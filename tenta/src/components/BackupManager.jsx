import { useState } from "react";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { firestore, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function BackupManager() {
  const [status, setStatus] = useState("");

  const handleBackup = async () => {
    try {
      setStatus("Creating backup...");
      const snapshot = await getDocs(collection(firestore, "products"));
      const data = snapshot.docs.map((d) => d.data());

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const backupRef = ref(storage, `backups/products-${Date.now()}.json`);
      await uploadBytes(backupRef, blob);
      const url = await getDownloadURL(backupRef);

      await setDoc(doc(collection(firestore, "backups")), {
        createdAt: new Date().toISOString(),
        url,
      });

      setStatus("Backup complete!");
    } catch (err) {
      console.error(err);
      setStatus("Error creating backup");
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-bold mb-2">Backup Manager</h3>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleBackup}
      >
        Create Backup
      </button>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  );
}
