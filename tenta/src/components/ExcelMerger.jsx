// INCREMENT: ExcelMerger.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Layout, file inputs, buttons, table
// Mode: Candidate (test preview before full integration)

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  VStack,
  HStack,
  Button,
  Input,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@chakra-ui/react";

export default function ExcelMerger() {
  const [equivalenciasFile, setEquivalenciasFile] = useState(null);
  const [preciosFile, setPreciosFile] = useState(null);
  const [mergedData, setMergedData] = useState([]);
  const [counters, setCounters] = useState({
    toWrite: 0,
    skipped: 0,
    outOfVigencia: 0,
  });
  const [error, setError] = useState(null);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "equivalencias") setEquivalenciasFile(file);
    if (type === "precios") setPreciosFile(file);
  };

  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.toString().split(/[\/-]/);
    if (parts.length < 3) return null;
    let [day, month, year] = parts.map((p) => parseInt(p, 10));
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day);
  };

  const parsePrice = (str) => {
    if (!str) return 0;
    let normalized = str.toString().replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const mergeFiles = async () => {
    if (!equivalenciasFile || !preciosFile) {
      setError("Both files must be uploaded.");
      return;
    }
    setError(null);

    try {
      const eqData = XLSX.read(await equivalenciasFile.arrayBuffer(), { type: "array" });
      const eqSheet = eqData.Sheets[eqData.SheetNames[0]];
      const eqRows = XLSX.utils.sheet_to_json(eqSheet, { header: 1, raw: false });
      const eqMap = {};
      eqRows.slice(1).forEach((row) => {
        const [barcode, productId, desc] = row;
        if (!productId) return;
        eqMap[productId.toString()] = { barcodes: [barcode.toString()], description: desc };
      });

      const prData = XLSX.read(await preciosFile.arrayBuffer(), { type: "array" });
      const prSheet = prData.Sheets[prData.SheetNames[0]];
      const prRows = XLSX.utils.sheet_to_json(prSheet, { header: 1, raw: false });

      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const merged = [];
      let toWrite = 0,
        skipped = 0,
        outOfVigencia = 0;

      prRows.slice(1).forEach((row) => {
        const [productId, desc, , , vigenciaStr, priceStr] = row;
        if (!productId) return;

        const vigenciaDate = parseDate(vigenciaStr);
        const price = parsePrice(priceStr);
        const productKey = productId.toString();

        if (!vigenciaDate || vigenciaDate < oneYearAgo || vigenciaDate > today) {
          outOfVigencia++;
          merged.push({ productId: productKey, status: "outOfVigencia" });
          return;
        }

        const eqEntry = eqMap[productKey];
        const barcodes = eqEntry ? eqEntry.barcodes : [];
        const description = desc || (eqEntry ? eqEntry.description : "");

        merged.push({
          productId: productKey,
          barcodes,
          description,
          price,
          vigencia: vigenciaStr,
          status: "toWrite",
        });
        toWrite++;
      });

      setCounters({ toWrite, skipped, outOfVigencia });
      setMergedData(merged);
    } catch (e) {
      console.error(e);
      setError("Error processing files: " + e.message);
    }
  };

  return (
    <Box p={4} bg="gray.900" color="white" borderRadius="lg">
      <Text fontSize="lg" fontWeight="bold" mb={2}>
        Excel Merger (Candidate)
      </Text>

      <VStack spacing={3} mb={4} align="start">
        <VStack spacing={2} w="full">
          <Text>Equivalencias (barcode → productId):</Text>
          <Input type="file" accept=".xls,.xlsx" onChange={(e) => handleFileUpload(e, "equivalencias")} />
        </VStack>
        <VStack spacing={2} w="full">
          <Text>Precios (productId → details):</Text>
          <Input type="file" accept=".xls,.xlsx" onChange={(e) => handleFileUpload(e, "precios")} />
        </VStack>
        <Button colorScheme="gold" onClick={mergeFiles}>
          Merge & Preview
        </Button>
      </VStack>

      {error && <Text color="red.500" mb={2}>{error}</Text>}

      <Text mb={2}>
        <strong>Counters:</strong> To Write: {counters.toWrite}, Skipped: {counters.skipped}, Out of Vigencia: {counters.outOfVigencia}
      </Text>

      {mergedData.length > 0 && (
        <TableContainer maxH="64" overflowY="auto" border="1px" borderColor="gray.700" borderRadius="md">
          <Table size="sm" variant="simple" colorScheme="gray">
            <Thead bg="gray.800">
              <Tr>
                <Th>Product ID</Th>
                <Th>Barcodes</Th>
                <Th>Description</Th>
                <Th>Price</Th>
                <Th>Vigencia</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {mergedData.map((item, idx) => (
                <Tr key={idx} bg={idx % 2 === 0 ? "gray.800" : undefined}>
                  <Td>{item.productId}</Td>
                  <Td>{item.barcodes?.join(", ")}</Td>
                  <Td>{item.description}</Td>
                  <Td>{item.price}</Td>
                  <Td>{item.vigencia}</Td>
                  <Td>{item.status}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
s