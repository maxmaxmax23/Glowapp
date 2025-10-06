// File: src/theme.js
import { extendTheme } from "@chakra-ui/react";

const colors = {
  brand: {
    black: "#000000",
    gold: "#FFD700",
    grayDark: "#1A1A1A",
    grayLight: "#333333",
  },
};

const fonts = {
  heading: "'Distrampler', Times New Roman, serif",
  body: "'Inter', sans-serif",
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: "xl",
      fontWeight: "bold",
    },
    variants: {
      primary: {
        bg: "brand.gold",
        color: "brand.black",
        _hover: { bg: "yellow.400" },
      },
      secondary: {
        bg: "brand.grayDark",
        color: "brand.gold",
        _hover: { bg: "brand.grayLight" },
      },
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: "2xl",
      },
    },
  },
  Input: {
    baseStyle: {
      field: {
        borderRadius: "md",
        bg: "brand.grayLight",
        color: "white",
        _placeholder: { color: "gray.400" },
      },
    },
  },
  Table: {
    baseStyle: {
      th: { bg: "brand.gold", color: "brand.black" },
      td: { borderColor: "gray.700" },
    },
  },
};

const theme = extendTheme({
  colors,
  fonts,
  components,
  styles: {
    global: {
      body: {
        bg: "brand.black",
        color: "brand.gold",
        fontFamily: "'Inter', sans-serif",
      },
    },
  },
});

export default theme;
