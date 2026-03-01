// File: src/components/MergerModal.jsx
import React, { useState } from "react";
import { doc, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase.js";
import { processExcelFiles } from "../utils/mergeProcessor";
import { motion, AnimatePresence } from "framer-motion";

const BATCH_SIZE = 500;

export default function MergerModal({ onClose, addToQueue }) {
  const [equivalenciasFile, setEquivalenciasFile] = useState(null);
  const [preciosFile, setPreciosFile] = useState(null);
  const [mergedData, setMergedData] = useState([]);
  const [stats, setStats] = useState({ written: 0, skipped: 0, outOfTime: 0, failed: 0 });
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetCollection, setTargetCollection] = useState("products");

  const handleMerge = async () => {
    if (!equivalenciasFile || !preciosFile) {
      alert("Selecciona ambos archivos antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      const result = await processExcelFiles(equivalenciasFile, preciosFile);
      setStats(result.stats);
      setMergedData(result.mergedData);
    } catch (error) {
      console.error("Error al procesar archivos:", error);
      alert("Error procesando los archivos. Ver consola.");
    } finally {
      setLoading(false);
    }
  };

  const handlePersistData = async () => {
    if (mergedData.length === 0) return alert("No hay datos para persistir");

    if (!db || typeof writeBatch !== 'function') {
      console.error("CRITICAL ERROR: Firestore not initialized.");
      alert("ERROR: No se pudo conectar con la base de datos.");
      setPersisting(false);
      return;
    }
    if (targetCollection === "products_location_b" && !storage) {
      console.error("CRITICAL ERROR: Storage not initialized for Location B upload.");
      alert("ERROR: No se pudo conectar con el almacenamiento de archivos.");
      setPersisting(false);
      return;
    }

    setPersisting(true);
    setProgress(0);
    const totalItems = mergedData.length;
    let successfulWrites = 0;
    let failedWrites = 0;

    console.log(`Starting Upload to Collection: ${targetCollection}`);

    try {
      if (targetCollection === "products") {
        for (let i = 0; i < totalItems; i += BATCH_SIZE) {
          let batch = writeBatch(db);
          const chunk = mergedData.slice(i, i + BATCH_SIZE);

          for (const item of chunk) {
            try {
              const productRef = doc(db, targetCollection, item.productId);

              batch.set(productRef, {
                barcodes: item.barcodes.filter(b => b !== "Sin código"),
                price: item.price,
                description: item.description,
                lastUpdated: Timestamp.now(),
                lastKnownStock: item.lastKnownStock || 0,
                variants: item.variants || {},
                provider: item.provider || "",
                currentInventory: item.currentInventory || 0,
              }, { merge: true });

              successfulWrites++;
            } catch (error) {
              console.error(`Error al preparar batch para ${item.productId}:`, error);
              failedWrites++;
            }
          }

          try {
            await batch.commit();
          } catch (error) {
            console.error(`FATAL ERROR AL PERSISTIR BATCH ${i / BATCH_SIZE}:`, error);
            failedWrites += chunk.length;
            successfulWrites -= chunk.length;
            break;
          }

          const newProgress = ((i + BATCH_SIZE) / totalItems) * 100;
          setProgress(Math.min(newProgress, 100));
        }
      } else {
        console.log("Modo: Location B (Storage JSON)");
        setProgress(30);

        const jsonString = JSON.stringify(mergedData);
        const blob = new Blob([jsonString], { type: "application/json" });

        const storageRef = ref(storage, "indexes/location_b.json");
        await uploadBytes(storageRef, blob);

        await setDoc(doc(db, "system", "metadata"), {
          locationB_lastUpdated: Timestamp.now(),
          locationB_count: mergedData.length
        }, { merge: true });

        successfulWrites = mergedData.length;
        setProgress(100);
      }

      setStats(prev => ({
        ...prev,
        written: Math.max(0, successfulWrites),
        failed: failedWrites,
      }));

      alert(`Carga Completa en "${targetCollection === 'products' ? 'Principal' : 'Ubicación B'}".\n${Math.max(0, successfulWrites)} productos persistidos.`);

      setMergedData([]);
      setEquivalenciasFile(null);
      setPreciosFile(null);

    } catch (error) {
      console.error("Error persistiendo datos:", error);
      alert("Error al subir los datos. Revisa la consola para errores críticos.");

      setStats(prev => ({
        ...prev,
        failed: prev.failed + totalItems,
        written: 0
      }));
    } finally {
      setPersisting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!loading && !persisting ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="z-10 w-full max-w-4xl bg-backgroundDark900 border border-borderDark800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-borderDark800 flex justify-between items-center bg-backgroundDark950">
            <h2 className="text-xl font-light text-textLight50">Fusionar Archivos Excel</h2>
            <button
              onClick={onClose}
              disabled={loading || persisting}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-backgroundDark900 hover:bg-borderDark800 text-textDark400 hover:text-white transition-colors border border-borderDark800 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">

            {/* Target Select */}
            <div className="bg-backgroundDark950 border border-borderDark800 p-4 rounded-xl">
              <label className="text-sm text-textDark400 font-medium mb-2 block">Base de Datos Destino:</label>
              <select
                value={targetCollection}
                onChange={(e) => setTargetCollection(e.target.value)}
                className="aurum-input w-full appearance-none bg-backgroundDark900 border border-borderDark800 rounded-lg px-4 py-3 text-textLight50 focus:border-amber400 transition-colors"
              >
                <option value="products">📍 Sucursal Principal (Firestore)</option>
                <option value="products_location_b">🏢 Sucursal B (JSON File)</option>
              </select>
              {targetCollection === 'products_location_b' && (
                <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  Modo Optimizado: Se subirá un solo archivo JSON (Sin costo de escritura).
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Equivalencias Upload */}
              <div className="aurum-card-inner border border-dashed border-borderDark800 flex flex-col items-center justify-center p-6 space-y-4 hover:border-amber400/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-amber400 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-bold text-textLight50 uppercase tracking-wide">Archivo Equivalencias</p>
                  <p className="text-xs text-textDark400 mt-1">.xlsx, .xls</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setEquivalenciasFile(e.target.files[0])}
                  className="w-full text-sm text-textDark400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber400/10 file:text-amber400 hover:file:bg-amber400/20"
                />
              </div>

              {/* Precios Upload */}
              <div className="aurum-card-inner border border-dashed border-borderDark800 flex flex-col items-center justify-center p-6 space-y-4 hover:border-amber400/50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-500 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-bold text-textLight50 uppercase tracking-wide">Archivo de Precios</p>
                  <p className="text-xs text-textDark400 mt-1">.xlsx, .xls</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setPreciosFile(e.target.files[0])}
                  className="w-full text-sm text-textDark400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500/10 file:text-green-500 hover:file:bg-green-500/20"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="aurum-btn-secondary flex-1"
                onClick={handleMerge}
                disabled={loading || persisting}
              >
                {loading ? (
                  <span className="flex items-center space-x-2 justify-center">
                    <svg className="animate-spin h-4 w-4 text-amber400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...</span>
                  </span>
                ) : "Fusionar y Previsualizar"}
              </button>

              <button
                className="aurum-btn-primary flex-1 bg-green-500 hover:bg-green-400 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:bg-green-900 flex items-center justify-center"
                onClick={handlePersistData}
                disabled={mergedData.length === 0 || loading || persisting}
              >
                {persisting ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Persistiendo...</span>
                  </span>
                ) : "Persistir en Base de Datos"}
              </button>
            </div>

            {persisting && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs text-green-500 font-bold tracking-wider">
                  <span>PROGRESO DE GUARDADO</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-backgroundDark950 h-2 rounded-full overflow-hidden border border-borderDark800">
                  <div
                    className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,1)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="bg-backgroundDark950 p-4 rounded-xl border border-borderDark800 flex flex-wrap gap-4 items-center justify-center text-sm">
              <span className="flex items-center"><span className="text-green-500 mr-2 text-lg">✓</span> <span className="text-textDark400 mr-2">Listos:</span> <b className="text-white">{stats.written}</b></span>
              <span className="flex items-center"><span className="text-red-500 mr-2 text-lg">✗</span> <span className="text-textDark400 mr-2">Fallos:</span> <b className="text-white">{stats.failed}</b></span>
              <span className="flex items-center"><span className="text-amber400 mr-2 text-lg">⚠</span> <span className="text-textDark400 mr-2">Ignorados:</span> <b className="text-white">{stats.skipped}</b></span>
              <span className="flex items-center"><span className="text-blue-400 mr-2 text-lg">⏱</span> <span className="text-textDark400 mr-2">Vencidos:</span> <b className="text-white">{stats.outOfTime}</b></span>
            </div>

            {mergedData.length > 0 && (
              <div className="border border-borderDark800 rounded-xl bg-backgroundDark900 overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm text-textLight50">
                  <thead className="text-xs uppercase bg-backgroundDark950 text-textDark400 font-bold sticky top-0 shadow-[0_1px_0_rgba(255,255,255,0.05)] border-b border-borderDark800">
                    <tr>
                      <th className="px-6 py-3 border-b border-borderDark800">Estado</th>
                      <th className="px-6 py-3 border-b border-borderDark800">ID</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Descripción</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Códigos</th>
                      <th className="px-6 py-3 border-b border-borderDark800 font-mono text-right">Precio</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Vigencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.map((item, idx) => (
                      <tr key={idx} className="border-b border-borderDark800 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          {new Date(item.vigencia) < new Date()
                            ? <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs border border-red-500/20">Revisar</span>
                            : <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs border border-green-500/20">Listo</span>
                          }
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-amber400 whitespace-nowrap">{item.productId}</td>
                        <td className="px-6 py-4 truncate max-w-xs">{item.description}</td>
                        <td className="px-6 py-4 truncate max-w-[150px] text-textDark400 font-mono text-xs">{item.barcodes?.join(", ")}</td>
                        <td className="px-6 py-4 font-mono font-bold text-right">${Math.round(item.price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-textDark400">{item.vigencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-borderDark800 flex justify-end bg-backgroundDark950">
            <button
              onClick={onClose}
              disabled={loading || persisting}
              className="aurum-btn-ghost disabled:opacity-50"
            >
              Cerrar Panel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

