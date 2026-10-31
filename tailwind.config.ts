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
        primary: "#6F3612",
        "primary-container": "#8A4A1E",
        "on-primary": "#ffffff",
        "on-primary-container": "#F3DEC4",
        "primary-fixed": "#F3DEC4",
        "primary-fixed-dim": "#DDBF9B",
        "on-primary-fixed": "#2B1204",
        "on-primary-fixed-variant": "#6F3612",

        secondary: "#A47A45",
        "secondary-container": "#F0DDBF",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#795938",
        "secondary-fixed": "#ffdcbd",
        "secondary-fixed-dim": "#e9bf96",
        "on-secondary-fixed": "#2c1600",
        "on-secondary-fixed-variant": "#5e4122",

        tertiary: "#5B5A2E",
        "tertiary-container": "#767440",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#EDEBC4",
        "tertiary-fixed": "#E6E4B8",
        "tertiary-fixed-dim": "#C9C78F",
        "on-tertiary-fixed": "#1C1B05",
        "on-tertiary-fixed-variant": "#4A4924",

        surface: "#FBF6EC",
        "surface-bright": "#FDF9F1",
        "surface-dim": "#E0D5C3",
        "surface-variant": "#EADFCC",
        "surface-container-lowest": "#FFFDF9",
        "surface-container-low": "#F6EEE0",
        "surface-container": "#F1E7D5",
        "surface-container-high": "#EBDFCA",
        "surface-container-highest": "#E5D8C1",
        background: "#FBF6EC",

        "on-surface": "#2B1A0E",
        "on-surface-variant": "#5E4A3A",
        "on-background": "#2B1A0E",
        outline: "#8F7A68",
        "outline-variant": "#D6C6B0",

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
