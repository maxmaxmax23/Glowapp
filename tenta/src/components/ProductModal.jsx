// File: src/components/ProductModal.jsx
// INCREMENT: ProductModal.jsx Mobile Swipe-Up Enhancement
// Type: UI Enhancement
// Scope: Mobile swipe-up bottom sheet style
// Mode: Candidate (test preview before full integration)

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Image,
  Text,
  VStack,
  Box,
  useMediaQuery,
} from "@chakra-ui/react";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  // Detect mobile devices
  const [isWide] = useMediaQuery("(min-width: 768px)");
  const isMobile = !isWide || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
    <Modal
      isOpen
      onClose={onClose}
      isCentered={!isMobile} // centered only on desktop
      size={isMobile ? "full" : "md"} // full-screen for mobile
      motionPreset="slideInBottom"
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent
        bg="gray.900"
        color="gold"
        borderTopRadius={isMobile ? "2xl" : "xl"}
        borderRadius={!isMobile ? "xl" : "2xl 2xl 0 0"}
        mt={isMobile ? "auto" : 0} // bottom sheet alignment
        pb={isMobile ? "env(safe-area-inset-bottom)" : 4} // safe area for mobile
      >
        <ModalHeader textAlign="center">
          {product ? product.description || "Producto" : "Cargando..."}
        </ModalHeader>
        <ModalBody>
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
        </ModalBody>

        {product && (
          <ModalFooter justifyContent="space-between">
            <Button colorScheme="gold" onClick={() => setShowUploader(true)}>
              Subir imagen
            </Button>
            <Button colorScheme="red" onClick={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
