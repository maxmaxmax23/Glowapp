// File: src/components/ProductModal.jsx
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import ProductUploaderModal from "./ProductUploaderModal.jsx";
import {
  Modal,
  ModalOverlay,
  ModalBody,
  ModalFooter,
  Button,
  Image,
  Text,
  VStack,
  Box,
  useMediaQuery,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";

const MotionModalContent = motion.div;

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  const [isWide] = useMediaQuery("(min-width: 768px)");
  const isMobile = !isWide || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const [dragY, setDragY] = useState(0);

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

  if (!isMobile) {
    // Desktop: normal Chakra modal
    return (
      <Modal isOpen onClose={onClose} isCentered size="md">
        <ModalOverlay bg="blackAlpha.800" />
        <MotionModalContent
          style={{ background: "#1a202c", color: "gold", borderRadius: "xl", padding: "16px" }}
        >
          <VStack spacing={3} align="start">
            <Text fontWeight="bold">{product?.description || "Producto"}</Text>
            <Text>
              <b>Código:</b> {code}
            </Text>
            <Text>
              <b>Precio:</b> ${product?.price ?? "Sin precio"}
            </Text>
            {product?.image && (
              <Image src={product.image} alt={product.description} borderRadius="md" w="full" />
            )}
          </VStack>
          <ModalFooter justifyContent="space-between">
            <Button colorScheme="gold" onClick={() => setShowUploader(true)}>
              Subir imagen
            </Button>
            <Button colorScheme="red" onClick={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </MotionModalContent>
      </Modal>
    );
  }

  // Mobile: swipeable bottom sheet
  return (
    <AnimatePresence>
      <Modal isOpen onClose={onClose} isCentered={false} size="full" motionPreset="none">
        <ModalOverlay bg="blackAlpha.800" />
        <MotionModalContent
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDrag={(e, info) => setDragY(info.point.y)}
          onDragEnd={(e, info) => {
            if (info.point.y > window.innerHeight * 0.25) onClose();
            setDragY(0);
          }}
          style={{
            y: dragY,
            background: "#1a202c",
            color: "gold",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            width: "100%",
            bottom: 0,
            position: "absolute",
            maxHeight: "90vh",
            padding: "16px",
          }}
        >
          {/* Handle Bar */}
          <Box
            w="36px"
            h="4px"
            bg="gray.500"
            borderRadius="2px"
            mx="auto"
            mb={3}
          />

          <VStack spacing={3} align="start">
            <Text fontWeight="bold" textAlign="center" w="full">
              {product?.description || "Producto"}
            </Text>
            <Text>
              <b>Código:</b> {code}
            </Text>
            <Text>
              <b>Precio:</b> ${product?.price ?? "Sin precio"}
            </Text>
            {product?.image && (
              <Image src={product.image} alt={product.description} borderRadius="md" w="full" />
            )}
          </VStack>

          <ModalFooter justifyContent="space-between">
            <Button colorScheme="gold" onClick={() => setShowUploader(true)}>
              Subir imagen
            </Button>
            <Button colorScheme="red" onClick={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </MotionModalContent>
      </Modal>
    </AnimatePresence>
  );
}
