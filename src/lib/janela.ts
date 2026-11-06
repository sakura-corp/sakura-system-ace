// Recarregar a janela apaga o login: a sessão do Supabase fica só na memória
// (`persistSession: false`, em lib/supabase.ts). É a saída que não depende
// de rede, usada quando o "Sair" pelo servidor falha (#752).
export function recarregarJanela(): void {
  window.location.reload();
}
