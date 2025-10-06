import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", code);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) setProduct(snapshot.data());
        else setProduct({ id: code, notFound: true });
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    };
    fetchProduct();
  }, [code]);

  if (showUploader)
    return <ProductUploaderModal code={code} onClose={() => setShowUploader(false)} />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center">
      <div className="bg-gray-900 p-6 rounded-xl text-white w-96 animate-fadeIn">
        {product ? (
          <>
            <h2 className="text-xl text-gold mb-2">{product.description || "Producto"}</h2>
            <p>
              <b>Código:</b> {code}
            </p>
            <p>
              <b>Precio:</b> ${product.price ?? "Sin precio"}
            </p>
            {product.image && (
              <img src={product.image} alt={product.description} className="mt-3 rounded" />
            )}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowUploader(true)}
                className="bg-gold text-black px-4 py-2 rounded"
              >
                Subir imagen
              </button>
              <button onClick={onClose} className="bg-red-500 px-4 py-2 rounded">
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <p>Cargando...</p>
        )}
      </div>
    </div>
  );
}
