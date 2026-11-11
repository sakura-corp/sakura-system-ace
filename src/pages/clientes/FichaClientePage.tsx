import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { Explicacao } from "@/components/Explicacao";
import { LinkPlaca } from "@/components/LinkPlaca";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, diaLocal, diasEntre, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { buscarFichaDoCliente, type FichaDoCliente } from "@/lib/fichaCliente";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  comprasDoCliente,
  contaAtrasada,
  contasRecebidas,
  dividaDoCliente,
  formasDePagamento,
  resumoDoCliente,
  type OrdemDaFichaDoCliente,
} from "@/schemas/fichaCliente";
import { tempoDesde } from "@/schemas/fichaVeiculo";
import { nomeOrdem, STATUS_COR, STATUS_LABEL, totalOrdem } from "@/types/os";
import { temPermissao } from "@/types/operador";

/** O que aparece no lugar de um valor que a pessoa não pode ver: nunca "R$ 0,00". */
const SEM_ACESSO = "—";

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
    navigate("/ordens-servico", { state: { abrirOrdemId: ordemId } });
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
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Ficha do cliente</h1>
        </header>
        {carregando ? (
          <p className="text-corpo text-sakura-muted">Carregando...</p>
        ) : erro ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>
        ) : (
          <p className="text-corpo text-sakura-muted">
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
          <h1 className="truncate text-titulo font-semibold text-sakura-purple-dark">
            {cliente.nome}
          </h1>
          {/* Sem o módulo Clientes o telefone nem chega (migration 0068):
              "sem telefone cadastrado" seria mentira, então a linha some. */}
          {podeVerCadastro && (
            <p className="text-corpo text-sakura-muted">
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
          <span className="text-rotulo text-sakura-muted">
            {veiculos.length === 1 ? "Carro:" : "Carros:"}
          </span>
          {veiculos.map((v) => (
            <LinkPlaca key={v.id} veiculoId={v.id} placa={v.placa} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cartao
          titulo="Deve"
          explicacao="A soma das contas a receber dele ainda pendentes, em todas as lojas que você alcança. Atrasada é a que venceu antes de hoje. Pra receber, use Contas a Receber."
        >
          {divida ? (
            <>
              <p className="text-destaque font-semibold text-sakura-purple-dark">
                {formatarMoeda(divida.totalEmAberto)}
              </p>
              {divida.atrasadas > 0 ? (
                <p className="mt-1">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-rotulo font-medium text-red-700">
                    {formatarMoeda(divida.totalAtrasado)} atrasado
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-rotulo text-sakura-muted">
                  {divida.pendentes.length === 0 ? "Não deve nada" : "Nada atrasado"}
                </p>
              )}
            </>
          ) : (
            <SemAcesso modulo="Contas a Receber" />
          )}
        </Cartao>

        <Cartao
          titulo="Total comprado"
          explicacao="A soma das OS e vendas de balcão já faturadas dele, com desconto e sem os juros do cartão — o mesmo 'Total' da lista de OS. OS ainda em andamento e orçamentos não entram."
        >
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(resumo.totalComprado)}
          </p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {resumo.faturadas === 1 ? "1 faturada" : `${resumo.faturadas} faturadas`}
          </p>
        </Cartao>

        <Cartao
          titulo="Visitas"
          explicacao="Os dias diferentes em que ele passou pela loja com uma OS ou uma venda (duas no mesmo dia contam como uma visita). Orçamento não conta."
        >
          <p className="text-destaque font-semibold text-sakura-purple-dark">{resumo.visitas}</p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            {resumo.ultimaVisita
              ? `Última: ${diaBrasileiro(resumo.ultimaVisita)} (${tempoDesde(diasEntre(resumo.ultimaVisita, hoje))})`
              : "Ainda não passou pela loja"}
          </p>
        </Cartao>
      </div>

      <Secao titulo="O que deve">
        {!divida ? (
          <SemAcesso modulo="Contas a Receber" />
        ) : divida.pendentes.length === 0 ? (
          <p className="text-corpo text-sakura-purple-dark/85">
            Nenhuma conta a receber pendente.
          </p>
        ) : (
          <Tabela
            colunas={["Vencimento", "Descrição", ...(dados.variasLojas ? ["Loja"] : []), "Valor", "Situação"]}
          >
            {divida.pendentes.map((conta) => {
              const atrasada = contaAtrasada(conta, hoje);
              return (
                <tr key={conta.id} className="border-t border-sakura-gray/20">
                  <td className="whitespace-nowrap px-4 py-3">{diaBrasileiro(conta.vencimento)}</td>
                  <td className="px-4 py-3">{conta.descricao}</td>
                  {dados.variasLojas && <td className="px-4 py-3">{nomeDaLoja(conta.loja_id)}</td>}
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {formatarMoeda(conta.valor)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-rotulo font-medium ${
                        atrasada ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {atrasada ? "Atrasada" : "Pendente"}
                    </span>
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
          <p className="text-corpo text-sakura-purple-dark/85">
            Ainda não tem nenhuma OS nem venda.
          </p>
        ) : (
          <Tabela
            colunas={["Dia", "OS / Venda", "Carro", ...(dados.variasLojas ? ["Loja"] : []), "Situação", "Total", ""]}
          >
            {dados.compras.map((ordem) => (
              <tr key={ordem.id} className="border-t border-sakura-gray/20">
                <td className="whitespace-nowrap px-4 py-3">
                  {diaBrasileiro(diaLocal(ordem.data_abertura))}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{nomeOrdem(ordem.numero, ordem.tipo)}</td>
                <td className="whitespace-nowrap px-4 py-3">{ordem.placa ?? "—"}</td>
                {dados.variasLojas && <td className="px-4 py-3">{nomeDaLoja(ordem.loja_id)}</td>}
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-rotulo font-medium ${STATUS_COR[ordem.status]}`}
                  >
                    {STATUS_LABEL[ordem.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">
                  {formatarMoeda(totalOrdem(ordem.itens ?? []))}
                </td>
                <td className="px-4 py-3 text-right">
                  {podeAbrir(ordem) && (
                    <button
                      type="button"
                      onClick={() => abrirOrdem(ordem.id)}
                      className="min-h-8 whitespace-nowrap rounded-lg border border-sakura-borda-campo px-3 text-rotulo font-medium text-sakura-purple-dark hover:bg-white/10"
                    >
                      Abrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>

      <Secao titulo="Como pagou">
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-rotulo font-semibold text-sakura-purple-dark">
              No faturamento das OS e vendas
            </h3>
            {!podeVerOS ? (
              <SemAcesso modulo="Ordens de Serviço" />
            ) : dados.pagamentos.length === 0 ? (
              <p className="text-corpo text-sakura-purple-dark/85">Nenhuma OS ou venda faturada.</p>
            ) : (
              <Tabela
                colunas={["Dia", "OS / Venda", ...(dados.variasLojas ? ["Loja"] : []), "Forma", "Parcelas", "Valor"]}
              >
                {dados.pagamentos.map((pagamento) => (
                  <tr key={pagamento.ordemId} className="border-t border-sakura-gray/20">
                    <td className="whitespace-nowrap px-4 py-3">{diaBrasileiro(pagamento.dia)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {nomeOrdem(pagamento.numero, pagamento.tipo)}
                    </td>
                    {dados.variasLojas && (
                      <td className="px-4 py-3">{nomeDaLoja(pagamento.loja_id)}</td>
                    )}
                    <td className="px-4 py-3">{pagamento.forma || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {pagamento.parcelas && pagamento.parcelas > 1 ? `${pagamento.parcelas}x` : "À vista"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {formatarMoeda(pagamento.valor)}
                    </td>
                  </tr>
                ))}
              </Tabela>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-rotulo font-semibold text-sakura-purple-dark">
              Contas a receber já pagas
            </h3>
            {!dados.recebidas ? (
              <SemAcesso modulo="Contas a Receber" />
            ) : dados.recebidas.length === 0 ? (
              <p className="text-corpo text-sakura-purple-dark/85">Nenhuma conta recebida ainda.</p>
            ) : (
              <Tabela
                colunas={["Recebida em", "Descrição", ...(dados.variasLojas ? ["Loja"] : []), "Valor"]}
              >
                {dados.recebidas.map((conta) => (
                  <tr key={conta.id} className="border-t border-sakura-gray/20">
                    <td className="whitespace-nowrap px-4 py-3">
                      {conta.diaRecebimento ? diaBrasileiro(conta.diaRecebimento) : "—"}
                    </td>
                    <td className="px-4 py-3">{conta.descricao}</td>
                    {dados.variasLojas && <td className="px-4 py-3">{nomeDaLoja(conta.loja_id)}</td>}
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
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
    <div>
      <p className="text-destaque font-semibold text-sakura-purple-dark">{SEM_ACESSO}</p>
      <p className="mt-1 text-rotulo text-sakura-muted">Você não tem acesso a {modulo}.</p>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="sakura-card min-w-0 p-4">
      <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">{titulo}</h2>
      {children}
    </section>
  );
}

function Tabela({ colunas, children }: { colunas: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-sakura-gray/25">
      <table className="w-full text-left text-corpo">
        <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
          <tr>
            {colunas.map((coluna, i) => (
              <th key={`${coluna}-${i}`} className="px-4 py-3 font-medium">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
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
