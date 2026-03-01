// File: src/components/ScannerModal.jsx (FINAL PATCH - Data Handoff and Flow Control)
import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import { lookupLocalProduct } from "../utils/localIndex";
import { motion, AnimatePresence } from "framer-motion";

export default function ScannerModal({ onClose, onSelectProduct }) {
  const readerRef = useRef(null);
  const [manualSearch, setManualSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [scannerKey, setScannerKey] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  const handleSearch = async (term) => {
    if (!term || term.trim() === "") {
      setMatches([]);
      return;
    }

    const queryKey = term.toString().trim();
    let results = [];

    // 1. Attempt local index lookup first (Fast Path)
    try {
      const localResults = await lookupLocalProduct(queryKey);
      if (localResults && localResults.length > 0) {
        setMatches(localResults);
        return;
      }
    } catch (e) {
      console.warn("Warning: Local index lookup failed. Continuing with no results.", e);
    }

    // 2. Local search failed.
    setMatches([]);
  };

  const handleLiveSearch = async () => {
    if (!manualSearch || manualSearch.trim() === "") return;

    setIsLiveSearching(true);
    const queryKey = manualSearch.toString().trim();
    const lowerTerm = queryKey.toLowerCase();

    // Firestore Fallback: This is the expensive step now behind an explicit button.
    try {
      const snapshot = await getDocs(collection(db, "products"));

      const results = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => {
          const productId = item.id?.toString().toLowerCase() || "";
          const barcodes = item.barcodes?.map((b) => b.toString().toLowerCase()) || [];
          const description = item.description?.toLowerCase() || "";

          return (
            productId.includes(lowerTerm) ||
            barcodes.some((b) => b.includes(lowerTerm)) ||
            description.includes(lowerTerm)
          );
        });

      setMatches(results);
    } catch (err) {
      console.error("P3 Search error (Firestore fallback):", err);
    } finally {
      setIsLiveSearching(false);
    }
  };


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

  const handleSelectProduct = (product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const resetScanner = () => {
    setScannerKey((k) => k + 1);
    setIsScanning(false);
    setMatches([]);
    setManualSearch("");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetScanner}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="z-10 w-full max-w-md bg-backgroundDark900 border border-borderDark800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-borderDark800 flex justify-between items-center bg-backgroundDark950">
            <h2 className="text-xl font-light text-textLight50">Buscar producto</h2>
            <button
              onClick={resetScanner}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-backgroundDark900 hover:bg-borderDark800 text-textDark400 hover:text-white transition-colors border border-borderDark800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">

            {/* Search Controls */}
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Buscar producto..."
                className="aurum-input flex-1"
                value={manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  handleSearch(e.target.value);
                }}
              />
              <button
                className={`px-4 rounded-xl font-medium transition-all duration-300 ${isScanning
                    ? "bg-red500 hover:bg-red-400 text-black shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    : "bg-backgroundDark950 border border-borderDark800 text-amber400 hover:bg-amber400/10"
                  }`}
                onClick={() => setIsScanning((prev) => !prev)}
              >
                {isScanning ? "Detener" : "Escanear"}
              </button>
            </div>

            {/* Live Search Fallback */}
            <button
              className="w-full text-xs font-semibold uppercase tracking-wider text-textDark400 hover:text-amber400 border border-borderDark800 rounded-xl py-3 flex items-center justify-center disabled:opacity-50 transition-colors bg-backgroundDark950 hover:border-amber400/30"
              onClick={handleLiveSearch}
              disabled={!manualSearch || isLiveSearching}
            >
              {isLiveSearching ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-amber400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Buscando en Vivo...</span>
                </span>
              ) : "Búsqueda en vivo (Admin)"}
            </button>

            {/* Scanner Box */}
            {isScanning && (
              <div
                className="w-full aspect-square bg-black rounded-2xl overflow-hidden border border-amber400/50 relative shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber400/20"
              >
                <div ref={readerRef} key={scannerKey} id="reader" className="w-full h-full object-cover"></div>
                {/* Decorative Scanner Overlay */}
                <div className="absolute inset-x-0 h-0.5 bg-amber400/50 shadow-[0_0_10px_rgba(251,191,36,1)] top-1/2 -translate-y-1/2 "></div>
              </div>
            )}

            {/* Results */}
            {matches.length > 0 && (
              <div className="space-y-2 pb-4">
                <h3 className="text-xs uppercase tracking-widest text-textDark400 font-bold mb-3">Resultados</h3>
                {matches.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectProduct(item)}
                    className="group flex flex-col justify-center p-4 rounded-xl bg-backgroundDark950 border border-borderDark800 hover:border-amber400/50 hover:bg-amber400/5 cursor-pointer transition-all duration-200"
                  >
                    <p className="text-amber400 font-bold mb-1 group-hover:text-amber-300 transition-colors">{item.id}</p>
                    <p className="text-sm text-textLight50 line-clamp-1">{item.description}</p>
                    <p className="text-xs text-textDark400 mt-2 truncate">Codes: {item.barcodes?.join(", ")}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {manualSearch && matches.length === 0 && !isLiveSearching && (
              <div className="py-12 flex flex-col justify-center items-center text-center space-y-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-textDark400 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-textDark400">No se encontraron productos en caché local.</p>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}