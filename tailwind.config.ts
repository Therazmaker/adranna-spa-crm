import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#003441",
        "primary-container": "#0f4c5c",
        "on-primary": "#ffffff",
        "on-primary-container": "#87bbce",
        "primary-fixed": "#b6ebfe",
        "primary-fixed-dim": "#9acee1",
        "on-primary-fixed": "#001f28",
        "on-primary-fixed-variant": "#114d5d",

        secondary: "#785837",
        "secondary-container": "#fed2a9",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#795938",
        "secondary-fixed": "#ffdcbd",
        "secondary-fixed-dim": "#e9bf96",
        "on-secondary-fixed": "#2c1600",
        "on-secondary-fixed-variant": "#5e4122",

        tertiary: "#003630",
        "tertiary-container": "#004f47",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#5ac5b6",
        "tertiary-fixed": "#8cf5e4",
        "tertiary-fixed-dim": "#6fd8c8",
        "on-tertiary-fixed": "#00201c",
        "on-tertiary-fixed-variant": "#005048",

        surface: "#faf9f6",
        "surface-bright": "#faf9f6",
        "surface-dim": "#dbdad7",
        "surface-variant": "#e3e2e0",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f3f1",
        "surface-container": "#efeeeb",
        "surface-container-high": "#e9e8e5",
        "surface-container-highest": "#e3e2e0",
        background: "#faf9f6",

        "on-surface": "#1a1c1a",
        "on-surface-variant": "#40484b",
        "on-background": "#1a1c1a",
        outline: "#70787c",
        "outline-variant": "#c0c8cb",

        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        serif: ["'Noto Serif'", "serif"],
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      spacing: {
        gutter: "1.25rem",
        "gutter-mobile": "0.75rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
