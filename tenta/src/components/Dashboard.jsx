// File: src/components/Dashboard.jsx
import React from "react";

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  return (
    <div className="w-full max-w-lg mx-auto p-4 mt-8">
      <h1 className="text-2xl font-bold text-gold mb-6 text-center">Dashboard</h1>

      <div className="flex flex-col gap-3 mb-6">
        <button
          className="bg-gold text-black py-2 px-4 rounded hover:opacity-80 transition"
          onClick={onScan}
        >
          Escanear Producto
        </button>

        <button
          className="bg-gold text-black py-2 px-4 rounded hover:opacity-80 transition"
          onClick={onOpenImporter}
        >
          Importar JSON
        </button>

        <button
          className="bg-gold text-black py-2 px-4 rounded hover:opacity-80 transition"
          onClick={onOpenMerger}
        >
          Combinar Archivos Excel
        </button>
      </div>

      <div className="text-gold text-center">
        <p>Escrituras en Firebase: {firebaseWrites}</p>
      </div>
    </div>
  );
}
