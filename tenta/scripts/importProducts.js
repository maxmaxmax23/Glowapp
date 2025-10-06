// scripts/importProducts.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

// Check for service account
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Service account key not found at", serviceAccountPath);
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccountPath),
});

const db = getFirestore();

// Convert Excel-style serial to JS Date
const excelDateToJSDate = (serial) => {
  const base = new Date(1900, 0, 1);
  return new Date(base.getTime() + (serial - 2) * 86400000);
};

// Date range: Sept 1 2024 → Sept 30 2025
const START_DATE = new Date(2024, 8, 1); // 8 = September
const END_DATE = new Date(2025, 8, 30);

async function importProducts() {
  try {
    const filePath = path.join(__dirname, "../products.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const products = JSON.parse(raw);

    let imported = 0;
    for (const product of products) {
      try {
        const { id, descripcion, precio, lista, listadesc, vigencia } = product;

        if (!id) {
          console.warn("⚠️ Skipping product without id:", product);
          continue;
        }

        const vigenciaDate = excelDateToJSDate(Number(vigencia));

        // Only import products within date range
        if (vigenciaDate >= START_DATE && vigenciaDate <= END_DATE) {
          await db.collection("products").doc(id).set({
            descripcion,
            precio,
            lista,
            listadesc,
            vigencia: vigenciaDate.toISOString(),
          });
          imported++;
          console.log(`✅ Imported ${id} (${descripcion})`);
        } else {
          console.log(`⏭️ Skipped ${id} (${descripcion}) – out of range`);
        }
      } catch (err) {
        console.error("❌ Error importing product:", err);
      }
    }

    console.log(`\n🎉 Done! Imported ${imported} products into Firestore.`);
  } catch (err) {
    console.error("❌ Import failed:", err);
  }
}

importProducts();
