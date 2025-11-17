// File: src/components/Dashboard.jsx

import React, { useState, useEffect } from "react";
import { 
  Box, 
  VStack, 
  Button, 
  Text, 
  Heading, 
  useToast, 
  Spinner, 
  HStack,
  Icon // Ensure Icon is imported for the download icon
} from "@chakra-ui/react";
import { FiDownload } from 'react-icons/fi'; // Import a standard icon
// Import the new utility file
import { exportAllProducts } from "../utils/dataExporter"; 

// Dashboard component receives props to open other modals/screens
export default function Dashboard({ onScan, onOpenImporter, onOpenMerger, firebaseWrites }) {
  // State to track if data is currently being exported
  const [isExporting, setIsExporting] = useState(false); 
  
  // State for sync status (optional, depends on your existing logic)
  const [syncStatus, setSyncStatus] = useState("Sincronizado"); 
  const toast = useToast(); 

  // --- Export Handler Function ---
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const count = await exportAllProducts();
      
      if (count > 0) {
        toast({
          title: "Exportación Exitosa",
          description: ${count} productos guardados como CSV.,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Fallo en la Exportación",
        description: "Revisa la consola para errores de base de datos.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // --- Mock Sync Status Effect (Adjust based on your real-world sync logic) ---
  useEffect(() => {
    if (firebaseWrites > 0) {
      setSyncStatus(Pendiente: ${firebaseWrites} cambios);
    } else {
      setSyncStatus("Sincronizado");
    }
  }, [firebaseWrites]);
  // ------------------------------------------------------------------------

  return (
    <Box bg="gray.800" p={6} borderRadius="xl" shadow="lg" minW="300px">
      <Heading size="lg" textAlign="center" mb={6} color="gold">
        GLOWAPP Control Panel
      </Heading>

      <VStack spacing={4} align="stretch">
        
        {/* Core Operations */}
        <Button colorScheme="yellow" w="full" onClick={onScan}>
          Escanear Producto
        </Button>

        <Button colorScheme="yellow" w="full" onClick={onOpenImporter}>
          Importar JSON
        </Button>

        <Button colorScheme="yellow" w="full" onClick={onOpenMerger}>
          Combinar Archivos Excel (Bulk Update)
        </Button>
        
        {/* New Export Button */}
        <Button 
          colorScheme="blue" 
          w="full" 
          onClick={handleExport}
          isDisabled={isExporting}
          leftIcon={isExporting ? <Spinner size="sm" /> : <Icon as={FiDownload} />} 
        >
          {isExporting ? "Exportando..." : "Exportar Inventario a CSV"}
        </Button>
        {/* End Export Button */}
        
        {/* System Status Display */}
        <HStack justifyContent="space-between" pt={4} borderTop="1px" borderColor="gray.700">
          <Text fontSize="sm" color="gray.400">Estado de Sincronización:</Text>
          <Text 
            fontSize="sm" 
            fontWeight="bold" 
            color={syncStatus.startsWith("Sincronizado") ? "green.300" : "red.400"}
          >
            {syncStatus}
          </Text>
        </HStack>

      </VStack>
    </Box>
  );
}
