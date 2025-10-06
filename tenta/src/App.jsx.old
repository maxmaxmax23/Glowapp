import { useEffect, useState, Fragment} from 'react'
import './App.css'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Popover } from '@headlessui/react'
import './index.jsx'
import Lista from "./tentadb.json"


function App() {
  const [scanResult, setScanResult] = useState(null);
  const [codigoAr, setCodigoAr] = useState(0);
  let [isOpen, setIsOpen] = useState(false)
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width:250,
        height: 250,
      },
      fps: 10,
      aspectRatio: 2,
      focusMode: "continuous",
    });
  
   scanner.render(success, error);

   function success (result) {
    scanner.clear();
    setScanResult(String(result));
  
   }
   
   function error(err) {
    console.warn(err);
   }
  
  },[]);

  return (

   <> 
   
   <div className='App'>
   {scanResult ? (
  <div>
    CODIGO:
    <Popover className="relative">
      <Popover.Button className="px-1.5em py-2em text-lg text-logo-shaddow font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-pink-shaddow hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2">
        {scanResult}
      </Popover.Button>

      <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-screen max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
        {Lista.filter((precio) => precio.id === scanResult).length > 0 ? (
          <div className="grid grid-cols-1">
            <div className="justify-self-center mt-1 text-xl font-semibold uppercase leading-tight truncate">
              {Lista.filter((precio) => precio.id === scanResult).map((precio) => (
                <div key={precio.precio}>${precio.precio}</div>
              ))}
            </div>
            <div className="justify-self-center mt-1 text-xl font-semibold uppercase leading-tight truncate">
              {Lista.filter((precio) => precio.id === scanResult).map((precio) => (
                <div key={precio.descripcion}>{precio.descripcion}</div>
              ))}
            </div>
          </div>
        ) : (
          <div>No hay datos para {scanResult}. Consultar en CAJA</div>
        )}
      </Popover.Panel>
    </Popover>
  </div>
) : (
  <div id="reader"></div>
)}

</div>
 
    </>  
  );

}
export default App
