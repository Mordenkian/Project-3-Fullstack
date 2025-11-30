import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // This line tells Tailwind to scan all .ts and .tsx files in your app directory.
    // This is the most important part of the file.
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;