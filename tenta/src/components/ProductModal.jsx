// File: src/components/ProductModal.jsx
// INCREMENT: Mobile swipe-up modal with rubber-band animation
// Layer: Presentation enhancement (mobile only)

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
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isDesktop] = useMediaQuery("(min-width: 768px)");

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
    return (
      <ProductUploaderModal
        product={product}
        onClose={() => setShowUploader(false)}
      />
    );

  // --- Mobile swipe-up + rubber-band close ---
  if (!isDesktop) {
    const y = useMotionValue(0);
    const opacity = useTransform(y, [0, 250], [1, 0.3]);
    let startY = 0;
    const maxDrag = 180;
    const threshold = 100;

    const handleTouchStart = (e) => {
      startY = e.touches ? e.touches[0].clientY : e.clientY;
    };

    const handleTouchMove = (e) => {
      const currentY = e.touches ? e.touches[0].clientY : e.clientY;
      let diff = currentY - startY;
      if (diff > 0) {
        const resistance =
          diff > maxDrag ? maxDrag + (diff - maxDrag) * 0.3 : diff;
        y.set(resistance);
      }
    };

    const handleTouchEnd = () => {
      if (y.get() > threshold) {
        animate(y, 600, {
          type: "spring",
          stiffness: 200,
          damping: 30,
          onComplete: onClose,
        });
      } else {
        animate(y, 0, {
          type: "spring",
          stiffness: 300,
          damping: 20,
        });
      }
    };

    return (
      <Modal isOpen onClose={onClose} size="full" motionPreset="none">
        <ModalOverlay bg="blackAlpha.700" style={{ opacity }} />
        <ModalContent
          as={motion.div}
          style={{ y }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          bg="gray.900"
          color="gold"
          borderTopRadius="2xl"
          p={4}
          h="80vh"
          overflowY="auto"
          position="absolute"
          bottom="0"
        >
          <ModalHeader textAlign="center" cursor="grab">
            <Box
              w="40px"
              h="4px"
              bg="gray.600"
              borderRadius="full"
              mx="auto"
              mb={2}
            />
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

          <ModalFooter justifyContent="space-between">
            <Button colorScheme="yellow" onClick={() => setShowUploader(true)}>
              Subir imagen
            </Button>
            <Button colorScheme="red" onClick={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  // --- Desktop fallback ---
  return (
    <Modal isOpen onClose={onClose} isCentered size="md" motionPreset="scale">
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" borderRadius="xl" p={4}>
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
            <Button colorScheme="yellow" onClick={() => setShowUploader(true)}>
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
