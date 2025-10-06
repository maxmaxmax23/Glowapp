// INCREMENT: main.jsx ChakraProvider Wrap
// Type: UI Migration
// Scope: Wrap root App in ChakraProvider
// Mode: Candidate (safe preview)

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./App.css";

// Chakra UI
import { ChakraProvider } from "@chakra-ui/react";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ChakraProvider>
    <App />
  </ChakraProvider>
);
