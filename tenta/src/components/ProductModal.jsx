// INCREMENT: ProductModal.jsx Dual UI (Modal + Swipe Sheet)
// Type: UI Enhancement (Responsive Presentation Layer)
// Scope: Modal layout adapts to device (desktop → modal, mobile → swipe sheet)

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
  useBreakpointValue,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgColor = useColorModeValue("gray.900", "gray.800");

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

  // --- Mobile Swipe-Up Version ---
  if (isMobile) {
    return (
      <AnimatePresence>
        <Box
          pos="fixed"
          inset="0"
          bg="blackAlpha.700"
          backdropFilter="blur(4px)"
          zIndex="overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 70, damping: 18 }}
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              backgroundColor: bgColor,
              borderTopLeftRadius: "1.5rem",
              borderTopRightRadius: "1.5rem",
              padding: "1.25rem",
              boxShadow: "0 -8px 24px rgba(0,0,0,0.5)",
              color: "#FFD700",
            }}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <Box
              w="50px"
              h="5px"
              bg="gray.500"
              borderRadius="full"
              mx="auto"
              mb={3}
            />
            {product ? (
              <VStack align="start" spacing={3}>
                <Text fontWeight="bold" fontSize="lg">
                  {product.description || "Producto"}
                </Text>
                <Text fontSize="sm">
                  <b>Código:</b> {code}
                </Text>
                <Text fontSize="sm">
                  <b>Precio:</b> ${product.price ?? "Sin precio"}
                </Text>

                {product.image && (
                  <Image
                    src={product.image}
                    alt={product.description}
                    borderRadius="md"
                    w="full"
                    objectFit="cover"
                    maxH="200px"
                  />
                )}

                <Box w="full" pt={2} display="flex" gap={2}>
                  <Button
                    flex="1"
                    colorScheme="yellow"
                    onClick={() => setShowUploader(true)}
                  >
                    Subir imagen
                  </Button>
                  <Button flex="1" colorScheme="red" onClick={onClose}>
                    Cerrar
                  </Button>
                </Box>
              </VStack>
            ) : (
              <Text color="gray.400">Cargando...</Text>
            )}
          </motion.div>
        </Box>
      </AnimatePresence>
    );
  }

  // --- Desktop Modal Version ---
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
