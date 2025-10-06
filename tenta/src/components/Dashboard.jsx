// File: src/components/Dashboard.jsx
import React from "react";
import { Box, VStack, Button, Text, Heading } from "@chakra-ui/react";

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  return (
    <Box bg="gray.800" p={6} borderRadius="xl" shadow="lg">
      <Heading size="lg" textAlign="center" mb={4} color="gold">
        Dashboard
      </Heading>

      <VStack spacing={3}>
        <Button colorScheme="yellow" w="full" onClick={onScan}>
          Escanear Producto
        </Button>

        <Button colorScheme="yellow" w="full" onClick={onOpenImporter}>
          Importar JSON
        </Button>

        <Button colorScheme="yellow" w="full" onClick={onOpenMerger}>
          Combinar Archivos Excel
        </Button>
      </VStack>

      <Text textAlign="center" mt={6} color="gold">
        Escrituras en Firebase: {firebaseWrites}
      </Text>
    </Box>
  );
}
