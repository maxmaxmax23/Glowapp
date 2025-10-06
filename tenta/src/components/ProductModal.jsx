// File: src/components/ProductModal.jsx
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
      size="full"
      autoFocus={false}
      trapFocus={false}
    >
      <DrawerOverlay bg="blackAlpha.800" />
      <DrawerContent
        borderTopRadius="2xl"
        maxH="90vh"
        mt="auto"
        bg="gray.900"
        color="gold"
      >
        {/* Drag handle */}
        <Box
          w="12"
          h="1.5"
          bg="gray.600"
          borderRadius="full"
          mx="auto"
          mt="2"
          mb="3"
        />

        <DrawerHeader textAlign="center">
          {product ? product.description || "Producto" : "Cargando..."}
        </DrawerHeader>

        <DrawerBody overflowY="auto">
          {product ? (
            <VStack spacing={3} align="start">
              <Text>
                <b>Código:</b> {code}
              </Text>
              <Text>
                <b>Precio:</b> ${product.price ?? "Sin precio"}
              </Text>
              {product.image && (
                <Image
                  src={product.image}
                  alt={product.description}
                  borderRadius="md"
                  w="full"
                  objectFit="cover"
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
