// File: src/components/ExcelMerger.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";

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
    // Normalize DD/MM/YYYY, DD/MM/YY -> YYYY-MM-DD
    if (!str) return null;
    const parts = str.toString().split(/[\/-]/);
    if (parts.length < 3) return null;
    let [day, month, year] = parts.map((p) => parseInt(p, 10));
    if (year < 100) year += 2000; // handle YY
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
      // Read equivalencias
      const eqData = XLSX.read(await equivalenciasFile.arrayBuffer(), {
        type: "array",
      });
      const eqSheet = eqData.Sheets[eqData.SheetNames[0]];
      const eqRows = XLSX.utils.sheet_to_json(eqSheet, { header: 1, raw: false });
      // Skip header
      const eqMap = {};
      eqRows.slice(1).forEach((row) => {
        const [barcode, productId, desc] = row;
        if (!productId) return;
        eqMap[productId.toString()] = {
          barcodes: [barcode.toString()],
          description: desc,
        };
      });

      // Read precios
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

        // For candidate, we assume all products need write
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
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-lg font-bold mb-2">Excel Merger (Candidate)</h2>
      <div className="flex flex-col gap-2 mb-4">
        <label>
          Equivalencias (barcode → productId):
          <input type="file" accept=".xls,.xlsx" onChange={(e) => handleFileUpload(e, "equivalencias")} />
        </label>
        <label>
          Precios (productId → details):
          <input type="file" accept=".xls,.xlsx" onChange={(e) => handleFileUpload(e, "precios")} />
        </label>
        <button
          className="bg-gold text-black px-4 py-2 rounded hover:bg-yellow-400"
          onClick={mergeFiles}
        >
          Merge & Preview
        </button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="mb-2">
        <strong>Counters:</strong> To Write: {counters.toWrite}, Skipped: {counters.skipped}, Out of Vigencia: {counters.outOfVigencia}
      </div>

      {mergedData.length > 0 && (
        <table className="table-auto border-collapse border border-gray-700 w-full text-sm">
          <thead>
            <tr className="bg-gray-800">
              <th className="border px-2 py-1">Product ID</th>
              <th className="border px-2 py-1">Barcodes</th>
              <th className="border px-2 py-1">Description</th>
              <th className="border px-2 py-1">Price</th>
              <th className="border px-2 py-1">Vigencia</th>
              <th className="border px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {mergedData.map((item, idx) => (
              <tr key={idx} className="even:bg-gray-800">
                <td className="border px-2 py-1">{item.productId}</td>
                <td className="border px-2 py-1">{item.barcodes?.join(", ")}</td>
                <td className="border px-2 py-1">{item.description}</td>
                <td className="border px-2 py-1">{item.price}</td>
                <td className="border px-2 py-1">{item.vigencia}</td>
                <td className="border px-2 py-1">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
