import { useState } from "react";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { firestore, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";

export default function BackupManager() {
  const [status, setStatus] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      setStatus("Generando copia de seguridad...");
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

      setStatus("Copia de seguridad completada ✅");
    } catch (err) {
      console.error(err);
      setStatus("Error al crear la copia de seguridad ❌");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="aurum-card flex flex-col items-center justify-center p-8 gap-6 max-w-sm mx-auto"
    >
      <div className="w-16 h-16 rounded-full bg-backgroundDark900 border border-borderDark800 flex items-center justify-center -mb-2 shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-amber400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-light text-textLight50 tracking-wide">Copia de Seguridad</h3>
        <p className="text-sm text-textDark400 leading-relaxed font-light">
          Guarda una instantánea de todos los productos actuales en la nube.
        </p>
      </div>

      <button
        className="aurum-btn-primary w-full flex items-center justify-center gap-2 group"
        onClick={handleBackup}
        disabled={isBackingUp}
      >
        {isBackingUp ? (
          <>
            <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Guardando...
          </>
        ) : (
          <>
            Crear Backup
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </>
        )}
      </button>

      {status && (
        <div className={`w-full p-3 rounded-xl border text-sm font-medium text-center flex items-center justify-center ${status.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : status.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber400/5 border-borderDark800 text-amber400 animate-pulse'}`}>
          {status}
        </div>
      )}
    </motion.div>
  );
}
