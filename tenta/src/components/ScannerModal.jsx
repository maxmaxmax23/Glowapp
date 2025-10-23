// File: src/components/ScannerModal.jsx (REVISED PATCH)
import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import { lookupLocalProduct } from "../utils/localIndex"; // Import local search utility
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
  Spinner, // ADDITION: For loading indicator on live search
} from "@chakra-ui/react";

export default function ScannerModal({ onClose, onSelectProduct }) {
  const readerRef = useRef(null);
  const [manualSearch, setManualSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [scannerKey, setScannerKey] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveSearching, setIsLiveSearching] = useState(false); // ADDITION: State for the Admin Live Search

  /**
   * P1: Core Search Function - PRIORITIZES LOCAL CACHE ONLY.
   * NO AUTOMATIC FIREBASE FALLBACK TO SAVE COSTS.
   */
  const handleSearch = async (term) => {
    if (!term || term.trim() === "") {
      setMatches([]);
      return;
    }

    const queryKey = term.toString().trim();

    // 1. Attempt local index lookup first (Fast Path)
    try {
      const localResults = await lookupLocalProduct(queryKey);
      if (localResults && localResults.length > 0) {
        setMatches(localResults);
        return; // SUCCESS: Use local results and STOP here.
      }
    } catch (e) {
      console.warn("Warning: Local index lookup failed. Continuing with no results.", e);
    }
    
    // 2. Local search failed, but we DO NOT automatically fall back to Firestore.
    // The user must click the "Buscar en Vivo" button for a Firebase scan.
    setMatches([]);
  };
  
  /**
   * P2: ADMIN LIVE SEARCH - Executes the slow, costly Firestore scan.
   * This logic was previously an automatic fallback in handleSearch.
   */
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
      console.error("Live Search (Firestore) error:", err);
      // Optional: Show error state to the user
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
        handleSearch(decodedText); // Scanner uses the cost-free local search
        setIsScanning(false);
        scanner.clear();
      },
      (err) => console.warn(err)
    );

    return () => scanner.clear();
  }, [readerRef, scannerKey, isScanning]);

  const handleSelectProduct = (product) => {
    if (onSelectProduct) {
      onSelectProduct(product); // trigger App.jsx ProductModal
    }
    resetScanner();
  };

  const resetScanner = () => {
    setScannerKey((k) => k + 1);
    setIsScanning(false);
    setMatches([]);
    setManualSearch("");
    setIsLiveSearching(false); // Reset new state
    onClose(); // close the ScannerModal
  };

  return (
    <Modal isOpen onClose={onClose} size="md" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="xl" p={4}>
        <ModalHeader textAlign="center">Buscar / Escanear Producto</ModalHeader>
        <ModalBody>
          <VStack spacing={3} align="stretch">
            <HStack>
              {/* Manual Search Input */}
              <Input
                placeholder="Buscar (Local Index)..."
                value={manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  handleSearch(e.target.value); // Uses local-only search
                }}
                bg="black"
                color="white"
                size="sm"
              />
              {/* Scanner Toggle Button */}
              <Button
                colorScheme="gold"
                size="sm"
                onClick={() => setIsScanning((prev) => !prev)}
              >
                {isScanning ? "Detener" : "Escanear"}
              </Button>
            </HStack>
            
            {/* ADDITION: Admin Live Search Button (Costly Operation) */}
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
            {/* END ADDITION */}


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
            {/* ADDITION: Show status if no local matches were found */}
            {manualSearch && matches.length === 0 && !isLiveSearching && (
                 <Text color="gray.500" fontSize="sm" textAlign="center" mt={2}>
                    No se encontró un producto en el índice local.
                 </Text>
            )}
            {/* END ADDITION */}
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="center">
          <Button
            colorScheme="gray"
            variant="outline"
            onClick={onClose}
            _hover={{ bg: "gold", color: "black" }}
          >
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}