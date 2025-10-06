import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase.js";

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
    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg w-96 animate-fadeIn">
      <h2 className="text-2xl mb-4 text-gold">Iniciar sesión</h2>
      <form onSubmit={handleLogin}>
        <input
          className="w-full p-2 mb-2 text-black rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full p-2 mb-2 text-black rounded"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button className="bg-gold text-black font-bold px-4 py-2 rounded w-full hover:bg-yellow-500">
          Entrar
        </button>
      </form>
    </div>
  );
}
