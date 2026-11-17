import { X } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { criarCategoria, excluirCategoria } from "@/lib/categorias";
import { mensagemDeErro } from "@/lib/errors";
import { BotaoDeLista } from "./pecas";
import { AvisoDeErro } from "@/components/Aviso";
import type { Categoria } from "@/types/categoria";

interface CategoriasSectionProps {
  categorias: Categoria[];
  onSalvo: () => Promise<void>;
}

export function CategoriasSection({ categorias, onSalvo }: CategoriasSectionProps) {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    setSalvando(true);
    try {
      await criarCategoria({ nome: nome.trim() });
      setNome("");
      await onSalvo();
    } catch (err) {
      console.error("Erro ao criar categoria:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta categoria? Produtos nela ficam sem categoria.")) return;
    setErro(null);
    try {
      await excluirCategoria(id);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao excluir categoria:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <>
      {erro && <AvisoDeErro className="mt-4">{erro}</AvisoDeErro>}

      <form onSubmit={handleAdicionar} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          aria-label="Nome da categoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da categoria (ex: Pneus, Lubrificantes)"
          className="sakura-campo min-w-0 flex-1"
        />
        <Botao type="submit" disabled={!nome.trim()} ocupado={salvando} className="h-11">
          {salvando ? "Salvando..." : "+ Adicionar"}
        </Botao>
      </form>

      {categorias.length === 0 ? (
        <p className="mt-4 text-corpo text-texto-2">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {categorias.map((categoria) => (
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
    </>
  );
}
