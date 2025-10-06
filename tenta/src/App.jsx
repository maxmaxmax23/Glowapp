// File: src/App.jsx
import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import LoginForm from "./components/LoginForm.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";

export default function App() {
  const [user, setUser] = useState(null);
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
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"  // vertically center content
      alignItems="center"      // horizontally center content
      px={{ base: 4, md: 8 }}
      py={{ base: 4, md: 8 }}
      bg="gray.900"
      color="gold"
      w="full"
      maxW="600px"             // constrain max width
      mx="auto"                // horizontally center
      minH="100vh"             // allow full height scroll
    >
      {!user ? (
        <LoginForm onLogin={setUser} />
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
              queuedData={[]} // pass your queued data here
            />
          )}

          {showMerger && (
            <MergerModal
              onClose={() => setShowMerger(false)}
              addToQueue={() => {}}
            />
          )}

          {scannedCode && (
            <ProductModal
              code={scannedCode}
              onClose={() => setScannedCode(null)}
            />
          )}
        </>
      )}
    </Box>
  );
}
