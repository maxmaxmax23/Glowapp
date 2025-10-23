// File: src/App.jsx (PATCHED - Full Product Object Management)
import React, { useState } from "react";
import LoginForm from "./components/LoginForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  // MODIFICATION: Renamed state to hold the full product OBJECT, not just the code/ID string.
  const [selectedProduct, setSelectedProduct] = useState(null); 
  
  const [showScanner, setShowScanner] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);
  const [firebaseWrites, setFirebaseWrites] = useState(0);

  const incrementWrites = (count) => setFirebaseWrites((prev) => prev + count);

  // ADDITION: New handler to process the full product result from the Scanner
  const handleProductSelect = (productObject) => {
    // 1. Ensure the product is a valid object with an ID before setting state
    if (productObject && productObject.id) {
        setSelectedProduct(productObject);
    } else {
        // Handle case where product is found but data is malformed
        console.error("Attempted to select product with invalid data:", productObject);
        alert("Error al cargar producto: ID no válido.");
    }
    setShowScanner(false); // Close the scanner modal
  };

  return (
    <div className="min-h-screen bg-black text-gold flex items-center justify-center">
      {!user ? (
        <LoginForm onLogin={setUser} />
      ) : selectedProduct ? (
        // MODIFICATION: Pass the full object down to the ProductModal
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
              // NOTE: ScannerModal.jsx will need to be patched to pass the FULL product OBJECT, not just the ID.
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
    </div>
  );
}