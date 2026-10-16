import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// O painel é um projeto separado do programa das lojas (docs/painel.md,
// "Decisões técnicas"): não importa nada de ../src, e tem node_modules próprio.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
  },
});
