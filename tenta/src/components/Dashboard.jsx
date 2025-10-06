// File: src/components/Dashboard.jsx
import React from "react";
import { VStack, Button, Text, Box } from "@chakra-ui/react";

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  return (
    <Box
      p={4}
      maxW="lg"
      mx="auto"
      w="full"
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <Text fontSize="2xl" fontWeight="bold" textAlign="center" fontFamily="'Distrampler', serif">
        Dashboard
      </Text>

      <VStack spacing={3} align="stretch">
        <Button variant="primary" onClick={onScan}>
          Escanear Producto
        </Button>

        <Button variant="primary" onClick={onOpenImporter}>
          Importar JSON
        </Button>

        <Button variant="primary" onClick={onOpenMerger}>
          Combinar Archivos Excel
        </Button>
      </VStack>

      <Text mt={6} textAlign="center">
        Escrituras en Firebase: {firebaseWrites}
      </Text>
    </Box>
  );
}
