// File: src/App.jsx (FINAL PATCH - Full Product Object Management & Flow Control)
import React, { useState } from "react";
import LoginForm from "./components/LoginForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showScanner, setShowScanner] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);
  const [firebaseWrites, setFirebaseWrites] = useState(0);

  const incrementWrites = (count) => setFirebaseWrites((prev) => prev + count);

  const handleProductSelect = (productObject) => {
    if (productObject && productObject.id) {
      setSelectedProduct(productObject);
    } else {
      console.error("Product selected without valid ID. State remains unchanged.");
    }
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-black text-textLight50 flex items-center justify-center font-sans antialiased text-rendering-optimizeLegibility selection:bg-amber-400 selection:text-black">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">

        {/* Subtle radial gradient to create depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-neutral-900/60 via-black to-black"></div>

        {/* Amber glow effects */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-1/4 w-[800px] h-[800px] bg-amber-400/5 rounded-full blur-[150px] mix-blend-screen"></div>

        {/* Optional noise texture (requires a generic noise.png or CSS noise) */}
        {/* <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url('/noise.png')", backgroundRepeat: "repeat" }}></div> */}
      </div>

      {!user ? (
        <LoginForm onLogin={setUser} />
      ) : selectedProduct ? (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      ) : (
        <>
          <Dashboard
            onScan={() => setShowScanner(true)}
            onOpenImporter={() => setShowImporter(true)}
            onOpenMerger={() => setShowMerger(true)}
            firebaseWrites={firebaseWrites}
          />

          {showScanner && (
            <ScannerModal
              onClose={() => setShowScanner(false)}
              onSelectProduct={handleProductSelect}
            />
          )}

          {showImporter && (
            <ImporterModal
              onClose={() => setShowImporter(false)}
              queuedData={[]}
            />
          )}

          {showMerger && (
            <MergerModal onClose={() => setShowMerger(false)} addToQueue={() => { }} />
          )}
        </>
      )}
    </div>
  );
}