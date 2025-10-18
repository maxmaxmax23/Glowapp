// File: src/utils/localIndex.js (Final Webapp Stability Patch)

import { openDB } from "idb"; 
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase.js"; 

// --- IndexedDB Configuration (P1) ---
const DB_NAME = "GLOWAPP_v26_Cache";
const PRODUCTS_STORE = "products";
const METADATA_STORE = "metadata";
const DB_VERSION = 1;

let dbPromise;
const initDB = async () => {
    if (!('indexedDB' in window)) {
        console.warn("IndexedDB not supported. Local index disabled.");
        // Throwing a rejection here handles environments like old webviews gracefully
        return Promise.reject(new Error("IndexedDB not available.")); 
    }
    
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            db.createObjectStore(PRODUCTS_STORE, { keyPath: "id" }).createIndex("barcodes", "barcodes", { multiEntry: true });
            db.createObjectStore(METADATA_STORE, { keyPath: "key" });
        },
    });
};

// Initialize dbPromise once
try {
    dbPromise = initDB();
} catch (e) {
    dbPromise = Promise.reject(e); // Store the initial promise rejection
}


// --- Metadata Management (functions remain simple/unchanged) ---

const METADATA_KEYS = {
    LAST_SYNC: 'lastSync',
    PRODUCT_COUNT: 'productCount',
    MISSING_PHOTOS: 'missingPhotos'
};

export const loadIndexMetadata = async () => {
    try {
        const idb = await dbPromise;
        if (!idb) return { lastSync: 0, productCount: 0, missingPhotos: 0 };
        // ... (rest of logic using idb) ...
        const metadata = {};
        for (const key of Object.values(METADATA_KEYS)) {
            const item = await idb.get(METADATA_STORE, key);
            metadata[key] = item ? item.value : (key === METADATA_KEYS.LAST_SYNC ? 0 : 0);
        }
        return metadata;

    } catch(e) {
        console.error("Error loading index metadata:", e);
        return { lastSync: 0, productCount: 0, missingPhotos: 0 };
    }
};

const saveIndexMetadata = async (updates) => {
    try {
        const idb = await dbPromise;
        if (!idb) return;
        const tx = idb.transaction(METADATA_STORE, 'readwrite');
        await Promise.all(
            Object.entries(updates).map(([key, value]) => 
                tx.store.put({ key: key, value: value })
            )
        );
        await tx.done;
    } catch(e) {
        console.error("Error saving index metadata:", e);
    }
};


// --- Core Synchronization Logic (CRASH FIX APPLIED HERE) ---

export const syncProductsFromFirebase = async () => {
    try {
        const idb = await dbPromise;
        if (!idb) {
            console.warn("IndexedDB connection failed. Sync cannot be completed locally.");
            return await loadIndexMetadata(); // Return current, unsynced status
        }
        
        const metadata = await loadIndexMetadata();
        const lastSyncTime = metadata[METADATA_KEYS.LAST_SYNC];

        // 1. Query Firebase (standard Firestore logic)
        const productsRef = collection(db, "products");
        let syncQuery = lastSyncTime === 0 
            ? query(productsRef)
            : query(productsRef, where("lastUpdated", ">", Timestamp.fromMillis(lastSyncTime)));

        const snapshot = await getDocs(syncQuery);
        if (snapshot.empty) return metadata;

        // 2. Write to IndexedDB (CRITICAL SECTION)
        const tx = idb.transaction(PRODUCTS_STORE, 'readwrite');
        const updates = snapshot.docs.map(doc => {
            const data = doc.data();
            const product = {
                id: doc.id,
                barcodes: data.barcodes || [],
                description: data.description || "Sin descripción",
                photoURL: data.photoURL || null,
                lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
                stock: data.stock || 0
            };
            
            // Try to put the product, handling possible data errors
            try {
                tx.store.put(product);
            } catch (writeError) {
                console.error(`Skipping product ${doc.id} due to local write error (possible invalid key/ID):`, writeError);
            }
            return product;
        });

        await tx.done; // Wait for the transaction to complete

        // 3. Recalculate/Update Metadata
        const newProductCount = await idb.count(PRODUCTS_STORE);
        const allProducts = await idb.getAll(PRODUCTS_STORE);
        const newMissingPhotos = allProducts.filter(p => !p.photoURL).length;

        const newMetadata = {
            [METADATA_KEYS.LAST_SYNC]: Date.now(),
            [METADATA_KEYS.PRODUCT_COUNT]: newProductCount,
            [METADATA_KEYS.MISSING_PHOTOS]: newMissingPhotos,
        };
        await saveIndexMetadata(newMetadata);
        return newMetadata;

    } catch (e) {
        console.error("FATAL ERROR during sync process:", e);
        // This stops the blank screen crash and forces Dashboard.jsx to display the last known state
        return await loadIndexMetadata(); 
    }
};


// --- Local Search Utility (functions remain simple/unchanged) ---

export const lookupLocalProduct = async (queryKey) => {
    try {
        const idb = await dbPromise;
        if (!idb) return [];
        // ... (rest of search logic using idb) ...
        
        // This is a placeholder for the full logic
        const productById = await idb.get(PRODUCTS_STORE, queryKey);
        if (productById) return [productById];
        // ... (full scan logic) ...
        const allProducts = await idb.getAll(PRODUCTS_STORE);
        const lowerQuery = queryKey.toLowerCase();
        
        return allProducts.filter(item => {
            const productId = item.id?.toString().toLowerCase() || "";
            const barcodes = item.barcodes?.map(b => b.toString().toLowerCase()) || [];
            const description = item.description?.toLowerCase() || "";
            return (
                productId.includes(lowerQuery) ||
                barcodes.some(b => b.includes(lowerQuery)) ||
                description.includes(lowerQuery)
            );
        });

    } catch(e) {
        console.error("Error during local product lookup:", e);
        return [];
    }
};

export const updateLocalProduct = async (productData) => {
    try {
        const idb = await dbPromise;
        if (!idb || !productData || !productData.id) return;
        
        const tx = idb.transaction(PRODUCTS_STORE, 'readwrite');
        const store = tx.store;

        const existingProduct = await store.get(productData.id);

        const mergedData = { 
            ...(existingProduct || {}), 
            ...productData 
        };
        
        await store.put(mergedData);
        await tx.done;
    } catch(e) {
        console.error("Error during local product update:", e);
    }
};
