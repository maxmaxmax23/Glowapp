// File: src/components/ProductUploaderModal.jsx (FINAL PATCH - ID Validation and Sync Integration)
import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, Timestamp } from "firebase/firestore"; // ADDITION: Import Timestamp
import { updateLocalProduct } from "../utils/localIndex"; // ADDITION: Import local update utility
import {
  Box,
  VStack,
  Text,
  Button,
  Image,
  Input,
  Center,
  Spinner,
} from "@chakra-ui/react";

export default function ProductUploaderModal({ product, onClose }) {
  const [photoURL, setPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  if (!product) return null;

  // Load existing photo from Firestore on mount
  useEffect(() => {
    if (product.photoURL) {
      setPhotoURL(product.photoURL);
    } else {
      const tryFetchExisting = async () => {
        try {
          // Note: This logic correctly uses product.id but should be secured by the validation below
          const fileRef = ref(storage, `images/${product.id}.jpg`);
          const url = await getDownloadURL(fileRef);
          setPhotoURL(url);
        } catch {
          // silently ignore
        }
      };
      // Only attempt to fetch if an ID exists
      if (product.id) {
          tryFetchExisting();
      }
    }
  }, [product]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await uploadImage(file);
  };

  const handleTakePhoto = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) await uploadImage(file);
      };
      input.click();
    } catch (err) {
      console.error("Camera error:", err);
      setMessage("Camera not supported on this device.");
    }
  };

  const uploadImage = async (file) => {
    // CRITICAL FIX: Block upload if the ID is invalid to prevent 'undefined.jpg' corruption.
    if (!product.id || product.id === 'undefined') {
      console.error("Upload Error: Product ID is missing or invalid.");
      setMessage("❌ ERROR: El producto debe ser guardado y tener un ID válido antes de subir la foto.");
      setUploading(false);
      return;
    }

    try {
      setUploading(true);
      
      // Use the now-validated product.id
      const fileRef = ref(storage, `images/${product.id}.jpg`); 
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const updateData = {
        photoURL: url,
        lastUpdated: Timestamp.now() // CRITICAL: Updates Firestore timestamp for sync
      };

      // 1. Write to Firestore (Source of Truth)
      await updateDoc(doc(db, "products", product.id), updateData);
      
      // 2. Write to Local Index (Instant UX Fix)
      await updateLocalProduct({ 
          id: product.id, 
          photoURL: url,
          lastUpdated: Date.now() 
      });

      setPhotoURL(url);
      setMessage("✅ Foto subida exitosamente y caché actualizada.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Falló la subida de la foto. Revisa la consola/reglas de Firebase.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.900"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={4}
      zIndex={50}
      overflowY="auto"
    >
      <Box
        maxW="md"
        w="full"
        bg="gray.900"
        color="gold"
        borderRadius="xl"
        p={4}
        textAlign="center"
      >
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          {product.description}
        </Text>

        {photoURL ? (
          <Image
            src={photoURL}
            alt="Product"
            w="full"
            h="48"
            objectFit="cover"
            borderRadius="lg"
            mb={3}
          />
        ) : (
          <Center
            w="full"
            h="48"
            bg="gray.800"
            borderRadius="lg"
            mb={3}
          >
            <Text>No photo yet</Text>
          </Center>
        )}

        <VStack spacing={2}>
          <Button
            onClick={handleTakePhoto}
            colorScheme="gold"
            w="full"
            isDisabled={uploading}
          >
            📷 Tomar Foto
          </Button>

          <Button
            as="label"
            colorScheme="gold"
            w="full"
            cursor="pointer"
            isDisabled={uploading}
          >
            🖼️ Seleccionar Archivo
            <Input
              type="file"
              accept="image/*"
              display="none"
              onChange={handleFileSelect}
            />
          </Button>

          {uploading && <Spinner size="sm" color="gold" />}

          {message && <Text fontSize="sm">{message}</Text>}

          <Button
            onClick={onClose}
            variant="outline"
            borderColor="gold"
            color="gold"
            _hover={{ bg: "gold", color: "black" }}
            w="full"
          >
            Cerrar
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
