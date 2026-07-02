/// <reference types="vitest" />
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// 단일 HTML 산출물: 모든 JS/CSS를 dist/index.html에 인라인
export default defineConfig({
  plugins: [viteSingleFile()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
