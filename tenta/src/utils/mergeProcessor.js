// File: src/utils/mergeProcessor.js (NEW FILE)

import * as XLSX from "xlsx";

const BATCH_SIZE = 500; // Define locally if needed, but not used in this file

const parseExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
};

/**
 * Executes the full parsing, conflict resolution, validation, and merging process.
 * This is now a pure function, separated from the React component's state.
 * * @param {File} equivalenciasFile The file containing barcodes and product IDs.
 * @param {File} preciosFile The file containing prices, dates, and new schema data.
 * @returns {Promise<{mergedData: Array, stats: Object}>} The processed data and summary statistics.
 */
export const processExcelFiles = async (equivalenciasFile, preciosFile) => {
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
            // Check #1: Self-Referential Skip (Barcode === Product ID)
            if (barcode === productId) {
                 return; 
            }

            barcodeSuperset.add(barcode); 
            
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
    
    rawPrData.forEach(row => {
        const productId = row[0]?.toString().trim();
        
        // CRITICAL CONFLICT CHECK: Skip the conflicting price row
        if (productId && barcodeSuperset.has(productId)) {
            conflictCount++; 
            return; 
        }
        prData.push(row); 
    });
    
    skipped += conflictCount;
    // --- END STEP 2 ---


    // --- STEP 3: Process Filtered Data and Finalize Merged Array ---
    prData.forEach((row) => { 
        let rawProductId = row[0]?.toString().trim(); 
        const description = row[1]?.toString().trim();
        const vigenciaRaw = row[4];
        const priceRaw = row[5];
        
        // Extract new schema fields (assuming indexes 6, 7, 8, 9)
        const stockRaw = row[6];
        const variantsRaw = row[7];
        const providerRaw = row[8];
        const inventoryRaw = row[9];
        
        // Validation check for fundamental errors 
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

        const eqMatch = eqMap.get(rawProductId); 
        const barcodes = eqMatch ? Array.from(eqMap.get(rawProductId).barcodes) : ["Sin código"];

        // --- FINAL SCHEMA NORMALIZATION ---
        const lastKnownStock = parseInt(stockRaw?.toString().trim()) || 0;
        const currentInventory = parseInt(inventoryRaw?.toString().trim()) || 0;
        const variants = variantsRaw?.toString().trim() || ""; 
        const provider = providerRaw?.toString().trim() || ""; 
        // --- END FINAL SCHEMA NORMALIZATION ---

        merged.push({
          productId: productId, 
          description: description || eqMatch?.description || "Sin descripción",
          barcodes,
          price,
          vigencia: vigencia.toLocaleDateString("es-AR"),
          
          lastKnownStock,
          variants,
          provider,
          currentInventory,
        });
        written++;
      });
      
    const stats = { written, skipped, outOfTime, failed: 0 }; 
    
    return { mergedData: merged, stats };
};
