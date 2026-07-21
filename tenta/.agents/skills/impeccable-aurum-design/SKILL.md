---
name: impeccable-aurum-design
description: Strict UI design constraints enforcing the luxury "Aurum" aesthetic and Impeccable anti-patterns for Glowapp. Trigger this when modifying or creating frontend components.
---

# Impeccable Aurum Design System

When designing or modifying frontend components, follow this strict design language. We combine the "Aurum" aesthetic with "Impeccable" anti-patterns to prevent generic AI UI.

## 1. Core Tokens & Colors
- **App Background:** `$black` (True black for OLEDs)
- **Cards/Surfaces:** `$backgroundDark900` (Lv 1) or `$backgroundDark950` (Lv 2)
- **Accent:** `$amber400` (Signature gold for buttons, active states)
- **Text:** `$textLight50` (Primary), `$textDark400` (Secondary/Muted)
- **Borders:** `$borderDark800` (Subtle 1px separation)

## 2. Impeccable Anti-Patterns (NEVER DO THIS)
- **No pure grays on colored backgrounds:** It ruins contrast.
- **No "Cards in Cards":** Do not nest cards infinitely. Use spacing, borders, or typography for hierarchy instead.
- **No generic fonts for luxury:** Follow the typography rules below. Avoid default Arial/Inter for main immersive headers.
- **No elastic/bouncy easings:** They feel dated. Use smooth, intentional curves.
- **No pure black or pure gray for text:** Always tint it slightly to match the background warmth.

## 3. Typography & Hierarchy
- **Immersive Headers:** Huge (`3xl` or `2xl`), thin/light weight (`$thin`, `$light`), tightly tracked (`letterSpacing={-1}`). Color: `$textLight50`.
- **Subtitles:** Small (`sm` or `xs`), uppercase, widely tracked (`letterSpacing={1}` or `2`), bold. Color: `$amber400`.
- **Body:** Clean size `md`, use `$textSub` for descriptive text to avoid overwhelming headers.

## 4. Layout & Interactions
- **Borders & Corners:** Use massive radii (`$xl` or `$2xl`) for big cards.
- **Borders:** Rely on 1px borders instead of box-shadows on true black backgrounds.
- **Haptics:** Always trigger `expo-haptics` on major interactions (saving, toggling).
- **Animations:** All screens/cards must enter smoothly via `moti` (fade in, slide up: `from={{ opacity: 0, translateY: 10 }}`, duration 400, `Easing.exp`).

## 5. Commands
You can simulate the Impeccable workflow via these instructions:
- `/polish`: Final pass for spacing, borders, and typography alignment to Aurum.
- `/critique`: Review the UX hierarchy. Are we relying too much on cards?
- `/bolder`: Make the headers thinner, bigger, and use `$amber400` more aggressively.
- `/quieter`: Tone down the gold, rely on `$textDark400`.
