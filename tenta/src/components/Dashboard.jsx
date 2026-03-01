// File: src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { loadIndexMetadata, syncProductsFromFirebase } from "../utils/localIndex";
import { exportAllProducts } from "../utils/dataExporter";
import AurumHeader from "./AurumHeader";
import { motion } from "framer-motion";

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  const [syncStatus, setSyncStatus] = useState({
    lastSync: 0,
    productCount: 0,
    missingPhotos: 0,
    isSyncing: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const formatLastSync = (timestamp) => {
    if (timestamp === 0) return "Nunca";
    const date = new Date(timestamp);
    return date.toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSyncProducts = async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const newMetadata = await syncProductsFromFirebase();
      setSyncStatus({ ...newMetadata, isSyncing: false });
    } catch (error) {
      console.error(error);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage("");
    try {
      const count = await exportAllProducts();

      if (count > 0) {
        setExportMessage(`✅ ${count} productos guardados como CSV.`);
        setTimeout(() => setExportMessage(""), 5000);
      }
    } catch (error) {
      setExportMessage("❌ Error al exportar");
      setTimeout(() => setExportMessage(""), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        const metadata = await loadIndexMetadata();
        setSyncStatus({ ...metadata, isSyncing: false });
      } catch (e) {
        console.warn("Could not load local index metadata.", e);
      }
    };
    loadInitialStatus();
  }, []);

  return (
    <div className="w-full min-h-screen bg-black flex flex-col items-center">
      <AurumHeader title="Dashboard" variant="immersive" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="w-full max-w-md px-4 mt-6 flex flex-col space-y-6 pb-8"
      >
        <div className="flex flex-col space-y-4">
          <button className="aurum-btn-primary" onClick={onScan}>
            <span className="flex-1 text-center">Escanear Producto</span>
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button className="aurum-btn-secondary" onClick={onOpenImporter}>
              Importar JSON
            </button>
            <button className="aurum-btn-secondary" onClick={onOpenMerger}>
              Combinar Excel
            </button>
          </div>

          <button
            className="w-full rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold py-3 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exportando...
              </>
            ) : "Exportar Inventario a CSV"}
          </button>
          {exportMessage && (
            <div className="text-center text-sm font-medium animate-pulse text-textLight50">
              {exportMessage}
            </div>
          )}
        </div>

        {/* Sync Status Card */}
        <div className="aurum-card mt-8">
          <button
            className="w-full rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 text-black font-semibold py-3 transition-all duration-300 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
            onClick={handleSyncProducts}
            disabled={syncStatus.isSyncing}
          >
            {syncStatus.isSyncing ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sincronizando...</span>
              </span>
            ) : "Sincronizar productos"}
          </button>

          <div className="mt-4 pt-4 border-t border-borderDark800 space-y-2 text-sm">
            <div className="flex justify-between items-center text-textDark400">
              <span>Indexados:</span>
              <span className="text-textLight50 font-medium">{syncStatus.productCount}</span>
            </div>
            <div className="flex justify-between items-center text-textDark400">
              <span>Faltan Fotos:</span>
              <span className="text-amber400 font-medium">{syncStatus.missingPhotos}</span>
            </div>
            <div className="flex justify-between items-center text-textDark400 pb-2">
              <span>Última Sincro:</span>
              <span className="text-textLight50 text-right">{formatLastSync(syncStatus.lastSync)}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto py-8">
          <p className="text-center text-textDark400 text-sm">Escrituras en Firebase: <span className="text-amber400 font-bold">{firebaseWrites}</span></p>
        </div>
      </motion.div>
    </div>
  );
}
