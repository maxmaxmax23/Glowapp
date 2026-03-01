import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";

export default function ProductCard({ product }) {
  const [showUpload, setShowUpload] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar ${product.description}?`)) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, "products", product.id));
      alert("Producto eliminado.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error al eliminar el producto.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="aurum-card-inner flex flex-col justify-between hover:border-amber400/50 transition-all duration-300">
      <div>
        <div className="flex justify-between items-start gap-2 mb-3">
          <h3 className="font-semibold text-textLight50 line-clamp-2 leading-tight">
            {product.description || "Sin descripción"}
          </h3>
          <span className="text-amber400 text-[10px] font-mono font-bold bg-amber400/10 px-2 py-1 rounded-md shrink-0 border border-amber400/20">
            {product.id}
          </span>
        </div>
        <p className="text-xl font-light text-textLight50 mb-4 flex items-center">
          <span className="text-amber400 font-medium mr-1 text-sm">$</span>
          {typeof product.price === 'number' ? product.price.toLocaleString('es-AR') : product.price}
        </p>
      </div>

      <div className="flex gap-2 mt-auto pt-4 border-t border-borderDark800">
        <button
          onClick={() => setShowUpload(true)}
          className="flex-1 aurum-btn-secondary text-xs py-2 px-0 flex items-center justify-center gap-1 hover:bg-amber400/10 hover:text-amber400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          Imagen
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 text-xs py-2 px-0 flex items-center justify-center gap-1 bg-backgroundDark950 border border-borderDark800 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 rounded-xl transition-colors font-medium disabled:opacity-50"
        >
          {isDeleting ? (
            <svg className="animate-spin h-3.5 w-3.5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              X
            </>
          )}
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
