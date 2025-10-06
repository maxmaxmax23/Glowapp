// File: src/App.jsx
import { useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";

export default function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [queue, setQueue] = useState([]);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);

  const handleScanOpen = () => setShowScanner(true);
  const handleImporterOpen = () => setShowImporter(true);
  const handleMergerOpen = () => setShowMerger(true);

  const addToQueue = (items) => setQueue((prev) => [...prev, ...items]);

  const handleSelectProduct = (product) => {
    setScannedCode(product.id);
    setShowScanner(false);
  };

  // --- RETURN ---
  return (
    <>
      <Dashboard
        onScan={handleScanOpen}
        onOpenImporter={handleImporterOpen}
        onOpenMerger={handleMergerOpen}
        firebaseWrites={queue.length}
      />

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {scannedCode && (
        <ProductModal
          code={scannedCode}
          onClose={() => setScannedCode(null)}
        />
      )}

      {showImporter && (
        <ImporterModal queuedData={queue} onClose={() => setShowImporter(false)} />
      )}

      {showMerger && (
        <MergerModal addToQueue={addToQueue} onClose={() => setShowMerger(false)} />
      )}
    </>
  );
}
