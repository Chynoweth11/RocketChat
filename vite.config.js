import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["subshield-logo.png"],
      manifest: {
        name: "SubShield — Business Insurance Command Center",
        short_name: "SubShield",
        description:
          "Track business insurance policies, renewals, certificates, documents, and savings in one workspace.",
        theme_color: "#0a1421",
        background_color: "#0a1421",
        display: "standalone",
        start_url: ".",
        scope: "./",
        icons: [
          { src: "subshield-logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "subshield-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "subshield-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the app shell only. The heavy, on-demand pdf.js chunks and
        // worker are excluded so installs stay lean; they load from the network
        // the first time a PDF is actually processed.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        globIgnores: ["**/pdf-*.js", "**/pdf.worker*.*"],
      },
    }),
  ],
  base: "./",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
