import { useMemo, useState } from "react";
import { diaBrasileiro } from "@/lib/datas";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import {
  resumirComissoes,
  totaisComissoes,
  SEM_FUNCIONARIO,
  type ComissaoFuncionario,
  type ResumoPapel,
} from "@/schemas/comissoes";
import {
  compararComPagamento,
  jaPagoEmOutrosPeriodos,
  pagamentoDoPeriodo,
} from "@/schemas/comissoesPagas";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import {
  HistoricoPagamentos,
  ReciboComissaoModal,
  RegistrarPagamentoModal,
} from "./ComissoesPagamentos";
import type { ContaReceber } from "@/types/contaReceber";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";
import { nomeOrdem } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

function primeiroDiaDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString("sv-SE");
}

function hojeStr(): string {
  return new Date().toLocaleDateString("sv-SE");
}

interface ComissoesSectionProps {
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
  funcionarios: Funcionario[];
  contasReceber: ContaReceber[];
  lojaId: string;
  nomeLoja: string;
  /** Pagamentos já registrados (migration 0059). Vazio se o banco ainda não tem a tabela. */
  pagamentos: ComissaoFechamento[];
  /** Só admin da loja desfaz um registro — o banco confere de novo. */
  podeDesfazer: boolean;
  onPagamentosMudaram: () => Promise<void>;
}

export function ComissoesSection({
  ordens,
  pecas,
  servicos,
  funcionarios,
  contasReceber,
  lojaId,
  nomeLoja,
  pagamentos,
  podeDesfazer,
  onPagamentosMudaram,
}: ComissoesSectionProps) {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hojeStr());
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [pagando, setPagando] = useState<ComissaoFuncionario | null>(null);
  const [recibo, setRecibo] = useState<ComissaoFechamento | null>(null);

  const linhas = useMemo(
    () =>
      resumirComissoes({
        ordens,
        funcionarios,
        custoPeca: mapaCustoPecas(pecas),
        custoServico: mapaCustoServicos(servicos),
        ordensAReceber: new Set(
          contasReceber
            .filter((conta) => conta.status === "pendente" && conta.ordem_servico_id)
            .map((conta) => conta.ordem_servico_id as string),
        ),
        de: dataInicio,
        ate: dataFim,
      }),
    [ordens, funcionarios, pecas, servicos, contasReceber, dataInicio, dataFim],
  );

  const totais = totaisComissoes(linhas);
  const semPercentual = linhas.filter(
    (linha) => linha.funcionarioId !== SEM_FUNCIONARIO && linha.percentual === null,
  );
  const semDono = linhas.find((linha) => linha.funcionarioId === SEM_FUNCIONARIO);

  // Pagamento registrado pra EXATAMENTE este período, e o que mudou desde ele.
  // Inclui quem pagou-se no período mas não tem mais OS nele (a linha sumiu
  // do recálculo) — é justamente o caso mais estranho, e não pode sumir junto.
  const pagosNoPeriodo = pagamentos.filter(
    (p) => p.periodo_inicio === dataInicio && p.periodo_fim === dataFim,
  );
  const divergencias = pagosNoPeriodo
    .map((p) => ({
      pagamento: p,
      comparacao: compararComPagamento(
        linhas.find((l) => l.funcionarioId === p.funcionario_id),
        p,
      ),
    }))
    .filter((d) => d.comparacao.divergiu);
  const jaPagosEmOutros = linhas
    .filter((l) => l.funcionarioId !== SEM_FUNCIONARIO)
    .filter((l) => !pagamentoDoPeriodo(pagamentos, l.funcionarioId, dataInicio, dataFim))
    .map((l) => ({ linha: l, jaPago: jaPagoEmOutrosPeriodos(l, pagamentos, dataInicio, dataFim) }))
    .filter((x) => x.jaPago.valor !== 0);

  return (
    <>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          De:
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          Até:
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
      </div>

      <p className="text-rotulo text-sakura-muted">
        Conta só OS já faturada, pela data do faturamento. A comissão é calculada sobre o lucro
        (venda − custo), na porcentagem do cadastro de cada funcionário.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Lucro do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totais.lucro)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Total de comissões</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totais.comissao)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Comissão de OS ainda não recebida</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totais.comissaoAReceber)}
          </p>
        </div>
      </div>

      {totais.comissaoAReceber > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          {formatarMoeda(totais.comissaoAReceber)} dessa comissão vem de OS faturada como "a
          receber depois", que o cliente ainda não pagou.
        </p>
      )}

      {totais.itensSemCusto > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          {totais.itensSemCusto === 1
            ? "1 item vendido no período está sem preço de custo cadastrado"
            : `${totais.itensSemCusto} itens vendidos no período estão sem preço de custo cadastrado`}
          . Eles entram como lucro cheio, então a comissão sai maior que a real — vale conferir o
          cadastro dessas peças/serviços antes de pagar.
        </p>
      )}

      {semPercentual.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Sem porcentagem de comissão cadastrada:{" "}
          {semPercentual.map((linha) => linha.nome).join(", ")}. A comissão deles fica em zero até
          preencher o campo "Comissão (%)" no cadastro do funcionário.
        </p>
      )}

      {semDono && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          {formatarMoeda(semDono.lucroTotal)} de lucro ficou sem
          dono no período — OS sem vendedor escolhido, ou item sem técnico. Esse valor não gera
          comissão pra ninguém.
        </p>
      )}

      {divergencias.map(({ pagamento, comparacao }) => (
        <div key={pagamento.id} className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          <p className="font-medium">
            A comissão de {pagamento.funcionario_nome} mudou depois do pagamento de{" "}
            {diaBrasileiro(pagamento.data_pagamento)}.
          </p>
          <p>
            Foi paga com base em {formatarMoeda(comparacao.congelado)}; recalculada hoje dá{" "}
            {formatarMoeda(comparacao.recalculado)} ({comparacao.diferenca > 0 ? "+" : "−"}
            {formatarMoeda(Math.abs(comparacao.diferenca))}). Alguma OS desse período foi editada depois:
          </p>
          <ul className="mt-1 list-inside list-disc text-rotulo">
            {comparacao.mudancas.map((m) => (
              <li key={`${m.numero}-${m.papel}`}>
                {nomeOrdem(m.numero, m.tipo)} ({m.papel === "vendedor" ? "vendedor" : "técnico"}):{" "}
                {m.antes === null ? "entrou no período" : formatarMoeda(m.antes)} →{" "}
                {m.agora === null ? "saiu do período" : formatarMoeda(m.agora)}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {jaPagosEmOutros.map(({ linha, jaPago }) => (
        <p key={linha.funcionarioId} className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          {formatarMoeda(jaPago.valor)} da comissão de {linha.nome} neste período vem de OS que já
          entraram num pagamento anterior (OS {jaPago.numeros.join(", ")}). Confira antes de pagar de novo.
        </p>
      ))}

      {linhas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhuma OS faturada nesse período — nada pra calcular ainda.
        </p>
      ) : (
        <section>
          <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
            Comissão por funcionário
          </h2>
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-3 font-medium">Funcionário</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                  <th className="px-4 py-3 font-medium">Vendeu</th>
                  <th className="px-4 py-3 font-medium">Lucro gerado</th>
                  <th className="px-4 py-3 font-medium">A pagar</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <LinhaFuncionario
                    key={linha.funcionarioId}
                    linha={linha}
                    aberta={abertoId === linha.funcionarioId}
                    pagamento={pagamentoDoPeriodo(pagamentos, linha.funcionarioId, dataInicio, dataFim)}
                    onPagar={() => setPagando(linha)}
                    onRecibo={setRecibo}
                    onAlternar={() =>
                      setAbertoId(abertoId === linha.funcionarioId ? null : linha.funcionarioId)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <HistoricoPagamentos
        pagamentos={pagamentos}
        podeDesfazer={podeDesfazer}
        onRecibo={setRecibo}
        onDesfeito={onPagamentosMudaram}
      />

      {pagando && (
        <RegistrarPagamentoModal
          lojaId={lojaId}
          linha={pagando}
          de={dataInicio}
          ate={dataFim}
          jaPago={jaPagoEmOutrosPeriodos(pagando, pagamentos, dataInicio, dataFim)}
          onRegistrado={async () => {
            setPagando(null);
            await onPagamentosMudaram();
          }}
          onFechar={() => setPagando(null)}
        />
      )}

      {recibo && (
        <ReciboComissaoModal nomeLoja={nomeLoja} pagamento={recibo} onFechar={() => setRecibo(null)} />
      )}
    </>
  );
}

function LinhaFuncionario({
  linha,
  aberta,
  onAlternar,
  pagamento,
  onPagar,
  onRecibo,
}: {
  linha: ComissaoFuncionario;
  aberta: boolean;
  onAlternar: () => void;
  pagamento: ComissaoFechamento | null;
  onPagar: () => void;
  onRecibo: (p: ComissaoFechamento) => void;
}) {
  return (
    <>
      <tr className="border-t border-sakura-gray/20">
        <td className="px-4 py-3">{linha.nome}</td>
        <td className="px-4 py-3">
          {linha.percentual === null ? (
            <span className="text-sakura-muted">—</span>
          ) : (
            `${linha.percentual}%`
          )}
        </td>
        <td className="px-4 py-3">{formatarMoeda(linha.vendidoTotal)}</td>
        <td className="px-4 py-3">{formatarMoeda(linha.lucroTotal)}</td>
        <td className="px-4 py-3 font-medium">{formatarMoeda(linha.comissaoTotal)}</td>
        <td className="px-4 py-3">
          {linha.funcionarioId === SEM_FUNCIONARIO ? (
            <span className="text-sakura-muted">—</span>
          ) : pagamento ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="whitespace-nowrap text-sakura-purple-dark">
                ✓ {formatarMoeda(pagamento.valor_pago)} em {diaBrasileiro(pagamento.data_pagamento)}
              </span>
              <button
                type="button"
                onClick={() => onRecibo(pagamento)}
                className="min-h-8 rounded-lg px-2 text-rotulo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
              >
                Recibo
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={onPagar}
              className="min-h-8 whitespace-nowrap rounded-lg border border-sakura-gray/40 px-3 text-rotulo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
            >
              Registrar pagamento
            </button>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={onAlternar}
            className="text-rotulo font-medium text-sakura-purple hover:underline"
          >
            {aberta ? "Fechar" : "Ver as OS"}
          </button>
        </td>
      </tr>
      {aberta && (
        <tr className="border-t border-sakura-gray/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-4">
              <BlocoDoPapel
                titulo="Como vendedor (atendeu a OS)"
                papel={linha.comoVendedor}
                vazio="Não atendeu nenhuma OS faturada nesse período."
              />
              <BlocoDoPapel
                titulo="Como técnico (executou o item)"
                papel={linha.comoTecnico}
                vazio="Não foi marcado como técnico em nenhum item nesse período."
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BlocoDoPapel({
  titulo,
  papel,
  vazio,
}: {
  titulo: string;
  papel: ResumoPapel;
  vazio: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-rotulo font-semibold text-sakura-purple-dark">
        {titulo}
        {papel.ordens.length > 0 && (
          <span className="ml-2 font-normal text-sakura-muted">
            {formatarMoeda(papel.lucro)} de lucro · {formatarMoeda(papel.comissao)} de comissão
          </span>
        )}
      </h3>
      {papel.ordens.length === 0 ? (
        <p className="text-rotulo text-sakura-muted">{vazio}</p>
      ) : (
        <table className="w-full table-fixed text-left text-tabela">
          {/* Largura fixa pra as duas tabelas (vendedor e técnico) ficarem
              alinhadas uma embaixo da outra, e não cada uma num lugar. */}
          <thead className="text-sakura-purple-dark/90">
            <tr>
              <th className="w-[10%] py-1 font-medium">OS</th>
              <th className="w-[14%] py-1 font-medium">Data</th>
              <th className="w-[30%] py-1 font-medium">Cliente</th>
              <th className="w-[14%] py-1 font-medium">Vendido</th>
              <th className="w-[14%] py-1 font-medium">Lucro</th>
              <th className="py-1 font-medium">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {papel.ordens.map((ordem) => (
              <tr key={`${ordem.ordemId}-${titulo}`} className="border-t border-sakura-gray/20">
                <td className="py-1.5">{nomeOrdem(ordem.numero, ordem.tipo)}</td>
                <td className="py-1.5">{formatarData(ordem.data)}</td>
                <td className="py-1.5">{ordem.cliente}</td>
                <td className="py-1.5">{formatarMoeda(ordem.vendido)}</td>
                <td className="py-1.5">{formatarMoeda(ordem.lucro)}</td>
                <td className="py-1.5">
                  {formatarMoeda(ordem.comissao)}
                  {ordem.aReceber && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-meta text-amber-800">
                      a receber
                    </span>
                  )}
                  {ordem.itensSemCusto > 0 && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-meta text-amber-800">
                      sem custo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
