import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Config separado do vite.config.ts de propósito — aquele carrega os plugins
// do Electron (vite-plugin-electron), que não fazem sentido (e podem
// atrapalhar) numa rodada de teste unitário puro. Os testes daqui não
// abrem janela nenhuma, só rodam funções TypeScript isoladas.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
