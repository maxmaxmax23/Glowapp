// File: src/components/ProductUploaderModal.jsx
import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
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
          const fileRef = ref(storage, `images/${product.id}.jpg`);
          const url = await getDownloadURL(fileRef);
          setPhotoURL(url);
        } catch {
          // silently ignore
        }
      };
      tryFetchExisting();
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
    try {
      setUploading(true);
      const fileRef = ref(storage, `images/${product.id}.jpg`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await updateDoc(doc(db, "products", product.id), { photoURL: url });

      setPhotoURL(url);
      setMessage("✅ Photo uploaded successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed.");
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
            📷 Take Photo
          </Button>

          <Button
            as="label"
            colorScheme="gold"
            w="full"
            cursor="pointer"
            isDisabled={uploading}
          >
            🖼️ Select File
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
            Close
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}
