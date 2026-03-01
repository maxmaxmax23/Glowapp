// File: src/components/MergerModal.jsx (FINAL PATCH for Persistence Reliability)
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { doc, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import { motion, AnimatePresence } from "framer-motion";
import AurumHeader from "./AurumHeader";

const BATCH_SIZE = 500;

export default function MergerModal({ onClose, addToQueue }) {
  const [equivalenciasFile, setEquivalenciasFile] = useState(null);
  const [preciosFile, setPreciosFile] = useState(null);
  const [mergedData, setMergedData] = useState([]);
  const [stats, setStats] = useState({ written: 0, skipped: 0, outOfTime: 0, failed: 0 });
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  };

  const handleMerge = async () => {
    if (!equivalenciasFile || !preciosFile) {
      alert("Selecciona ambos archivos antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      const [eqRows, prRows] = await Promise.all([
        parseExcel(equivalenciasFile),
        parseExcel(preciosFile),
      ]);

      const eqData = eqRows.slice(1);
      const prData = prRows.slice(1);

      const eqMap = new Map();
      eqData.forEach((row) => {
        const barcode = row[0]?.toString().trim();
        const productId = row[1]?.toString().trim();
        const description = row[2]?.toString().trim();

        if (barcode && productId) {
          if (!eqMap.has(productId)) eqMap.set(productId, { barcodes: new Set(), description });
          eqMap.get(productId).barcodes.add(barcode);
        }
      });

      let written = 0, skipped = 0, outOfTime = 0;
      const merged = [];

      const now = new Date();
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

      prData.forEach((row) => {
        let rawProductId = row[0]?.toString().trim();
        const description = row[1]?.toString().trim();
        const vigenciaRaw = row[4];
        const priceRaw = row[5];

        let productId = rawProductId;
        if (productId) {
          productId = productId.replace(/\//g, '-');
        }

        if (!productId || !vigenciaRaw || !priceRaw) {
          skipped++;
          return;
        }

        let vigencia;
        try {
          if (typeof vigenciaRaw === "number") {
            const date = XLSX.SSF.parse_date_code(vigenciaRaw);
            vigencia = new Date(date.y, date.m - 1, date.d);
          } else {
            const parts = vigenciaRaw.split(/[\/\-]/);
            if (parts.length === 3) {
              const [d, m, y] = parts.map((p) => parseInt(p, 10));
              vigencia = new Date(2000 + (y % 100), m - 1, d);
            }
          }
        } catch {
          skipped++;
          return;
        }

        if (vigencia < twelveMonthsAgo) {
          outOfTime++;
          return;
        }

        let price = parseFloat(priceRaw.toString().replace(/\./g, "").replace(",", "."));
        if (isNaN(price)) {
          skipped++;
          return;
        }

        const eqMatch = eqMap.get(rawProductId);
        const barcodes = eqMatch ? Array.from(eqMap.get(rawProductId).barcodes) : ["Sin código"];

        merged.push({
          productId: productId,
          description: description || eqMatch?.description || "Sin descripción",
          barcodes,
          price,
          vigencia: vigencia.toLocaleDateString("es-AR"),
        });
        written++;
      });

      setStats({ written, skipped, outOfTime, failed: 0 });
      setMergedData(merged);
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
      console.error("CRITICAL ERROR: Firebase/Firestore is not initialized or imported correctly. Check src/firebase.js.");
      alert("ERROR: No se pudo conectar con la base de datos. Verifica la consola.");
      setPersisting(false);
      return;
    }

    setPersisting(true);
    setProgress(0);
    const totalItems = mergedData.length;
    let successfulWrites = 0;
    let failedWrites = 0;

    for (let i = 0; i < totalItems; i += BATCH_SIZE) {
      let batch = writeBatch(db);
      const chunk = mergedData.slice(i, i + BATCH_SIZE);

      for (const item of chunk) {
        try {
          const productRef = doc(db, "products", item.productId);

          batch.set(productRef, {
            barcodes: item.barcodes.filter(b => b !== "Sin código"),
            price: item.price,
            lastUpdated: Timestamp.now(),
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
        console.error(`FATAL ERROR AL PERSISTIR BATCH ${i / BATCH_SIZE}. Revisa Reglas de Seguridad o Conexión:`, error);
        failedWrites += chunk.length;
        successfulWrites -= chunk.length;
        break;
      }

      const newProgress = ((i + BATCH_SIZE) / totalItems) * 100;
      setProgress(Math.min(newProgress, 100));
    }

    setPersisting(false);

    setStats(prev => ({
      ...prev,
      written: Math.max(0, successfulWrites),
      failed: failedWrites,
    }));

    alert(`Proceso Completo. ${Math.max(0, successfulWrites)} productos persistidos. ${failedWrites} fallaron.`);

    setMergedData([]);
    setEquivalenciasFile(null);
    setPreciosFile(null);
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green500 opacity-50">
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
                  className="w-full text-sm text-textDark400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green500/10 file:text-green500 hover:file:bg-green500/20"
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
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-amber400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...</span>
                  </span>
                ) : "Fusionar y Previsualizar"}
              </button>

              <button
                className="aurum-btn-primary flex-1 bg-green500 hover:bg-green-400 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]"
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
                ) : "Persistir en Firebase"}
              </button>
            </div>

            {persisting && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs text-green500 font-bold tracking-wider">
                  <span>PROGRESO DE GUARDADO</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-backgroundDark950 h-2 rounded-full overflow-hidden border border-borderDark800">
                  <div
                    className="h-full bg-green500 shadow-[0_0_10px_rgba(34,197,94,1)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="bg-backgroundDark950 p-4 rounded-xl border border-borderDark800 flex flex-wrap gap-4 items-center justify-center text-sm">
              <span className="flex items-center"><span className="text-green500 mr-2 text-lg">✓</span> <span className="text-textDark400 mr-2">Listos:</span> <b className="text-white">{stats.written}</b></span>
              <span className="flex items-center"><span className="text-red500 mr-2 text-lg">✗</span> <span className="text-textDark400 mr-2">Fallos:</span> <b className="text-white">{stats.failed}</b></span>
              <span className="flex items-center"><span className="text-amber400 mr-2 text-lg">⚠</span> <span className="text-textDark400 mr-2">Ignorados:</span> <b className="text-white">{stats.skipped}</b></span>
              <span className="flex items-center"><span className="text-blue-400 mr-2 text-lg">⏱</span> <span className="text-textDark400 mr-2">Vencidos:</span> <b className="text-white">{stats.outOfTime}</b></span>
            </div>

            {mergedData.length > 0 && (
              <div className="border border-borderDark800 rounded-xl overflow-hidden bg-backgroundDark900 overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm text-textLight50">
                  <thead className="text-xs uppercase bg-backgroundDark950 text-textDark400 font-bold sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 border-b border-borderDark800">Estado</th>
                      <th className="px-6 py-3 border-b border-borderDark800">ID</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Descripción</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Códigos</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Precio</th>
                      <th className="px-6 py-3 border-b border-borderDark800">Vigencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.map((item, idx) => (
                      <tr key={idx} className="border-b border-borderDark800 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          {new Date(item.vigencia) < new Date()
                            ? <span className="px-2 py-1 bg-red500/10 text-red500 rounded text-xs">Revisar</span>
                            : <span className="px-2 py-1 bg-green500/10 text-green500 rounded text-xs">Listo</span>
                          }
                        </td>
                        <td className="px-6 py-4 font-medium text-amber400 whitespace-nowrap">{item.productId}</td>
                        <td className="px-6 py-4 truncate max-w-xs" title={item.description}>{item.description}</td>
                        <td className="px-6 py-4 truncate max-w-[150px] text-textDark400" title={item.barcodes.join(", ")}>{item.barcodes.join(", ")}</td>
                        <td className="px-6 py-4 font-mono font-bold">${Math.round(item.price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.vigencia}</td>
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
