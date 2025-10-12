// File: src/utils/localIndex.js

import { openDB } from "idb";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase.js"; // Assuming firebase.js exports the initialized Firestore instance

// --- IndexedDB Configuration (P1) ---
const DB_NAME = "GLOWAPP_v26_Cache";
const PRODUCTS_STORE = "products";
const METADATA_STORE = "metadata";
const DB_VERSION = 1;

/**
 * Initializes and returns the IndexedDB connection.
 * Creates the object stores if they don't exist.
 * @returns {Promise<IDBPDatabase>} The IndexedDB database instance.
 */
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Products Store: Stores indexed product data
      const productStore = db.createObjectStore(PRODUCTS_STORE, { keyPath: "id" });
      productStore.createIndex("barcodes", "barcodes", { multiEntry: true });
      productStore.createIndex("description", "description", { unique: false });

      // 2. Metadata Store: Stores sync status and counts
      db.createObjectStore(METADATA_STORE, { keyPath: "key" });
    },
    blocked() {
      console.error("IndexedDB blocked. Please close other tabs using this app.");
    },
    blocking() {
      console.warn("IndexedDB blocking an old connection. Refreshing may be needed.");
    },
  });
};

let dbPromise;
try {
  dbPromise = initDB();
} catch (e) {
  console.error("Failed to initialize IndexedDB:", e);
}


// --- Metadata Management (P2) ---

const METADATA_KEYS = {
    LAST_SYNC: 'lastSync',
    PRODUCT_COUNT: 'productCount',
    MISSING_PHOTOS: 'missingPhotos'
};

/**
 * Loads the current synchronization and index metadata from IndexedDB.
 * Returns default values if the metadata store is empty.
 * @returns {Promise<{lastSync: number, productCount: number, missingPhotos: number}>}
 */
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

/**
 * Saves the current synchronization and index metadata to IndexedDB.
 * @param {object} updates - The metadata to save.
 */
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


// --- Core Synchronization Logic (P2) ---

/**
 * Fetches incremental product updates from Firestore and stores them in IndexedDB.
 * Uses the 'lastUpdated' timestamp for efficient querying.
 * @returns {Promise<{lastSync: number, productCount: number, missingPhotos: number}>} The new index metadata.
 */
export const syncProductsFromFirebase = async () => {
    if (!dbPromise) throw new Error("Local index database is not initialized.");
    
    // 1. Get the last sync timestamp
    const metadata = await loadIndexMetadata();
    const lastSyncTime = metadata.lastSync;

    // 2. Build the incremental Firestore query
    const productsRef = collection(db, "products");
    let syncQuery;

    if (lastSyncTime === 0) {
        // Initial full sync (query all)
        console.log("Starting initial full product sync from Firestore.");
        syncQuery = query(productsRef);
    } else {
        // Incremental sync (query only updates since last sync)
        const lastSyncTimestamp = Timestamp.fromMillis(lastSyncTime);
        syncQuery = query(
            productsRef,
            where("lastUpdated", ">", lastSyncTimestamp)
        );
        console.log(`Starting incremental sync since: ${new Date(lastSyncTime).toLocaleString()}`);
    }

    // 3. Execute the query
    const snapshot = await getDocs(syncQuery);
    if (snapshot.empty) {
        console.log("No new updates found.");
        return metadata; // Return existing metadata if nothing changed
    }

    const updates = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            barcodes: data.barcodes || [],
            description: data.description || "Sin descripción",
            photoURL: data.photoURL || null,
            // Ensure lastUpdated is stored as a number (timestamp in ms)
            lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
            stock: data.stock || 0
        };
    });

    // 4. Batch write updates to IndexedDB and calculate new metadata
    const idb = await dbPromise;
    const tx = idb.transaction(PRODUCTS_STORE, 'readwrite');
    let newMissingPhotos = metadata.missingPhotos;

    for (const product of updates) {
        await tx.store.put(product);
        
        // Simple logic for missingPhotos tracking (Additive Only)
        // We need the *old* product status to correctly adjust the count, 
        // but for an 'additive only' patch, we'll keep the logic simple:
        // just count missing photos in the *current* update batch.
        // A full rebuild logic is safer, but this keeps it additive.
        if (product.photoURL) {
            // Assume the previous count is handled or we'll recount later
        } else {
            // New or updated product is missing a photo
            // NOTE: Accurate tracking requires knowing if the photo was *removed* or *added*
            // For now, we'll just track the count based on the current *full* index size after update.
        }
    }
    await tx.done;
    
    // 5. Recalculate/update metadata
    const newProductCount = await idb.count(PRODUCTS_STORE);
    
    // Recalculate missingPhotos based on the entire index (safer than incremental)
    const allProducts = await idb.getAll(PRODUCTS_STORE);
    newMissingPhotos = allProducts.filter(p => !p.photoURL).length;

    const newSyncTime = Date.now();
    const newMetadata = {
        [METADATA_KEYS.LAST_SYNC]: newSyncTime,
        [METADATA_KEYS.PRODUCT_COUNT]: newProductCount,
        [METADATA_KEYS.MISSING_PHOTOS]: newMissingPhotos,
    };

    await saveIndexMetadata(newMetadata);
    console.log(`Sync complete. Indexed ${newProductCount} products.`);

    return newMetadata;
};


// --- Local Search Utility (P3) ---

/**
 * Searches the local IndexedDB index for products matching an ID or barcode.
 * This is the fast-path search used by ScannerModal.jsx.
 * @param {string} queryKey - The product ID or barcode to search for.
 * @returns {Promise<Array<object>>} Array of matching product objects.
 */
export const lookupLocalProduct = async (queryKey) => {
    if (!dbPromise) return [];
    
    const db = await dbPromise;
    const lowerQuery = queryKey.toLowerCase();
    
    // 1. Check direct ID match (primary key lookup is fastest)
    const productById = await db.get(PRODUCTS_STORE, queryKey);
    if (productById) {
        return [productById];
    }

    // 2. Check barcode index (multiEntry index lookup)
    const productByBarcode = await db.getFromIndex(PRODUCTS_STORE, "barcodes", queryKey);
    if (productByBarcode) {
        return [productByBarcode];
    }
    
    // 3. Fallback: Search all products by description (slowest path, still local)
    // NOTE: IndexedDB search by substring is not supported, so this performs a full scan.
    const allProducts = await db.getAll(PRODUCTS_STORE);
    
    const matches = allProducts.filter(item => {
        // ID check is redundant but safe
        const productId = item.id?.toString().toLowerCase() || "";
        const barcodes = item.barcodes?.map(b => b.toString().toLowerCase()) || [];
        const description = item.description?.toLowerCase() || "";
        
        return (
            productId.includes(lowerQuery) ||
            barcodes.some(b => b.includes(lowerQuery)) ||
            description.includes(lowerQuery)
        );
    });

    return matches;
};