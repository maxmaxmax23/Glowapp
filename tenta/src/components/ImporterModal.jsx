// File: src/components/ImporterModal.jsx
import React, { useState } from "react";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js"; // corrected import
import PropTypes from "prop-types";

export default function ImporterModal({ queuedData, onClose }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ total: 0, written: 0 });

  const sanitizeId = (id) => {
    if (!id) return "unknown";
    return id.toString().replace(/[^a-zA-Z0-9]/g, ""); // remove any invalid char
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
      alert(`✅ Import completed. Written ${writtenCount} items.`);
    } catch (err) {
      console.error("Error importing products:", err);
      alert(`Error importing products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 text-gold rounded-2xl p-4 w-full max-w-md flex flex-col">
        <h2 className="text-xl font-bold mb-3">Importar Productos</h2>

        <button
          onClick={handleImport}
          disabled={loading}
          className="bg-gold text-black py-2 rounded mb-4 font-semibold"
        >
          {loading ? "Importando..." : "Importar datos a Firebase"}
        </button>

        {progress.total > 0 && (
          <p className="text-sm">
            Escritos: {progress.written} / {progress.total}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 bg-gray-700 text-gold py-2 rounded hover:bg-gray-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

ImporterModal.propTypes = {
  queuedData: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};
