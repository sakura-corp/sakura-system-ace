import { useMemo, useState } from "react";
import {
  custoDaOrdemPeloBanco,
  lucroPorMovimento,
  resumirMovimentos,
  type CustoDoBanco,
} from "@/schemas/metricasCaixa";
import { Plus } from "lucide-react";
import { Botao } from "@/components/Botao";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Dica } from "@/components/Dica";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import {
  lancamentosDepoisDoFechamento,
  rotuloDaForma,
  totaisPorFormaDePagamento,
} from "@/schemas/fechamentoCaixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import { nomeOrdem } from "@/types/os";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa } from "@/types/caixa";
import { CaixaForm } from "./CaixaForm";

interface DiarioSectionProps {
  movimentos: MovimentoCaixa[];
  custoDasOrdens: CustoDoBanco;
  categorias: CategoriaCaixa[];
  fechamentos?: FechamentoCaixa[];
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paraDataLocal(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString("sv-SE");
}

export function DiarioSection({
  movimentos,
  custoDasOrdens,
  categorias,
  fechamentos = [],
  onSalvar,
}: DiarioSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [dataFiltro, setDataFiltro] = useState(() => paraDataLocal(new Date().toISOString()));

  async function handleSalvar(movimento: NovoMovimentoCaixa) {
    await onSalvar(movimento);
    setMostrarFormulario(false);
  }

  const custoDaOrdem = useMemo(() => custoDaOrdemPeloBanco(custoDasOrdens), [custoDasOrdens]);

  const movimentosDoDia = useMemo(
    () => movimentos.filter((m) => paraDataLocal(m.data) === dataFiltro),
    [movimentos, dataFiltro],
  );

  const resumo = useMemo(
    () => resumirMovimentos(movimentosDoDia, custoDaOrdem),
    [movimentosDoDia, custoDaOrdem],
  );
  const entradas = resumo.entradas;
  const saidas = resumo.saidas;

  const porFormaPagamento = useMemo(
    () => totaisPorFormaDePagamento(movimentosDoDia),
    [movimentosDoDia],
  );

  // Lucro de cada linha: numa OS paga em duas formas, o lucro da OS é
  // repartido entre os lançamentos — antes cada linha mostrava o lucro
  // cheio da OS e o total do dia contava esse lucro duas vezes.
  const lucrosPorMovimento = useMemo(
    () => lucroPorMovimento(movimentosDoDia, custoDaOrdem),
    [movimentosDoDia, custoDaOrdem],
  );

  const totalLucro = resumo.lucro;

  const fechamentoDoDia = fechamentos.find((f) => f.data === dataFiltro) ?? null;
  const idsDepoisDoFechamento = useMemo(
    () => new Set(lancamentosDepoisDoFechamento(movimentosDoDia, fechamentoDoDia).map((m) => m.id)),
    [movimentosDoDia, fechamentoDoDia],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="sakura-rotulo w-44">
          Dia
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="sakura-campo sakura-campo-filtro"
          />
        </label>
        {!mostrarFormulario && (
          <Botao variante="principal" icone={<Plus />} onClick={() => setMostrarFormulario(true)}>
            Lançamento manual
          </Botao>
        )}
      </div>

      {mostrarFormulario && (
        <CaixaForm
          categorias={categorias}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {/* Quatro lado a lado só quando cabem (a largura da TELA, não da janela:
          o menu aberto come 236 px). Abaixo disso, dois por linha: o número
          tem 30 px e não quebra, e "R$ 12.345,67" não cabe num quarto de 980 px. */}
      <div className="@container">
      <div className="grid grid-cols-2 gap-4 @5xl:grid-cols-4">
        <CartaoNumero titulo="Entradas do dia" explicacao={EXPLICA.entradas}>
          <Valor valor={entradas} />
        </CartaoNumero>
        <CartaoNumero titulo="Saídas do dia" explicacao={EXPLICA.saidas}>
          <Valor valor={saidas} />
        </CartaoNumero>
        <CartaoNumero titulo="Saldo do dia" explicacao={EXPLICA.saldo}>
          <Valor valor={entradas - saidas} />
        </CartaoNumero>
        {/* Dia de prejuízo existe (o lucro desconta custo de aquisição e as
            saídas lançadas à mão) e precisa parecer prejuízo — daí o
            <Valor>, o mesmo dos cartões do Início. */}
        <CartaoNumero titulo="Lucro do dia" explicacao={EXPLICA.lucro}>
          <Valor valor={totalLucro} />
        </CartaoNumero>
      </div>
      </div>

      {porFormaPagamento.length > 0 && (
        <section>
          <h2 className="mb-3 font-titulo text-corpo font-semibold text-texto">
            Formas de recebimento
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {porFormaPagamento.map(([forma, valor]) => (
              <div key={forma} className="sakura-card px-4 py-3">
                <p className="text-rotulo font-medium text-texto-2">{forma}</p>
                <p className="mt-0.5 font-titulo text-destaque font-semibold tabular-nums text-texto">
                  {formatarMoeda(valor)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {movimentosDoDia.length === 0 ? (
        <p className="sakura-card px-[18px] py-4 text-corpo text-texto-2">
          Nenhuma movimentação neste dia.
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Origem</th>
                <th>Cliente</th>
                <th>Forma de pagamento</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {movimentosDoDia.map((m) => {
                const lucro = lucrosPorMovimento.get(m.id) ?? null;
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-texto-2">
                      {new Date(m.data).toLocaleTimeString("pt-BR")}
                    </td>
                    <td className="text-texto">
                      <span className="font-medium">
                        {m.ordem_servico_id
                          ? m.ordem_servico?.numero
                            ? nomeOrdem(m.ordem_servico.numero, m.ordem_servico.tipo)
                            : "OS"
                          : m.categoria?.nome || m.descricao || "Lançamento manual"}
                      </span>
                      {idsDepoisDoFechamento.has(m.id) && (
                        <Dica texto="Entrou depois de o caixa do dia ser fechado — não estava na gaveta quando ela foi contada.">
                          <span tabIndex={0} className="ml-2 inline-flex rounded-full align-middle">
                            <Selo tipo="atencao" palavra="Depois do fechamento" />
                            {/* A explicação também no texto, pro leitor de
                                tela ouvir lendo a linha (a dica só aparece com
                                o mouse ou o foco). */}
                            <span className="sr-only">
                              : entrou depois de o caixa do dia ser fechado, não estava na gaveta quando
                              ela foi contada.
                            </span>
                          </span>
                        </Dica>
                      )}
                    </td>
                    <td className="text-texto">{m.ordem_servico?.cliente?.nome ?? "—"}</td>
                    <td className="text-texto-2">
                      {m.forma_pagamento ? rotuloDaForma(m.forma_pagamento) : "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap text-right font-semibold ${
                        m.tipo === "saida" ? "text-perigo" : "text-texto"
                      }`}
                    >
                      {m.tipo === "saida" ? "− " : ""}
                      {formatarMoeda(m.valor)}
                    </td>
                    <td className="whitespace-nowrap text-right text-texto-2">
                      {lucro !== null ? <Valor valor={lucro} classeDeCor="text-texto-2" /> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-linha-forte bg-poco font-semibold">
                <td className="text-texto" colSpan={4}>
                  Total do dia
                </td>
                <td className="whitespace-nowrap text-right">
                  <Valor valor={entradas - saidas} />
                </td>
                <td className="whitespace-nowrap text-right">
                  <Valor valor={totalLucro} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * A frase do "?" de cada cartão: o que o número quer dizer, em palavras de
 * balcão. Só texto: a conta continua em `schemas/metricasCaixa.ts`.
 */
const EXPLICA = {
  entradas:
    "Tudo que entrou no caixa neste dia: o que as ordens de serviço e as vendas de balcão receberam, as contas a receber pagas, as entradas lançadas à mão e a sobra de caixa do fechamento.",
  saidas:
    "Tudo que saiu do caixa neste dia: as contas pagas, as saídas lançadas à mão e a quebra de caixa do fechamento.",
  saldo:
    "Entradas menos saídas do dia. Não é o dinheiro da gaveta: Pix e cartão também entram aqui. Pra conferir a gaveta, use a aba Fechamento.",
  lucro:
    "Entradas menos saídas, menos o custo das peças e dos serviços das ordens e vendas de balcão que receberam neste dia. Fica vermelho, com a seta pra baixo, quando o dia deu prejuízo.",
};
