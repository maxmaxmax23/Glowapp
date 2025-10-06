// INCREMENT: Dashboard.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Layout and buttons using Chakra
// Mode: Candidate (test in preview before integration)

import React from "react";
import { Flex, VStack, Button, Text, Box } from "@chakra-ui/react";

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  return (
    <Flex direction="column" w="full" maxW="lg" mx="auto" p={4} gap={4}>
      {/* Title */}
      <Text fontSize="2xl" fontWeight="bold" color="gold" textAlign="center" mb={4}>
        Dashboardd
      </Text>

      {/* Action Buttons */}
      <VStack spacing={3} w="full">
        <Button colorScheme="gold" w="full" onClick={onScan}>
          Escanear Producto
        </Button>

        <Button colorScheme="gold" w="full" onClick={onOpenImporter}>
          Importar JSON
        </Button>

        <Button colorScheme="gold" w="full" onClick={onOpenMerger}>
          Combinar Archivos Excel
        </Button>
      </VStack>

      {/* Firebase Writes */}
      <Box mt={6} w="full" textAlign="center">
        <Text color="gold">Escrituras en Firebase: {firebaseWrites}</Text>
      </Box>
    </Flex>
  );
}
