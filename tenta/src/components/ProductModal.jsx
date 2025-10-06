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
  Text,
  VStack,
  Image,
  Box,
  useBreakpointValue,
} from "@chakra-ui/react";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  const isMobile = useBreakpointValue({ base: true, md: false });

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

  const DrawerContentInner = (
    <>
      {isMobile && (
        <Box w="40px" h="4px" bg="gray.500" borderRadius="full" mx="auto" my={2} />
      )}
      <DrawerHeader fontFamily="'Distrampler', serif" fontSize="2xl" textAlign="center">
        {product ? product.description || "Producto" : "Cargando..."}
      </DrawerHeader>
      <DrawerBody>
        {product ? (
          <VStack spacing={4} align="start" fontFamily="Arial, sans-serif">
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
                w="full"
                borderRadius="lg"
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
    </>
  );

  return (
    <Drawer
      isOpen={true}        // force drawer open
      placement={isMobile ? "bottom" : "right"}
      onClose={onClose}
      size={isMobile ? "full" : "md"}
    >
      <DrawerOverlay />
      <DrawerContent
        bg="gray.900"
        color="gold"
        borderTopRadius={isMobile ? "2xl" : "none"}
        borderLeftRadius={isMobile ? "none" : "2xl"}
      >
        {DrawerContentInner}
      </DrawerContent>
    </Drawer>
  );
}
