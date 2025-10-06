// INCREMENT: ProductUploaderModal.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Modal layout, image preview, buttons
// Mode: Candidate (test preview before integration)

import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Box,
  Button,
  Image,
  VStack,
  Text,
  Spinner,
} from "@chakra-ui/react";

export default function ProductUploaderModal({ product, onClose }) {
  const [photoURL, setPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  if (!product) return null;

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
          // no existing image found
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
    <Modal isOpen={true} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent bg="gray.900" color="gold" rounded="2xl">
        <ModalHeader textAlign="center">{product.description}</ModalHeader>
        <ModalBody>
          <VStack spacing={3}>
            {photoURL ? (
              <Image
                src={photoURL}
                alt="Product"
                w="full"
                h="48"
                objectFit="cover"
                borderRadius="md"
              />
            ) : (
              <Box
                w="full"
                h="48"
                bg="gray.800"
                rounded="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text>No photo yet</Text>
              </Box>
            )}

            <VStack spacing={2} w="full">
              <Button
                onClick={handleTakePhoto}
                colorScheme="yellow"
                w="full"
                isDisabled={uploading}
              >
                {uploading ? <Spinner size="sm" /> : "📷 Take Photo"}
              </Button>

              <Button
                as="label"
                colorScheme="yellow"
                w="full"
                cursor="pointer"
                isDisabled={uploading}
              >
                🖼️ Select File
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileSelect}
                />
              </Button>

              {message && <Text fontSize="sm">{message}</Text>}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            onClick={onClose}
            colorScheme="gray"
            w="full"
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
