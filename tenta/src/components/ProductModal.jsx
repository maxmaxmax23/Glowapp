// File: src/components/ProductModal.jsx (PATCHED - Local Cache Priority)

import { useState, useEffect } from "react";
// ADDITION: Import local index utility
import { lookupLocalProduct } from "../utils/localIndex.js"; 
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Image,
  Text,
  VStack,
  Box,
  Spinner, // ADDITION: Import Spinner for loading state
} from "@chakra-ui/react";

export default function ProductModal({ product: initialProduct, onClose }) {
  // MODIFICATION: Use local state to manage the product, initializing with the prop
  // The prop 'product' now contains the full object from the scanner's successful lookup (from App.jsx)
  const [product, setProduct] = useState(initialProduct); 
  const [showUploader, setShowUploader] = useState(false);
  const [loading, setLoading] = useState(true); // ADDITION: New loading state

  // We need the ID from the prop, as App.jsx now sends the full object
  const productId = initialProduct?.id; 

  useEffect(() => {
    // MODIFICATION: Check if the initial product data is complete enough (e.g., has price/description).
    // If App.jsx passes the full object, we don't need to do a fetch.
    if (product && product.price) {
      setLoading(false);
      return; 
    }

    const fetchProduct = async () => {
      if (!productId) {
        setProduct({ id: 'N/A', description: 'ID no proporcionado', notFound: true });
        setLoading(false);
        return;
      }
      
      setLoading(true);
      let productData = null;

      // 1. ATTEMPT LOCAL LOOKUP (Cost-Optimized Path)
      try {
        // Use lookupLocalProduct which handles IDs and returns an array.
        const localResults = await lookupLocalProduct(productId);
        if (localResults && localResults.length > 0) {
          productData = localResults[0];
          console.log(`Product ${productId} found in local cache.`);
        }
      } catch (localErr) {
        console.warn("Local cache lookup error, falling back to Firestore:", localErr);
      }
      
      // 2. FALLBACK TO FIRESTORE (Source-of-Truth Path, only if local fails)
      if (!productData) {
        try {
          const docRef = doc(db, "products", productId);
          const snapshot = await getDoc(docRef); // Targeted Firestore Read (1 read)
          
          if (snapshot.exists()) {
            productData = { id: snapshot.id, ...snapshot.data() };
            console.log(`Product ${productId} fetched live from Firestore.`);
          }
        } catch (firestoreErr) {
          console.error("Error fetching product live from Firestore:", firestoreErr);
        }
      }

      // 3. Set Final State
      if (productData) {
        setProduct(productData);
      } else {
        setProduct({ id: productId, notFound: true, description: "Producto No Encontrado" });
      }
      setLoading(false);

    };
    fetchProduct();
  }, [productId, initialProduct]); // Depend on product ID and the initial prop for safety

  if (showUploader)
    return <ProductUploaderModal product={product} onClose={() => setShowUploader(false)} />;

  return (
    <Drawer
      isOpen
      placement="bottom"
      onClose={onClose}
      size="full" 
    >
      <DrawerOverlay />
      <DrawerContent bg="gray.900" color="gold" borderTopRadius="xl">
        <DrawerHeader textAlign="center">
          {product ? product.description || "Producto" : "Cargando..."}
        </DrawerHeader>
        <DrawerBody>
          {loading ? ( // ADDITION: Display spinner while loading
            <Center h="100%">
              <VStack>
                <Spinner size="lg" color="gold" />
                <Text>Verificando base de datos...</Text>
              </VStack>
            </Center>
          ) : product && product.notFound ? ( // Handle Not Found Case
            <Text color="red.400" textAlign="center">
              Producto con código **{productId}** no encontrado en la base de datos.
            </Text>
          ) : product ? (
            <VStack spacing={3} align="start">
              <Text>
                <b>Código:</b> {productId}
              </Text>
              <Text>
                <b>Descripción:</b> {product.description} 
              </Text>
              <Text>
                <b>Stock:</b> {product.stock ?? "N/A"} 
              </Text>
              <Text>
                <b>Precio:</b> ${product.price ?? "Sin precio"}
              </Text>

              {product.photoURL && (
                <Image
                  src={product.photoURL}
                  alt={product.description}
                  w="20%"
                  maxH="80px"
                  borderRadius="md"
                  objectFit="cover"
                  cursor="pointer" 
                  onClick={() => {}}
                />
              )}
            </VStack>
          ) : (
            <Text>Error al cargar datos.</Text>
          )}
        </DrawerBody>
        {/* Only show footer if not loading and a product (or notFound) exists */}
        {!loading && product && (
          <DrawerFooter justifyContent="space-between">
            <Button colorScheme="gold" onClick={() => setShowUploader(true)}>
              Subir imagen
            </Button>
            <Button colorScheme="red" onClick={onClose}>
              Cerrar
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}