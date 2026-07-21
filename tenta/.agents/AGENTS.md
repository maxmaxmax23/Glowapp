# Project Core Rules

## 1. Architectural Philosophy
- Always use React Functional Components and Hooks.
- Follow the Vite build toolchain standard practices.
- State management relies on local state and props, favoring simplicity for modals and components.

## 2. Tech Stack & Styling Restrictions
- Use **Tailwind CSS** as the primary styling solution (compiled via `npx tailwindcss`). 
- Maintain consistency with the pre-existing Tailwind classes instead of falling back to inline styles or mixing with Chakra/MUI unless explicitly crossing legacy component boundaries.

## 3. Data Flow
- Treat `src/tentadb.json` as the local source of truth for product data during local development.
- Always use the predefined sync scripts when pushing/pulling data from Firestore.
