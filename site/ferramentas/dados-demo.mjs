// Dados 100% inventados pra gerar as imagens do site.
// Nenhum cliente, placa ou CPF de verdade da loja do pai dela.
//
// A cópia única dos dados mora em src/demo/ (TypeScript), porque o programa
// também abre com eles no modo demonstração. Aqui só se carrega essa cópia,
// UMA vez (o `runnerImport` do Vite roda o TypeScript e resolve o "@/"):
// quem precisar dos dados ou do "responder como o Supabase" pega daqui, nunca
// carrega de novo, senão viram duas cópias e o que uma ferramenta muda numa
// não aparece na outra (o percorrer-telas muda linhas).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const { module: demo } = await runnerImport(join(RAIZ, "src/demo/index.ts"), {
  configFile: false,
  logLevel: "error",
  resolve: { alias: { "@": join(RAIZ, "src") } },
});

export const { TABELAS, FUNCOES, SESSAO, responderComoSupabase, filtrarComoOSupabase, tabelasSemDados } = demo;
