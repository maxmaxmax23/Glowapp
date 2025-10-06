// INCREMENT: LoginForm.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Login form layout, inputs, buttons
// Mode: Candidate (test preview before integration)

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase.js";
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Heading,
} from "@chakra-ui/react";

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLogin(userCredential.user);
    } catch (err) {
      setError("Error de autenticación: " + err.message);
    }
  };

  return (
    <Box
      bg="gray.900"
      color="white"
      p={6}
      rounded="xl"
      shadow="lg"
      w="96"
      textAlign="center"
    >
      <Heading as="h2" size="lg" mb={4} color="gold">
        Iniciar sesión
      </Heading>

      <form onSubmit={handleLogin}>
        <VStack spacing={3} align="stretch">
          <FormControl>
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              bg="white"
              color="black"
            />
          </FormControl>

          <FormControl>
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              bg="white"
              color="black"
            />
          </FormControl>

          {error && (
            <Text color="red.500" fontSize="sm" textAlign="center">
              {error}
            </Text>
          )}

          <Button
            type="submit"
            colorScheme="yellow"
            w="full"
            fontWeight="bold"
            _hover={{ bg: "yellow.400" }}
          >
            Entrar
          </Button>
        </VStack>
      </form>
    </Box>
  );
}
