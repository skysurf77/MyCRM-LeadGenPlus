import type { Config } from "tailwindcss";

// Thème MyCRM LeadGenPlus : fond blanc crisp, bleu clair « confiance », corail/orange pour les CTA.
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        surface: "hsl(var(--surface))",
        // Bleu clair « confiance »
        brand: {
          DEFAULT: "hsl(var(--brand))",
          soft: "hsl(var(--brand-soft))",
          foreground: "hsl(var(--brand-foreground))",
        },
        // Corail/orange — CTA primaires
        accent: {
          DEFAULT: "hsl(var(--accent))",
          soft: "hsl(var(--accent-soft))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Dataviz (palette validee, cf. app/globals.css)
        chart: {
          1: "hsl(var(--chart-1))",
          good: "hsl(var(--chart-good))",
          bad: "hsl(var(--chart-bad))",
          grid: "hsl(var(--chart-grid))",
        },
        // Pastilles de tier
        tier: {
          a: "hsl(var(--tier-a))",
          b: "hsl(var(--tier-b))",
          c: "hsl(var(--tier-c))",
          d: "hsl(var(--tier-d))",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        drawer: "-8px 0 30px -12px rgba(16, 24, 40, 0.18)",
        card: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
      },
      keyframes: {
        "slide-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
