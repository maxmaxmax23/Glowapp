import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

export default function ProductUploaderModal({ product, onClose }) {
  const [photoURL, setPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Safety check: don’t render if product not loaded yet
  if (!product) return null;

  // Load existing photo from Firestore on mount
  useEffect(() => {
    if (product.photoURL) {
      setPhotoURL(product.photoURL);
    } else {
      // Attempt to retrieve it directly from Storage (optional)
      const tryFetchExisting = async () => {
        try {
          const fileRef = ref(storage, `images/${product.id}.jpg`);
          const url = await getDownloadURL(fileRef);
          setPhotoURL(url);
        } catch {
          // no existing image found — silently ignore
        }
      };
      tryFetchExisting();
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
      setMessage("Camera not supported on this device.");
    }
  };

  //  Use consistent folder name — match your Firebase Storage rules ("images/")
  const uploadImage = async (file) => {
    try {
      setUploading(true);
      const fileRef = ref(storage, `images/${product.id}.jpg`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Update product document with new photoURL
      await updateDoc(doc(db, "products", product.id), { photoURL: url });

      setPhotoURL(url);
      setMessage("✅ Photo uploaded successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4 text-gold">
      <div className="w-full max-w-md bg-zinc-900 border border-gold rounded-xl p-4 text-center">
        <h2 className="text-xl font-bold mb-4">{product.description}</h2>

        {photoURL ? (
          <img
            src={photoURL}
            alt="Product"
            className="w-full h-48 object-cover rounded-lg mb-3"
          />
        ) : (
          <div className="w-full h-48 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
            No photo yet
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleTakePhoto}
            className="bg-gold text-black py-2 rounded hover:opacity-80"
            disabled={uploading}
          >
            📷 Take Photo
          </button>

          <label className="bg-gold text-black py-2 rounded hover:opacity-80 cursor-pointer">
            🖼️ Select File
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>

          {message && <p className="mt-2 text-sm">{message}</p>}

          <button
            onClick={onClose}
            className="mt-3 bg-transparent border border-gold py-2 rounded hover:bg-gold hover:text-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
