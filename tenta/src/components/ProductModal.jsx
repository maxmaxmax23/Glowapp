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
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const y = useMotionValue(0);

  // Transform y to create shadow/lift effect
  const shadow = useTransform(y, [-200, 0, 200], [50, 20, 0]);
  const scale = useTransform(y, [-200, 0, 200], [1.02, 1, 0.98]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", code);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) setProduct(snapshot.data());
        else setProduct({ id: code, notFound: true });
      } catch (err) {
        console.error(err);
      }
    };
    fetchProduct();
  }, [code]);

  if (showUploader)
    return <ProductUploaderModal product={product} onClose={() => setShowUploader(false)} />;

  const PARTIAL_HEIGHT = window.innerHeight * 0.4;
  const FULL_HEIGHT = 0;

  const snapToHeight = (dragY, velocityY) => {
    const threshold = window.innerHeight * 0.25;

    if (velocityY > 800 || dragY > PARTIAL_HEIGHT + threshold) {
      onClose();
    } else if (dragY < threshold) {
      animate(y, FULL_HEIGHT, { type: "spring", stiffness: 500, damping: 35 });
    } else {
      animate(y, -PARTIAL_HEIGHT, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  return (
    <Drawer
      isOpen
      placement="bottom"
      onClose={onClose}
      size="full"
      autoFocus={false}
      trapFocus={false}
    >
      <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
      <DrawerContent
        borderTopRadius="2xl"
        bg="gray.900"
        as={motion.div}
        style={{ y, boxShadow: shadow, scale }}
        drag="y"
        dragConstraints={{ top: -PARTIAL_HEIGHT, bottom: window.innerHeight }}
        dragElastic={0.2}
        onDragEnd={(event, info) => snapToHeight(info.point.y, info.velocity.y)}
        initial={{ y: PARTIAL_HEIGHT }}
        animate={{ y: -PARTIAL_HEIGHT }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <Box
          w="40px"
          h="4px"
          bg="gray.500"
          borderRadius="2px"
          mx="auto"
          mt={2}
          mb={3}
          cursor="grab"
        />

        <DrawerHeader borderBottom="1px" borderColor="gray.700" textAlign="center" p={2}>
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
