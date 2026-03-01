// INCREMENT: ExcelMerger.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Layout, file inputs, buttons, table
// Mode: Candidate (test preview before full integration)

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="aurum-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-backgroundDark900 border border-borderDark800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-light text-textLight50 tracking-tight">Excel Merger <span className="text-xs text-amber400 border border-amber400/30 bg-amber400/10 px-2 py-0.5 rounded-full ml-2 align-middle">Candidate</span></h3>
          <p className="text-sm text-textDark400">Mezcla Equivalencias y Precios</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-textDark400 ml-1">Equivalencias (barcode → productId):</label>
          <div className="relative group">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileUpload(e, "equivalencias")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`aurum-input flex items-center justify-between group-hover:border-amber400/50 transition-colors ${equivalenciasFile ? 'border-amber400/30 bg-amber400/5' : ''}`}>
              <span className={`truncate ${equivalenciasFile ? 'text-amber400' : 'text-textDark400'}`}>
                {equivalenciasFile ? equivalenciasFile.name : "Seleccionar archivo .xlsx"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${equivalenciasFile ? 'text-amber400' : 'text-textDark400'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-textDark400 ml-1">Precios (productId → details):</label>
          <div className="relative group">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileUpload(e, "precios")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`aurum-input flex items-center justify-between group-hover:border-amber400/50 transition-colors ${preciosFile ? 'border-amber400/30 bg-amber400/5' : ''}`}>
              <span className={`truncate ${preciosFile ? 'text-amber400' : 'text-textDark400'}`}>
                {preciosFile ? preciosFile.name : "Seleccionar archivo .xlsx"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${preciosFile ? 'text-amber400' : 'text-textDark400'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
          </div>
        </div>

        <button
          className="aurum-btn-primary w-full mt-4 flex items-center justify-center gap-2"
          onClick={mergeFiles}
          disabled={!equivalenciasFile || !preciosFile}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Merge & Preview
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6 bg-backgroundDark950 p-4 rounded-2xl border border-borderDark800">
        <div className="flex-1 text-center">
          <p className="text-2xl font-light text-textLight50">{counters.toWrite}</p>
          <p className="text-xs font-semibold tracking-widest uppercase text-amber400 mt-1">To Write</p>
        </div>
        <div className="w-px bg-borderDark800"></div>
        <div className="flex-1 text-center">
          <p className="text-2xl font-light text-textLight50">{counters.skipped}</p>
          <p className="text-xs font-semibold tracking-widest uppercase text-textDark400 mt-1">Skipped</p>
        </div>
        <div className="w-px bg-borderDark800"></div>
        <div className="flex-1 text-center">
          <p className="text-2xl font-light text-red-400">{counters.outOfVigencia}</p>
          <p className="text-xs font-semibold tracking-widest uppercase text-red-500 mt-1">Expirados</p>
        </div>
      </div>

      {mergedData.length > 0 && (
        <div className="max-h-64 overflow-y-auto border border-borderDark800 rounded-2xl bg-backgroundDark950 aurum-scrollbar">
          <table className="w-full text-left text-sm text-textLight50">
            <thead className="bg-backgroundDark900 sticky top-0 z-10 text-xs uppercase tracking-wider text-textDark400 border-b border-borderDark800">
              <tr>
                <th className="px-4 py-3 font-medium">Product ID</th>
                <th className="px-4 py-3 font-medium">Barcodes</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium">Vigencia</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderDark800">
              {mergedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-backgroundDark900 transition-colors">
                  <td className="px-4 py-3 font-mono text-amber400">{item.productId}</td>
                  <td className="px-4 py-3 text-textDark400 font-mono text-xs">{item.barcodes?.join(", ")}</td>
                  <td className="px-4 py-3 truncate max-w-[150px]" title={item.description}>{item.description}</td>
                  <td className="px-4 py-3 text-right font-medium">${item.price}</td>
                  <td className="px-4 py-3 text-textDark400 text-xs">{item.vigencia}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.status === 'toWrite' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}