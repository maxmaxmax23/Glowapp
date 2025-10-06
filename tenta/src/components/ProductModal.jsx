import { useState, useEffect, useRef } from "react";
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
import { motion, useMotionValue, useDragControls } from "framer-motion";

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isFull, setIsFull] = useState(false);

  const controls = useDragControls();
  const y = useMotionValue(0);
  const drawerRef = useRef(null);

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
        bg="gray.900"
        as={motion.div}
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 500 }}
        dragElastic={0.2}
        dragControls={controls}
        onDragEnd={(event, info) => {
          if (info.point.y > window.innerHeight / 2) {
            onClose(); // swipe down to close
          } else {
            y.set(0); // snap to top
            setIsFull(true);
          }
        }}
      >
        <DrawerHeader
          borderBottom="1px"
          borderColor="gray.700"
          cursor="grab"
          textAlign="center"
          p={3}
        >
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
