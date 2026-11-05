import { createClient } from "@supabase/supabase-js";
import { conexaoAtual } from "./conexao";

// Qual empresa/banco este computador usa é decidido em `conexao.ts` — em
// desenvolvimento vem do `.env`, no app instalado vem do que foi digitado na
// tela de configuração e guardado nesta máquina.
const conexao = conexaoAtual();

// Só o `AuthContext` usa isto: ele roda antes do portão do `App.tsx` (inclusive
// com a tela de Conexão aberta) e não deve tentar login sem conexão. As telas
// não precisam conferir: sem conexão, o `App.tsx` mostra só a tela de Conexão.
export const isSupabaseConfigured = conexao !== null;

// O cliente precisa existir sempre (todo `lib/*.ts` importa esse módulo), mesmo
// antes de alguém configurar a conexão — sem conexão o app mostra a tela de
// configuração e nunca chega a usar esse cliente de mentira.
export const supabase = createClient(
  conexao?.url || "https://placeholder.supabase.co",
  conexao?.chave || "placeholder-anon-key",
  {
    // Sem persistir sessão: cada vez que o app abre, pede login de novo — a
    // pedido do usuário, já que o programa costuma ficar aberto o dia
    // inteiro (não é algo que se fecha e reabre com frequência).
    auth: { persistSession: false },
  },
);
