import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";

export default function ProductCard({ product }) {
  const [showUpload, setShowUpload] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${product.description}?`)) return;
    try {
      await deleteDoc(doc(firestore, "products", product.id));
      alert("Product deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting product.");
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow hover:shadow-lg transition">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{product.description}</h3>
        <span className="text-gray-500 text-sm">{product.id}</span>
      </div>
      <p className="text-lg font-bold">💲{product.price}</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setShowUpload(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Upload Image
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-500 text-white rounded"
        >
          Delete
        </button>
      </div>

      {showUpload && (
        <ProductUploaderModal
          code={product.id}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
