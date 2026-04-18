import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { createHtmlPlugin } from "vite-plugin-html";
import vueDevTools from "vite-plugin-vue-devtools";
export default defineConfig({
  base: "/Arknights-alliance-tool/",
  plugins: [
    vue(),
    // register vueDevTools before createHtmlPlugin
    vueDevTools(),
    createHtmlPlugin({}),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
  },
});
