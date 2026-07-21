import React, { useState, useEffect, useRef, useCallback } from "react";
import { lookupLocalProduct } from "../../utils/localIndex.js";
import { motion } from "framer-motion";
import AurumHeader from "../AurumHeader.jsx";

const STORAGE_KEY = "GLOWAPP_PriceTagLayoutCustom";

export default function PriceTagPrinter({ onClose }) {
  // Configuration State
  const [layout, setLayout] = useState({ columns: 4, rows: 8, showBarcode: true, bannerText: "" });
  
  // Printing Queue State
  const [queue, setQueue] = useState([]);
  
  // Input tracking
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const lastScanTime = useRef(0);
  const [warning, setWarning] = useState("");

  const maxCapacity = layout.columns * layout.rows;

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLayout(JSON.parse(saved));
      } catch (e) {
        console.error("Could not parse saved layout.");
      }
    }
  }, []);

  // Save layout when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  // Keep focus on input
  const maintainFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-focus on click anywhere outside specific UI
  useEffect(() => {
    maintainFocus();
    window.addEventListener("click", maintainFocus);
    return () => window.removeEventListener("click", maintainFocus);
  }, [maintainFocus]);

  // Handle hardware scanner input
  const handleScanInput = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const queryKey = inputValue.trim();
    setInputValue(""); // Clear immediately
    
    // Debounce protection
    const now = Date.now();
    if (now - lastScanTime.current < 300) {
       console.log("Ignored double scan (debounce).");
       return;
    }
    lastScanTime.current = now;

    // Check capacity
    if (queue.length >= maxCapacity) {
      setWarning(`Límite de capacidad alcanzado (${maxCapacity}). Imprima o borre items.`);
      setTimeout(() => setWarning(""), 3000);
      return;
    }

    // Lookup
    const results = await lookupLocalProduct(queryKey);
    if (results && results.length > 0) {
      setQueue((prev) => [...prev, results[0]]);
      maintainFocus();
    } else {
      setWarning(`Producto no encontrado: ${queryKey}`);
      setTimeout(() => setWarning(""), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden text-textLight50">
      {/* Invisible Wedge Input */}
      <form onSubmit={handleScanInput} className="absolute opacity-0 pointer-events-none">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
          autoComplete="off"
        />
      </form>

      {/* Configuration Panel (Left side) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full md:w-80 border-r border-borderDark800 bg-backgroundDark900 flex flex-col print:hidden z-10 shadow-2xl h-full flex-shrink-0"
      >
        <div className="p-4 border-b border-borderDark800 flex justify-between items-center">
            <h2 className="aurum-title-stack text-xl">Configuración</h2>
            <button onClick={onClose} className="aurum-btn-icon-circular w-8 h-8">X</button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          {warning && (
            <div className="bg-amber400/10 border border-amber400/30 text-amber400 p-3 rounded-lg text-sm text-center">
              {warning}
            </div>
          )}

          <div className="space-y-2">
            <label className="aurum-subtitle text-xs">Columnas</label>
            <input 
              type="number" 
              className="aurum-input" 
              value={layout.columns} 
              onChange={(e) => setLayout({...layout, columns: parseInt(e.target.value) || 1})} 
              min="1" max="10" 
            />
          </div>

          <div className="space-y-2">
            <label className="aurum-subtitle text-xs">Filas</label>
            <input 
              type="number" 
              className="aurum-input" 
              value={layout.rows} 
              onChange={(e) => setLayout({...layout, rows: parseInt(e.target.value) || 1})} 
              min="1" max="20" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="aurum-subtitle text-xs">Banner Promocional</label>
            <input 
              type="text" 
              className="aurum-input" 
              placeholder="Ej: OFERTA ESPECIAL"
              value={layout.bannerText} 
              onChange={(e) => setLayout({...layout, bannerText: e.target.value})} 
            />
          </div>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="form-checkbox text-amber400 rounded focus:ring-0 focus:ring-offset-0 bg-backgroundDark950 border-borderDark800 w-5 h-5"
              checked={layout.showBarcode}
              onChange={(e) => setLayout({...layout, showBarcode: e.target.checked})}
            />
            <span className="text-sm">Mostrar Código/ID</span>
          </label>
        </div>

        <div className="p-6 border-t border-borderDark800 space-y-3 bg-backgroundDark950">
           <div className="flex justify-between text-sm text-textDark400 mb-2">
             <span>En cola: {queue.length}</span>
             <span>Capacidad: {maxCapacity}</span>
           </div>
           <button 
             onClick={handlePrint}
             className="w-full aurum-btn-primary"
             disabled={queue.length === 0}
           >
             Imprimir ({queue.length})
           </button>
           <button 
             onClick={() => { setQueue([]); maintainFocus(); }}
             className="w-full aurum-btn-secondary"
             disabled={queue.length === 0}
           >
             Limpiar Cola
           </button>
        </div>
      </motion.div>

      {/* Preview Panel (Right side) / Actual Print Target */}
      <div className="flex-1 overflow-auto bg-[#111] p-8 flex items-center justify-center print:p-0 print:bg-white print:block h-full">
         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
           id="gl-print-sheet-area"
           className="bg-white text-black shadow-2xl relative overflow-hidden print:shadow-none"
           style={{ 
             width: '210mm', 
             height: '297mm', // A4 Dimensions
             padding: '10mm', // Inner page margin
           }}
         >
            <div 
              className="w-full h-full grid gap-1"
              style={{
                 gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                 gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
              }}
            >
               {queue.map((item, i) => (
                 <div key={i} className="border border-black flex flex-col justify-between p-1 overflow-hidden box-border">
                    {layout.bannerText && (
                      <div className="bg-black text-white text-[8px] sm:text-[10px] uppercase font-bold text-center py-0.5 tracking-wider truncate">
                         {layout.bannerText}
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-1">
                       <h3 className="text-xs sm:text-sm font-bold uppercase leading-tight overflow-hidden text-black"
                           style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                         {item.description}
                       </h3>
                       <p className="text-xl sm:text-2xl font-black mt-1 tabular-nums text-black tracking-tighter">
                          ${typeof item.price === 'number' ? item.price.toLocaleString('es-AR') : (item.price || "—")}
                       </p>
                    </div>
                    {layout.showBarcode && (
                      <div className="text-center text-[8px] sm:text-[10px] font-mono font-bold text-black border-t border-black pt-0.5 mt-auto">
                        {item.id}
                      </div>
                    )}
                 </div>
               ))}
            </div>
         </motion.div>
      </div>
    </div>
  );
}
