import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#142131",
        navy: "#17385F",
        teal: "#007C78",
        mist: "#F3F7F9",
      },
      boxShadow: {
        card: "0 12px 30px rgba(20, 33, 49, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
