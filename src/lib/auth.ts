import { supabase } from "./supabase";
import type { Operador } from "@/types/operador";

const DOMINIO_INTERNO = "sakura.local";

export function emailInterno(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@${DOMINIO_INTERNO}`;
}

export async function entrar(usuario: string, senha: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInterno(usuario),
    password: senha,
  });
  if (error) throw error;
}

export async function sair(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Troca a própria senha (usa a sessão já logada — funciona tanto pra quem
// só quer trocar por vontade própria quanto pra quem está cumprindo a troca
// obrigatória depois de um reset feito pelo admin, ver TrocarSenhaPage).
export async function trocarSenhaPropria(novaSenha: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

export async function buscarOperadorAtual(
  userId: string,
): Promise<Operador | null> {
  const { data, error } = await supabase
    .from("operadores")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Operador | null;
}
