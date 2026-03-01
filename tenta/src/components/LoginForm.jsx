// INCREMENT: LoginForm.jsx Chakra UI Migration
// Type: UI Migration
// Scope: Login form layout, inputs, buttons
// Mode: Candidate (test preview before integration)

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase.js";
import { motion } from "framer-motion";
import AurumHeader from "./AurumHeader";

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
    <div className="w-full flex justify-center items-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md aurum-card flex flex-col space-y-6"
      >
        <AurumHeader
          title="Glow"
          subtitle="INICIAR SESIÓN"
          variant="immersive"
        />

        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              className="aurum-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              className="aurum-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-red500 text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="aurum-btn-primary mt-2"
          >
            Entrar
          </button>
        </form>
      </motion.div>
    </div>
  );
}
