// File: src/components/ImporterModal.jsx
import React, { useState } from "react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import AurumHeader from "./AurumHeader";

export default function ImporterModal({ queuedData, onClose }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ total: 0, written: 0 });

  const sanitizeId = (id) => {
    if (!id) return "unknown";
    return id.toString().replace(/[^a-zA-Z0-9]/g, "");
  };

  const handleImport = async () => {
    if (!queuedData || queuedData.length === 0) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      let writtenCount = 0;

      queuedData.forEach((item) => {
        const safeId = sanitizeId(item.productId);
        const docRef = doc(collection(db, "products"), safeId);

        batch.set(docRef, {
          description: item.description,
          barcodes: item.barcodes,
          price: item.price,
          vigencia: item.vigencia,
        });

        writtenCount++;
      });

      await batch.commit();
      setProgress({ total: queuedData.length, written: writtenCount });
      alert(`✅ Importación completada. Se escribieron ${writtenCount} items.`);
    } catch (err) {
      console.error("Error importing products:", err);
      alert(`Error al importar: ${err.message}`);
    } finally {
      setLoading(false);
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
          onClick={!loading ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="z-10 w-full max-w-md bg-backgroundDark900 border border-borderDark800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-borderDark800 bg-backgroundDark950 flex justify-between items-center">
            <h2 className="text-xl font-light text-textLight50">Importar Productos</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-backgroundDark900 hover:bg-borderDark800 text-textDark400 hover:text-white transition-colors border border-borderDark800 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-textDark400 text-sm text-center">
              Asegúrate de tener un archivo válido antes de importar la data a Firebase.
              {queuedData.length > 0 && ` (${String(queuedData.length)} en cola)`}
            </p>

            <button
              onClick={handleImport}
              disabled={loading || !queuedData || queuedData.length === 0}
              className="aurum-btn-primary w-full shadow-[0_0_15px_rgba(251,191,36,0.3)]"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Importando...</span>
                </span>
              ) : "Importar a Firebase"}
            </button>

            {progress.total > 0 && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs text-textDark400 font-medium">
                  <span>Progreso</span>
                  <span>{progress.written} / {progress.total}</span>
                </div>
                <div className="w-full bg-backgroundDark950 h-2 rounded-full overflow-hidden border border-borderDark800">
                  <div
                    className="h-full bg-amber400 shadow-[0_0_10px_rgba(251,191,36,1)] transition-all duration-300"
                    style={{ width: `${(progress.written / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              disabled={loading}
              className="aurum-btn-secondary w-full disabled:opacity-50"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

ImporterModal.propTypes = {
  queuedData: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};
