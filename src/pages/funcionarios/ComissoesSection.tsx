import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { diaBrasileiro } from "@/lib/datas";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import {
  resumirComissoes,
  totaisComissoes,
  SEM_FUNCIONARIO,
  colunaLucroSomaMaisQueOTotal,
  type ComissaoFuncionario,
  type ResumoPapel,
} from "@/schemas/comissoes";
import {
  compararComPagamento,
  jaPagoEmOutrosPeriodos,
  pagamentoDoPeriodo,
} from "@/schemas/comissoesPagas";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import { Aviso } from "@/components/Aviso";
import {
  HistoricoPagamentos,
  ReciboComissaoModal,
  RegistrarPagamentoModal,
} from "./ComissoesPagamentos";
import type { ContaReceber } from "@/types/contaReceber";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemParaComissao } from "@/types/os";
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
  ordens: OrdemParaComissao[];
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
  const colunaLucroSomaMais = colunaLucroSomaMaisQueOTotal(linhas);
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
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-corpo text-texto-2">
          De:
          <span className="w-44">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="sakura-campo sakura-campo-filtro"
            />
          </span>
        </label>
        <label className="flex items-center gap-2 text-corpo text-texto-2">
          Até:
          <span className="w-44">
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="sakura-campo sakura-campo-filtro"
            />
          </span>
        </label>
      </div>

      <p className="text-rotulo text-texto-2">
        Conta só OS já faturada, pela data do faturamento. A comissão é calculada sobre o lucro
        (venda − custo), na porcentagem do cadastro de cada funcionário. Serviço sem custo
        cadastrado fica de fora: a comissão sai sobre o lucro das peças.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <CartaoNumero
          titulo="Lucro do período"
          explicacao="O que sobrou das OS já faturadas no período: a venda menos o custo cadastrado. Serviço sem custo cadastrado fica de fora."
        >
          <Valor valor={totais.lucro} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Total de comissões"
          explicacao="A soma da comissão de todos os funcionários no período, na porcentagem do cadastro de cada um."
        >
          <Valor valor={totais.comissao} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Comissão de OS ainda não recebida"
          explicacao="A parte da comissão que vem de OS faturada como “a receber depois” e que o cliente ainda não pagou."
        >
          <Valor valor={totais.comissaoAReceber} />
        </CartaoNumero>
      </div>

      {/* #876: o dono soma a coluna "Lucro gerado" e dá mais que o lucro do
          período. A conta está certa — só faltava dizer por quê. Só quando é
          verdade. Estava dentro do cartão do lucro; com o cartão de número
          (que só leva o valor), a frase ficou logo abaixo dos três cartões. */}
      {colunaLucroSomaMais && (
        <Aviso tipo="info">
          A coluna "Lucro gerado" soma mais porque o lucro de um item conta pra quem vendeu a OS e
          pra quem fez o item.
        </Aviso>
      )}

      {totais.comissaoAReceber > 0 && (
        <Aviso tipo="atencao">
          {formatarMoeda(totais.comissaoAReceber)} dessa comissão vem de OS faturada como "a
          receber depois", que o cliente ainda não pagou.
        </Aviso>
      )}

      {totais.itensSemCusto > 0 && (
        <Aviso tipo="atencao">
          {totais.itensSemCusto === 1
            ? "1 item vendido no período está sem preço de custo cadastrado"
            : `${totais.itensSemCusto} itens vendidos no período estão sem preço de custo cadastrado`}
          . Eles entram como lucro cheio, então a comissão sai maior que a real — vale conferir o
          cadastro dessas peças/serviços antes de pagar.
        </Aviso>
      )}

      {semPercentual.length > 0 && (
        <Aviso tipo="atencao">
          Sem porcentagem de comissão cadastrada:{" "}
          {semPercentual.map((linha) => linha.nome).join(", ")}. A comissão deles fica em zero até
          preencher o campo "Comissão (%)" no cadastro do funcionário.
        </Aviso>
      )}

      {semDono && (
        <Aviso tipo="atencao">
          {formatarMoeda(semDono.lucroTotal)} de lucro ficou sem
          dono no período — OS sem vendedor escolhido, ou item sem técnico. Esse valor não gera
          comissão pra ninguém.
        </Aviso>
      )}

      {divergencias.map(({ pagamento, comparacao }) => (
        <Aviso key={pagamento.id} tipo="atencao">
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
        </Aviso>
      ))}

      {jaPagosEmOutros.map(({ linha, jaPago }) => (
        <Aviso key={linha.funcionarioId} tipo="atencao">
          {formatarMoeda(jaPago.valor)} da comissão de {linha.nome} neste período vem de OS que já
          entraram num pagamento anterior (OS {jaPago.numeros.join(", ")}). Confira antes de pagar de novo.
        </Aviso>
      ))}

      {linhas.length === 0 ? (
        <p className="text-corpo text-texto-2">
          Nenhuma OS faturada nesse período — nada pra calcular ainda.
        </p>
      ) : (
        <section>
          <h2 className="mb-3 text-corpo font-semibold text-texto">Comissão por funcionário</h2>
          <div className="sakura-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="sakura-tabela">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th className="text-right">Comissão</th>
                    <th className="text-right">Vendeu</th>
                    <th className="text-right">Lucro gerado</th>
                    <th className="text-right">A pagar</th>
                    <th>Pagamento</th>
                    <th>
                      <span className="sr-only">Detalhes</span>
                    </th>
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
      <tr>
        <td className="font-medium text-texto">{linha.nome}</td>
        <td className="text-right">
          {linha.percentual === null ? (
            <span className="text-texto-2">—</span>
          ) : (
            `${linha.percentual}%`
          )}
        </td>
        <td className="text-right">{formatarMoeda(linha.vendidoTotal)}</td>
        <td className="text-right">{formatarMoeda(linha.lucroTotal)}</td>
        <td className="text-right font-semibold text-texto">{formatarMoeda(linha.comissaoTotal)}</td>
        <td>
          {linha.funcionarioId === SEM_FUNCIONARIO ? (
            <span className="text-texto-2">—</span>
          ) : pagamento ? (
            <span className="flex flex-wrap items-center gap-2">
              <Selo tipo="ok" palavra="Pago" />
              <span className="whitespace-nowrap">
                {formatarMoeda(pagamento.valor_pago)} em {diaBrasileiro(pagamento.data_pagamento)}
              </span>
              <Botao variante="fantasma" tamanho="pequeno" onClick={() => onRecibo(pagamento)}>
                Recibo
              </Botao>
            </span>
          ) : (
            <Botao variante="secundario" tamanho="pequeno" onClick={onPagar}>
              Registrar pagamento
            </Botao>
          )}
        </td>
        <td className="text-right">
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            onClick={onAlternar}
            aria-expanded={aberta}
            icone={aberta ? <ChevronUp /> : <ChevronDown />}
          >
            {aberta ? "Fechar" : "Ver as OS"}
          </Botao>
        </td>
      </tr>
      {aberta && (
        <tr>
          <td colSpan={7} className="!h-auto bg-poco !py-4">
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
      <h3 className="mb-2 text-rotulo font-semibold text-texto">
        {titulo}
        {papel.ordens.length > 0 && (
          <span className="ml-2 font-normal text-texto-2">
            {formatarMoeda(papel.lucro)} de lucro · {formatarMoeda(papel.comissao)} de comissão
          </span>
        )}
      </h3>
      {papel.ordens.length === 0 ? (
        <p className="text-rotulo text-texto-2">{vazio}</p>
      ) : (
        <table className="w-full table-fixed text-left text-tabela tabular-nums">
          {/* Largura fixa pra as duas tabelas (vendedor e técnico) ficarem
              alinhadas uma embaixo da outra, e não cada uma num lugar. Valores
              à direita e em coluna, como na tabela de cima. */}
          <thead className="text-texto-2">
            <tr>
              <th className="w-[10%] py-1 font-medium">OS</th>
              <th className="w-[14%] py-1 font-medium">Data</th>
              <th className="w-[26%] py-1 font-medium">Cliente</th>
              <th className="w-[14%] py-1 text-right font-medium">Vendido</th>
              <th className="w-[14%] py-1 text-right font-medium">Lucro</th>
              <th className="py-1 text-right font-medium">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {papel.ordens.map((ordem) => (
              <tr key={`${ordem.ordemId}-${titulo}`} className="border-t border-linha">
                <td className="py-1.5">{nomeOrdem(ordem.numero, ordem.tipo)}</td>
                <td className="py-1.5">{formatarData(ordem.data)}</td>
                <td className="py-1.5">{ordem.cliente}</td>
                <td className="py-1.5 text-right">{formatarMoeda(ordem.vendido)}</td>
                <td className="py-1.5 text-right">{formatarMoeda(ordem.lucro)}</td>
                <td className="py-1.5 text-right">
                  <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                    {ordem.aReceber && <Selo tipo="atencao" palavra="A receber" />}
                    {ordem.itensSemCusto > 0 && <Selo tipo="atencao" palavra="Sem custo" />}
                    {formatarMoeda(ordem.comissao)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
