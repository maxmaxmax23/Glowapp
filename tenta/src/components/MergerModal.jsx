// File: src/components/MergerModal.jsx (FINAL PATCH - Multi-Strategy Persistence)

import React, { useState } from "react";
// Import Storage and Firestore modules
import { doc, setDoc, Timestamp, writeBatch } from "firebase/firestore"; 
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase.js"; 
// Import the external parsing utility
import { processExcelFiles } from "../utils/mergeProcessor"; 
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
  Select,
} from "@chakra-ui/react";

const BATCH_SIZE = 500; 

export default function MergerModal({ onClose, addToQueue }) { 
  const [equivalenciasFile, setEquivalenciasFile] = useState(null);
  const [preciosFile, setPreciosFile] = useState(null);
  const [mergedData, setMergedData] = useState([]);
  const [stats, setStats] = useState({ written: 0, skipped: 0, outOfTime: 0, failed: 0 }); 
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false); 
  const [progress, setProgress] = useState(0); 
  // State to select the destination (Firestore collection or Storage file)
  const [targetCollection, setTargetCollection] = useState("products");

  // MODIFIED: handleMerge is simplified to just call the external utility
  const handleMerge = async () => {
    if (!equivalenciasFile || !preciosFile) {
      alert("Selecciona ambos archivos antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      // CRITICAL CHANGE: Offload processing logic to external pure function
      const result = await processExcelFiles(equivalenciasFile, preciosFile);

      setStats(result.stats); 
      setMergedData(result.mergedData);
    } catch (error) {
      console.error("Error al procesar archivos:", error);
      alert("Error procesando los archivos. Ver consola.");
    } finally {
      setLoading(false);
    }
  };


  const handlePersistData = async () => {
    if (mergedData.length === 0) return alert("No hay datos para persistir");

    // CRITICAL: Check both DB and STORAGE are available
    if (!db || typeof writeBatch !== 'function') {
        console.error("CRITICAL ERROR: Firestore not initialized.");
        alert("ERROR: No se pudo conectar con la base de datos.");
        setPersisting(false);
        return; 
    }
    // Check storage availability for Strategy B path
    if (targetCollection === "products_location_b" && !storage) {
        console.error("CRITICAL ERROR: Storage not initialized for Location B upload.");
        alert("ERROR: No se pudo conectar con el almacenamiento de archivos.");
        setPersisting(false);
        return; 
    }
    
    setPersisting(true); 
    setProgress(0);
    const totalItems = mergedData.length;
    let successfulWrites = 0;
    let failedWrites = 0;
    
    console.log(`Starting Upload to Collection: ${targetCollection}`);

    try {
        // STRATEGY A: PRINCIPAL (Firestore Batch Writes - High Cost/High Integrity)
        if (targetCollection === "products") {
            
            for (let i = 0; i < totalItems; i += BATCH_SIZE) {
                let batch = writeBatch(db);
                const chunk = mergedData.slice(i, i + BATCH_SIZE);
                
                for (const item of chunk) {
                    try { 
                        const productRef = doc(db, targetCollection, item.productId);
                        
                        batch.set(productRef, {
                            barcodes: item.barcodes.filter(b => b !== "Sin código"), 
                            price: item.price,
                            description: item.description, 
                            lastUpdated: Timestamp.now(), 
                            
                            lastKnownStock: item.lastKnownStock,
                            variants: item.variants,
                            provider: item.provider,
                            currentInventory: item.currentInventory,
                        }, { merge: true }); 
                        
                        successfulWrites++;
                    } catch (error) {
                        console.error(`Error al preparar batch para ${item.productId}:`, error);
                        failedWrites++;
                    }
                }

                try {
                    await batch.commit();
                } catch (error) {
                    console.error(`FATAL ERROR AL PERSISTIR BATCH ${i / BATCH_SIZE}:`, error);
                    failedWrites += chunk.length; 
                    successfulWrites -= chunk.length; 
                    break; 
                }
                
                const newProgress = ((i + BATCH_SIZE) / totalItems) * 100;
                setProgress(Math.min(newProgress, 100));
            }
            // If successful, successfulWrites holds the final count from the inner loop.

        // STRATEGY B: LOCATION B (Storage JSON File - Low Cost/Bulk Sync)
        } else {
            console.log("Modo: Location B (Storage JSON)");
            setProgress(30);

            // 1. Convert Data to JSON String
            const jsonString = JSON.stringify(mergedData);
            const blob = new Blob([jsonString], { type: "application/json" });

            // 2. Upload to Firebase Storage
            const storageRef = ref(storage, "indexes/location_b.json");
            await uploadBytes(storageRef, blob);
            
            // 3. Update Metadata in Firestore (Sync Flag)
            await setDoc(doc(db, "system", "metadata"), {
                locationB_lastUpdated: Timestamp.now(),
                locationB_count: mergedData.length
            }, { merge: true });

            // CRITICAL FIX: Set success count manually for the JSON path
            successfulWrites = mergedData.length; 
            setProgress(100);
        }

        // Finalize stats update based on successfulWrites from EITHER path
        setStats(prev => ({ 
            ...prev, 
            written: Math.max(0, successfulWrites), 
            failed: failedWrites,
        })); 
        
        alert(`Carga Completa en "${targetCollection === 'products' ? 'Principal' : 'Ubicación B'}".\n${Math.max(0, successfulWrites)} productos persistidos.`);

        // Cleanup
        setMergedData([]);
        setEquivalenciasFile(null);
        setPreciosFile(null);

    } catch (error) {
        console.error("Error persistiendo datos:", error);
        alert("Error al subir los datos. Revisa la consola para errores críticos.");
        
        // Ensure failed count is updated in the event of a catastrophic failure
        setStats(prev => ({ 
            ...prev, 
            failed: prev.failed + totalItems, 
            written: 0 
        }));
    } finally {
        setPersisting(false);
    }
  };

  const handleAddToQueue = () => { }; 


  return (
    <Modal isOpen onClose={onClose} size="xl" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="xl" p={4}>
        <ModalHeader>Fusionar Archivos Excel</ModalHeader>
        <ModalBody>
          <VStack spacing={3} mb={3} align="stretch">
            
            {/* Database Selector */}
            <Box mb={2}>
                <Text fontSize="sm" color="gray.400" mb={1}>Base de Datos Destino:</Text>
                <Select 
                    value={targetCollection}
                    onChange={(e) => setTargetCollection(e.target.value)}
                    bg="gray.800"
                    borderColor="gold"
                    color="white"
                    size="sm"
                >
                    <option value="products" style={{ color: 'black' }}>📍 Sucursal Principal (Firestore)</option>
                    <option value="products_location_b" style={{ color: 'black' }}>🏢 Sucursal B (JSON File)</option>
                </Select>
                {targetCollection === 'products_location_b' && (
                    <Text fontSize="xs" color="green.300" mt={1}>
                        ℹ️ Modo Optimizado: Se subirá un solo archivo JSON (Sin costo de escritura).
                    </Text>
                )}
            </Box>

            {/* File Inputs */}
            <input type="file" accept=".xlsx, .xls" onChange={(e) => setEquivalenciasFile(e.target.files[0])} />
            <Text fontSize="sm" color="gray.400">Archivo de Equivalencias</Text>

            <input type="file" accept=".xlsx, .xls" onChange={(e) => setPreciosFile(e.target.files[0])} />
            <Text fontSize="sm" color="gray.400">Archivo de Precios</Text>

            <Button
              colorScheme="gold"
              onClick={handleMerge}
              isLoading={loading}
              loadingText="Procesando..."
              isDisabled={persisting} 
            >
              Fusionar y Previsualizar
            </Button>

            <Button
              colorScheme="green"
              onClick={handlePersistData}
              isLoading={persisting}
              loadingText="Subiendo..."
              isDisabled={mergedData.length === 0 || loading || persisting}
            >
              Persistir Datos
            </Button>
          </VStack>
          
          {persisting && (
            <Box mb={4}>
              <Text fontSize="sm" color="gold" mb={1}>Progreso: {Math.round(progress)}%</Text>
              <Progress value={progress} size="sm" colorScheme="green" hasStripe isAnimated={progress < 100}/>
            </Box>
          )}

          <Box mb={3}>
            <Text fontSize="sm">
              ✅ **Items:** {stats.written} | ⚠️ **Ignorados:** {stats.skipped}
            </Text>
          </Box>
          
          {mergedData.length > 0 && (
            <TableContainer maxH="300px" overflowY="auto" border="1px" borderColor="gold" borderRadius="md">
              <Table variant="simple" size="sm">
                <Thead bg="gold" color="black" position="sticky" top={0}>
                  <Tr><Th>ID</Th><Th>Desc</Th><Th>Precio</Th></Tr>
                </Thead>
                <Tbody>
                  {mergedData.slice(0, 100).map((item, idx) => (
                    <Tr key={idx} borderBottom="1px" borderColor="gray.700">
                      <Td>{item.productId}</Td><Td>{item.description}</Td><Td>${Math.round(item.price)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" borderColor="gold" color="gold" _hover={{ bg: "gold", color: "black" }} onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
