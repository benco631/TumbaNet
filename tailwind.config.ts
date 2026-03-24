import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tumba: {
          50: "#fce4ff",
          100: "#f8c4ff",
          200: "#f08cff",
          300: "#e454fb",
          400: "#d63cf0",
          500: "#c026d3",
          600: "#a21caf",
          700: "#86198f",
          800: "#6b1470",
          900: "#4a0e4e",
        },
        neon: {
          purple: "#c026d3",
          blue: "#a21caf",
          pink: "#e040fb",
          cyan: "#f0abfc",
        },
      },
    },
  },
  plugins: [],
};
export default config;
