import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Dica } from "@/components/Dica";
import { LinkPlaca } from "@/components/LinkPlaca";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, diaLocal, diasEntre, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { buscarFichaDoCliente, type FichaDoCliente } from "@/lib/fichaCliente";
import {
  comprasDoCliente,
  contaAtrasada,
  contasRecebidas,
  dividaDoCliente,
  formasDePagamento,
  resumoDoCliente,
  type OrdemDaFichaDoCliente,
} from "@/schemas/fichaCliente";
import { formatarMoeda } from "@/schemas/dinheiro";
import { tempoDesde } from "@/schemas/fichaVeiculo";
import { nomeOrdem, totalOrdem } from "@/types/os";
import { temPermissao } from "@/types/operador";
import { AvisoDeErro } from "@/components/Aviso";
import { SeloDoStatusDaOrdem } from "./SeloDoStatusDaOrdem";

/**
 * A ficha do cliente (#393): o que ele comprou, como pagou e o que deve. É a
 * pergunta do balcão — "esse cliente está devendo alguma coisa?".
 *
 * Só lê: receber uma conta continua sendo em Contas a Receber. As contas
 * moram em `schemas/fichaCliente.ts`, e a leitura (que só pergunta ao banco o
 * que cada módulo deixa) em `lib/fichaCliente.ts`.
 *
 * Cada parte respeita o módulo dela, e sem ele mostra "—" com a frase do
 * porquê, nunca "R$ 0,00" como se fosse verdade:
 *   - o que comprou: com Clientes ou Ordens de Serviço (a rota já exige um dos dois);
 *   - como pagou (forma e parcelas): só com Ordens de Serviço;
 *   - o que deve, e as contas já recebidas: só com Contas a Receber.
 */
export function FichaClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operador, lojaAtual, lojasDisponiveis } = useAuth();
  const [ficha, setFicha] = useState<FichaDoCliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const podeVerCadastro = temPermissao(operador, "clientes");
  const podeVerOS = temPermissao(operador, "ordens_servico");
  const podeVerContas = temPermissao(operador, "contas_receber");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      if (!id) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      setErro(null);
      // Sem isto, um erro ao trocar de cliente deixaria o anterior na tela.
      setFicha(null);
      try {
        const lida = await buscarFichaDoCliente(id, {
          clientes: podeVerCadastro,
          ordens: podeVerOS,
          contasReceber: podeVerContas,
        });
        if (!cancelado) setFicha(lida);
      } catch (err) {
        console.error("Erro ao carregar a ficha do cliente:", err);
        if (!cancelado) setErro(mensagemDeErro(err));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [id, podeVerCadastro, podeVerOS, podeVerContas]);

  const hoje = hojeLocal();

  const dados = useMemo(() => {
    if (!ficha) return null;
    const { ordens, contas } = ficha;
    const lojas = new Set([...ordens.map((o) => o.loja_id), ...(contas ?? []).map((c) => c.loja_id)]);
    return {
      compras: comprasDoCliente(ordens),
      resumo: resumoDoCliente(ordens),
      // `null` = sem o módulo: a consulta nem foi feita.
      divida: contas ? dividaDoCliente(contas, hoje) : null,
      recebidas: contas ? contasRecebidas(contas) : null,
      pagamentos: formasDePagamento(ordens),
      // Só mostra de qual loja é cada linha quando há mais de uma — numa
      // empresa de loja única, a informação só ocuparia espaço.
      variasLojas: lojas.size > 1,
    };
  }, [ficha, hoje]);

  function abrirOrdem(ordemId: string) {
    // `voltarAoFechar`: o Voltar da OS traz de volta pra esta ficha.
    navigate("/ordens-servico", { state: { abrirOrdemId: ordemId, voltarAoFechar: true } });
  }

  function nomeDaLoja(lojaId: string): string {
    return lojasDisponiveis.find((l) => l.id === lojaId)?.nome ?? "outra loja";
  }

  // Só dá pra abrir a OS da loja ativa: a tela de OS lista a loja ativa.
  function podeAbrir(ordem: Pick<OrdemDaFichaDoCliente, "loja_id">): boolean {
    return podeVerOS && ordem.loja_id === lojaAtual?.id;
  }

  // Volta pelo histórico: a ficha é aberta de Clientes, da OS, de Contas a
  // Receber e da ficha do veículo, e o certo é voltar pra onde se estava.
  const voltar = () => navigate(-1);

  if (carregando || !ficha || !dados) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <BotaoVoltar onClick={voltar} />
          <h1 className="font-titulo text-titulo font-bold text-texto">Ficha do cliente</h1>
        </header>
        {carregando ? (
          <p className="text-corpo text-texto-2">Carregando...</p>
        ) : erro ? (
          <AvisoDeErro>{erro}</AvisoDeErro>
        ) : (
          <p className="text-corpo text-texto-2">
            Cliente não encontrado. Ele pode ter sido excluído do cadastro.
          </p>
        )}
      </div>
    );
  }

  const { cliente, veiculos } = ficha;
  const { resumo, divida } = dados;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <BotaoVoltar onClick={voltar} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-titulo text-titulo font-bold text-texto">{cliente.nome}</h1>
          {/* Sem o módulo Clientes o telefone nem chega (migration 0068):
              "sem telefone cadastrado" seria mentira, então a linha some. */}
          {podeVerCadastro && (
            <p className="text-corpo text-texto-2">
              {cliente.telefone || "Sem telefone cadastrado"}
            </p>
          )}
        </div>
        {podeVerCadastro && (
          <BotaoWhatsapp
            telefone={cliente.telefone}
            texto={`Olá, ${cliente.nome}!`}
            titulo="Abrir a conversa com o cliente no WhatsApp"
          />
        )}
      </header>

      {veiculos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-rotulo text-texto-2">
            {veiculos.length === 1 ? "Carro:" : "Carros:"}
          </span>
          {veiculos.map((v) => (
            <LinkPlaca key={v.id} veiculoId={v.id} placa={v.placa} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CartaoNumero
          titulo="Deve"
          explicacao="A soma das contas a receber dele ainda pendentes, em todas as lojas que você alcança. Atrasada é a que venceu antes de hoje. Pra receber, use Contas a Receber."
          semAcesso={divida ? undefined : "Você não tem acesso a Contas a Receber."}
          variacao={
            divida &&
            (divida.atrasadas > 0 ? (
              <Selo tipo="perigo" palavra={`${formatarMoeda(divida.totalAtrasado)} atrasado`} />
            ) : (
              <span className="text-rotulo text-texto-2">
                {divida.pendentes.length === 0 ? "Não deve nada" : "Nada atrasado"}
              </span>
            ))
          }
        >
          {divida && <Valor valor={divida.totalEmAberto} />}
        </CartaoNumero>

        <CartaoNumero
          titulo="Total comprado"
          explicacao="A soma das OS e vendas de balcão já faturadas dele, com desconto e sem os juros do cartão — o mesmo 'Total' da lista de OS. OS ainda em andamento e orçamentos não entram."
          variacao={
            <span className="text-rotulo text-texto-2">
              {resumo.faturadas === 1 ? "1 faturada" : `${resumo.faturadas} faturadas`}
            </span>
          }
        >
          <Valor valor={resumo.totalComprado} />
        </CartaoNumero>

        <CartaoNumero
          titulo="Visitas"
          explicacao="Os dias diferentes em que ele passou pela loja com uma OS ou uma venda (duas no mesmo dia contam como uma visita). Orçamento não conta."
          variacao={
            <span className="text-rotulo text-texto-2">
              {resumo.ultimaVisita
                ? `Última: ${diaBrasileiro(resumo.ultimaVisita)} (${tempoDesde(diasEntre(resumo.ultimaVisita, hoje))})`
                : "Ainda não passou pela loja"}
            </span>
          }
        >
          <span className="text-texto">{resumo.visitas}</span>
        </CartaoNumero>
      </div>

      <Secao titulo="O que deve">
        {!divida ? (
          <SemAcesso modulo="Contas a Receber" />
        ) : divida.pendentes.length === 0 ? (
          <Vazio>Nenhuma conta a receber pendente.</Vazio>
        ) : (
          <Tabela
            colunas={["Vencimento", "Descrição", ...(dados.variasLojas ? ["Loja"] : []), "Valor", "Situação"]}
            direita={["Valor"]}
          >
            {divida.pendentes.map((conta) => {
              const atrasada = contaAtrasada(conta, hoje);
              return (
                <tr key={conta.id}>
                  <td className="whitespace-nowrap">{diaBrasileiro(conta.vencimento)}</td>
                  <td>{conta.descricao}</td>
                  {dados.variasLojas && <td>{nomeDaLoja(conta.loja_id)}</td>}
                  <td className="whitespace-nowrap text-right font-medium text-texto">
                    {formatarMoeda(conta.valor)}
                  </td>
                  <td>
                    {atrasada ? (
                      <Selo tipo="perigo" palavra="Atrasada" />
                    ) : (
                      <Selo tipo="atencao" palavra="Pendente" />
                    )}
                  </td>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Secao>

      <Secao
        titulo={`O que comprou (${dados.compras.length === 1 ? "1 OS ou venda" : `${dados.compras.length} OS e vendas`})`}
      >
        {dados.compras.length === 0 ? (
          <Vazio>Ainda não tem nenhuma OS nem venda.</Vazio>
        ) : (
          <Tabela
            colunas={["Dia", "OS / Venda", "Carro", ...(dados.variasLojas ? ["Loja"] : []), "Situação", "Total", ""]}
            direita={["Total"]}
          >
            {dados.compras.map((ordem) => (
              <tr key={ordem.id}>
                <td className="whitespace-nowrap">{diaBrasileiro(diaLocal(ordem.data_abertura))}</td>
                <td className="whitespace-nowrap">{nomeOrdem(ordem.numero, ordem.tipo)}</td>
                <td className="whitespace-nowrap">{ordem.placa ?? "—"}</td>
                {dados.variasLojas && <td>{nomeDaLoja(ordem.loja_id)}</td>}
                <td>
                  <SeloDoStatusDaOrdem status={ordem.status} />
                </td>
                <td className="whitespace-nowrap text-right font-medium text-texto">
                  {formatarMoeda(totalOrdem(ordem.itens ?? []))}
                </td>
                <td className="text-right">
                  {/* Sem o botão, a linha diria nada: diz por quê. */}
                  {podeVerOS && !podeAbrir(ordem) && (
                    <Dica texto="A lista de OS mostra só a loja ativa: troque de loja, embaixo à esquerda, pra abrir esta OS.">
                      <span className="cursor-default whitespace-nowrap text-rotulo text-texto-2" tabIndex={0}>
                        outra loja
                      </span>
                    </Dica>
                  )}
                  {podeAbrir(ordem) && (
                    <Botao tamanho="pequeno" onClick={() => abrirOrdem(ordem.id)}>
                      Abrir
                    </Botao>
                  )}
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>

      <Secao titulo="Como pagou">
        <div className="space-y-5 pb-3">
          <div>
            <h3 className="px-[18px] pb-1 text-rotulo font-semibold text-texto-2">
              No faturamento das OS e vendas
            </h3>
            {!podeVerOS ? (
              <SemAcesso modulo="Ordens de Serviço" />
            ) : dados.pagamentos.length === 0 ? (
              <Vazio>Nenhuma OS ou venda faturada.</Vazio>
            ) : (
              <Tabela
                colunas={["Dia", "OS / Venda", ...(dados.variasLojas ? ["Loja"] : []), "Forma", "Parcelas", "Valor"]}
                direita={["Valor"]}
              >
                {dados.pagamentos.map((pagamento) => (
                  <tr key={pagamento.ordemId}>
                    <td className="whitespace-nowrap">{diaBrasileiro(pagamento.dia)}</td>
                    <td className="whitespace-nowrap">
                      {nomeOrdem(pagamento.numero, pagamento.tipo)}
                    </td>
                    {dados.variasLojas && <td>{nomeDaLoja(pagamento.loja_id)}</td>}
                    <td>{pagamento.forma || "—"}</td>
                    <td className="whitespace-nowrap">
                      {/* Sem a forma gravada, "à vista" seria um palpite. */}
                      {!pagamento.forma
                        ? "—"
                        : pagamento.parcelas && pagamento.parcelas > 1
                          ? `${pagamento.parcelas}x`
                          : "À vista"}
                    </td>
                    <td className="whitespace-nowrap text-right font-medium text-texto">
                      {formatarMoeda(pagamento.valor)}
                    </td>
                  </tr>
                ))}
              </Tabela>
            )}
          </div>

          <div>
            <h3 className="px-[18px] pb-1 text-rotulo font-semibold text-texto-2">
              Contas a receber já pagas
            </h3>
            {!dados.recebidas ? (
              <SemAcesso modulo="Contas a Receber" />
            ) : dados.recebidas.length === 0 ? (
              <Vazio>Nenhuma conta recebida ainda.</Vazio>
            ) : (
              <Tabela
                colunas={["Recebida em", "Descrição", ...(dados.variasLojas ? ["Loja"] : []), "Valor"]}
                direita={["Valor"]}
              >
                {dados.recebidas.map((conta) => (
                  <tr key={conta.id}>
                    <td className="whitespace-nowrap">
                      {conta.diaRecebimento ? diaBrasileiro(conta.diaRecebimento) : "—"}
                    </td>
                    <td>{conta.descricao}</td>
                    {dados.variasLojas && <td>{nomeDaLoja(conta.loja_id)}</td>}
                    <td className="whitespace-nowrap text-right font-medium text-texto">
                      {formatarMoeda(conta.valor)}
                    </td>
                  </tr>
                ))}
              </Tabela>
            )}
          </div>
        </div>
      </Secao>
    </div>
  );
}

/** "—" e a frase do porquê: sem o módulo, a parte não é zero, é desconhecida. */
function SemAcesso({ modulo }: { modulo: string }) {
  return (
    <div className="px-[18px] pb-2">
      <p className="font-titulo text-destaque font-semibold text-texto-2">—</p>
      <p className="mt-1 text-rotulo text-texto-2">Você não tem acesso a {modulo}.</p>
    </div>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-[18px] pb-3 text-corpo text-texto-2">{children}</p>;
}

/**
 * Uma parte da ficha: cartão com o título em cima e a tabela de borda a borda
 * (o `sakura-tabela` põe o respiro das colunas).
 */
function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="sakura-card min-w-0 overflow-hidden pt-4">
      <h2 className="mb-2 px-[18px] text-corpo font-semibold text-texto">{titulo}</h2>
      {children}
    </section>
  );
}

function Tabela({
  colunas,
  direita = [],
  children,
}: {
  colunas: string[];
  /** As colunas de dinheiro, alinhadas à direita (a célula faz o mesmo). */
  direita?: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="sakura-tabela">
        <thead>
          <tr>
            {colunas.map((coluna, i) => (
              <th key={`${coluna}-${i}`} className={direita.includes(coluna) ? "text-right" : undefined}>
                {coluna || <span className="sr-only">Ações</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
