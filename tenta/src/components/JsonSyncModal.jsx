import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function JsonSyncModal({ onClose }) {
  const [status, setStatus] = useState(""); // For logging
  const [progress, setProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus("Iniciando sincronización...");
    setProgress(0);

    try {
      // Example: Firestore → GitHub JSON
      setStatus("Exportando datos desde Firebase...");
      await new Promise((res) => setTimeout(res, 500)); // simulate work
      setProgress(25);

      // Example: GitHub JSON → Firebase
      setStatus("Importando datos desde GitHub...");
      await new Promise((res) => setTimeout(res, 500)); // simulate work
      setProgress(50);

      // Example: backup overwritten JSON
      setStatus("Haciendo backup de JSON sobrescrito...");
      await new Promise((res) => setTimeout(res, 500));
      setProgress(75);

      setStatus("Sincronización completada ✅");
      setProgress(100);
    } catch (err) {
      setStatus(`Error durante la sincronización: ${err.message}`);
    } finally {
      setIsSyncing(false);
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
          onClick={!isSyncing ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="z-10 w-full max-w-md bg-backgroundDark900 border border-borderDark800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col relative"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-borderDark800 flex justify-between items-center bg-backgroundDark950/50 relative">
            <h2 className="text-xl font-light text-textLight50 tracking-tight flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Sincronización
            </h2>
            <button
              onClick={onClose}
              disabled={isSyncing}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-backgroundDark900 hover:bg-borderDark800 text-textDark400 hover:text-white transition-all duration-300 border border-borderDark800 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            <div className="bg-backgroundDark950 border border-borderDark800 rounded-2xl p-5 space-y-4 shadow-inner">
              <div className="flex justify-between items-end">
                <p className="text-xs font-medium text-textDark400 uppercase tracking-widest">Estado</p>
                <p className="text-sm font-bold text-amber400">{progress}%</p>
              </div>

              <p className="text-sm text-textLight50 h-5 truncate">{status || "Listo para sincronizar"}</p>

              <div className="h-2 w-full bg-backgroundDark900 rounded-full overflow-hidden border border-borderDark800">
                <div
                  className="h-full bg-amber400 shadow-[0_0_10px_rgba(251,191,36,0.8)] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-[2] aurum-btn-primary flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sincronizando...
                  </>
                ) : (
                  "Iniciar sincronización"
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isSyncing}
                className="flex-1 aurum-btn-secondary disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
