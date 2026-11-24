import { X } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import {
  criarCategoriaCaixa,
  excluirCategoriaCaixa,
  trocarGrupoCategoriaCaixa,
} from "@/lib/categoriasCaixa";
import { mensagemDeErro } from "@/lib/errors";
import { BotaoDeLista } from "./pecas";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import {
  FRASE_DO_GRUPO,
  GRUPO_PADRAO,
  contarSemGrupo,
  grupoServePraTipo,
  gruposParaTipo,
  type GrupoDre,
} from "@/schemas/gruposDre";
import type { CategoriaCaixa, TipoCategoriaCaixa } from "@/types/categoriaCaixa";

interface CategoriasCaixaSectionProps {
  categorias: CategoriaCaixa[];
  onSalvo: () => Promise<void>;
}

export function CategoriasCaixaSection({ categorias, onSalvo }: CategoriasCaixaSectionProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCategoriaCaixa>("saida");
  const [grupo, setGrupo] = useState<GrupoDre>(GRUPO_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // O grupo escolhido enquanto salva: o select mostra a escolha na hora, sem
  // piscar de volta pro grupo antigo até a lista recarregar.
  const [escolhas, setEscolhas] = useState<Record<string, GrupoDre>>({});

  const categoriasEntrada = categorias.filter((c) => c.tipo === "entrada");
  const categoriasSaida = categorias.filter((c) => c.tipo === "saida");
  const semGrupo = contarSemGrupo(categorias);

  function handleTipo(novo: TipoCategoriaCaixa) {
    setTipo(novo);
    if (!grupoServePraTipo(grupo, novo)) setGrupo(GRUPO_PADRAO);
  }

  async function handleTrocarGrupo(categoria: CategoriaCaixa, novo: GrupoDre) {
    setErro(null);
    setEscolhas((atual) => ({ ...atual, [categoria.id]: novo }));
    try {
      await trocarGrupoCategoriaCaixa(categoria.id, novo);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao trocar o grupo da categoria de caixa:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setEscolhas((atual) => {
        const resto = { ...atual };
        delete resto[categoria.id];
        return resto;
      });
    }
  }

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    setSalvando(true);
    try {
      await criarCategoriaCaixa({ nome: nome.trim(), tipo, grupo });
      setNome("");
      setGrupo(GRUPO_PADRAO);
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

  // Função comum, não componente: um componente declarado aqui dentro seria
  // recriado a cada render, e o select perderia o foco ao trocar o grupo.
  function lista(titulo: string, itens: CategoriaCaixa[]) {
    return (
      <div>
        <p className="text-rotulo font-medium text-texto-2">{titulo}</p>
        {itens.length === 0 ? (
          <p className="mt-2 text-corpo text-texto-2">Nenhuma categoria ainda.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {itens.map((categoria) => (
              <li key={categoria.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-rotulo font-medium text-texto">
                  {categoria.nome}
                </span>
                <select
                  aria-label={`Grupo de ${categoria.nome}`}
                  value={escolhas[categoria.id] ?? categoria.grupo}
                  onChange={(e) => handleTrocarGrupo(categoria, e.target.value as GrupoDre)}
                  className="sakura-campo w-64 shrink-0"
                >
                  {gruposParaTipo(categoria.tipo).map((g) => (
                    <option key={g.chave} value={g.chave}>
                      {g.rotulo}
                    </option>
                  ))}
                </select>
                <BotaoDeLista
                  rotulo={`Excluir a categoria ${categoria.nome}`}
                  icone={X}
                  perigoso
                  aoClicar={() => handleExcluir(categoria.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <>
      {erro && <AvisoDeErro className="mt-4">{erro}</AvisoDeErro>}

      {semGrupo > 0 && (
        <AvisoDeAtencao className="mt-4">
          {semGrupo === 1 ? "1 categoria sem grupo." : `${semGrupo} categorias sem grupo.`}{" "}
          {FRASE_DO_GRUPO}
        </AvisoDeAtencao>
      )}

      <form onSubmit={handleAdicionar} className="mt-4 flex flex-wrap items-center gap-2">
        <select
          aria-label="Tipo da categoria"
          value={tipo}
          onChange={(e) => handleTipo(e.target.value as TipoCategoriaCaixa)}
          className="sakura-campo w-32 shrink-0"
        >
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </select>
        <select
          aria-label="Grupo da nova categoria"
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as GrupoDre)}
          className="sakura-campo w-64 shrink-0"
        >
          {gruposParaTipo(tipo).map((g) => (
            <option key={g.chave} value={g.chave}>
              {g.rotulo}
            </option>
          ))}
        </select>
        <input
          type="text"
          aria-label="Nome da categoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da categoria (ex: Aluguel, Sucata)"
          className="sakura-campo min-w-48 flex-1"
        />
        <Botao type="submit" disabled={!nome.trim()} ocupado={salvando} className="h-11">
          {salvando ? "Salvando..." : "+ Adicionar"}
        </Botao>
      </form>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {lista("Categorias de entrada", categoriasEntrada)}
        {lista("Categorias de saída", categoriasSaida)}
      </div>
    </>
  );
}
