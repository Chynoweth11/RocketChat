import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Use relative asset URLs so static hosts under subpaths (for example
  // GitHub Pages project sites) load JS/CSS correctly.
  base: "./",
});
