// INCREMENT: App.jsx Chakra UI Root Layout
// Type: UI Migration
// Scope: Root container, Flex layout, preserve existing logic
// Mode: Candidate (test before full integration)

import React from "react";
import { Flex, Box } from "@chakra-ui/react";
import ScannerModal from "./components/ScannerModal";
import ProductUploaderModal from "./components/ProductUploaderModal";
import "./App.css"; // Keep existing styles

function App() {
  // Existing state and logic untouched
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState(null);

  return (
    <Flex
      direction="column"
      minH="100vh"
      w="100%"
      bg="black"
      color="gold"
      align="center"
      justify="flex-start"
      p={4}
    >
      {/* Main App content */}
      <Box w="full" maxW="400px">
        {/* Your existing app content can stay here */}
        <button
          className="scanner-button"
          onClick={() => setScannerOpen(true)}
        >
          Open Scanner
        </button>
      </Box>

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        setSelectedProduct={setSelectedProduct}
      />

      {/* Product Uploader Modal */}
      {selectedProduct && (
        <ProductUploaderModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </Flex>
  );
}

export default App;
