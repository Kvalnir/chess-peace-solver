import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ─── IMPORTANT ───────────────────────────────────────────────────────────────
// This matches your GitHub repo name: github.com/Kvalnir/chess-peace-solver
// If you ever rename the repo, update REPO_NAME here and re-upload this file.
// ─────────────────────────────────────────────────────────────────────────────
const REPO_NAME = "chess-peace-solver";

export default defineConfig({
  base: `/${REPO_NAME}/`,

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "icons/icon.svg"],

      manifest: {
        name: "Chess Peace Solver",
        short_name: "Chess Peace Solver",
        description:
          "Place every chess piece so that none can capture another.",
        theme_color: "#080c10",
        background_color: "#080c10",
        display: "standalone",
        orientation: "portrait",
        scope: `/${REPO_NAME}/`,
        start_url: `/${REPO_NAME}/`,
        icons: [
          {
            src: `/${REPO_NAME}/icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `/${REPO_NAME}/icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,png,ico,svg,woff2}"],
        // Cache Google Fonts so typography survives offline (standard
        // Workbox recipe: stylesheet revalidates, font files cache-first).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Prevent the service worker from intercepting cross-origin requests
        navigateFallback: `/${REPO_NAME}/index.html`,
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],

  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split solver into its own chunk for faster initial paint
          solver: ["./src/solver/engine.js"],
        },
      },
    },
  },

  worker: {
    // Vite needs to know workers use ES modules
    format: "es",
  },
});
