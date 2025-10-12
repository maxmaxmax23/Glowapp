// File: src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Box, VStack, Button, Text, Heading, Spinner } from "@chakra-ui/react";
import { loadIndexMetadata, syncProductsFromFirebase } from "../utils/localIndex"; // ADDITION: Import sync utilities

export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  // ADDITION: P2 State for sync status
  const [syncStatus, setSyncStatus] = useState({
    lastSync: 0,
    productCount: 0,
    missingPhotos: 0,
    isSyncing: false,
  });

  // ADDITION: Helper function to format the timestamp
  const formatLastSync = (timestamp) => {
    if (timestamp === 0) return "Nunca";
    const date = new Date(timestamp);
    // Use an appropriate locale for Spanish
    return date.toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ADDITION: P2 Sync Handler function
  const handleSyncProducts = async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      // The utility function syncs from Firestore to IndexedDB and returns the new metadata
      const newMetadata = await syncProductsFromFirebase();
      setSyncStatus({ ...newMetadata, isSyncing: false });
    } catch (error) {
      console.error("Error al sincronizar productos:", error);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  // ADDITION: P2 useEffect hook to load initial status
  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        const metadata = await loadIndexMetadata();
        // Load existing metadata from IndexedDB/localStorage on component mount
        setSyncStatus({ ...metadata, isSyncing: false });
      } catch (e) {
        // This warning is expected if IndexedDB isn't initialized yet
        console.warn("Could not load local index metadata.", e);
      }
    };
    loadInitialStatus();
  }, []);

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

        {/* ADDITION: P2 Sync Button and Status UI */}
        <Box w="full" pt={4} borderTop="1px solid" borderColor="gray.700">
          <Button
            colorScheme="green"
            w="full"
            onClick={handleSyncProducts}
            isDisabled={syncStatus.isSyncing}
            leftIcon={syncStatus.isSyncing ? <Spinner size="sm" /> : null}
          >
            {syncStatus.isSyncing ? "Sincronizando..." : "Sincronizar productos"}
          </Button>
          <VStack align="flex-start" mt={2} p={2} bg="gray.700" borderRadius="md" fontSize="sm">
            <Text color="whiteAlpha.800">
              **Indexados:** **{syncStatus.productCount}** productos
            </Text>
            <Text color="whiteAlpha.800">
              **Faltan Fotos:** **{syncStatus.missingPhotos}**
            </Text>
            <Text color="whiteAlpha.800">
              **Última Sincro:** {formatLastSync(syncStatus.lastSync)}
            </Text>
          </VStack>
        </Box>
        {/* END P2 ADDITION */}

      </VStack>

      <Text textAlign="center" mt={6} color="gold">
        Escrituras en Firebase: {firebaseWrites}
      </Text>
    </Box>
  );
}