import { createClient } from "@supabase/supabase-js";
import { emailInterno } from "./auth";
import { conexaoAtual } from "./conexao";
import { definirLojasDoOperador } from "./lojas";
import { supabase } from "./supabase";
import type { NovoOperador, Operador } from "@/types/operador";

export async function listarOperadores(): Promise<Operador[]> {
  const { data, error } = await supabase
    .from("operadores")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw error;
  return data as Operador[];
}

// Um client isolado (sem persistir sessão) evita que criar um operador novo
// troque a sessão de quem está logado agora (o supabase-js loga
// automaticamente como o usuário recém-criado ao chamar signUp). Usa a mesma
// conexão do resto do programa: no app instalado o `.env` é ignorado, então
// ler `import.meta.env` aqui mandava o cadastro pra um endereço de mentira.
export function criarClienteTemporario() {
  const conexao = conexaoAtual();
  if (!conexao) {
    throw new Error(
      "Este computador ainda não está ligado a nenhuma empresa. Configure a conexão antes de cadastrar operadores.",
    );
  }
  return createClient(conexao.url, conexao.chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function criarOperador(
  operador: NovoOperador,
  senha: string,
  lojaIds: string[],
): Promise<void> {
  const clienteTemporario = criarClienteTemporario();

  const { data, error } = await clienteTemporario.auth.signUp({
    email: emailInterno(operador.usuario),
    password: senha,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar o login do operador.");

  const { error: erroPerfil } = await supabase.from("operadores").insert({
    id: data.user.id,
    usuario: operador.usuario,
    nome: operador.nome,
    admin: operador.admin,
    permissoes: operador.permissoes,
    ativo: operador.ativo,
  });
  if (erroPerfil) throw erroPerfil;

  if (lojaIds.length > 0) {
    await definirLojasDoOperador(data.user.id, lojaIds);

    // O gatilho que espelha o operador em `funcionarios` (migration 0019)
    // roda no INSERT acima, antes de operador_lojas existir — por isso ainda
    // não sabe a loja. Preenche agora que já temos o vínculo.
    const { error: erroFuncionario } = await supabase
      .from("funcionarios")
      .update({ loja_id: lojaIds[0] })
      .eq("operador_id", data.user.id);
    if (erroFuncionario) throw erroFuncionario;
  }
}

export async function atualizarOperador(
  id: string,
  patch: Partial<Pick<Operador, "nome" | "admin" | "permissoes" | "ativo">>,
): Promise<void> {
  const { error } = await supabase.from("operadores").update(patch).eq("id", id);
  if (error) throw error;
}

// Só admin consegue de verdade — a Edge Function confere isso de novo do
// lado do servidor antes de mudar qualquer coisa (ver
// supabase/functions/redefinir-senha-operador). Devolve a senha temporária
// gerada, pra admin repassar ao operador (por WhatsApp, pessoalmente etc.) —
// ela só aparece essa vez, o app não guarda em lugar nenhum.
export async function redefinirSenhaOperador(operadorId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("redefinir-senha-operador", {
    body: { acao: "redefinir", operadorId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.senhaTemporaria) throw new Error("Não foi possível redefinir a senha.");
  return data.senhaTemporaria as string;
}

// Chamado depois que o próprio operador já trocou a senha de verdade (ver
// trocarSenhaPropria em lib/auth.ts) — limpa a marca de troca obrigatória.
export async function confirmarTrocaSenha(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("redefinir-senha-operador", {
    body: { acao: "confirmar-troca" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
