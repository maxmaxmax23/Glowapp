// File: src/components/ScannerModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
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
} from "@chakra-ui/react";

export default function ScannerModal({ onClose, onSelectProduct }) {
  const readerRef = useRef(null);
  const [manualSearch, setManualSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [scannerKey, setScannerKey] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const handleSearch = async (term) => {
    if (!term || term.trim() === "") {
      setMatches([]);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, "products"));
      const lowerTerm = term.toString().trim().toLowerCase();

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
      console.error("Search error:", err);
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

  const handleSelectProduct = (product) => {
    if (onSelectProduct) {
      onSelectProduct(product.id); // trigger App.jsx ProductModal
    }
    resetScanner();
  };

  const resetScanner = () => {
    setScannerKey((k) => k + 1);
    setIsScanning(false);
    setMatches([]);
    setManualSearch("");
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
              <Input
                placeholder="Buscar por ID, código o descripción..."
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
