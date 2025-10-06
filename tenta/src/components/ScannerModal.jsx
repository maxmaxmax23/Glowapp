// INCREMENT: ScannerModal.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Modal, layout, buttons, inputs, scrollable list
// Mode: Candidate (test preview before full integration)

import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import ProductUploaderModal from "./ProductUploaderModal.jsx";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import {
  Box,
  Flex,
  Input,
  Button,
  VStack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ScrollView,
} from "@chakra-ui/react";

export default function ScannerModal({ onClose }) {
  const readerRef = useRef(null);
  const [manualSearch, setManualSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [scanResult, setScanResult] = useState(null);
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

          const barcodeMatch = barcodes.some((b) => b.includes(lowerTerm));
          const productIdMatch = productId.includes(lowerTerm);
          const descMatch = description.includes(lowerTerm);

          return barcodeMatch || productIdMatch || descMatch;
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

  const openProduct = (product) => setScanResult(product);

  const resetScanner = () => {
    setScanResult(null);
    setScannerKey((k) => k + 1);
    setIsScanning(false);
    setMatches([]);
    setManualSearch("");
  };

  return (
    <Modal isOpen onClose={onClose} size="lg" isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="2xl" p={4}>
        {!scanResult ? (
          <>
            <ModalHeader textAlign="center">Buscar / Escanear Producto</ModalHeader>

            <ModalBody>
              <Flex gap={2} mb={3}>
                <Input
                  placeholder="Buscar por ID, código o descripción..."
                  value={manualSearch}
                  onChange={(e) => {
                    setManualSearch(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  bg="black"
                  color="white"
                  borderColor="gold"
                  size="sm"
                />
                <Button
                  onClick={() => setIsScanning((prev) => !prev)}
                  colorScheme="gold"
                  size="sm"
                >
                  {isScanning ? "Detener" : "Escanear"}
                </Button>
              </Flex>

              {isScanning && (
                <Box
                  key={scannerKey}
                  ref={readerRef}
                  id="reader"
                  w="full"
                  h="64"
                  bg="black"
                  borderWidth="1px"
                  borderColor="gold"
                  borderRadius="lg"
                  overflow="hidden"
                  mb={3}
                />
              )}

              {matches.length > 0 && (
                <Box maxH="64" overflowY="auto" borderWidth="1px" borderColor="gold" borderRadius="md" mb={3}>
                  <VStack spacing={1} align="stretch">
                    {matches.map((item, idx) => (
                      <Box
                        key={idx}
                        p={2}
                        borderBottomWidth={idx !== matches.length - 1 ? "1px" : 0}
                        borderBottomColor="gray.700"
                        _hover={{ bg: "gray.800", cursor: "pointer" }}
                        onClick={() => openProduct(item)}
                      >
                        <Text fontSize="sm" fontWeight="bold" color="gold">
                          {item.id}
                        </Text>
                        <Text fontSize="xs" color="gray.300">
                          Códigos: {item.barcodes?.join(", ")}
                        </Text>
                        <Text fontSize="xs" color="gray.400" fontStyle="italic" isTruncated>
                          {item.description}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
            </ModalBody>

            <ModalFooter justifyContent="center">
              <Button onClick={onClose} colorScheme="gray">
                Cerrar
              </Button>
            </ModalFooter>
          </>
        ) : (
          <ProductUploaderModal product={scanResult} onClose={resetScanner} />
        )}
      </ModalContent>
    </Modal>
  );
}
