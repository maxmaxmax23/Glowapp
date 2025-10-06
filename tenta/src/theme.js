// src/theme.js
import { extendTheme } from "@chakra-ui/react";

// Define the color palette
const colors = {
  brand: {
    black: "#0a0a0a",
    gold: "#FFD700",
    gray900: "#1a1a1a",
    gray800: "#2a2a2a",
    gray700: "#3a3a3a",
  },
};

// Define global styles
const styles = {
  global: {
    body: {
      bg: colors.brand.black,
      color: colors.brand.gold,
      fontFamily: "'Inter', sans-serif",
    },
  },
};

// Define component defaults & variants
const components = {
  Button: {
    baseStyle: {
      borderRadius: "xl",
      fontWeight: "bold",
    },
    variants: {
      primary: {
        bg: colors.brand.gold,
        color: colors.brand.black,
        _hover: { bg: "#e6c200" },
      },
      secondary: {
        bg: colors.brand.gray700,
        color: colors.brand.gold,
        _hover: { bg: colors.brand.gray600 },
      },
      danger: {
        bg: "red.500",
        color: "white",
        _hover: { bg: "red.600" },
      },
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: colors.brand.gray900,
        color: colors.brand.gold,
        borderRadius: "2xl",
      },
    },
  },
};

const theme = extendTheme({ colors, styles, components });

export default theme;
