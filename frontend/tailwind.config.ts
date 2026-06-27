import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        court: "#0E5C3F",      // тёмно-зелёный, цвет корта
        courtLine: "#F4F1EA",  // линия корта / фон
        shuttle: "#FF5A2D",    // акцент — цвет волана
        ink: "#10241C",        // основной текст
        slateGray: "#5B6B63",
      },
      fontFamily: {
        display: ["system-ui", "sans-serif"],
        body: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
