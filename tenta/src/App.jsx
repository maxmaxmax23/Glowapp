// File: src/App.jsx
import React, { useState } from "react";
import { ChakraProvider, Box, Center } from "@chakra-ui/react";
import Dashboard from "./components/Dashboard.jsx";
import ScannerModal from "./components/ScannerModal.jsx";
import ImporterModal from "./components/ImporterModal.jsx";
import MergerModal from "./components/MergerModal.jsx";
import ProductModal from "./components/ProductModal.jsx";

export default function App() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [mergerOpen, setMergerOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [firebaseWrites, setFirebaseWrites] = useState(0);
  const [scannedCode, setScannedCode] = useState(null);

  const addToQueue = (items) => setQueue((prev) => [...prev, ...items]);

  return (
    <ChakraProvider>
      <Center minH="100vh" p={4} bg="gray.900">
        <Box w={{ base: "full", md: "container.md" }}>
          <Dashboard
            onScan={() => setScannerOpen(true)}
            onOpenImporter={() => setImporterOpen(true)}
            onOpenMerger={() => setMergerOpen(true)}
            firebaseWrites={firebaseWrites}
          />
        </Box>
      </Center>

      {scannerOpen && <ScannerModal onClose={() => setScannerOpen(false)} setScannedCode={setScannedCode} />}
      {importerOpen && <ImporterModal queuedData={queue} onClose={() => setImporterOpen(false)} />}
      {mergerOpen && <MergerModal onClose={() => setMergerOpen(false)} addToQueue={addToQueue} />}
      {scannedCode && (
        <ProductModal
          code={scannedCode}
          onClose={() => setScannedCode(null)}
        />
      )}
    </ChakraProvider>
  );
}
