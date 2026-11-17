import { useAuth } from "@/contexts/AuthContext";

// Só aparece pra quem tem acesso a mais de uma loja — fica invisível por
// completo pra quem usa o sistema numa loja só, sem mudar nada pra ela.
export function LojaSwitcher() {
  const { lojaAtual, lojasDisponiveis, definirLojaAtual } = useAuth();

  if (lojasDisponiveis.length <= 1) return null;

  return (
    <select
      value={lojaAtual?.id ?? ""}
      onChange={(e) => definirLojaAtual(e.target.value)}
      aria-label="Loja"
      className="mt-3 w-full rounded-lg border border-borda-campo bg-transparent px-2 py-1 text-rotulo text-texto focus:border-acao"
    >
      {lojasDisponiveis.map((loja) => (
        <option key={loja.id} value={loja.id}>
          {loja.nome}
        </option>
      ))}
    </select>
  );
}
