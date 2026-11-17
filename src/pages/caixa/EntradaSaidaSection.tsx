import { Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import {
  movimentosManuais,
  movimentosSemCategoria,
  resumirSemCategoria,
  totaisPorCategoria,
} from "@/schemas/caixa";
import { formatarMoeda, somar } from "@/schemas/dinheiro";
import { rotuloDaForma } from "@/schemas/fechamentoCaixa";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa, TipoCaixa } from "@/types/caixa";
import { CaixaForm } from "./CaixaForm";
import { CategorizarSemCategoria } from "./CategorizarSemCategoria";

interface EntradaSaidaSectionProps {
  tipo: TipoCaixa;
  movimentos: MovimentoCaixa[];
  categorias: CategoriaCaixa[];
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
  /** Recarrega o caixa depois de mexer no histórico já gravado. */
  onAtualizado: () => Promise<void>;
}

export function EntradaSaidaSection({
  tipo,
  movimentos,
  categorias,
  onSalvar,
  onAtualizado,
}: EntradaSaidaSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarCategorizar, setMostrarCategorizar] = useState(false);
  const rotulo = tipo === "entrada" ? "entrada" : "saída";

  const manuais = useMemo(() => movimentosManuais(movimentos, tipo), [movimentos, tipo]);

  const semCategoria = useMemo(
    () => movimentosSemCategoria(movimentos, tipo),
    [movimentos, tipo],
  );

  const resumoSemCategoria = useMemo(
    () => resumirSemCategoria(movimentos, tipo),
    [movimentos, tipo],
  );

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo],
  );

  const total = somar(manuais.map((m) => m.valor));

  const porCategoria = useMemo(() => totaisPorCategoria(manuais), [manuais]);

  async function handleSalvar(movimento: NovoMovimentoCaixa) {
    await onSalvar(movimento);
    setMostrarFormulario(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 basis-80 text-corpo text-texto-2">
          Lançamentos manuais de {rotulo} — não inclui faturamento de OS, que já aparece na
          aba Diário
        </p>
        {!mostrarFormulario && (
          // Um botão laranja por tela (regra 2): com o "Categorizar" aberto, o
          // próximo passo é o "Salvar" de lá, e este vira secundário.
          <Botao
            variante={mostrarCategorizar ? "secundario" : "principal"}
            icone={<Plus />}
            onClick={() => setMostrarFormulario(true)}
          >
            Nova {rotulo}
          </Botao>
        )}
      </div>

      {mostrarFormulario && (
        <CaixaForm
          categorias={categorias}
          tipoInicial={tipo}
          tipoBloqueado
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {resumoSemCategoria.quantidade > 0 && !mostrarCategorizar && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-atencao/[0.12] px-4 py-3">
          <p className="flex min-w-0 flex-1 basis-80 items-start gap-2 text-corpo text-atencao">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              {resumoSemCategoria.quantidade === 1
                ? "1 lançamento antigo está sem categoria"
                : `${resumoSemCategoria.quantidade} lançamentos antigos estão sem categoria`}
              , somando {formatarMoeda(resumoSemCategoria.total)} — eles ficam de fora do
              resumo por categoria.
            </span>
          </p>
          <Botao onClick={() => setMostrarCategorizar(true)} disabled={categoriasDoTipo.length === 0}>
            Categorizar agora
          </Botao>
        </div>
      )}

      {mostrarCategorizar && (
        <CategorizarSemCategoria
          tipo={tipo}
          movimentos={semCategoria}
          categorias={categoriasDoTipo}
          onConcluir={async () => {
            await onAtualizado();
            setMostrarCategorizar(false);
          }}
          onCancelar={() => setMostrarCategorizar(false)}
        />
      )}

      <div className="grid grid-cols-4 gap-4">
        <CartaoNumero
          titulo={`Total de ${rotulo}s (todo o período)`}
          explicacao={`A soma de todas as ${rotulo}s desta loja que não vieram de uma ordem de serviço, desde o primeiro lançamento. O faturamento das ordens está na aba Diário.`}
        >
          <Valor valor={total} />
        </CartaoNumero>
      </div>

      {porCategoria.length > 0 && (
        <section>
          <h2 className="mb-3 font-titulo text-corpo font-semibold text-texto">Por categoria</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {porCategoria.map(([nome, valor]) => (
              <div key={nome} className="sakura-card px-4 py-3">
                <p className="text-rotulo font-medium text-texto-2">{nome}</p>
                <p className="mt-0.5 font-titulo text-destaque font-semibold tabular-nums text-texto">
                  {formatarMoeda(valor)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {manuais.length === 0 ? (
        <p className="sakura-card px-[18px] py-4 text-corpo text-texto-2">
          Nenhum lançamento manual de {rotulo} ainda.
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Forma de pagamento</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {manuais.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-texto-2">
                    {new Date(m.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="text-texto">
                    {m.categoria?.nome ?? <Selo tipo="neutro" palavra="Sem categoria" />}
                  </td>
                  <td className="text-texto">{m.descricao || "—"}</td>
                  <td className="text-texto-2">
                    {m.forma_pagamento ? rotuloDaForma(m.forma_pagamento) : "—"}
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold text-texto">
                    {formatarMoeda(m.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
