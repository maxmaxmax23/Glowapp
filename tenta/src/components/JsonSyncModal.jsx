import React, { useState } from "react";

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
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4">
      <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg w-full max-w-lg animate-fadeIn">
        <h2 className="text-2xl text-gold mb-4">Sincronización JSON</h2>
        <div className="mb-4">
          <p className="mb-2">Estado: {status || "Listo para sincronizar"}</p>
          <div className="h-4 w-full bg-gray-700 rounded">
            <div
              className="h-4 bg-gold rounded"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-gold text-black px-4 py-2 rounded hover:bg-yellow-500 disabled:opacity-50"
          >
            {isSyncing ? "Sincronizando..." : "Iniciar sincronización"}
          </button>
          <button
            onClick={onClose}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
