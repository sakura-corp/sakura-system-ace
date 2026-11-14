import { useState } from "react";
import { criarCategoriaCaixa, excluirCategoriaCaixa } from "@/lib/categoriasCaixa";
import { mensagemDeErro } from "@/lib/errors";
import type { CategoriaCaixa, TipoCategoriaCaixa } from "@/types/categoriaCaixa";

interface CategoriasCaixaSectionProps {
  categorias: CategoriaCaixa[];
  onSalvo: () => Promise<void>;
}

export function CategoriasCaixaSection({ categorias, onSalvo }: CategoriasCaixaSectionProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCategoriaCaixa>("saida");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const categoriasEntrada = categorias.filter((c) => c.tipo === "entrada");
  const categoriasSaida = categorias.filter((c) => c.tipo === "saida");

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    setSalvando(true);
    try {
      await criarCategoriaCaixa({ nome: nome.trim(), tipo });
      setNome("");
      await onSalvo();
    } catch (err) {
      console.error("Erro ao criar categoria de caixa:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta categoria? Lançamentos nela ficam sem categoria.")) return;
    setErro(null);
    try {
      await excluirCategoriaCaixa(id);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao excluir categoria de caixa:", err);
      setErro(mensagemDeErro(err));
    }
  }

  function Lista({ titulo, itens }: { titulo: string; itens: CategoriaCaixa[] }) {
    return (
      <div>
        <p className="text-rotulo font-medium text-sakura-purple-dark/85">{titulo}</p>
        {itens.length === 0 ? (
          <p className="mt-2 text-corpo text-sakura-muted">Nenhuma categoria ainda.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {itens.map((categoria) => (
              <span
                key={categoria.id}
                className="flex items-center gap-2 rounded-full bg-sakura-pink-soft px-3 py-1.5 text-rotulo font-medium text-sakura-purple-dark"
              >
                {categoria.nome}
                <button
                  onClick={() => handleExcluir(categoria.id)}
                  title="Excluir categoria"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sakura-purple-dark/75 hover:bg-red-500/15 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}

      <form onSubmit={handleAdicionar} className="mt-4 flex gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCategoriaCaixa)}
          className="rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da categoria (ex: Aluguel, Sucata)"
          className="flex-1 rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
        />
        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "+ Adicionar"}
        </button>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Lista titulo="Categorias de entrada" itens={categoriasEntrada} />
        <Lista titulo="Categorias de saída" itens={categoriasSaida} />
      </div>
    </>
  );
}
