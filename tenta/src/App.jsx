// File: src/App.jsx
import React, { useState } from "react";
import LoginForm from "./components/LoginForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";

/*
  Layout change:
  - use flex-col so the app behaves like a native mobile app (scrollable main area)
  - no vertical centering (avoids "zoomed in / top snapped" look)
*/

export default function App() {
  const [user, setUser] = useState(null);
  const [scannedCode, setScannedCode] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);
  const [firebaseWrites, setFirebaseWrites] = useState(0);

  const incrementWrites = (count) => setFirebaseWrites((prev) => prev + count);

  // Called by ScannerModal when user selects a product
  const handleScanSelect = (productId) => {
    if (!productId) return;
    setScannedCode(productId);
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-black text-gold flex flex-col">
      {/* Header area (optional in the future) */}
      <main className="flex-1 overflow-auto p-3">
        {!user ? (
          <LoginForm onLogin={setUser} />
        ) : scannedCode ? (
          // ProductModal will be mounted only when scannedCode is set
          <ProductModal code={scannedCode} onClose={() => setScannedCode(null)} />
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
                onSelectProduct={handleScanSelect}
              />
            )}

            {showImporter && (
              <ImporterModal
                onClose={() => setShowImporter(false)}
                queuedData={[]}
              />
            )}

            {showMerger && (
              <MergerModal onClose={() => setShowMerger(false)} addToQueue={() => {}} />
            )}
          </>
        )}
      </main>
      {/* optional footer / safe-area spacer */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </div>
  );
}
