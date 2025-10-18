// File: src/components/MergerModal.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
// ADDITION: Import Firestore utilities
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase.js"; // Assuming db is exported from firebase.js
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

// NOTE: The addToQueue prop is now effectively deprecated, but kept here 
// for zero functionality loss compatibility if App.jsx still relies on it.
export default function MergerModal({ onClose, addToQueue }) { 
  const [equivalenciasFile, setEquivalenciasFile] = useState(null);
  const [preciosFile, setPreciosFile] = useState(null);
  const [mergedData, setMergedData] = useState([]);
  // MODIFICATION: Added 'failed' to track persistence status
  const [stats, setStats] = useState({ written: 0, skipped: 0, outOfTime: 0, failed: 0 }); 
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false); // ADDITION: State for persistence loading

  const parseExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  };

  const handleMerge = async () => {
    // ... (handleMerge logic remains completely unchanged) ...
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

      const eqData = eqRows.slice(1);
      const prData = prRows.slice(1);

      const eqMap = new Map();
      eqData.forEach((row) => {
        const barcode = row[0]?.toString().trim();
        const productId = row[1]?.toString().trim();
        const description = row[2]?.toString().trim();
        if (barcode && productId) {
          if (!eqMap.has(productId)) eqMap.set(productId, { barcodes: new Set(), description });
          eqMap.get(productId).barcodes.add(barcode);
        }
      });

      let written = 0,
        skipped = 0,
        outOfTime = 0;
      const merged = [];

      const now = new Date();
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

      prData.forEach((row) => {
        const productId = row[0]?.toString().trim();
        const description = row[1]?.toString().trim();
        const vigenciaRaw = row[4];
        const priceRaw = row[5];

        if (!productId || !vigenciaRaw || !priceRaw) {
          skipped++;
          return;
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

        const eqMatch = eqMap.get(productId);
        const barcodes = eqMatch ? Array.from(eqMap.get(productId).barcodes) : ["Sin código"];

        merged.push({
          productId,
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

  // MODIFICATION: New persistence function replacing the transient queue (addToQueue)
  const handlePersistData = async () => {
    if (mergedData.length === 0) return alert("No hay datos para persistir");

    setPersisting(true); // Use new state for persistence loading
    let successfulWrites = 0;
    let failedWrites = 0;
    
    // Iterate over the merged data and perform a Firestore update for each product
    for (const item of mergedData) {
        try {
            const productRef = doc(db, "products", item.productId);
            
            // CRITICAL: Update the product's barcodes, price, and lastUpdated timestamp
            await updateDoc(productRef, {
                // Remove the "Sin código" placeholder before writing to DB
                barcodes: item.barcodes.filter(b => b !== "Sin código"), 
                price: item.price,
                lastUpdated: Timestamp.now(), // ESSENTIAL: Triggers incremental sync
            });
            successfulWrites++;
        } catch (error) {
            console.error(`Error al persistir producto ${item.productId}:`, error);
            failedWrites++;
        }
    }

    setPersisting(false);
    
    // Update the UI stats with the results of the persistence step
    setStats(prev => ({ 
        ...prev, 
        written: successfulWrites, 
        failed: failedWrites,
    })); 
    
    alert(`${successfulWrites} productos persistidos en la base de datos. ${failedWrites} fallaron.`);
    
    // Clear data after processing
    setMergedData([]);
    setEquivalenciasFile(null);
    setPreciosFile(null);
    // onClose(); // Let the user review stats before closing
  };

  // NOTE: The original handleAddToQueue is commented out as it is replaced by handlePersistData
  /*
  const handleAddToQueue = () => {
    if (mergedData.length === 0) return alert("No hay datos para añadir a la cola");
    addToQueue(mergedData);
    alert(`${mergedData.length} productos añadidos a la cola`);
    setMergedData([]);
    setStats({ written: 0, skipped: 0, outOfTime: 0 });
    setEquivalenciasFile(null);
    setPreciosFile(null);
    onClose();
  };
  */
  
  // Placeholder function for the now-removed handleAddToQueue (allows the button to be patched easily)
  const handleAddToQueue = () => { /* Now calls the persistence function below */ }; 


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
              isDisabled={persisting} // Disable during persistence
            >
              Fusionar y Previsualizar
            </Button>

            {/* MODIFICATION: Button now calls the persistence function */}
            <Button
              colorScheme="green"
              onClick={handlePersistData}
              isLoading={persisting}
              loadingText="Persistiendo en Firebase..."
              isDisabled={mergedData.length === 0 || loading || persisting}
            >
              Persistir en Firebase
            </Button>
            {/* END MODIFICATION */}
          </VStack>

          <Box mb={3}>
             {/* MODIFICATION: Display the success/failure counts clearly */}
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
