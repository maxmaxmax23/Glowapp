// File: src/utils/localIndex.js (CORRECTED WEBAPP VERSION using IndexedDB)

import { openDB } from "idb"; // Web standard IndexedDB wrapper
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase.js"; 

// --- IndexedDB Configuration (P1) ---
const DB_NAME = "GLOWAPP_v26_Cache";
const PRODUCTS_STORE = "products";
const METADATA_STORE = "metadata";
const DB_VERSION = 1;

let dbPromise;
const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            db.createObjectStore(PRODUCTS_STORE, { keyPath: "id" }).createIndex("barcodes", "barcodes", { multiEntry: true });
            db.createObjectStore(METADATA_STORE, { keyPath: "key" });
        },
    });
};
try {
    dbPromise = initDB();
} catch (e) {
    console.error("Failed to initialize IndexedDB:", e);
}


// --- Metadata Management ---

const METADATA_KEYS = {
    LAST_SYNC: 'lastSync',
    PRODUCT_COUNT: 'productCount',
    MISSING_PHOTOS: 'missingPhotos'
};

export const loadIndexMetadata = async () => {
    if (!dbPromise) return { lastSync: 0, productCount: 0, missingPhotos: 0 };
    const db = await dbPromise;
    const metadata = {};
    for (const key of Object.values(METADATA_KEYS)) {
        const item = await db.get(METADATA_STORE, key);
        metadata[key] = item ? item.value : (key === METADATA_KEYS.LAST_SYNC ? 0 : 0);
    }
    return metadata;
};

const saveIndexMetadata = async (updates) => {
    if (!dbPromise) return;
    const db = await dbPromise;
    const tx = db.transaction(METADATA_STORE, 'readwrite');
    await Promise.all(
        Object.entries(updates).map(([key, value]) => 
            tx.store.put({ key: key, value: value })
        )
    );
    await tx.done;
};


// --- Core Synchronization Logic ---

export const syncProductsFromFirebase = async () => {
    if (!dbPromise) throw new Error("Local index database is not initialized.");
    
    const metadata = await loadIndexMetadata();
    const lastSyncTime = metadata[METADATA_KEYS.LAST_SYNC];

    const productsRef = collection(db, "products");
    let syncQuery = lastSyncTime === 0 
        ? query(productsRef)
        : query(productsRef, where("lastUpdated", ">", Timestamp.fromMillis(lastSyncTime)));

    const snapshot = await getDocs(syncQuery);
    if (snapshot.empty) return metadata;

    const idb = await dbPromise;
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
        tx.store.put(product); // Stage the update
        return product;
    });

    await tx.done;

    const newProductCount = await idb.count(PRODUCTS_STORE);
    const allProducts = await idb.getAll(PRODUCTS_STORE); // Fetch all for accurate count
    const newMissingPhotos = allProducts.filter(p => !p.photoURL).length;

    const newMetadata = {
        [METADATA_KEYS.LAST_SYNC]: Date.now(),
        [METADATA_KEYS.PRODUCT_COUNT]: newProductCount,
        [METADATA_KEYS.MISSING_PHOTOS]: newMissingPhotos,
    };
    await saveIndexMetadata(newMetadata);
    return newMetadata;
};


// --- Local Search Utility ---

export const lookupLocalProduct = async (queryKey) => {
    if (!dbPromise) return [];
    const idb = await dbPromise;
    const lowerQuery = queryKey.toLowerCase();
    
    // 1. Check direct ID match
    const productById = await idb.get(PRODUCTS_STORE, queryKey);
    if (productById) return [productById];

    // 2. Check barcode index
    const productByBarcode = await idb.getFromIndex(PRODUCTS_STORE, "barcodes", queryKey);
    if (productByBarcode) return [productByBarcode];

    // 3. Fallback: Search all products by description (slowest, but local)
    const allProducts = await idb.getAll(PRODUCTS_STORE);
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
};

// --- NEW ADDITION: Client-Side Update Utility (For ProductUploaderModal) ---
/**
 * Updates a single product directly in IndexedDB for instant UI feedback.
 */
export const updateLocalProduct = async (productData) => {
    if (!dbPromise || !productData || !productData.id) return;
    
    const db = await dbPromise;
    const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
    const store = tx.store;

    // We first read the existing item to ensure we don't accidentally wipe fields
    const existingProduct = await store.get(productData.id);

    const mergedData = { 
        ...(existingProduct || {}), 
        ...productData 
    };
    
    await store.put(mergedData);
    await tx.done;
};