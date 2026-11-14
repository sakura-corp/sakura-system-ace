import { useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import { definirCategoriaDosMovimentos } from "@/lib/caixa";
import { agruparPorCategoria } from "@/schemas/caixa";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, TipoCaixa } from "@/types/caixa";

interface CategorizarSemCategoriaProps {
  tipo: TipoCaixa;
  /** Só os lançamentos manuais daquele tipo que estão sem categoria. */
  movimentos: MovimentoCaixa[];
  categorias: CategoriaCaixa[];
  onConcluir: () => Promise<void>;
  onCancelar: () => void;
}

/**
 * Conserta o passado: tornar a categoria obrigatória arruma só o que vier
 * daqui pra frente, e o que já está lançado sem categoria não se move sozinho
 * — continuaria aparecendo como um balde único no bloco "Por categoria".
 *
 * É painel aberto na própria tela, não modal, por dois motivos: é o padrão que
 * esta tela já usa pro formulário de lançamento, e a lista aqui pode ter
 * dezenas de linhas, que não caberiam na largura do `Modal.tsx`.
 */
export function CategorizarSemCategoria({
  tipo,
  movimentos,
  categorias,
  onConcluir,
  onCancelar,
}: CategorizarSemCategoriaProps) {
  const [atribuicoes, setAtribuicoes] = useState<Record<string, string>>({});
  const [categoriaParaTodos, setCategoriaParaTodos] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const rotulo = tipo === "entrada" ? "entrada" : "saída";
  const opcoes = categorias.map((c) => ({ valor: c.id, rotulo: c.nome }));
  const escolhidos = Object.values(atribuicoes).filter(Boolean).length;

  function escolher(movimentoId: string, categoriaId: string) {
    setAtribuicoes((atual) => ({ ...atual, [movimentoId]: categoriaId }));
  }

  // Preenche só o que ainda está em branco, de propósito: quem já classificou
  // algumas linhas à mão não perde esse trabalho ao usar o atalho.
  function aplicarNosVazios() {
    if (!categoriaParaTodos) return;
    setAtribuicoes((atual) => {
      const novo = { ...atual };
      for (const m of movimentos) {
        if (!novo[m.id]) novo[m.id] = categoriaParaTodos;
      }
      return novo;
    });
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      for (const grupo of agruparPorCategoria(atribuicoes)) {
        await definirCategoriaDosMovimentos(grupo.ids, grupo.categoriaId);
      }
      await onConcluir();
    } catch (err) {
      console.error("Erro ao categorizar lançamentos:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="space-y-4 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
          Categorizar {rotulo}s antigas
        </h2>
      </div>

      <p className="text-corpo text-sakura-muted">
        Escolha a categoria de cada lançamento. O que ficar em branco continua sem categoria e
        pode ser ajustado depois.
      </p>

      {erro && (
        <p className="rounded-lg bg-red-950/60 px-4 py-2 text-corpo text-red-300">{erro}</p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-black/20 p-4">
        <label className="flex flex-1 flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Aplicar a todos que estão em branco</span>
          <Combobox
            opcoes={opcoes}
            valor={categoriaParaTodos}
            onMudar={setCategoriaParaTodos}
            placeholder="Escolha uma categoria"
          />
        </label>
        <button
          type="button"
          onClick={aplicarNosVazios}
          disabled={!categoriaParaTodos}
          className="rounded-xl bg-sakura-purple/80 px-4 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-40"
        >
          Aplicar
        </button>
      </div>

      <div className="max-h-[24rem] overflow-y-auto rounded-xl border border-sakura-gray/20">
        <table className="w-full text-left text-corpo">
          <thead className="sticky top-0 bg-sakura-pink-soft text-sakura-purple-dark">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="w-64 px-4 py-3 font-medium">Categoria</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m) => (
              <tr key={m.id} className="border-t border-sakura-gray/20">
                <td className="px-4 py-3">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">{m.descricao || "—"}</td>
                <td className="px-4 py-3 font-medium">{formatarMoeda(m.valor)}</td>
                <td className="px-4 py-3">
                  <Combobox
                    opcoes={opcoes}
                    valor={atribuicoes[m.id] ?? ""}
                    onMudar={(v) => escolher(m.id, v)}
                    placeholder="Em branco"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-rotulo text-sakura-muted">
          {escolhidos === 0
            ? "Nenhum lançamento escolhido ainda"
            : `${escolhidos} de ${movimentos.length} prontos para salvar`}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || escolhidos === 0}
            className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : `Salvar ${escolhidos}`}
          </button>
        </div>
      </div>
    </section>
  );
}
