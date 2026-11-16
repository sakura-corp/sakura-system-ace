import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, TriangleAlert } from "lucide-react";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Dica } from "@/components/Dica";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { LinkCliente } from "@/components/LinkCliente";
import { useAuth } from "@/contexts/AuthContext";
import { listarClientesParaEscolha } from "@/lib/clientes";
import { temPermissao } from "@/types/operador";
import { buscarConfiguracaoPix } from "@/lib/configuracoes";
import { criarContaReceber, listarContasReceber, receberConta } from "@/lib/contasReceber";
import { avisar } from "@/lib/avisoQueSome";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
  ultimasMensagensPorReferencia,
} from "@/lib/modelosWhatsapp";
import { montarPixCopiaECola } from "@/schemas/pix";
import { blocoPix, preencherModelo } from "@/schemas/whatsapp";
import type { Cliente } from "@/types/cliente";
import type { ConfiguracaoPix } from "@/types/configuracao";
import type { ContaReceber, NovaContaReceber } from "@/types/contaReceber";
import { ContaReceberForm } from "./ContaReceberForm";
import { ReceberContaModal } from "./ReceberContaModal";
import { SeloDoVencimento } from "@/pages/contas-pagar/SeloDoVencimento";
import { situacaoDoVencimento } from "@/pages/contas-pagar/vencimento";
import { somar } from "@/schemas/dinheiro";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContasReceberPage() {
  const { operador, lojaAtual } = useAuth();
  // Sem o módulo Clientes a lista vem pela janela estreita (migration 0068).
  const podeVerCadastro = temPermissao(operador, "clientes");
  // O nome do cliente abre a ficha dele (#393), que pede Clientes ou Ordens
  // de Serviço: quem só cobra vê o nome como texto.
  const podeAbrirFichaDoCliente = podeVerCadastro || temPermissao(operador, "ordens_servico");
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contaRecebendo, setContaRecebendo] = useState<ContaReceber | null>(null);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  // O Pix da loja (#456). Sem ele (ou se não deu pra ler) a cobrança sai como sempre.
  const [configuracaoPix, setConfiguracaoPix] = useState<ConfiguracaoPix | null>(null);
  // Quando cada conta teve a última cobrança ABERTA no WhatsApp. Responde a
  // pergunta que hoje mora só na memória de quem cobrou: "já falei com essa
  // pessoa?". Ver a tabela `whatsapp_mensagens` na migration 0052.
  const [ultimasCobrancas, setUltimasCobrancas] = useState<Map<string, string>>(new Map());
  // Só a carga mais nova mexe na tela (#927).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);

  async function carregar() {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [listaContas, listaClientes, modelos, cobrancas, pix] = await Promise.all([
        listarContasReceber(carga.lojaId),
        listarClientesParaEscolha(podeVerCadastro),
        listarModelosWhatsapp(carga.lojaId),
        ultimasMensagensPorReferencia(carga.lojaId, "cobranca"),
        buscarConfiguracaoPix(carga.lojaId),
      ]);
      if (!carga.aindaEhAtual()) return;
      setContas(listaContas);
      setClientes(listaClientes);
      setModelosWhatsapp(modelos);
      setConfiguracaoPix(pix);
      setUltimasCobrancas(cobrancas);
      carga.gravou();
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar contas a receber:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  async function handleCadastrar(conta: NovaContaReceber) {
    if (!lojaAtual) return;
    await criarContaReceber(conta, lojaAtual.id);
    setMostrarFormulario(false);
    avisar(`Conta a receber cadastrada: ${conta.descricao}`);
    await carregar();
  }

  async function handleConfirmarRecebimento(valorRecebido: number, formaPagamento: string) {
    if (!contaRecebendo || !operador) return;
    await receberConta({
      conta: contaRecebendo,
      valorRecebido,
      formaPagamento,
      operadorId: operador.id,
    });
    avisar(`Conta recebida: ${contaRecebendo.descricao}`);
    setContaRecebendo(null);
    await carregar();
  }

  const hoje = hojeLocal();
  const pendentes = contas
    .filter((c) => c.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const recebidas = contas
    .filter((c) => c.status === "recebido")
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const totalPendente = somar(pendentes.map((c) => c.valor));
  // Só a contagem, pro selo ao lado de "Pendentes": nenhum valor novo.
  const quantasAtrasadas = pendentes.filter(
    (c) => situacaoDoVencimento(c.vencimento, hoje) === "atrasada",
  ).length;

  function abrirOrdem(conta: ContaReceber) {
    if (!conta.ordem_servico_id) return;
    navigate("/ordens-servico", { state: { abrirOrdemId: conta.ordem_servico_id } });
  }

  function textoDaCobranca(conta: ContaReceber): string {
    return preencherModelo(textoDoModelo(modelosWhatsapp, "cobranca"), {
      cliente: conta.cliente?.nome,
      valor: formatarMoeda(conta.valor),
      // O `vencimento` é uma coluna `date`: `new Date` leria meia-noite em UTC
      // e a mensagem iria pro cliente com o dia anterior (#1005).
      vencimento: diaBrasileiro(conta.vencimento),
      descricao: conta.descricao,
      loja: lojaAtual?.nome,
      pix: blocoPix(
        configuracaoPix
          ? montarPixCopiaECola({
              chave: configuracaoPix.chave,
              nomeRecebedor: configuracaoPix.nome_recebedor,
              cidadeRecebedor: configuracaoPix.cidade_recebedor,
              valor: conta.valor,
            })
          : null,
      ),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="text-titulo font-semibold text-texto">Contas a Receber</h1>
            <p className="text-corpo text-texto-2">
              Criadas sozinhas ao faturar uma OS escolhendo "a receber" — ou lançadas à mão,
              pra cobrança que não passou por OS
            </p>
          </div>
        </div>
        {!mostrarFormulario && (
          <Botao variante="principal" icone={<Plus />} onClick={() => setMostrarFormulario(true)}>
            Nova conta
          </Botao>
        )}
      </header>

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-perigo/[0.12] px-4 py-3 text-corpo text-perigo"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{erro}</span>
        </p>
      )}

      {mostrarFormulario && (
        <ContaReceberForm
          clientes={clientes}
          onSalvar={handleCadastrar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {!carregando && dadosSaoDaLoja && (
        <div className="max-w-sm">
          <CartaoNumero
            titulo="Total pendente"
            explicacao="A soma do que os clientes ainda devem à loja, atrasado ou não. O que já foi recebido fica de fora."
          >
            <Valor valor={totalPendente} />
          </CartaoNumero>
        </div>
      )}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : !dadosSaoDaLoja ? null : (
        <>
          <section>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-corpo font-semibold text-texto">
              Pendentes
              {quantasAtrasadas > 0 && (
                <Selo
                  tipo="perigo"
                  palavra={quantasAtrasadas === 1 ? "1 atrasada" : `${quantasAtrasadas} atrasadas`}
                />
              )}
            </h2>
            {pendentes.length === 0 ? (
              <p className="text-corpo text-texto-2">Nenhuma conta a receber pendente.</p>
            ) : (
              <div className="overflow-x-auto sakura-card">
                <table className="sakura-tabela">
                  <thead>
                    <tr>
                      <th>Previsão</th>
                      <th>Cliente</th>
                      <th>Descrição</th>
                      <th className="text-right">Valor</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.map((conta) => {
                      const cliente = clientes.find((c) => c.id === conta.cliente_id);
                      const ultimaCobranca = ultimasCobrancas.get(conta.id);
                      return (
                        <tr
                          key={conta.id}
                          onClick={() => abrirOrdem(conta)}
                          className={conta.ordem_servico_id ? "cursor-pointer" : undefined}
                        >
                          <td className="whitespace-nowrap text-texto">
                            {diaBrasileiro(conta.vencimento)}
                          </td>
                          <td>
                            {conta.cliente?.nome ? (
                              <LinkCliente
                                clienteId={conta.cliente_id}
                                nome={conta.cliente.nome}
                                podeAbrir={podeAbrirFichaDoCliente}
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="text-texto [overflow-wrap:anywhere]">{conta.descricao}</td>
                          <td className="whitespace-nowrap text-right font-semibold text-texto">
                            {formatarMoeda(conta.valor)}
                          </td>
                          <td>
                            <div className="flex flex-col items-start gap-1">
                              <SeloDoVencimento vencimento={conta.vencimento} hoje={hoje} />
                              {/* A última cobrança aberta no WhatsApp, embaixo do
                                  status (antes ficava ao lado dos botões). */}
                              {ultimaCobranca && (
                                <Dica texto="O sistema só sabe que a conversa foi aberta — se a mensagem foi mesmo enviada, só você sabe.">
                                  <span className="whitespace-nowrap text-meta text-texto-2">
                                    cobrado em{" "}
                                    {new Date(ultimaCobranca).toLocaleDateString("pt-BR")}
                                  </span>
                                </Dica>
                              )}
                            </div>
                          </td>
                          <td>
                            {/* O clique nos botões não pode abrir a OS junto: a
                                linha inteira é clicável. */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-end gap-1.5"
                            >
                              {/* Sem o módulo Clientes o telefone não chega (a janela da
                                  migration 0068 só tem o nome): o botão diria "cadastro sem
                                  telefone", que é mentira — então some. */}
                              {podeVerCadastro && (
                                <BotaoWhatsapp
                                  telefone={cliente?.telefone}
                                  texto={textoDaCobranca(conta)}
                                  rotulo="Cobrar"
                                  titulo="Abrir a conversa no WhatsApp com a cobrança pronta"
                                  aoAbrir={() => {
                                    if (!lojaAtual) return;
                                    registrarMensagemAberta(
                                      lojaAtual.id,
                                      "cobranca",
                                      conta.id,
                                      cliente?.telefone ?? null,
                                      operador?.id ?? null,
                                    ).then(carregar);
                                  }}
                                />
                              )}
                              <Botao
                                tamanho="pequeno"
                                icone={<Check />}
                                aria-label={`Marcar como recebido — a conta ${conta.descricao}`}
                                onClick={() => setContaRecebendo(conta)}
                              >
                                Marcar como recebido
                              </Botao>
                              {/* A OS também abre clicando na linha, mas só com o
                                  mouse e sem nada que diga isso: no "Mais ações"
                                  ela fica achável e no teclado (como na lista de
                                  OS, tarefa 7). */}
                              {conta.ordem_servico_id ? (
                                <AcoesDaLinha
                                  descricao={`a conta ${conta.descricao}`}
                                  acoes={[
                                    {
                                      tipo: "menu",
                                      rotulo: "Abrir a OS",
                                      aoClicar: () => abrirOrdem(conta),
                                    },
                                  ]}
                                />
                              ) : (
                                // O lugar dos três pontos, vazio: os botões das
                                // linhas sem OS ficam alinhados com os das outras.
                                <span aria-hidden="true" className="w-8 shrink-0" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {recebidas.length > 0 && (
            <section>
              <h2 className="mb-3 text-corpo font-semibold text-texto">Recebidas recentemente</h2>
              <div className="overflow-x-auto sakura-card">
                <table className="sakura-tabela">
                  <thead>
                    <tr>
                      <th>Previsão</th>
                      <th>Cliente</th>
                      <th>Descrição</th>
                      <th className="text-right">Valor</th>
                      <th>Recebido em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recebidas.map((conta) => (
                      <tr key={conta.id}>
                        <td className="whitespace-nowrap text-texto-2">
                          {diaBrasileiro(conta.vencimento)}
                        </td>
                        <td>
                          {conta.cliente?.nome ? (
                            <LinkCliente
                              clienteId={conta.cliente_id}
                              nome={conta.cliente.nome}
                              podeAbrir={podeAbrirFichaDoCliente}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-texto [overflow-wrap:anywhere]">{conta.descricao}</td>
                        <td className="whitespace-nowrap text-right font-semibold text-texto">
                          {formatarMoeda(conta.valor)}
                        </td>
                        <td>
                          {/* `data_recebimento` é data COM hora (timestamptz): o
                              `new Date` está certo aqui (#1005, "ficam como estão"). */}
                          <Selo
                            tipo="ok"
                            palavra={
                              conta.data_recebimento
                                ? `Recebida em ${new Date(conta.data_recebimento).toLocaleDateString("pt-BR")}`
                                : "Recebida"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {contaRecebendo && (
        <ReceberContaModal
          conta={contaRecebendo}
          hoje={hoje}
          onConfirmar={handleConfirmarRecebimento}
          onFechar={() => setContaRecebendo(null)}
        />
      )}
    </div>
  );
}
