import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { createHtmlPlugin } from "vite-plugin-html";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages 部署在 /Arknights-alliance-tool/ 子路径下，
  // Service Worker 的 scope 与 manifest 的 start_url 都基于该 base 计算
  base: "/Arknights-alliance-tool/",
  plugins: [
    vue(),
    createHtmlPlugin({}),
    VitePWA({
      // 由 src/infrastructure/pwa/usePwaUpdate.ts 手动注册，便于提示「新版本可用」
      injectRegister: false,
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons.svg"],
      manifest: {
        name: "卫戍协议练功房",
        short_name: "卫戍练功房",
        description: "明日方舟卫戍协议盟约、干员与编队工具",
        lang: "zh-CN",
        theme_color: "#121212",
        background_color: "#121212",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // 预缓存应用外壳：index.html + 构建产物，二次访问与离线都能直接用
        globPatterns: ["**/*.{js,css,html,svg,ico,woff,woff2}"],
        // 干员头像共 14MB / 345 张，不进预缓存，改走运行时缓存
        globIgnores: ["**/resource/**"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // 头像与盟约图标：命中缓存直接返回（文件名稳定，适合 CacheFirst）
            urlPattern: /\/resource\/image\/.*\.(?:png|jpe?g|webp|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "arknights-images",
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html"],
      // 只统计源码：数据 JSON 与测试自身不计入
      include: ["src/**/*.{js,ts,vue}"],
      exclude: ["src/**/tests/**", "src/tests/**", "src/**/*.d.ts"],
      // 初始只出报告不设卡：存量覆盖率先测量，阈值在 P2 拆分后再定
      reportOnFailure: true,
    },
  },
});
