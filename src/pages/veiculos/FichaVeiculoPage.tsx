import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Explicacao } from "@/components/Explicacao";
import { VeiculoIcone } from "@/components/VeiculoIcone";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, diaLocal, diasEntre, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/supabase";
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
import { nomeOrdem, STATUS_COR, STATUS_LABEL, totalOrdem } from "@/types/os";
import { temPermissao } from "@/types/operador";

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

  useEffect(() => {
    async function carregar() {
      if (!isSupabaseConfigured || !id) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      setErro(null);
      try {
        setFicha(await buscarFichaDoVeiculo(id));
      } catch (err) {
        console.error("Erro ao carregar a ficha do veículo:", err);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

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
    navigate("/ordens-servico", { state: { abrirOrdemId: ordem.id } });
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
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Ficha do veículo</h1>
        </header>
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      </div>
    );
  }

  if (!ficha || !dados) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <BotaoVoltar onClick={voltar} />
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Ficha do veículo</h1>
        </header>
        {erro ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>
        ) : (
          <p className="text-corpo text-sakura-muted">
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
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">{veiculo.placa}</h1>
          <p className="text-corpo text-sakura-muted">{descricaoCarro || "Ficha do veículo"}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Cartao
          titulo="Dono atual"
          explicacao="O cliente em cujo cadastro este veículo está hoje. Uma OS antiga pode ter sido aberta em nome de outra pessoa."
        >
          <p className="truncate text-destaque font-semibold text-sakura-purple-dark">
            {veiculo.cliente?.nome ?? "—"}
          </p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {veiculo.cliente?.telefone || "Sem telefone cadastrado"}
          </p>
        </Cartao>

        <Cartao
          titulo="KM mais recente"
          explicacao="O KM anotado na OS mais recente deste carro — não o maior já digitado, pra um erro de digitação não ficar colado nele. Sem OS com KM, vale o do cadastro."
        >
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {dados.kmAtual ? km(dados.kmAtual.km) : "—"}
          </p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {!dados.kmAtual
              ? "Nenhum KM anotado ainda"
              : dados.kmAtual.dia
                ? `Anotado em ${diaBrasileiro(dados.kmAtual.dia)}`
                : "Do cadastro do veículo"}
          </p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {dados.rodagem.tipo === "estimada"
              ? `Roda cerca de ${km(dados.rodagem.kmPorMes)} por mês (estimativa)`
              : dados.rodagem.motivo}
          </p>
        </Cartao>

        <Cartao
          titulo="Total em OS faturadas"
          explicacao="A soma dos itens das OS já faturadas deste carro, com desconto e sem os juros do cartão — o mesmo 'Total' da lista de OS. OS ainda em andamento não entram."
        >
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(dados.gasto)}
          </p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {dados.faturadas === 1 ? "1 OS faturada" : `${dados.faturadas} OS faturadas`}
          </p>
        </Cartao>

        <Cartao
          titulo="Visitas"
          explicacao="Os dias diferentes em que o carro passou pela loja (duas OS no mesmo dia contam como uma visita), e a média de dias entre uma visita e a seguinte."
        >
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {dados.visitas.length}
          </p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {ultimaVisita
              ? `Última: ${tempoDesde(diasEntre(ultimaVisita, hoje))}`
              : "Ainda não passou pela loja"}
          </p>
          {dados.mediaVisitas != null && (
            <p className="mt-1 text-rotulo text-sakura-muted">
              Volta a cada {dados.mediaVisitas} dias, em média
            </p>
          )}
        </Cartao>
      </div>

      <section className="sakura-card p-4">
        <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
          Peças na garantia
        </h2>
        {dados.garantia.emVigor.length === 0 ? (
          <p className="text-corpo text-sakura-purple-dark/85">
            Nenhuma peça deste carro está na garantia agora.
            {dados.garantia.vencidas > 0 &&
              ` ${dados.garantia.vencidas === 1 ? "Uma já venceu" : `${dados.garantia.vencidas} já venceram`}.`}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-sakura-gray/25">
              <table className="w-full text-left text-corpo">
                <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                  <tr>
                    <th className="px-4 py-3 font-medium">Peça</th>
                    <th className="px-4 py-3 font-medium">Qtde.</th>
                    <th className="px-4 py-3 font-medium">Vendida na</th>
                    <th className="px-4 py-3 font-medium">Vence em</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.garantia.emVigor.map((peca) => (
                    <tr key={peca.itemId} className="border-t border-sakura-gray/20">
                      <td className="px-4 py-3">{peca.descricao}</td>
                      <td className="px-4 py-3">{peca.quantidade.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">{nomeOrdem(peca.numero, peca.tipoOrdem)}</td>
                      <td className="px-4 py-3">
                        {diaBrasileiro(peca.vencimento)}
                        <span className="ml-2 text-rotulo text-sakura-muted">
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
              <p className="mt-2 text-rotulo text-sakura-muted">
                {dados.garantia.vencidas === 1
                  ? "Mais uma peça deste carro já saiu da garantia."
                  : `Mais ${dados.garantia.vencidas} peças deste carro já saíram da garantia.`}
              </p>
            )}
          </>
        )}
      </section>

      <section className="sakura-card p-4">
        <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
          Histórico ({dados.linha.length === 1 ? "1 OS" : `${dados.linha.length} OS`})
        </h2>
        {dados.linha.length === 0 ? (
          <p className="text-corpo text-sakura-purple-dark/85">
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
                <li
                  key={ordem.id}
                  className="rounded-xl border border-sakura-gray/25 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-corpo font-semibold text-sakura-purple-dark">
                        {diaBrasileiro(dia)}
                        <span className="ml-2 font-normal text-sakura-muted">
                          {tempoDesde(diasEntre(dia, hoje))}
                        </span>
                      </p>
                      <p className="mt-1 text-rotulo text-sakura-muted">
                        {nomeOrdem(ordem.numero, ordem.tipo)}
                        {ordem.km_entrada != null && ` · ${km(ordem.km_entrada)}`}
                        {dados.variasLojas && ` · ${nomeDaLoja(ordem.loja_id)}`}
                        {outroDono && ` · em nome de ${outroDono}`}
                      </p>
                      {dados.kmSuspeitos.has(ordem.id) && (
                        <p className="mt-1 text-rotulo text-amber-300">
                          KM menor que o da visita anterior — confira se não faltou um dígito
                          numa das duas.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-rotulo font-medium ${STATUS_COR[ordem.status]}`}
                      >
                        {STATUS_LABEL[ordem.status]}
                      </span>
                      <span className="whitespace-nowrap text-corpo font-semibold text-sakura-purple-dark">
                        {formatarMoeda(totalOrdem(ordem.itens ?? []))}
                      </span>
                      {podeAbrirOS && daLojaAtual && (
                        <button
                          type="button"
                          onClick={() => abrirOrdem(ordem)}
                          className="min-h-8 rounded-lg border border-sakura-borda-campo px-3 text-rotulo font-medium text-sakura-purple-dark hover:bg-white/10"
                        >
                          Abrir OS
                        </button>
                      )}
                    </div>
                  </div>
                  {(ordem.itens ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-sakura-gray/20 pt-3">
                      {(ordem.itens ?? []).map((item) => (
                        <li key={item.id} className="flex gap-2 text-corpo text-sakura-purple-dark/90">
                          <span className="w-10 shrink-0 text-right text-sakura-muted">
                            {item.quantidade.toLocaleString("pt-BR")}×
                          </span>
                          <span className="min-w-0 flex-1">{item.descricao}</span>
                          <span className="shrink-0 text-rotulo text-sakura-muted">
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

function Cartao({
  titulo,
  explicacao,
  children,
}: {
  titulo: string;
  explicacao: string;
  children: ReactNode;
}) {
  return (
    <div className="sakura-card min-w-0 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-rotulo text-sakura-muted">{titulo}</p>
        <Explicacao titulo={titulo} texto={explicacao} />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
