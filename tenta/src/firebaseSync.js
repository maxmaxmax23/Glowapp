import { db } from './firebase.js';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const COLLECTION = 'products';
const JSON_PATH = path.join(process.cwd(), 'src/tentadb.json');

/**
 * Push local JSON to Firestore
 */
export const pushJsonToFirestore = async () => {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  for (const item of data) {
    const docRef = doc(db, COLLECTION, item.id);
    await setDoc(docRef, item, { merge: true });
    console.log(`Pushed ${item.id} to Firestore`);
  }
};

/**
 * Pull Firestore collection to JSON file
 */
export const pullFirestoreToJson = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  const products = [];
  querySnapshot.forEach((docSnap) => {
    products.push(docSnap.data());
  });
  fs.writeFileSync(JSON_PATH, JSON.stringify(products, null, 2));
  console.log(`Pulled ${products.length} products from Firestore to ${JSON_PATH}`);
};
