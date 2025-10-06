// INCREMENT: ImporterModal.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Modal layout, buttons, progress
// Mode: Candidate (test preview before full integration)

import React, { useState } from "react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import PropTypes from "prop-types";
import {
  Box,
  VStack,
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
} from "@chakra-ui/react";

export default function ImporterModal({ queuedData, onClose }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ total: 0, written: 0 });

  const sanitizeId = (id) => {
    if (!id) return "unknown";
    return id.toString().replace(/[^a-zA-Z0-9]/g, "");
  };

  const handleImport = async () => {
    if (!queuedData || queuedData.length === 0) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      let writtenCount = 0;

      queuedData.forEach((item) => {
        const safeId = sanitizeId(item.productId);
        const docRef = doc(collection(db, "products"), safeId);

        batch.set(docRef, {
          description: item.description,
          barcodes: item.barcodes,
          price: item.price,
          vigencia: item.vigencia,
        });

        writtenCount++;
      });

      await batch.commit();
      setProgress({ total: queuedData.length, written: writtenCount });
      alert(`✅ Import completed. Written ${writtenCount} items.`);
    } catch (err) {
      console.error("Error importing products:", err);
      alert(`Error importing products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} isCentered size="md" motionPreset="scale">
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="xl" p={4}>
        <ModalHeader textAlign="center">Importar Productos</ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <Button
              colorScheme="gold"
              w="full"
              onClick={handleImport}
              isLoading={loading}
            >
              {loading ? "Importando..." : "Importar datos a Firebase"}
            </Button>

            {progress.total > 0 && (
              <Box w="full">
                <Progress
                  value={(progress.written / progress.total) * 100}
                  colorScheme="gold"
                  size="sm"
                  mb={2}
                />
                <Text fontSize="sm" textAlign="center">
                  Escritos: {progress.written} / {progress.total}
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent="center">
          <Button
            onClick={onClose}
            variant="outline"
            color="gold"
            borderColor="gold"
            _hover={{ bg: "gold", color: "black" }}
          >
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

ImporterModal.propTypes = {
  queuedData: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};
