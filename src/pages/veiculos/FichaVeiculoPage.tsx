import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Explicacao } from "@/components/Explicacao";
import { LinkCliente } from "@/components/LinkCliente";
import { Valor } from "@/components/Valor";
import { VeiculoIcone } from "@/components/VeiculoIcone";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, diaLocal, diasEntre, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { buscarFichaDoVeiculo, type FichaDoVeiculo } from "@/lib/veiculos";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  kmMaisRecente,
  linhaDoTempo,
  mediaDeDiasEntreVisitas,
  ordensComKmMenorQueAnterior,
  pecasNaGarantia,
  rodagemEstimada,
  tempoDesde,
  totalGastoNoVeiculo,
  diasDeVisita,
  type OrdemDaFicha,
} from "@/schemas/fichaVeiculo";
import { nomeOrdem, totalOrdem } from "@/types/os";
import { temPermissao } from "@/types/operador";
import { AvisoDeErro } from "../clientes/AvisoDeErro";
import { SeloDoStatusDaOrdem } from "../clientes/SeloDoStatusDaOrdem";

function km(valor: number): string {
  return `${valor.toLocaleString("pt-BR")} km`;
}

/**
 * A ficha do veículo (item FN-04 do guia de melhorias): tudo que já foi feito
 * num carro, por placa. É a pergunta que chega no balcão junto com o carro —
 * "quando foi a última troca?", "esse pneu ainda está na garantia?" — e o
 * histórico que a loja constrói sem perceber.
 *
 * Só lê. Nenhuma tabela nova, nenhuma gravação: tudo sai das OS que já
 * existem, e as contas moram em `schemas/fichaVeiculo.ts`.
 */
export function FichaVeiculoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operador, lojaAtual, lojasDisponiveis } = useAuth();
  const [ficha, setFicha] = useState<FichaDoVeiculo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // Sem o módulo Clientes a ficha vem pela janela estreita (migration 0068).
  const podeVerCadastro = temPermissao(operador, "clientes");

  useEffect(() => {
    async function carregar() {
      if (!id) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      setErro(null);
      try {
        setFicha(await buscarFichaDoVeiculo(id, podeVerCadastro));
      } catch (err) {
        console.error("Erro ao carregar a ficha do veículo:", err);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id, podeVerCadastro]);

  const hoje = hojeLocal();

  const dados = useMemo(() => {
    if (!ficha) return null;
    const { ordens, veiculo } = ficha;
    const visitas = diasDeVisita(ordens);
    return {
      linha: linhaDoTempo(ordens),
      kmAtual: kmMaisRecente(ordens, veiculo.km_atual),
      kmSuspeitos: ordensComKmMenorQueAnterior(ordens),
      rodagem: rodagemEstimada(ordens),
      mediaVisitas: mediaDeDiasEntreVisitas(ordens),
      visitas,
      gasto: totalGastoNoVeiculo(ordens),
      faturadas: ordens.filter((o) => o.status === "faturada").length,
      garantia: pecasNaGarantia(ordens, hoje),
      // Só mostra de qual loja é cada OS quando o carro passou em mais de
      // uma — numa empresa de loja única, a informação só ocuparia espaço.
      variasLojas: new Set(ordens.map((o) => o.loja_id)).size > 1,
    };
  }, [ficha, hoje]);

  const podeAbrirOS = temPermissao(operador, "ordens_servico");

  function abrirOrdem(ordem: OrdemDaFicha) {
    // `voltarAoFechar` (#393): o Voltar da OS traz de volta pra esta ficha.
    navigate("/ordens-servico", { state: { abrirOrdemId: ordem.id, voltarAoFechar: true } });
  }

  function nomeDaLoja(lojaId: string): string {
    return lojasDisponiveis.find((l) => l.id === lojaId)?.nome ?? "outra loja";
  }

  // Volta pelo histórico: a ficha é aberta de Clientes, da lista de OS e de
  // Garantias, e o certo é voltar pra onde se estava.
  const voltar = () => navigate(-1);

  if (carregando) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <BotaoVoltar onClick={voltar} />
          <h1 className="font-titulo text-titulo font-bold text-texto">Ficha do veículo</h1>
        </header>
        <p className="text-corpo text-texto-2">Carregando...</p>
      </div>
    );
  }

  if (!ficha || !dados) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <BotaoVoltar onClick={voltar} />
          <h1 className="font-titulo text-titulo font-bold text-texto">Ficha do veículo</h1>
        </header>
        {erro ? (
          <AvisoDeErro>{erro}</AvisoDeErro>
        ) : (
          <p className="text-corpo text-texto-2">
            Veículo não encontrado. Ele pode ter sido excluído do cadastro do cliente.
          </p>
        )}
      </div>
    );
  }

  const { veiculo } = ficha;
  const descricaoCarro = [
    [veiculo.marca, veiculo.modelo].filter(Boolean).join(" "),
    veiculo.ano,
    veiculo.cor,
  ]
    .filter(Boolean)
    .join(" · ");
  const ultimaVisita = dados.visitas[dados.visitas.length - 1];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar onClick={voltar} />
        <VeiculoIcone tipo={veiculo.tipo} cor={veiculo.cor} className="h-12 w-20 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-titulo text-titulo font-bold tracking-[0.04em] text-texto">
            {veiculo.placa}
          </h1>
          <p className="text-corpo text-texto-2">{descricaoCarro || "Ficha do veículo"}</p>
          {/* O dono (antes um cartão à parte, "Dono atual") sobe pro cabeçalho:
              é a primeira coisa que se pergunta com o carro na frente, e um
              nome não é um número de bater o olho. O "?" explicou o cartão e
              continua explicando aqui. */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-corpo text-texto-2">
            <span>Dono atual:</span>
            {veiculo.cliente ? (
              <LinkCliente clienteId={veiculo.cliente.id} nome={veiculo.cliente.nome} podeAbrir />
            ) : (
              <span className="text-texto">—</span>
            )}
            {/* Sem o módulo Clientes o telefone nem chega (migration 0068):
                "sem telefone cadastrado" seria mentira, então a linha some. */}
            {podeVerCadastro && (
              <>
                <span aria-hidden="true">·</span>
                <span>{veiculo.cliente?.telefone || "Sem telefone cadastrado"}</span>
              </>
            )}
            <Explicacao
              titulo="Dono atual"
              texto="O cliente em cujo cadastro este veículo está hoje. Uma OS antiga pode ter sido aberta em nome de outra pessoa."
            />
          </p>
        </div>
      </header>

      {/* O `max-w-[17rem]` das frases embaixo dos números: o `CartaoNumero` não
          quebra a linha do que vem depois do número (o bloco dele não encolhe),
          e sem o limite a frase do KM saía do cartão. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CartaoNumero
          titulo="KM mais recente"
          explicacao="O KM anotado na OS mais recente deste carro — não o maior já digitado, pra um erro de digitação não ficar colado nele. Sem OS com KM, vale o do cadastro."
          variacao={
            <div className="max-w-[17rem] space-y-1 whitespace-normal text-rotulo text-texto-2">
              <p>
                {!dados.kmAtual
                  ? "Nenhum KM anotado ainda"
                  : dados.kmAtual.dia
                    ? `Anotado em ${diaBrasileiro(dados.kmAtual.dia)}`
                    : "Do cadastro do veículo"}
              </p>
              <p>
                {dados.rodagem.tipo === "estimada"
                  ? `Roda cerca de ${km(dados.rodagem.kmPorMes)} por mês (estimativa)`
                  : dados.rodagem.motivo}
              </p>
            </div>
          }
        >
          <span className="text-texto">{dados.kmAtual ? km(dados.kmAtual.km) : "—"}</span>
        </CartaoNumero>

        <CartaoNumero
          titulo="Total em OS faturadas"
          explicacao="A soma dos itens das OS já faturadas deste carro, com desconto e sem os juros do cartão — o mesmo 'Total' da lista de OS. OS ainda em andamento não entram."
          variacao={
            <span className="text-rotulo text-texto-2">
              {dados.faturadas === 1 ? "1 OS faturada" : `${dados.faturadas} OS faturadas`}
            </span>
          }
        >
          <Valor valor={dados.gasto} />
        </CartaoNumero>

        <CartaoNumero
          titulo="Visitas"
          explicacao="Os dias diferentes em que o carro passou pela loja (duas OS no mesmo dia contam como uma visita), e a média de dias entre uma visita e a seguinte."
          variacao={
            <div className="max-w-[17rem] space-y-1 whitespace-normal text-rotulo text-texto-2">
              <p>
                {ultimaVisita
                  ? `Última: ${tempoDesde(diasEntre(ultimaVisita, hoje))}`
                  : "Ainda não passou pela loja"}
              </p>
              {dados.mediaVisitas != null && <p>Volta a cada {dados.mediaVisitas} dias, em média</p>}
            </div>
          }
        >
          <span className="text-texto">{dados.visitas.length}</span>
        </CartaoNumero>
      </div>

      <section className="sakura-card overflow-hidden pt-4">
        <h2 className="mb-2 px-[18px] text-corpo font-semibold text-texto">Peças na garantia</h2>
        {dados.garantia.emVigor.length === 0 ? (
          <p className="px-[18px] pb-4 text-corpo text-texto-2">
            Nenhuma peça deste carro está na garantia agora.
            {dados.garantia.vencidas > 0 &&
              ` ${dados.garantia.vencidas === 1 ? "Uma já venceu" : `${dados.garantia.vencidas} já venceram`}.`}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="sakura-tabela">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th className="text-right">Qtde.</th>
                    <th>Vendida na</th>
                    <th>Vence em</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.garantia.emVigor.map((peca) => (
                    <tr key={peca.itemId}>
                      <td className="font-medium text-texto">{peca.descricao}</td>
                      <td className="text-right">{peca.quantidade.toLocaleString("pt-BR")}</td>
                      <td>{nomeOrdem(peca.numero, peca.tipoOrdem)}</td>
                      <td>
                        {diaBrasileiro(peca.vencimento)}
                        <span className="ml-2 text-rotulo text-texto-2">
                          {peca.diasRestantes === 0
                            ? "(último dia)"
                            : peca.diasRestantes === 1
                              ? "(falta 1 dia)"
                              : `(faltam ${peca.diasRestantes} dias)`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dados.garantia.vencidas > 0 && (
              <p className="px-[18px] py-3 text-rotulo text-texto-2">
                {dados.garantia.vencidas === 1
                  ? "Mais uma peça deste carro já saiu da garantia."
                  : `Mais ${dados.garantia.vencidas} peças deste carro já saíram da garantia.`}
              </p>
            )}
          </>
        )}
      </section>

      <section className="sakura-card p-4">
        <h2 className="mb-3 px-1 text-corpo font-semibold text-texto">
          Histórico ({dados.linha.length === 1 ? "1 OS" : `${dados.linha.length} OS`})
        </h2>
        {dados.linha.length === 0 ? (
          <p className="px-1 text-corpo text-texto-2">
            Este carro ainda não passou por nenhuma ordem de serviço.
          </p>
        ) : (
          <ol className="space-y-3">
            {dados.linha.map((ordem) => {
              const dia = diaLocal(ordem.data_abertura);
              const outroDono =
                ordem.cliente_id !== veiculo.cliente_id ? ordem.cliente?.nome : null;
              const daLojaAtual = ordem.loja_id === lojaAtual?.id;
              return (
                <li key={ordem.id} className="rounded-xl border border-linha bg-poco p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-corpo font-semibold text-texto">
                        {diaBrasileiro(dia)}
                        <span className="ml-2 font-normal text-texto-2">
                          {tempoDesde(diasEntre(dia, hoje))}
                        </span>
                      </p>
                      <p className="mt-1 text-rotulo text-texto-2">
                        {nomeOrdem(ordem.numero, ordem.tipo)}
                        {ordem.km_entrada != null && ` · ${km(ordem.km_entrada)}`}
                        {dados.variasLojas && ` · ${nomeDaLoja(ordem.loja_id)}`}
                        {outroDono && ` · em nome de ${outroDono}`}
                      </p>
                      {dados.kmSuspeitos.has(ordem.id) && (
                        <p className="mt-1 flex items-start gap-1.5 text-rotulo text-atencao">
                          <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                          KM menor que o da visita anterior — confira se não faltou um dígito
                          numa das duas.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <SeloDoStatusDaOrdem status={ordem.status} />
                      <span className="whitespace-nowrap text-corpo font-semibold tabular-nums text-texto">
                        {formatarMoeda(totalOrdem(ordem.itens ?? []))}
                      </span>
                      {podeAbrirOS && daLojaAtual && (
                        <Botao tamanho="pequeno" onClick={() => abrirOrdem(ordem)}>
                          Abrir OS
                        </Botao>
                      )}
                    </div>
                  </div>
                  {(ordem.itens ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-linha pt-3">
                      {(ordem.itens ?? []).map((item) => (
                        <li key={item.id} className="flex gap-2 text-corpo text-texto">
                          <span className="w-10 shrink-0 text-right text-texto-2">
                            {item.quantidade.toLocaleString("pt-BR")}×
                          </span>
                          <span className="min-w-0 flex-1">{item.descricao}</span>
                          <span className="shrink-0 text-rotulo text-texto-2">
                            {item.tipo === "peca" ? "peça" : "serviço"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
