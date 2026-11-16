import { useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import { definirCategoriaDosMovimentos } from "@/lib/caixa";
import { agruparPorCategoria } from "@/schemas/caixa";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, TipoCaixa } from "@/types/caixa";
import { Aviso } from "./Aviso";

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
    <section className="space-y-4 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">
          Categorizar {rotulo}s antigas
        </h2>
      </div>

      <p className="text-corpo text-texto-2">
        Escolha a categoria de cada lançamento. O que ficar em branco continua sem categoria e
        pode ser ajustado depois.
      </p>

      {erro && (
        <Aviso tipo="perigo" alerta className="text-corpo">
          {erro}
        </Aviso>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-poco p-4">
        <label className="sakura-rotulo flex-1">
          Aplicar a todos que estão em branco
          <Combobox
            opcoes={opcoes}
            valor={categoriaParaTodos}
            onMudar={setCategoriaParaTodos}
            placeholder="Escolha uma categoria"
          />
        </label>
        <Botao onClick={aplicarNosVazios} disabled={!categoriaParaTodos}>
          Aplicar
        </Botao>
      </div>

      {/* Tamanho fixo, rolando por dentro (regras, seção 6, "O que pode
          crescer"): a lista pode ter dezenas de linhas. */}
      <div className="max-h-[24rem] overflow-y-auto rounded-xl border border-linha">
        <table className="sakura-tabela">
          {/* O cabeçalho fica parado ao rolar. A linha embaixo dele é uma
              sombra, e não a borda da tabela: com as bordas coladas
              (border-collapse) a borda não acompanha a célula que fica parada. */}
          <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-cartao [&_th]:shadow-[inset_0_-1px_0_var(--color-linha)]">
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th className="text-right">Valor</th>
              <th className="w-64">Categoria</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap text-texto-2">
                  {new Date(m.data).toLocaleDateString("pt-BR")}
                </td>
                <td className="text-texto">{m.descricao || "—"}</td>
                <td className="whitespace-nowrap text-right font-semibold text-texto">
                  {formatarMoeda(m.valor)}
                </td>
                <td>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-rotulo text-texto-2">
          {escolhidos === 0
            ? "Nenhum lançamento escolhido ainda"
            : `${escolhidos} de ${movimentos.length} prontos para salvar`}
        </p>
        <div className="flex gap-3">
          <Botao variante="fantasma" onClick={onCancelar}>
            Cancelar
          </Botao>
          <Botao variante="principal" onClick={salvar} ocupado={salvando} disabled={escolhidos === 0}>
            {salvando ? "Salvando..." : `Salvar ${escolhidos}`}
          </Botao>
        </div>
      </div>
    </section>
  );
}
