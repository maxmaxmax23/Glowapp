// INCREMENT: ProductModal.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Modal layout, buttons, image display (thumbnail patch)
// Mode: Candidate (test preview before full integration)

import { useState, useEffect } from "react";
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
} from "@chakra-ui/react";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", code);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) setProduct(snapshot.data());
        else setProduct({ id: code, notFound: true });
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    };
    fetchProduct();
  }, [code]);

  if (showUploader)
    return <ProductUploaderModal product={product} onClose={() => setShowUploader(false)} />;

  return (
    <Drawer
      isOpen
      placement="bottom"
      onClose={onClose}
      size="full"   // keeps native sheet feel, can drag
    >
      <DrawerOverlay />
      <DrawerContent bg="gray.900" color="gold" borderTopRadius="xl">
        <DrawerHeader textAlign="center">
          {product ? product.description || "Producto" : "Cargando..."}
        </DrawerHeader>
        <DrawerBody>
          {product ? (
            <VStack spacing={3} align="start">
              <Text>
                <b>Código:</b> {code}
              </Text>
              <Text>
                <b>Precio:</b> ${product.price ?? "Sin precio"}
              </Text>

              {product.photoURL && (
                <Image
                  src={product.photoURL}
                  alt={product.description}
                  w="20%"           // small thumbnail width
                  maxH="80px"       // limit height to prevent drawer skew
                  borderRadius="md"
                  objectFit="cover"
                  cursor="pointer"  // hint that it can be expanded in the future
                  onClick={() => {
                    // Optional future: expand image in full screen
                  }}
                />
              )}
            </VStack>
          ) : (
            <Text>Cargando...</Text>
          )}
        </DrawerBody>
        {product && (
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
