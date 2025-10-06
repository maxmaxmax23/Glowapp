// File: src/components/Dashboard.jsx
import React from "react";

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  return (
    <div className="p-4 w-full max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-gold mb-4 text-center">Dashboard</h1>

      <div className="flex flex-col gap-3">
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

      <div className="mt-6 text-gold text-center">
        <p>Escrituras en Firebase: {firebaseWrites}</p>
      </div>
    </div>
  );
}
