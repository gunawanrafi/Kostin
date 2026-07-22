import type { Config } from "tailwindcss";
import { colors, borderRadius } from "./src/lib/design-tokens";

// Tailwind theme extension built directly from src/lib/design-tokens.ts so
// there is exactly one source of truth for the KostIn palette/scale — Tailwind
// utilities (bg-accent, text-textMid, rounded-xl, …) and the `colors`/
// `borderRadius` JS objects always stay in sync.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...colors,
        // shadcn/ui's CSS-variable-driven primitives (Dialog overlay, focus
        // rings, etc.) read these — mapped onto the same KostIn tokens above
        // rather than shadcn's default slate/zinc palette.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accentUi: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        heading: ["var(--font-rubik)", "Rubik", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      borderRadius: Object.fromEntries(Object.entries(borderRadius).map(([k, v]) => [k, `${v}px`])),
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
