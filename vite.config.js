import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["locales/*.json"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/sw\.js$/, /^\/manifest\.webmanifest$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/rest\/v1\/.*/,
            method: "GET",
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest-cache",
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern:
              /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/sign\/recipe-images\/.*/,
            method: "GET",
            handler: "CacheFirst",
            options: {
              cacheName: "recipe-images-cache",
              matchOptions: { ignoreSearch: true },
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Rezepte",
        short_name: "Rezepte",
        theme_color: "#f2e7d2",
        background_color: "#f2e7d2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/eichhörnchen/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/eichhörnchen/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: true,
  },
});
