// File: src/theme.js
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    gold: {
      50: "#fff9e6",
      100: "#fff2cc",
      200: "#ffe699",
      300: "#ffdb66",
      400: "#ffd133",
      500: "#ffca00", // primary gold
      600: "#cc9f00",
      700: "#997600",
      800: "#664d00",
      900: "#332500",
    },
    black: {
      50: "#f2f2f2",
      100: "#e6e6e6",
      200: "#cccccc",
      300: "#b3b3b3",
      400: "#999999",
      500: "#808080",
      600: "#666666",
      700: "#4d4d4d",
      800: "#333333",
      900: "#000000", // primary black
    },
    background: "#000000",
    text: "#FFD700",
  },
  fonts: {
    heading: `'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: "black",
        color: "gold",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "bold",
        borderRadius: "lg",
      },
      variants: {
        solid: {
          bg: "gold.500",
          color: "black",
          _hover: {
            bg: "gold.400",
          },
        },
        outline: {
          borderColor: "gold.500",
          color: "gold.500",
          _hover: {
            bg: "gold.50",
          },
        },
        red: {
          bg: "red.500",
          color: "white",
          _hover: {
            bg: "red.400",
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: "black",
          color: "gold",
          borderRadius: "xl",
        },
        header: {
          color: "gold",
        },
      },
    },
  },
});

export default theme;
