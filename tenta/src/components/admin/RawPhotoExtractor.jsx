import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, limit, writeBatch, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase'; // Adjust this import based on your firebase config location
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-500">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-amber400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const MAX_BATCH_SIZE = 100;

export default function RawPhotoExtractor() {
    const [queueCount, setQueueCount] = useState(0);
    const [isExtracting, setIsExtracting] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    const [progressStats, setProgressStats] = useState({ total: 0, current: 0 });
    const [completionResult, setCompletionResult] = useState(null);

    // Live Snapshot Listener for Queue Counter
    useEffect(() => {
        const q = query(collection(db, 'products'), where('imageStatus', '==', 'raw'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setQueueCount(snapshot.size);
        });
        return () => unsubscribe();
    }, []);

    const handleExtract = async () => {
        if (queueCount === 0 || isExtracting) return;

        setIsExtracting(true);
        setCompletionResult(null);
        setProgressStatus('Asegurando cola de descarga (Cerrando registros)...');

        let skippedCount = 0;
        let successCount = 0;

        try {
            // STEP 1: The Smart Query (Batch Slicing)
            const q = query(
                collection(db, 'products'),
                where('imageStatus', '==', 'raw'),
                limit(MAX_BATCH_SIZE)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setIsExtracting(false);
                return;
            }

            const docs = snapshot.docs;
            setProgressStats({ total: docs.length, current: 0 });

            // STEP 2: The Checkout Lock (Concurrency Protection)
            const batch = writeBatch(db);
            docs.forEach(docSnap => {
                batch.update(docSnap.ref, { imageStatus: 'processing' });
            });
            await batch.commit();

            // STEP 3: Fetch & Package (Client-Side Zipping)
            setProgressStatus('Descargando y empaquetando archivos... 0%');
            const zip = new JSZip();

            for (let i = 0; i < docs.length; i++) {
                const docSnap = docs[i];
                const productId = docSnap.id;

                try {
                    // Try targeting both jpg and png formats typical of mobile uploads
                    let blob = null;
                    let fileExt = 'jpg';
                    const storageRefJpg = ref(storage, `raw_photos/${productId}.jpg`);

                    try {
                        const url = await getDownloadURL(storageRefJpg);
                        const response = await fetch(url);
                        if (!response.ok) throw new Error("Fetch failed");
                        blob = await response.blob();
                    } catch (e) {
                        // Fallback to PNG if JPG not found
                        try {
                            const storageRefPng = ref(storage, `raw_photos/${productId}.png`);
                            const url = await getDownloadURL(storageRefPng);
                            const response = await fetch(url);
                            if (!response.ok) throw new Error("Fetch failed");
                            blob = await response.blob();
                            fileExt = 'png';
                        } catch (fallbackError) {
                            throw new Error("No image found in storage"); // STEP 4 Trigger
                        }
                    }

                    // Add to ZIP
                    zip.file(`${productId}.${fileExt}`, blob);
                    successCount++;

                } catch (error) {
                    console.warn(`File for ${productId} not found in Storage. Reverting to 'missing'.`, error);
                    skippedCount++;

                    // STEP 4: The Ghost File Safety Net (Error Correction)
                    // Revert instantly directly
                    await updateDoc(doc(db, 'products', productId), {
                        imageStatus: 'missing'
                    });
                }

                // Update UI Progress safely
                setProgressStats(prev => ({ ...prev, current: i + 1 }));
                setProgressStatus(`Descargando y empaquetando archivos... ${Math.round(((i + 1) / docs.length) * 100)}%`);
            }

            setProgressStatus('Comprimiendo archivo ZIP (Esto puede tardar unos segundos)...');

            // STEP 5: Trigger Local Download
            if (successCount > 0) {
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const dateStr = new Date().toISOString().split('T')[0];
                saveAs(zipBlob, `glowapp_raw_batch_${dateStr}.zip`);
            } else {
                throw new Error("No se encontraron archivos válidos para descargar.");
            }

            setCompletionResult({
                success: successCount,
                skipped: skippedCount
            });

        } catch (error) {
            console.error("Critical error during extraction:", error);
            alert(`Error crítico durante la extracción: ${error.message}`);
            // In a production scenario, we might want to un-lock the processing docs here if JSZip completely failed
        } finally {
            setIsExtracting(false);
            setProgressStatus('');
            setProgressStats({ total: 0, current: 0 });
        }
    };

    return (
        <div className="aurum-card flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">

            {/* Conditional completion overlay banner */}
            <AnimatePresence>
                {completionResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 left-0 w-full bg-green-500/20 border-b border-green-500/50 p-2 text-xs flex justify-center items-center space-x-2 text-green-400 z-10 font-medium"
                    >
                        <CheckIcon />
                        <span>Lote descargado: {completionResult.success} archivos. ({completionResult.skipped} fotos fantasma saltadas)</span>
                        <button onClick={() => setCompletionResult(null)} className="ml-4 text-textDark400 hover:text-white underline">Cerrar</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <h3 className="text-xl font-light text-textLight50 mb-1">Extractor de Crudos</h3>
            <p className="text-sm text-textDark400 mb-6">Empaqueta fotos listas para edición offline (Max {MAX_BATCH_SIZE}/lote).</p>

            <div className="flex flex-col items-center space-y-2 mb-8">
                <span className="text-textDark400 uppercase text-xs font-bold tracking-wider">Cola Actual</span>
                <span className={`text-6xl font-extralight ${queueCount > 0 ? 'text-amber400' : 'text-borderDark800'}`}>
                    {queueCount}
                </span>
            </div>

            {isExtracting ? (
                <div className="w-full bg-backgroundDark950 border border-borderDark800 rounded-xl p-4 flex flex-col items-center">
                    <div className="flex items-center text-sm font-medium text-amber400 mb-3">
                        <SpinnerIcon />
                        {progressStatus}
                    </div>

                    {progressStats.total > 0 && (
                        <div className="w-full bg-backgroundDark900 rounded-full h-2 overflow-hidden border border-borderDark800">
                            <div
                                className="bg-amber400 h-2 transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                                style={{ width: `${(progressStats.current / progressStats.total) * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={handleExtract}
                    disabled={queueCount === 0}
                    className="aurum-btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-600/0 via-amber-600/30 to-amber-600/0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-100%] group-hover:translate-x-[100%] duration-1000 ease-in-out"></div>
                    <DownloadIcon />
                    <span>Descargar Siguiente Lote ZIP</span>
                </button>
            )}
        </div>
    );
}
