// File: src/components/ScannerModal.jsx (FINAL PATCH - Data Handoff and Flow Control)
import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import { lookupLocalProduct } from "../utils/localIndex"; 
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  VStack,
  HStack,
  Box,
  Text,
  Spinner,
} from "@chakra-ui/react";

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

  // MODIFICATION: This function now passes the full product OBJECT
  const handleSelectProduct = (product) => {
    if (onSelectProduct) {
      // Pass the full product object to the parent (App.jsx)
      onSelectProduct(product); 
      // CRITICAL FIX: DO NOT call resetScanner() or onClose() here.
      // App.jsx will handle closing the scanner and opening the product modal.
    }
    // resetScanner(); // <--- REMOVED TO PREVENT RACE CONDITION
  };

  const resetScanner = () => {
    setScannerKey((k) => k + 1);
    setIsScanning(false);
    setMatches([]);
    setManualSearch("");
    onClose(); // This is only called when the user manually clicks "Cerrar"
  };

  return (
    <Modal isOpen onClose={resetScanner} size="md" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="xl" p={4}>
        <ModalHeader textAlign="center">Buscar / Escanear Producto</ModalHeader>
        <ModalBody>
          <VStack spacing={3} align="stretch">
            <HStack>
              <Input
                placeholder="Buscar (Local Index)..."
                value={manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  handleSearch(e.target.value); 
                }}
                bg="black"
                color="white"
                size="sm"
              />
              <Button
                colorScheme="gold"
                size="sm"
                onClick={() => setIsScanning((prev) => !prev)}
              >
                {isScanning ? "Detener" : "Escanear"}
              </Button>
            </HStack>

            <Button
              colorScheme="red"
              variant="outline"
              w="full"
              size="xs"
              onClick={handleLiveSearch}
              isDisabled={!manualSearch || isLiveSearching}
              leftIcon={isLiveSearching ? <Spinner size="xs" /> : null}
            >
              {isLiveSearching ? "Buscando en Vivo..." : "Buscar en Vivo (Solo Admin)"}
            </Button>


            {isScanning && (
              <Box
                ref={readerRef}
                key={scannerKey}
                id="reader"
                w="full"
                h="64"
                border="2px"
                borderColor="gold"
                borderRadius="lg"
                overflow="hidden"
              />
            )}

            {matches.length > 0 && (
              <Box maxH="64" overflowY="auto" border="1px" borderColor="gold" borderRadius="md">
                <VStack spacing={1} align="stretch">
                  {matches.map((item, idx) => (
                    <Box
                      key={idx}
                      p={2}
                      borderBottom="1px"
                      borderColor="gray.700"
                      _hover={{ bg: "gray.800", cursor: "pointer" }}
                      // Calls the modified handler to pass the full product object
                      onClick={() => handleSelectProduct(item)} 
                    >
                      <Text fontWeight="bold" color="gold" fontSize="sm">
                        {item.id}
                      </Text>
                      <Text fontSize="xs" color="gray.300">
                        Códigos: {item.barcodes?.join(", ")}
                      </Text>
                      <Text fontSize="xs" color="gray.400" isTruncated>
                        {item.description}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
            {manualSearch && matches.length === 0 && !isLiveSearching && (
                 <Text color="gray.500" fontSize="sm" textAlign="center" mt={2}>
                    No se encontró un producto en el índice local.
                 </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="center">
          <Button
            colorScheme="gray"
            variant="outline"
            onClick={resetScanner} // User-initiated close calls resetScanner
            _hover={{ bg: "gold", color: "black" }}
          >
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}