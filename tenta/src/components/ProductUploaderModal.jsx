// File: src/components/ProductUploaderModal.jsx (FINAL PATCH - Robust ID Check)
import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { updateLocalProduct } from "../utils/localIndex";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductUploaderModal({ product, onClose }) {
  const [photoURL, setPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  if (!product) return null;

  useEffect(() => {
    if (product.photoURL) {
      setPhotoURL(product.photoURL);
    } else {
      const tryFetchExisting = async () => {
        try {
          const fileRef = ref(storage, `images/${product.id}.jpg`);
          const url = await getDownloadURL(fileRef);
          setPhotoURL(url);
        } catch {
          // silently ignore
        }
      };
      if (product.id) {
        tryFetchExisting();
      }
    }
  }, [product]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await uploadImage(file);
  };

  const handleTakePhoto = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) await uploadImage(file);
      };
      input.click();
    } catch (err) {
      console.error("Camera error:", err);
      setMessage("❌ Cámara no soportada en este dispositivo.");
    }
  };

  const uploadImage = async (file) => {
    if (!product || !product.id || typeof product.id !== 'string' || product.id.length < 1) {
      console.error("Upload Error: Product prop is null or ID is invalid during upload attempt.");
      setMessage("❌ ERROR: El producto debe ser guardado y tener un ID válido antes de subir la foto.");
      setUploading(false);
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const fileRef = ref(storage, `images/${product.id}.jpg`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const updateData = {
        photoURL: url,
        lastUpdated: Timestamp.now()
      };

      await updateDoc(doc(db, "products", product.id), updateData);

      await updateLocalProduct({
        id: product.id,
        photoURL: url,
        lastUpdated: Date.now()
      });

      setPhotoURL(url);
      setMessage("✅ Foto subida exitosamente y caché actualizada.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Falló la subida de la foto. Revisa la consola/reglas de Firebase.");
    } finally {
      setUploading(false);
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
          onClick={!uploading ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="z-10 w-full max-w-sm bg-backgroundDark900 border border-borderDark800 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col relative"
        >
          {/* Subtle top glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber400/30 to-transparent"></div>

          {/* Header */}
          <div className="p-6 pb-4 border-b border-borderDark800 flex justify-between items-center bg-backgroundDark950/50 backdrop-blur-sm z-10 relative">
            <h2 className="text-xl font-light text-textLight50 tracking-tight">Gestionar Imagen</h2>
            <button
              onClick={onClose}
              disabled={uploading}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-backgroundDark900 hover:bg-borderDark800 text-textDark400 hover:text-white transition-all duration-300 border border-borderDark800 hover:border-textDark400/50 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">

            {/* Product Info */}
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-amber400 truncate px-4">{product.id}</p>
              <h3 className="text-base font-light text-textLight50 line-clamp-2 leading-snug">{product.description}</h3>
            </div>

            {/* Photo Preview Container */}
            <div className="relative group rounded-2xl overflow-hidden border border-borderDark800 bg-backgroundDark950 aspect-square shadow-inner flex items-center justify-center transition-all duration-300 hover:border-amber400/30">
              {uploading && (
                <div className="absolute inset-0 z-20 bg-backgroundDark900/80 backdrop-blur-sm flex items-center justify-center flex-col gap-3">
                  <svg className="animate-spin h-8 w-8 text-amber400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-xs font-medium text-amber400 tracking-wider uppercase">Subiendo...</p>
                </div>
              )}

              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Producto"
                  className={`w-full h-full object-cover transition-all duration-500 ${uploading ? 'scale-105 blur-sm opacity-50' : 'group-hover:scale-105'}`}
                />
              ) : (
                <div className="text-center p-6 flex flex-col items-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-textDark400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm font-medium text-textDark400">Sin foto</p>
                </div>
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-xl border text-sm font-medium flex items-start gap-2 ${message.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                <span>{message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTakePhoto}
                disabled={uploading}
                className="flex flex-col items-center justify-center p-4 bg-backgroundDark950 border border-borderDark800 rounded-2xl hover:bg-amber400/5 hover:border-amber400/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-10 h-10 rounded-full bg-backgroundDark900 border border-borderDark800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-textLight50 uppercase tracking-widest">Cámara</span>
              </button>

              <label className={`flex flex-col items-center justify-center p-4 bg-backgroundDark950 border border-borderDark800 rounded-2xl transition-all duration-300 group ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-800/30 hover:border-textDark400'}`}>
                <div className="w-10 h-10 rounded-full bg-backgroundDark900 border border-borderDark800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-textLight50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-textLight50 uppercase tracking-widest">Galería</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}