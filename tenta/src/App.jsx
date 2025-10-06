// INCREMENT: App.jsx Chakra UI Root Layout
// Type: UI Migration
// Scope: Root container layout using Chakra Flex
// Mode: Candidate (test before full integration)

import React, { useState } from "react";
import { Flex, Box } from "@chakra-ui/react"; // Chakra components
import LoginForm from "./components/LoginForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";

export default function App() {
  const [user, setUser] = useState(null); // keep existing auth flow
  const [scannedCode, setScannedCode] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);
  const [firebaseWrites, setFirebaseWrites] = useState(0);

  const incrementWrites = (count) => setFirebaseWrites((prev) => prev + count);

  // Called when scanner or manual selection returns a productId
  const handleScanSelect = (productId) => {
    if (!productId) return;
    setScannedCode(productId);
    setShowScanner(false);
  };

  return (
    <Flex
      direction="column"
      minH="100vh"
      w="100%"
      bg="black"
      color="gold"
      align="center"
      justify="center"
      p={4}
    >
      {!user ? (
        <LoginForm onLogin={setUser} />
      ) : scannedCode ? (
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
              onSelect={handleScanSelect}
            />
          )}

          {showImporter && (
            <ImporterModal
              onClose={() => setShowImporter(false)}
              incrementWrites={incrementWrites}
            />
          )}

          {showMerger && (
            <MergerModal onClose={() => setShowMerger(false)} addToQueue={() => {}} />
          )}
        </>
      )}
    </Flex>
  );
}
