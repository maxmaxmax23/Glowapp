// File: src/utils/dataExporter.js (Final Version with photoURL Included)

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js"; 

// NOTE: Uses a basic formatting helper instead of an external library.

const JSONToCSV = (objArray) => {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    
    // MODIFICATION 1: "URL_FOTO" is correctly added to the headers
    let headers = [
        "ID_PRODUCTO", "DESCRIPCION", "PRECIO", "STOCK", "CODIGOS_BARRA", 
        "PROVEEDOR", "VARIANTES", "URL_FOTO", "ULTIMA_ACTUALIZACION" // <-- PHOTO_URL IS NOW INCLUDED
    ];
    
    let csv = headers.join(";") + "\n"; // Use semicolon (;) as delimiter for Excel compatibility

    for (let i = 0; i < array.length; i++) {
        let line = '';
        
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
        line += formatValue(item.stock) + ";"; 
        line += formatValue(item.barcodes ? item.barcodes.join(', ') : '') + ";";
        line += formatValue(item.provider) + ";";
        line += formatValue(item.variants) + ";";
        // MODIFICATION 2: photoURL is added to the CSV data line
        line += formatValue(item.photoURL) + ";"; 
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
                stock: data.currentInventory || data.stock || 0, 
                barcodes: data.barcodes || [],
                provider: data.provider || '',
                variants: data.variants || '',
                photoURL: data.photoURL || '', // <-- Ensures photoURL is pulled from Firestore
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
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'GLOWAPP_Export_${new Date().toISOString().slice(0, 10)}.csv');
        
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
