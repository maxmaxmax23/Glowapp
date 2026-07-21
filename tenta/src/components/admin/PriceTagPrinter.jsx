import React, { useState, useEffect, useRef, useCallback } from "react";
import { lookupLocalProduct } from "../../utils/localIndex.js";
import { motion } from "framer-motion";

const STORAGE_KEY = "GLOWAPP_SignTemplateCustom";

// Default template structure
const defaultTemplate = {
  bgUrl: "",
  layoutFormat: 10, // 1, 2, 4, 10
  elements: {
    description: { x: 0, y: -50, fontSize: 14, color: "#000000", visible: true, width: 200 },
    price: { x: 0, y: 10, fontSize: 32, color: "#000000", visible: true, width: 150 },
    id: { x: 0, y: 70, fontSize: 10, color: "#666666", visible: true, width: 100 }
  }
};

export default function PriceTagPrinter({ onClose }) {
  const [template, setTemplate] = useState(defaultTemplate);
  const [queue, setQueue] = useState([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
  // Input tracking for scanner
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const lastScanTime = useRef(0);
  const [warning, setWarning] = useState("");

  const editorRef = useRef(null);

  // Load saved template
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTemplate(JSON.parse(saved));
      } catch (e) {
        console.error("Could not parse saved template.");
      }
    }
  }, []);

  // Save template when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
  }, [template]);

  const maintainFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    maintainFocus();
    window.addEventListener("click", maintainFocus);
    return () => window.removeEventListener("click", maintainFocus);
  }, [maintainFocus]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTemplate(prev => ({ ...prev, bgUrl: ev.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanInput = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const queryKey = inputValue.trim();
    setInputValue("");
    
    const now = Date.now();
    if (now - lastScanTime.current < 300) return;
    lastScanTime.current = now;

    if (queue.length >= template.layoutFormat) {
      setWarning(`Límite alcanzado (${template.layoutFormat}). Imprima o limpie cola.`);
      setTimeout(() => setWarning(""), 3000);
      return;
    }

    const results = await lookupLocalProduct(queryKey);
    if (results && results.length > 0) {
      setQueue((prev) => [...prev, results[0]]);
      maintainFocus();
    } else {
      setWarning(`No encontrado: ${queryKey}`);
      setTimeout(() => setWarning(""), 3000);
    }
  };

  const handleDragEnd = (elementKey, info) => {
    let newX = template.elements[elementKey].x + info.offset.x;
    let newY = template.elements[elementKey].y + info.offset.y;

    // Snapping logic (snap to center X=0, or Y=0)
    if (snapEnabled) {
      if (Math.abs(newX) < 15) newX = 0;
      if (Math.abs(newY) < 15) newY = 0;
    }

    setTemplate(prev => ({
      ...prev,
      elements: {
        ...prev.elements,
        [elementKey]: { ...prev.elements[elementKey], x: newX, y: newY }
      }
    }));
    setShowGuidelines(false);
  };

  const updateElementStyle = (key, prop, value) => {
    setTemplate(prev => ({
      ...prev,
      elements: {
        ...prev.elements,
        [key]: { ...prev.elements[key], [prop]: value }
      }
    }));
  };

  // Helper to render an element in the editor
  const renderEditorElement = (key, placeholder) => {
    const el = template.elements[key];
    if (!el.visible) return null;

    return (
      <motion.div
        drag
        dragMomentum={false}
        onDrag={() => setShowGuidelines(true)}
        onDragEnd={(e, info) => handleDragEnd(key, info)}
        initial={{ x: el.x, y: el.y }}
        animate={{ x: el.x, y: el.y }}
        transition={{ type: "tween", duration: 0.1 }}
        style={{
          position: "absolute",
          width: el.width,
          left: `calc(50% - ${el.width / 2}px)`,
          top: `calc(50% - 10px)`, // Rough center offset
          fontSize: el.fontSize,
          color: el.color,
          cursor: "grab",
          textAlign: "center",
          fontWeight: key === 'price' ? 'bold' : 'normal',
          zIndex: 20
        }}
        className="hover:outline hover:outline-dashed hover:outline-amber400 hover:outline-2 active:cursor-grabbing text-center leading-tight drop-shadow-sm"
      >
        {placeholder}
      </motion.div>
    );
  };

  // Helper to render an element in the print output (static)
  const renderPrintElement = (key, text) => {
    const el = template.elements[key];
    if (!el.visible) return null;
    return (
      <div
        style={{
          position: "absolute",
          width: el.width,
          left: `calc(50% - ${el.width / 2}px)`,
          top: `calc(50% - 10px)`,
          transform: `translate(${el.x}px, ${el.y}px)`,
          fontSize: el.fontSize,
          color: el.color,
          textAlign: "center",
          fontWeight: key === 'price' ? 'bold' : 'normal',
          lineHeight: '1.1',
          zIndex: 20
        }}
      >
        {key === 'description' ? (
           <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
             {text}
           </span>
        ) : (
           text
        )}
      </div>
    );
  };

  // Grid classes for print output
  const getGridClasses = () => {
    switch (template.layoutFormat) {
      case 1: return "grid-cols-1 grid-rows-1";
      case 2: return "grid-cols-1 grid-rows-2";
      case 4: return "grid-cols-2 grid-rows-2";
      case 10: return "grid-cols-2 grid-rows-5";
      default: return "grid-cols-2 grid-rows-5";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden text-textLight50">
      
      {/* Invisible Wedge Input */}
      <form onSubmit={handleScanInput} className="absolute opacity-0 pointer-events-none">
        <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus autoComplete="off" />
      </form>

      {/* Editor & Configuration Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full md:w-[450px] border-r border-borderDark800 bg-backgroundDark900 flex flex-col print:hidden z-10 shadow-2xl h-full flex-shrink-0"
      >
        <div className="p-4 border-b border-borderDark800 flex justify-between items-center bg-backgroundDark950">
            <h2 className="aurum-title-stack text-lg">Diseñador de Carteles</h2>
            <button onClick={onClose} className="aurum-btn-icon-circular w-8 h-8">X</button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Main Template Preview (Interactive) */}
          <div className="space-y-2">
            <label className="aurum-subtitle text-xs">Previsualización (Arrastra los textos)</label>
            <div 
              className="relative w-full aspect-[3/2] bg-white rounded-lg border border-borderDark800 overflow-hidden"
              ref={editorRef}
            >
              {template.bgUrl && (
                <img src={template.bgUrl} alt="Fondo" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              )}
              
              {/* Guidelines */}
              {snapEnabled && showGuidelines && (
                <>
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber400/50 pointer-events-none z-10"></div>
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber400/50 pointer-events-none z-10"></div>
                </>
              )}

              {renderEditorElement('description', 'Nombre del Producto Extenso')}
              {renderEditorElement('price', '$9,999')}
              {renderEditorElement('id', '123456789')}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2 space-y-2">
               <label className="aurum-subtitle text-xs">Fondo (PNG/SVG)</label>
               <input type="file" accept="image/png, image/svg+xml, image/jpeg" onChange={handleImageUpload} className="aurum-input py-3 text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber400 file:text-black hover:file:bg-amber-300" />
             </div>

             <div className="col-span-2 space-y-2">
               <label className="aurum-subtitle text-xs">Formato de Página</label>
               <select 
                 className="aurum-input"
                 value={template.layoutFormat}
                 onChange={(e) => setTemplate({...template, layoutFormat: parseInt(e.target.value)})}
               >
                 <option value={1}>1 por hoja (Cartel Completo)</option>
                 <option value={2}>2 por hoja (Mitad)</option>
                 <option value={4}>4 por hoja (Cuartos)</option>
                 <option value={10}>10 por hoja (Góndola)</option>
               </select>
             </div>

             <label className="col-span-2 flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="form-checkbox text-amber400 rounded focus:ring-0 focus:ring-offset-0 bg-backgroundDark950 border-borderDark800 w-5 h-5" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
                <span className="text-sm">Ajuste Magnético (Snap) a guías</span>
             </label>
          </div>

          <div className="h-px bg-borderDark800 w-full"></div>

          {/* Tools for selected elements */}
          {['description', 'price', 'id'].map(key => (
            <div key={key} className="space-y-3 bg-backgroundDark950 p-4 rounded-xl border border-borderDark800">
               <div className="flex justify-between items-center">
                 <span className="aurum-subtitle text-xs capitalize">{key === 'description' ? 'Producto' : key === 'price' ? 'Precio' : 'Código'}</span>
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox text-amber400 rounded bg-black border-borderDark800 w-4 h-4" checked={template.elements[key].visible} onChange={(e) => updateElementStyle(key, 'visible', e.target.checked)} />
                    <span className="text-xs text-textDark400">Visible</span>
                 </label>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-xs text-textDark400">Tamaño (px)</label>
                   <input type="number" className="aurum-input h-10 text-sm" value={template.elements[key].fontSize} onChange={(e) => updateElementStyle(key, 'fontSize', parseInt(e.target.value) || 12)} />
                 </div>
                 <div>
                   <label className="text-xs text-textDark400">Ancho Max (px)</label>
                   <input type="number" className="aurum-input h-10 text-sm" value={template.elements[key].width} onChange={(e) => updateElementStyle(key, 'width', parseInt(e.target.value) || 100)} />
                 </div>
                 <div className="col-span-2 flex items-center gap-3">
                   <label className="text-xs text-textDark400">Color</label>
                   <input type="color" className="w-8 h-8 p-0 border-0 bg-transparent rounded cursor-pointer" value={template.elements[key].color} onChange={(e) => updateElementStyle(key, 'color', e.target.value)} />
                 </div>
               </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-borderDark800 space-y-3 bg-backgroundDark950">
           {warning && <div className="text-amber400 text-xs text-center">{warning}</div>}
           <div className="flex justify-between text-sm text-textDark400 mb-2">
             <span>En cola: <b className="text-white">{queue.length}</b></span>
             <span>Capacidad: <b className="text-white">{template.layoutFormat}</b></span>
           </div>
           <button onClick={() => window.print()} className="w-full aurum-btn-primary" disabled={queue.length === 0}>
             Imprimir ({queue.length})
           </button>
           <button onClick={() => { setQueue([]); maintainFocus(); }} className="w-full aurum-btn-secondary" disabled={queue.length === 0}>
             Limpiar Cola
           </button>
        </div>
      </motion.div>

      {/* Spooler / Print Preview Area */}
      <div className="flex-1 overflow-auto bg-[#111] p-8 flex items-center justify-center print:p-0 print:bg-white print:block h-full">
         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
           id="gl-print-sheet-area"
           className="bg-white text-black shadow-2xl relative overflow-hidden print:shadow-none"
           style={{ width: '210mm', height: '297mm', padding: '10mm' }}
         >
            <div className={`w-full h-full grid gap-2 ${getGridClasses()}`}>
               {queue.map((item, i) => (
                 <div key={i} className="relative w-full h-full overflow-hidden border border-gray-100 flex items-center justify-center">
                    {/* Background Graphic */}
                    {template.bgUrl && (
                      <img src={template.bgUrl} alt="Fondo" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    
                    {/* Elements mapped exactly to editor coordinates */}
                    {renderPrintElement('description', item.description)}
                    {renderPrintElement('price', `$${typeof item.price === 'number' ? item.price.toLocaleString('es-AR') : (item.price || "—")}`)}
                    {renderPrintElement('id', item.id)}
                 </div>
               ))}
            </div>
         </motion.div>
      </div>
    </div>
  );
}
