// File: src/components/ProductModal.jsx
import React, { useState, useEffect } from "react";
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
  useBreakpointValue,
} from "@chakra-ui/react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

/*
  Partial-bottom sheet (mobile-first) that:
  - starts partially open (PARTIAL_RATIO)
  - drag up to snap to full, drag down to close
  - velocity-sensitive flick-to-close
  - blurred overlay and subtle lift/scale while dragging
  - DOES NOT change your product logic (only presentation)
*/

const MotionDiv = motion.div;
const MotionOverlay = motion(DrawerOverlay);

export default function ProductModal({ code, onClose }) {
  const [product, setProduct] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

  // only treat small screens as mobile bottom-sheet by default
  const isMobile = useBreakpointValue({ base: true, md: false });

  // motion y value: 0 = fully open (top), positive = pushed down (partial)
  const y = useMotionValue(0);

  // overlay opacity + lift/scale derived from y
  const overlayOpacity = useTransform(y, [0, 1], [0.8, 0.35]); // we'll map later
  const scale = useTransform(y, [0, 300], [1, 0.995]);
  const boxShadow = useTransform(y, [0, 300], [
    "0 30px 60px rgba(0,0,0,0.45)",
    "0 8px 24px rgba(0,0,0,0.25)",
  ]);

  // sizes computed client-side
  const [vh, setVh] = useState(800);
  useEffect(() => {
    if (typeof window !== "undefined") setVh(window.innerHeight);
  }, []);

  // PARTIAL_RATIO: how much of screen is hidden initially (0.6 means 60% hidden,
  // so sheet shows 40% height). Tune this for "native" feel.
  const PARTIAL_RATIO = 0.6;
  const PARTIAL_PX = vh * PARTIAL_RATIO; // y value when partially open
  const CLOSE_THRESHOLD_PX = vh * 0.45; // if dragged beyond this (downwards) close
  const VELOCITY_CLOSE = 900; // px/sec downward flick closes immediately

  // fetch product data (unchanged logic)
  useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", code);
        const snapshot = await getDoc(docRef);
        if (!mounted) return;
        if (snapshot.exists()) setProduct({ id: snapshot.id, ...snapshot.data() });
        else setProduct({ id: code, notFound: true });
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    };
    if (code) fetchProduct();
    return () => (mounted = false);
  }, [code]);

  // ensure uploader still works as before
  if (showUploader)
    return <ProductUploaderModal product={product} onClose={() => setShowUploader(false)} />;

  // set initial position to partial on mount
  useEffect(() => {
    // set initial y to PARTIAL_PX (pushed down)
    y.set(PARTIAL_PX);
    // also map overlay opacity properly (we use numeric mapping in style below)
    // no cleanup needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PARTIAL_PX]);

  // handle drag end snapping/closing
  const handleDragEnd = (event, info) => {
    const currentY = y.get(); // distance dragged (positive = down)
    const velocityY = info.velocity?.y ?? 0;

    // if fast downward flick OR dragged far down => close
    if (velocityY > VELOCITY_CLOSE || currentY > CLOSE_THRESHOLD_PX) {
      // animate out then call onClose
      animate(y, vh + 30, { type: "spring", stiffness: 300, damping: 30, onComplete: onClose });
      return;
    }

    // if dragged sufficiently up -> snap to full open
    if (currentY < PARTIAL_PX * 0.4) {
      animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }

    // otherwise snap back to partial
    animate(y, PARTIAL_PX, { type: "spring", stiffness: 300, damping: 28 });
  };

  // overlay opacity style value (map y range to opacity)
  const overlayOpacityNumber = (val) => {
    // Map y [0, PARTIAL_PX] => opacity [0.8, 0.35]
    const t = Math.min(Math.max(val / PARTIAL_PX, 0), 1);
    return 0.8 - (0.8 - 0.35) * t;
  };

  // Render drawer with motion inner sheet so the rest of the app stays untouched
  return (
    <Drawer
      isOpen={Boolean(code)} // mounted only when code present, defensive
      placement="bottom"
      onClose={onClose}
      size="full"
      autoFocus={false}
      trapFocus={false}
    >
      {/* Motion overlay so we can animate opacity/blur */}
      <MotionOverlay
        bg="blackAlpha.800"
        style={{
          // read current y to set opacity; fallback to 0.6
          opacity: overlayOpacity,
          backdropFilter: "blur(6px)",
        }}
      />

      <DrawerContent
        borderTopRadius="2xl"
        bg="transparent"
        // place content at the bottom so inner card sits bottom and can be dragged
        display="flex"
        flexDirection="column"
        justifyContent="flex-end"
        // ensure no default DrawerContent overflow surprises
        overflow="visible"
      >
        {/* Inner card — the actual visual sheet that moves */}
        <MotionDiv
          drag="y"
          dragConstraints={{ top: 0, bottom: PARTIAL_PX + 40 }} // allow a little extra drag
          dragElastic={0.16}
          onDragEnd={handleDragEnd}
          style={{
            y,
            // derive style values from motion transforms
            boxShadow,
            scale,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            background: "#111216", // dark background for the sheet
            width: "100%",
            maxHeight: "90vh",
            borderTop: "1px solid rgba(255,255,255,0.02)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* grab handle */}
          <Box w="40px" h="4px" bg="gray.600" borderRadius="full" mx="auto" mt={2} mb={3} />

          <DrawerHeader textAlign="center" color="gold">
            {product ? product.description || "Producto" : "Cargando..."}
          </DrawerHeader>

          <DrawerBody style={{ paddingBottom: 8, paddingTop: 0 }}>
            {product ? (
              <VStack spacing={4} align="start">
                <Text color="gold">
                  <b>Código:</b> {product.id || code}
                </Text>

                <Text color="gray.300">
                  <b>Precio:</b> ${product.price ?? "Sin precio"}
                </Text>

                {product.photoURL && (
                  <Image
                    src={product.photoURL}
                    alt={product.description}
                    w="full"
                    borderRadius="md"
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
        </MotionDiv>
      </DrawerContent>
    </Drawer>
  );
}
