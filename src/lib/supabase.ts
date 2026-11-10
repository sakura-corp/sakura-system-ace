import { createClient } from "@supabase/supabase-js";
import { armazenamentoDemo, CHAVE_SESSAO_DEMO, ENDERECO_DEMO, fetchDemo } from "@/demo/fetchDemo";
import { conexaoAtual, modoDemonstracao } from "./conexao";

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
// Sinal pras telas: "estou na demonstração?". Fixo até recarregar a janela,
// que é quando o cliente abaixo é criado (entrar/sair da demonstração recarrega).
export const emDemonstracao = modoDemonstracao();

// Na demonstração o cliente fala com um endereço de mentira e o `fetchDemo`
// responde da memória, com dados inventados: nada sai do computador. A sessão
// de demonstração já vem gravada no `armazenamentoDemo` pra abrir logado, por
// isso aqui (e só aqui) a sessão persiste. Fora da demonstração o cliente é
// exatamente o de sempre.
export const supabase = emDemonstracao
  ? createClient(ENDERECO_DEMO, "demo-anon-key", {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        storage: armazenamentoDemo,
        storageKey: CHAVE_SESSAO_DEMO,
      },
      global: { fetch: fetchDemo },
    })
  : createClient(
      conexao?.url || "https://placeholder.supabase.co",
      conexao?.chave || "placeholder-anon-key",
      {
        // Sem persistir sessão: cada vez que o app abre, pede login de novo — a
        // pedido do usuário, já que o programa costuma ficar aberto o dia
        // inteiro (não é algo que se fecha e reabre com frequência).
        auth: { persistSession: false },
      },
    );
