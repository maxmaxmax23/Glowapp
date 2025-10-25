// File: src/components/MergerModal.jsx (FINAL PATCH - Aggressive Conflict Resolution and Batch Writes)

import React, { useState } from "react";
import * as XLSX from "xlsx";
// ADDITION: Import all necessary Firestore utilities
import { doc, setDoc, Timestamp, writeBatch } from "firebase/firestore"; 
import { db } from "../firebase.js"; 
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

  const parseExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  };

  const handleMerge = async () => {
    if (!equivalenciasFile || !preciosFile) {
      alert("Selecciona ambos archivos antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      const [eqRows, prRows] = await Promise.all([
        parseExcel(equivalenciasFile),
        parseExcel(preciosFile),
      ]);

      const rawEqData = eqRows.slice(1);
      const rawPrData = prRows.slice(1);

      // --- STEP 1: Build Conflict Superset and Barcode Map ---
      const eqMap = new Map();
      const barcodeSuperset = new Set(); // Stores ALL unique barcodes

      rawEqData.forEach((row) => {
        const barcode = row[0]?.toString().trim();
        const productId = row[1]?.toString().trim();
        const description = row[2]?.toString().trim();
        
        if (barcode && productId) {
          // 1. Check #1: Self-Referential Skip (Barcode === Product ID)
          if (barcode === productId) {
             return; // Skip this redundant alias
          }

          // 2. Add non-redundant barcode to the superset for cross-file conflict checking
          barcodeSuperset.add(barcode); 
          
          // 3. Original mapping logic
          if (!eqMap.has(productId)) eqMap.set(productId, { barcodes: new Set(), description });
          eqMap.get(productId).barcodes.add(barcode);
        }
      });
      // --- END STEP 1 ---
      

      let written = 0;
      let skipped = 0; 
      let outOfTime = 0;
      const merged = [];
      const now = new Date();
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

      // --- STEP 2: Filter Obsolete IDs from Precios File (Aggressive Conflict Check) ---
      let prData = []; 
      let conflictCount = 0;
      
      // Filter out price rows whose ID is found as a Barcode in the Equivalencias file
      rawPrData.forEach(row => {
          const productId = row[0]?.toString().trim();
          
          // CRITICAL CONFLICT CHECK: If the Product ID in the Precios file is found as a BARCODE, 
          // it means this Price Row is obsolete and must be skipped to preserve accurate price data.
          if (productId && barcodeSuperset.has(productId)) {
              conflictCount++; 
              return; // SKIP the conflicting price row
          }
          prData.push(row); // Keep the row if no conflict
      });
      
      // Update skipped count with conflicts
      skipped += conflictCount;
      // --- END STEP 2 ---


      // --- STEP 3: Process Filtered Data and Finalize Merged Array ---
      prData.forEach((row) => { // Now iterating over the conflict-free price data
        let rawProductId = row[0]?.toString().trim(); 
        const description = row[1]?.toString().trim();
        const vigenciaRaw = row[4];
        const priceRaw = row[5];
        
        // Validation check for fundamental errors (not conflict-related)
        if (!rawProductId || !vigenciaRaw || !priceRaw) {
          skipped++; 
          return;
        }

        // Apply ID sanitization 
        let productId = rawProductId;
        if (productId) {
            // FIX: Replace forward slashes (Firestore delimiter) with dashes
            productId = productId.replace(/\//g, '-'); 
        }

        let vigencia;
        try {
          if (typeof vigenciaRaw === "number") {
            const date = XLSX.SSF.parse_date_code(vigenciaRaw);
            vigencia = new Date(date.y, date.m - 1, date.d);
          } else {
            const parts = vigenciaRaw.split(/[\/\-]/);
            if (parts.length === 3) {
              const [d, m, y] = parts.map((p) => parseInt(p, 10));
              vigencia = new Date(2000 + (y % 100), m - 1, d);
            }
          }
        } catch {
          skipped++; 
          return;
        }

        if (vigencia < twelveMonthsAgo) {
          outOfTime++;
          return;
        }

        let price = parseFloat(priceRaw.toString().replace(/\./g, "").replace(",", "."));
        if (isNaN(price)) {
          skipped++; 
          return;
        }

        // Barcode lookup MUST still use the RAW ID from the Precios file
        const eqMatch = eqMap.get(rawProductId); 
        const barcodes = eqMatch ? Array.from(eqMap.get(rawProductId).barcodes) : ["Sin código"];

        merged.push({
          productId: productId, 
          description: description || eqMatch?.description || "Sin descripción",
          barcodes,
          price,
          vigencia: vigencia.toLocaleDateString("es-AR"),
        });
        written++;
      });
      
      setStats({ written, skipped, outOfTime, failed: 0 }); 
      setMergedData(merged);
    } catch (error) {
      console.error("Error al procesar archivos:", error);
      alert("Error procesando los archivos. Ver consola.");
    } finally {
      setLoading(false);
    }
  };


  const handlePersistData = async () => {
    if (mergedData.length === 0) return alert("No hay datos para persistir");

    if (!db || typeof writeBatch !== 'function') {
        console.error("CRITICAL ERROR: Firebase/Firestore is not initialized or imported correctly. Check src/firebase.js.");
        alert("ERROR: No se pudo conectar con la base de datos. Verifica la consola.");
        setPersisting(false);
        return; 
    }
    
    setPersisting(true); 
    setProgress(0);
    const totalItems = mergedData.length;
    let successfulWrites = 0;
    let failedWrites = 0;
    
    for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        let batch = writeBatch(db);
        const chunk = mergedData.slice(i, i + BATCH_SIZE);
        
        // 1. Fill the batch
        for (const item of chunk) {
            try { 
                const productRef = doc(db, "products", item.productId);
                
                // FINAL PAYLOAD: setDoc with merge: true for reliability
                batch.set(productRef, {
                    barcodes: item.barcodes.filter(b => b !== "Sin código"), 
                    price: item.price,
                    description: item.description, // ESSENTIAL for data integrity
                    lastUpdated: Timestamp.now(), 
                }, { merge: true }); 
                
                successfulWrites++;
            } catch (error) {
                console.error(`Error al preparar batch para ${item.productId}:`, error);
                failedWrites++;
            }
        }

        // 2. Commit the batch (single network call)
        try {
            await batch.commit();
        } catch (error) {
            console.error(`FATAL ERROR AL PERSISTIR BATCH ${i / BATCH_SIZE}. Revisa Reglas de Seguridad o Conexión:`, error);
            failedWrites += chunk.length; 
            successfulWrites -= chunk.length; 
            break; 
        }
        
        // 3. Update the progress bar
        const newProgress = ((i + BATCH_SIZE) / totalItems) * 100;
        setProgress(Math.min(newProgress, 100));
    }

    setPersisting(false);
    
    setStats(prev => ({ 
        ...prev, 
        written: Math.max(0, successfulWrites), 
        failed: failedWrites,
    })); 
    
    alert(`Proceso Completo. ${Math.max(0, successfulWrites)} productos persistidos. ${failedWrites} fallaron.`);
    
    setMergedData([]);
    setEquivalenciasFile(null);
    setPreciosFile(null);
  };

  const handleAddToQueue = () => { /* Placeholder for deprecated function */ }; 


  return (
    <Modal isOpen onClose={onClose} size="xl" scrollBehavior="inside" isCentered>
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="xl" p={4}>
        <ModalHeader>Fusionar Archivos Excel</ModalHeader>
        <ModalBody>
          <VStack spacing={3} mb={3} align="stretch">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setEquivalenciasFile(e.target.files[0])}
            />
            <Text fontSize="sm" color="gray.400">
              Archivo de Equivalencias
            </Text>

            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setPreciosFile(e.target.files[0])}
            />
            <Text fontSize="sm" color="gray.400">
              Archivo de Precios
            </Text>

            <Button
              colorScheme="gold"
              onClick={handleMerge}
              isLoading={loading}
              loadingText="Procesando... (Excel)"
              isDisabled={persisting} 
            >
              Fusionar y Previsualizar
            </Button>

            <Button
              colorScheme="green"
              onClick={handlePersistData}
              isLoading={persisting}
              loadingText="Persistiendo en Firebase..."
              isDisabled={mergedData.length === 0 || loading || persisting}
            >
              Persistir en Firebase
            </Button>
          </VStack>
          
          {persisting && (
            <Box mb={4}>
              <Text fontSize="sm" color="gold" mb={1}>
                Progreso: {Math.round(progress)}%
              </Text>
              <Progress value={progress} size="sm" colorScheme="green" hasStripe isAnimated={progress < 100}/>
            </Box>
          )}

          <Box mb={3}>
            <Text fontSize="sm">
              ✅ **Persistidos:** {stats.written} | ❌ **Fallaron:** {stats.failed} | ⚠️ **Ignorados (en Excel):** {stats.skipped} | ⏰ **Fuera de vigencia:** {stats.outOfTime}
            </Text>
          </Box>
          
          {mergedData.length > 0 && (
            <TableContainer maxH="300px" overflowY="auto" border="1px" borderColor="gold" borderRadius="md">
              <Table variant="simple" size="sm">
                <Thead bg="gold" color="black" position="sticky" top={0}>
                  <Tr>
                    <Th>Estado</Th>
                    <Th>ID</Th>
                    <Th>Descripción</Th>
                    <Th>Códigos</Th>
                    <Th>Precio</Th>
                    <Th>Vigencia</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {mergedData.map((item, idx) => (
                    <Tr key={idx} borderBottom="1px" borderColor="gray.700">
                      <Td>{new Date(item.vigencia) < new Date() ? "Revisar" : "Listo para persistir"}</Td>
                      <Td>{item.productId}</Td>
                      <Td>{item.description}</Td>
                      <Td>{item.barcodes.join(", ")}</Td>
                      <Td>${Math.round(item.price)}</Td>
                      <Td>{item.vigencia}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" borderColor="gold" color="gold" _hover={{ bg: "gold", color: "black" }} onClick={onClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
