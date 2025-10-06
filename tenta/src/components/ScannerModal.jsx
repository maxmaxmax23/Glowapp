import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import ProductUploaderModal from "./ProductUploaderModal.jsx";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * ScannerModal.jsx
 * - Manual search + scanner toggle
 * - Looks up Firestore products by productId or barcode
 * - Shows multiple matches (scrollable)
 * - Opens ProductUploaderModal for selected match
 */

export default function ScannerModal({ onClose }) {
  const readerRef = useRef(null);
  const [manualSearch, setManualSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // 🔍 Search Firestore for matches by productId or barcodes[]
  const handleSearch = async (term) => {
    if (!term || term.trim() === "") {
      setMatches([]);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, "products"));
      const lowerTerm = term.toString().trim().toLowerCase();

      const results = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => {
          const productId = item.id?.toString().toLowerCase() || "";
          const barcodes = item.barcodes?.map((b) => b.toString().toLowerCase()) || [];
          const description = item.description?.toLowerCase() || "";

          const barcodeMatch = barcodes.some((b) => b.includes(lowerTerm));
          const productIdMatch = productId.includes(lowerTerm);
          const descMatch = description.includes(lowerTerm);

          return barcodeMatch || productIdMatch || descMatch;
        });

      setMatches(results);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  // 📷 Scanner setup
  useEffect(() => {
    if (!readerRef.current || !isScanning) return;

    const scanner = new Html5QrcodeScanner(readerRef.current.id, {
      qrbox: { width: 250, height: 250 },
      fps: 10,
      aspectRatio: 1,
      focusMode: "continuous",
    });

    scanner.render(
      (decodedText) => {
        setManualSearch(decodedText);
        handleSearch(decodedText);
        setIsScanning(false);
        scanner.clear();
      },
      (err) => console.warn(err)
    );

    return () => scanner.clear();
  }, [readerRef, scannerKey, isScanning]);

  const openProduct = (product) => setScanResult(product);

  const resetScanner = () => {
    setScanResult(null);
    setScannerKey((k) => k + 1);
    setIsScanning(false);
    setMatches([]);
    setManualSearch("");
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4 z-50">
      {!scanResult ? (
        <div className="w-full max-w-md flex flex-col gap-3 bg-gray-900 text-gold rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-2 text-center">
            Buscar / Escanear Producto
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={manualSearch}
              onChange={(e) => {
                setManualSearch(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Buscar por ID, código o descripción..."
              className="flex-1 p-2 rounded bg-black text-white border border-gold text-sm"
            />
            <button
              onClick={() => setIsScanning((prev) => !prev)}
              className="bg-gold text-black px-3 rounded text-sm font-semibold"
            >
              {isScanning ? "Detener" : "Escanear"}
            </button>
          </div>

          {isScanning && (
            <div
              key={scannerKey}
              ref={readerRef}
              id="reader"
              className="w-full h-64 bg-black border border-gold rounded-lg overflow-hidden mt-2"
            ></div>
          )}

          {matches.length > 0 && (
            <div className="overflow-y-auto max-h-64 mt-3 border border-gold rounded">
              {matches.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
                  onClick={() => openProduct(item)}
                >
                  <p className="text-sm font-bold text-gold">{item.id}</p>
                  <p className="text-xs text-gray-300">
                    Códigos: {item.barcodes?.join(", ")}
                  </p>
                  <p className="text-xs text-gray-400 italic truncate">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-3 bg-gray-700 text-gold py-2 rounded hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <ProductUploaderModal product={scanResult} onClose={resetScanner} />
      )}
    </div>
  );
}
