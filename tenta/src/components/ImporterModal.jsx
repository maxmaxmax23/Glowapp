// File: src/components/ImporterModal.jsx
import React, { useState } from "react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import PropTypes from "prop-types";
import {
  Box,
  VStack,
  Text,
  Button,
  Progress,
  CloseButton,
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
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.900"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={4}
      zIndex={50}
      overflowY="auto"
    >
      <Box
        maxW="md"
        w="full"
        bg="gray.900"
        color="gold"
        borderRadius="xl"
        p={4}
        textAlign="center"
      >
        <VStack spacing={3}>
          <Text fontSize="xl" fontWeight="bold">
            Importar Productos
          </Text>

          <Button
            onClick={handleImport}
            colorScheme="gold"
            w="full"
            isLoading={loading}
            loadingText="Importando..."
          >
            Importar datos a Firebase
          </Button>

          {progress.total > 0 && (
            <Box w="full">
              <Text fontSize="sm" mb={1}>
                Escritos: {progress.written} / {progress.total}
              </Text>
              <Progress
                value={(progress.written / progress.total) * 100}
                size="sm"
                colorScheme="gold"
                borderRadius="md"
              />
            </Box>
          )}

          <Button
            onClick={onClose}
            variant="outline"
            borderColor="gold"
            color="gold"
            _hover={{ bg: "gold", color: "black" }}
            w="full"
          >
            Cerrar
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}

ImporterModal.propTypes = {
  queuedData: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};
