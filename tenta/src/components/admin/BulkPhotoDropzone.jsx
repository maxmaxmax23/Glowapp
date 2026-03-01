import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase'; // Adjust path if needed

// Icons
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-amber400 opacity-80 mb-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
);

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-textDark400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-500">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
);

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
);

const MAX_FILE_SIZE_MB = 5;

// WebP Conversion Utility
const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("La conversión a WebP falló."));
                    }
                }, 'image/webp', 0.85); // 0.85 Quality compression
            };
            img.onerror = () => reject(new Error("Error al leer la imagen."));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Error FileReader."));
        reader.readAsDataURL(file);
    });
};

export default function BulkPhotoDropzone({ onClose }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [summary, setSummary] = useState(null);
    const fileInputRef = useRef(null);

    // --- HTML5 Drag & Drop Handlers ---
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragActive) setIsDragActive(true);
    }, [isDragActive]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFilesSelection(Array.from(e.dataTransfer.files));
        }
    }, [isProcessing]);

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFilesSelection(Array.from(e.target.files));
        }
    };

    // --- Initial File Validation & Setup ---
    const processFilesSelection = (selectedFiles) => {
        if (isProcessing) return; // Prevent adding during upload

        const newFiles = selectedFiles.map((file) => {
            const isAllowedType = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type.toLowerCase());
            const isUnderLimit = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;

            let initialStatus = 'pending';
            let errorMessage = '';

            if (!isAllowedType) {
                initialStatus = 'failed';
                errorMessage = 'Formato inválido. Solo JPG/PNG/WEBP.';
            } else if (!isUnderLimit) {
                initialStatus = 'failed';
                errorMessage = `Supera el límite de ${MAX_FILE_SIZE_MB}MB.`;
            }

            // Extract Product ID: "GLOW-001.jpg" -> "GLOW-001"
            const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

            return {
                id: Math.random().toString(36).substring(7),
                file, // Raw JS File object
                name: file.name,
                productId: fileNameWithoutExt,
                status: initialStatus,
                message: errorMessage,
                progress: 0
            };
        });

        setFiles((prev) => [...prev, ...newFiles]);
    };

    // --- Functional Execution Logic ---
    const updateFileState = (id, updates) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleStartUpload = async () => {
        setIsProcessing(true);
        setSummary(null);
        let successCount = 0;
        let failCount = 0;

        // Filter out those that already failed local validation or are already successful
        const filesToProcess = files.filter(f => f.status === 'pending' || f.status === 'failed_network');

        for (const item of filesToProcess) {
            try {
                updateFileState(item.id, { status: 'uploading', message: 'Verificando ID...', progress: 5 });

                // 2. Database Validation (Safety Net)
                const docRef = doc(db, 'products', item.productId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    updateFileState(item.id, { status: 'failed', message: `Error: Producto ID '${item.productId}' no encontrado.`, progress: 0 });
                    failCount++;
                    continue; // Abort this file, move to next
                }

                updateFileState(item.id, { message: 'Convirtiendo a WebP...', progress: 15 });

                // 1. Cost-Saving Step: Browser WebP Conversion
                let uploadBlob = item.file;
                const isAlreadyWebp = item.file.type === 'image/webp';

                if (!isAlreadyWebp) {
                    try {
                        uploadBlob = await convertToWebP(item.file);
                    } catch (conversionErr) {
                        updateFileState(item.id, { status: 'failed', message: `Fallo conversión WebP: ${conversionErr.message}`, progress: 0 });
                        failCount++;
                        continue;
                    }
                }

                updateFileState(item.id, { message: 'Subiendo a Storage...', progress: 30 });

                // 3. Storage Upload
                const storagePath = `official_photos/${item.productId}.webp`;
                const fileRef = ref(storage, storagePath);

                // We wrap the upload stream in a Promise to track byte progress precisely
                const downloadURL = await new Promise((resolve, reject) => {
                    const uploadTask = uploadBytesResumable(fileRef, uploadBlob, { contentType: 'image/webp' });

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            // Scale from 30% to 80% visually
                            const uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 50;
                            updateFileState(item.id, { progress: 30 + uploadProgress });
                        },
                        (error) => reject(error),
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(url);
                        }
                    );
                });

                updateFileState(item.id, { message: 'Vinculando Base de Datos...', progress: 85 });

                // 4. Database Binding
                await updateDoc(docRef, {
                    photoURL: [downloadURL], // Array format as per usual product struct
                    imageStatus: 'enhanced',
                    lastUpdated: serverTimestamp()
                });

                // 5. Storage Cleanup (Fire-and-forget, don't fail the whole process if this errors)
                updateFileState(item.id, { message: 'Limpiando fotos crudas...', progress: 95 });
                try {
                    const oldExt = item.name.split('.').pop(); // e.g., 'jpg'
                    if (oldExt.toLowerCase() !== 'webp') {
                        await deleteObject(ref(storage, `raw_photos/${item.productId}.${oldExt}`));
                    }
                } catch (cleanupErr) {
                    console.warn(`Silently ignoring cleanup error for raw_photos/${item.productId}`, cleanupErr);
                }

                updateFileState(item.id, { status: 'success', message: 'Completado', progress: 100 });
                successCount++;

            } catch (error) {
                console.error(`Upload error for ${item.productId}:`, error);

                // Determine if it was a network drop to allow retries
                const isNetworkErr = error.code === 'storage/retry-limit-exceeded' || error.message.includes('network');
                updateFileState(item.id, {
                    status: isNetworkErr ? 'failed_network' : 'failed',
                    message: isNetworkErr ? 'Error de red. Clic en Reintentar.' : 'Error inesperado durante la subida.',
                    progress: 0
                });
                failCount++;
            }
        }

        setIsProcessing(false);
        setSummary({ success: successCount, failed: failCount });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isProcessing ? onClose : undefined}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="z-10 w-full max-w-3xl bg-backgroundDark900 border border-borderDark800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-borderDark800 flex justify-between items-center bg-backgroundDark950">
                        <div>
                            <h2 className="text-xl font-light text-textLight50">Carga Masiva de Fotos</h2>
                            <p className="text-sm text-textDark400 mt-1">Sube fotos mejoradas por IA para enlazarlas automáticamente.</p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-backgroundDark900 hover:bg-borderDark800 text-textDark400 hover:text-white transition-colors border border-borderDark800 disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">

                        {/* Completion Summary Banner */}
                        {summary && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-backgroundDark950 border border-borderDark800 rounded-xl p-4 flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-3">
                                    {summary.failed === 0 ? <CheckIcon /> : <ErrorIcon />}
                                    <div>
                                        <h3 className={summary.failed === 0 ? "text-green-500 font-bold" : "text-amber400 font-bold"}>Proceso Completado</h3>
                                        <p className="text-sm text-textLight50">
                                            {summary.success} fotos subidas exitosamente. {summary.failed} errores.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSummary(null); setFiles([]); }}
                                    className="aurum-btn-ghost text-xs"
                                >
                                    Cargar Nuevo Lote
                                </button>
                            </motion.div>
                        )}

                        {/* Drag & Drop Zone (Idle State) */}
                        {files.length === 0 && !summary && (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                  border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300
                  ${isDragActive ? 'border-amber400 bg-amber400/5' : 'border-borderDark800 hover:border-amber400/50 bg-backgroundDark950'}
                `}
                            >
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg, image/png, image/jpg, image/webp"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileInput}
                                />
                                <UploadIcon />
                                <h3 className="text-lg font-bold text-textLight50 mb-2">Arrastra y suelta fotos aquí</h3>
                                <p className="text-sm text-textDark400 max-w-sm mb-4">o haz clic para explorar tus archivos</p>

                                <div className="bg-backgroundDark900 border border-borderDark800 rounded-lg p-3 text-xs text-textDark400 text-left w-full max-w-sm">
                                    <p className="font-semibold text-amber400 mb-1">Reglas de carga:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>El nombre del archivo debe ser <b>EXACTAMENTE</b> el ID del Producto (ej. <span className="text-white font-mono">GLOW-001.jpg</span>).</li>
                                        <li>Formatos permitidos: JPG, PNG, WEBP.</li>
                                        <li>Peso máximo por imagen: {MAX_FILE_SIZE_MB}MB.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Processing State (List View) */}
                        {files.length > 0 && (
                            <div className="space-y-4">
                                {/* Compact Dropzone Header */}
                                {!summary && (
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`border border-dashed rounded-xl p-4 flex items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-amber400 bg-amber400/5' : 'border-borderDark800 hover:border-textDark400'}`}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span className="text-sm text-textDark400">Arrastra <b>más archivos</b> aquí o haz clic para agregar.</span>
                                    </div>
                                )}

                                <div className="bg-backgroundDark950 rounded-xl border border-borderDark800 overflow-hidden">
                                    {/* List Header */}
                                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-borderDark800 text-xs font-bold text-textDark400 uppercase tracking-wider bg-backgroundDark900">
                                        <div className="col-span-5">Archivo / Producto ID</div>
                                        <div className="col-span-3 text-center">Estado</div>
                                        <div className="col-span-4 text-right">Progreso / Info</div>
                                    </div>

                                    {/* List Items */}
                                    <div className="max-h-[40vh] overflow-y-auto custom-scrollbar">
                                        {files.map((file) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                key={file.id}
                                                className={`grid grid-cols-12 gap-4 p-4 border-b border-borderDark800/50 items-center transition-colors
                                                   ${file.status === 'failed' ? 'bg-red-500/5' : 'hover:bg-white/5'}
                                                `}
                                            >
                                                {/* Column 1: File Info */}
                                                <div className="col-span-5 flex items-center space-x-3 overflow-hidden">
                                                    <div className="flex-shrink-0">
                                                        <FileIcon />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-textLight50 truncate" title={file.name}>{file.name}</p>
                                                        <p className={`text-xs font-mono mt-0.5 truncate ${file.status === 'failed' ? 'text-red-400' : 'text-amber400'}`} title={file.productId}>ID: {file.productId}</p>
                                                    </div>
                                                </div>

                                                {/* Column 2: Status Badge */}
                                                <div className="col-span-3 flex justify-center">
                                                    {file.status === 'pending' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-backgroundDark800 text-textDark400 border border-borderDark800">En Cola</span>}
                                                    {file.status === 'uploading' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Subiendo...</span>}
                                                    {file.status === 'success' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">Completado</span>}
                                                    {file.status === 'failed' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Error</span>}
                                                    {file.status === 'failed_network' && (
                                                        <button
                                                            onClick={handleStartUpload}
                                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber400/10 text-amber400 border border-amber400/20 hover:bg-amber400/20"
                                                        >
                                                            Reintentar
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Column 3: Progress or Error Message */}
                                                <div className="col-span-4 flex flex-col justify-center items-end text-xs">
                                                    {file.status === 'failed' || file.status === 'failed_network' ? (
                                                        <span className="text-red-400 text-right w-full overflow-hidden text-ellipsis whitespace-nowrap" title={file.message}>
                                                            {file.message}
                                                        </span>
                                                    ) : file.status === 'success' ? (
                                                        <div className="flex items-center space-x-1">
                                                            <CheckIcon /> <span className="text-textDark400">Convertido a WebP</span>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full flex items-center space-x-2">
                                                            <span className="text-textDark400 min-w-[100px] text-right truncate overflow-hidden text-ellipsis">{file.message || 'Esperando...'}</span>
                                                            <div className="w-full bg-backgroundDark900 rounded-full h-1.5 border border-borderDark800 overflow-hidden">
                                                                <div
                                                                    className="bg-amber400 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                                                                    style={{ width: `${file.progress}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-borderDark800 bg-backgroundDark950 flex justify-between items-center">
                        <button
                            onClick={() => setFiles([])}
                            disabled={isProcessing || files.length === 0}
                            className="text-sm text-textDark400 hover:text-white transition-colors disabled:opacity-30"
                        >
                            Limpiar Lista
                        </button>
                        <button
                            onClick={handleStartUpload}
                            disabled={isProcessing || files.length === 0 || summary}
                            className="aurum-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Procesando...' : summary ? 'Carga Finalizada' : 'Iniciar Carga'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
