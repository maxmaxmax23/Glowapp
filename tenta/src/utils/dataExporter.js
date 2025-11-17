// File: src/utils/dataExporter.js

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js"; 

// NOTE: You must install a CSV converter library (e.g., json-2-csv or write a custom helper).
// For simplicity, this utility uses a basic formatting helper.

const JSONToCSV = (objArray) => {
    // We define the headers based on the fields we finalized in the MergerModal,
    // plus the product ID and the lastUpdated timestamp (as readable date).
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    
    // Define all headers explicitly, including new schema fields
    let headers = [
        "ID_PRODUCTO", "DESCRIPCION", "PRECIO", "STOCK", "CODIGOS_BARRA", 
        "PROVEEDOR", "VARIANTES", "ULTIMA_ACTUALIZACION"
    ];
    
    let csv = headers.join(";") + "\n"; // Use semicolon (;) as delimiter for Excel compatibility

    for (let i = 0; i < array.length; i++) {
        let line = '';
        
        // Ensure values are safe strings (and format the complex fields)
        const formatValue = (value) => {
            if (value === null || value === undefined) return '';
            // Escape quotes and ensure single line
            return String(value).replace(/"/g, '""').replace(/\n/g, ' '); 
        };

        const item = array[i];
        
        // Use the fields we know are present:
        line += formatValue(item.id) + ";";
        line += formatValue(item.description) + ";";
        line += formatValue(item.price) + ";";
        line += formatValue(item.stock) + ";"; // Assuming 'stock' is the inventory number
        line += formatValue(item.barcodes ? item.barcodes.join(', ') : '') + ";";
        line += formatValue(item.provider) + ";";
        line += formatValue(item.variants) + ";";
        line += formatValue(item.lastUpdated ? new Date(item.lastUpdated).toLocaleString('es-AR') : '');
        
        csv += line + "\n";
    }

    return csv;
};

/**
 * Fetches all product data from Firebase and triggers a browser download of a CSV file.
 * @returns {Promise<number>} The number of documents exported.
 */
export const exportAllProducts = async () => {
    try {
        console.log("Starting full database export...");
        
        // Step 1: Fetch ALL product documents (full read)
        const snapshot = await getDocs(collection(db, "products"));
        
        const productData = snapshot.docs.map(doc => {
            const data = doc.data();
            // Map Firestore data structure to a cleaner object for export
            return {
                id: doc.id,
                description: data.description || '',
                price: data.price || 0,
                stock: data.currentInventory || data.stock || 0, // Use the new inventory field or fallback
                barcodes: data.barcodes || [],
                provider: data.provider || '',
                variants: data.variants || '',
                lastUpdated: data.lastUpdated?.toMillis() || 0,
            };
        });

        if (productData.length === 0) {
            alert("No hay productos para exportar.");
            return 0;
        }

        // Step 2: Convert data to CSV format
        const csvContent = JSONToCSV(productData);

        // Step 3: Trigger browser download
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility (U+FEFF)
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', GLOWAPP_Export_${new Date().toISOString().slice(0, 10)}.csv);
        
        // Append link to body, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(Export successful. ${productData.length} documents processed.);
        return productData.length;

    } catch (error) {
        console.error("FATAL ERROR during product export:", error);
        alert("Fallo la exportación. Revisa la consola para detalles de Firebase.");
        return 0;
    }
};
