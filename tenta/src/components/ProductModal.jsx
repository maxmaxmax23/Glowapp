// File: src/components/ProductModal.jsx (PATCHED - Local Cache Priority)
import { useState, useEffect } from "react";
import { lookupLocalProduct } from "../utils/localIndex.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";
import AurumHeader from "./AurumHeader";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductModal({ product: initialProduct, onClose }) {
  const [product, setProduct] = useState(initialProduct);
  const [showUploader, setShowUploader] = useState(false);
  const [loading, setLoading] = useState(true);

  const productId = initialProduct?.id;

  useEffect(() => {
    if (product && product.price) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      if (!productId) {
        setProduct({ id: 'N/A', description: 'ID no proporcionado', notFound: true });
        setLoading(false);
        return;
      }

      setLoading(true);
      let productData = null;

      try {
        const localResults = await lookupLocalProduct(productId);
        if (localResults && localResults.length > 0) {
          productData = localResults[0];
          console.log(`Product ${productId} found in local cache.`);
        }
      } catch (localErr) {
        console.warn("Local cache lookup error, falling back to Firestore:", localErr);
      }

      if (!productData) {
        try {
          const docRef = doc(db, "products", productId);
          const snapshot = await getDoc(docRef);

          if (snapshot.exists()) {
            productData = { id: snapshot.id, ...snapshot.data() };
            console.log(`Product ${productId} fetched live from Firestore.`);
          }
        } catch (firestoreErr) {
          console.error("Error fetching product live from Firestore:", firestoreErr);
        }
      }

      if (productData) {
        setProduct(productData);
      } else {
        setProduct({ id: productId, notFound: true, description: "Producto No Encontrado" });
      }
      setLoading(false);

    };
    fetchProduct();
  }, [productId, initialProduct]);

  if (showUploader)
    return <ProductUploaderModal product={product} onClose={() => setShowUploader(false)} />;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="z-10 w-full max-w-2xl bg-backgroundDark900 border border-borderDark800 sm:border-b-0 border-b-0 sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header area - custom header specifically for the modal */}
          <div className="flex items-center justify-between p-6 border-b border-borderDark800">
            <div className="flex flex-col">
              <span className="aurum-subtitle mb-1">{product?.id || "N/A"}</span>
              <h2 className="aurum-title-stack line-clamp-2">
                {product ? product.description || "Producto" : "Cargando..."}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-backgroundDark950 border border-borderDark800 flex items-center justify-center text-textDark400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <svg className="animate-spin h-8 w-8 text-amber400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-textDark400 font-medium">Verificando base de datos...</p>
              </div>
            ) : product && product.notFound ? (
              <div className="py-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center text-center px-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500 mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-400 font-medium text-lg">Producto con código <span className="text-white font-bold">{productId}</span> no encontrado.</p>
              </div>
            ) : product ? (
              <div className="space-y-6">
                {product.photoURL ? (
                  <div className="w-full aspect-square md:aspect-[3/2] bg-backgroundDark950 rounded-2xl overflow-hidden border border-borderDark800 relative group">
                    <img
                      src={product.photoURL}
                      alt={product.description}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-sm font-medium text-white shadow-sm">Foto del Producto</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-backgroundDark950 rounded-2xl border border-dashed border-borderDark800 flex flex-col items-center justify-center text-textDark400 space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-50">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="text-sm">Sin imagen</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="aurum-card-inner space-y-1">
                    <span className="text-xs font-bold text-textDark400 uppercase tracking-wider">Código</span>
                    <p className="font-medium text-lg text-white">{productId}</p>
                  </div>
                  <div className="aurum-card-inner space-y-1">
                    <span className="text-xs font-bold text-textDark400 uppercase tracking-wider">Stock</span>
                    <p className="font-medium text-lg text-white">{product.stock ?? "N/A"}</p>
                  </div>
                  <div className="aurum-card-inner col-span-2 flex items-center justify-between border border-amber400/20 bg-amber400/5">
                    <span className="text-sm font-bold text-amber400 uppercase tracking-wider">Precio</span>
                    <p className="text-3xl font-light tracking-tight text-white">${product.price ?? "—"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-textDark400 py-10">
                Error al cargar datos.
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && product && (
            <div className="p-6 border-t border-borderDark800 bg-backgroundDark900 flex space-x-4">
              <button
                onClick={() => setShowUploader(true)}
                className="aurum-btn-secondary flex-1"
              >
                {product.photoURL ? "Cambiar Imagen" : "Subir Imagen"}
              </button>
              <button
                onClick={onClose}
                className="aurum-btn-primary flex-1 bg-white hover:bg-neutral-200"
              >
                Listo
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}