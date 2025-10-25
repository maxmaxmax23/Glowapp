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
  // MODIFICATION: Holds the full product OBJECT.
  const [selectedProduct, setSelectedProduct] = useState(null); 
  
  const [showScanner, setShowScanner] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);
  const [firebaseWrites, setFirebaseWrites] = useState(0);

  const incrementWrites = (count) => setFirebaseWrites((prev) => prev + count);

  // ADDITION: New handler to process the full product result from the Scanner
  const handleProductSelect = (productObject) => {
    // 1. Set the product object state
    if (productObject && productObject.id) {
        setSelectedProduct(productObject);
    } else {
        console.error("Product selected without valid ID. State remains unchanged.");
        // We do not alert the user here, we just fail silently and close the scanner.
    }
    // 2. CRITICAL FIX: App.jsx is now responsible for closing the ScannerModal
    setShowScanner(false); 
  };

  return (
    <div className="min-h-screen bg-black text-gold flex items-center justify-center">
      {!user ? (
        <LoginForm onLogin={setUser} />
      ) : selectedProduct ? (
        // MODIFICATION: Pass the full product object down to the ProductModal
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
              // MODIFICATION: Now uses the new handler to manage the product object
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
            // NOTE: The addToQueue prop has been deprecated by the patch in MergerModal.jsx
            <MergerModal onClose={() => setShowMerger(false)} addToQueue={() => {}} /> 
          )}
        </>
      )}
    </div>
  );
}