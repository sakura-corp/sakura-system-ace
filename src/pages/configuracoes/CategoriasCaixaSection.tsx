import { X } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { criarCategoriaCaixa, excluirCategoriaCaixa } from "@/lib/categoriasCaixa";
import { mensagemDeErro } from "@/lib/errors";
import { BotaoDeLista, MensagemDeErro } from "./pecas";
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
        <p className="text-rotulo font-medium text-texto-2">{titulo}</p>
        {itens.length === 0 ? (
          <p className="mt-2 text-corpo text-texto-2">Nenhuma categoria ainda.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {itens.map((categoria) => (
              <span
                key={categoria.id}
                className="flex items-center gap-1 rounded-full bg-texto/[0.08] py-0.5 pl-3 pr-1 text-rotulo font-medium text-texto"
              >
                {categoria.nome}
                <BotaoDeLista
                  rotulo={`Excluir a categoria ${categoria.nome}`}
                  icone={X}
                  perigoso
                  aoClicar={() => handleExcluir(categoria.id)}
                />
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {erro && <MensagemDeErro className="mt-4">{erro}</MensagemDeErro>}

      <form onSubmit={handleAdicionar} className="mt-4 flex items-center gap-2">
        <select
          aria-label="Tipo da categoria"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCategoriaCaixa)}
          className="sakura-campo w-32 shrink-0"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <input
          type="text"
          aria-label="Nome da categoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da categoria (ex: Aluguel, Sucata)"
          className="sakura-campo min-w-0 flex-1"
        />
        <Botao type="submit" disabled={!nome.trim()} ocupado={salvando} className="h-11">
          {salvando ? "Salvando..." : "+ Adicionar"}
        </Botao>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Lista titulo="Categorias de entrada" itens={categoriasEntrada} />
        <Lista titulo="Categorias de saída" itens={categoriasSaida} />
      </div>
    </>
  );
}
