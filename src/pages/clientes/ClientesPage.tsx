import { useEffect, useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { Dica } from "@/components/Dica";
import { LinkCliente } from "@/components/LinkCliente";
import { useAuth } from "@/contexts/AuthContext";
import { useRolarAteOFormulario } from "@/hooks/useRolarAteOFormulario";
import { useListaPaginada, type OrdemDaLista } from "@/hooks/useListaPaginada";
import {
  atualizarCliente,
  COLUNAS_DA_LISTA_DE_CLIENTES,
  criarCliente,
  excluirCliente,
  listarClientes,
  listarClientesPagina,
  type ColunaDaListaDeClientes,
} from "@/lib/clientes";
import { listarOrdensFaturadasDosClientes } from "@/lib/clientesSumidos";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
  ultimasMensagensPorReferencia,
} from "@/lib/modelosWhatsapp";
import {
  clientesSumidos,
  resumirPorCliente,
  type OrdemDoCliente,
} from "@/schemas/clientesSumidos";
import { formatarMoeda } from "@/schemas/dinheiro";
import { MODULOS_QUE_LEEM_O_CAIXA } from "@/schemas/painelInicio";
import { preencherModelo } from "@/schemas/whatsapp";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
import { temPermissao } from "@/types/operador";
import { AvisoDeErro } from "./AvisoDeErro";
import { ClienteForm } from "./ClienteForm";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { ImportarClientesModal } from "./ImportarClientesModal";
import { VeiculosDoClienteModal } from "./VeiculosDoClienteModal";

/** Padrão do filtro "sumiram" — decisão da Sofia, 17/10/2026 (tarefa #455). */
const MESES_PADRAO = 6;

const ORDEM_PADRAO = { coluna: "nome" as const, crescente: true };

export function ClientesPage() {
  const { operador, lojaAtual } = useAuth();
  // A lista principal vem do banco uma página por vez, já ordenada e
  // filtrada lá (#373, TR-03.5).
  const lista = useListaPaginada<Cliente, ColunaDaListaDeClientes>({
    chave: "clientes",
    buscarPagina: listarClientesPagina,
    ordemPadrao: ORDEM_PADRAO,
    colunas: COLUNAS_DA_LISTA_DE_CLIENTES,
  });
  // O filtro "sumiram" ainda precisa de TODOS os clientes (cruza com as OS),
  // e só é buscado quando a pessoa liga a caixinha.
  const [todosClientes, setTodosClientes] = useState<Cliente[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Cliente | null>(null);
  const caixaDoFormulario = useRolarAteOFormulario(
    formulario === "novo" ? "novo" : (formulario?.id ?? null),
  );
  const [veiculosDe, setVeiculosDe] = useState<Cliente | null>(null);
  const [importando, setImportando] = useState(false);

  // Filtro "clientes que sumiram" (FN-11). As ordens só são buscadas quando a
  // pessoa liga o filtro: a lista de clientes comum não precisa delas.
  const [soSumidos, setSoSumidos] = useState(false);
  const [textoMeses, setTextoMeses] = useState(String(MESES_PADRAO));
  const [ordens, setOrdens] = useState<OrdemDoCliente[] | null>(null);
  const [carregandoSumidos, setCarregandoSumidos] = useState(false);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  // Quando cada cliente foi chamado de volta pela última vez (a conversa foi
  // ABERTA; se a mensagem saiu, só quem mandou sabe) — tabela da migration 0052.
  const [ultimosChamados, setUltimosChamados] = useState<Map<string, string>>(new Map());

  // O total gasto segue a regra de quem enxerga o dinheiro da loja inteira: o
  // Caixa e Relações (migration 0062; a mesma lista que decide os cartões do
  // Início). Quem só cadastra cliente vê quem sumiu, mas não quanto gastou.
  const podeVerValores = MODULOS_QUE_LEEM_O_CAIXA.some((m) => temPermissao(operador, m));

  // Campo vazio ou "0" no meio da digitação não vira filtro de 0 meses:
  // vale o padrão até a pessoa terminar de digitar um número de verdade.
  const meses = Number(textoMeses) >= 1 ? Math.floor(Number(textoMeses)) : MESES_PADRAO;

  const sumidos = useMemo(
    () =>
      ordens ? clientesSumidos(todosClientes, resumirPorCliente(ordens), hojeLocal(), meses) : [],
    [todosClientes, ordens, meses],
  );

  async function carregarSumidos() {
    setCarregandoSumidos(true);
    setErro(null);
    try {
      const [clientes, ordensCarregadas] = await Promise.all([
        listarClientes(),
        listarOrdensFaturadasDosClientes(),
      ]);
      setTodosClientes(clientes);
      setOrdens(ordensCarregadas);
    } catch (err) {
      console.error("Erro ao carregar os clientes que sumiram:", err);
      setErro(mensagemDeErro(err));
      // Desmarca: com a caixinha marcada e a lista comum embaixo, pareceria
      // que todo cliente sumiu. Marcar de novo tenta outra vez.
      setSoSumidos(false);
    } finally {
      setCarregandoSumidos(false);
    }
  }

  // O texto do modelo e os "chamado em" são de cada LOJA (as ordens, não: o
  // cliente é da empresa). Trocar de loja na barra lateral com a tela aberta
  // precisa trazer os da loja nova, senão o botão misturaria o texto de uma
  // loja com o nome da outra.
  const lojaId = lojaAtual?.id;
  useEffect(() => {
    if (!soSumidos || !lojaId) return;
    let valendo = true;
    setModelosWhatsapp({});
    setUltimosChamados(new Map());
    Promise.all([
      listarModelosWhatsapp(lojaId),
      ultimasMensagensPorReferencia(lojaId, "cliente_sumido"),
    ])
      .then(([modelos, chamados]) => {
        if (!valendo) return;
        setModelosWhatsapp(modelos);
        setUltimosChamados(chamados);
      })
      .catch((err) => {
        console.error("Erro ao carregar os modelos de WhatsApp:", err);
        if (valendo) setErro(mensagemDeErro(err));
      });
    return () => {
      valendo = false;
    };
  }, [soSumidos, lojaId]);

  function handleLigarSumidos(ligar: boolean) {
    setSoSumidos(ligar);
    if (ligar && ordens === null) carregarSumidos();
  }

  function textoDoChamado(cliente: Cliente, veiculo: string | null): string {
    return preencherModelo(textoDoModelo(modelosWhatsapp, "cliente_sumido"), {
      cliente: cliente.nome,
      loja: lojaAtual?.nome,
      veiculo: veiculo || "carro",
    });
  }

  // A loja tem cliente (ou a pessoa está buscando): mostra a busca e o filtro.
  const temClientes = lista.total > 0 || lista.buscaDaTela !== "" || lista.busca !== "";

  // Depois de salvar ou excluir: a página atual da lista e, se o filtro
  // "sumiram" já foi usado, a lista completa dele também.
  async function carregar() {
    lista.recarregar();
    if (ordens !== null) {
      try {
        setTodosClientes(await listarClientes());
      } catch (err) {
        console.error("Erro ao recarregar os clientes:", err);
        setErro(mensagemDeErro(err));
      }
    }
  }

  async function handleSalvar(cliente: NovoCliente, veiculos: VeiculoFormulario[]) {
    if (formulario && formulario !== "novo") {
      await atualizarCliente(formulario.id, cliente, veiculos);
    } else {
      await criarCliente(cliente, veiculos);
    }
    setFormulario(null);
    await carregar();
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    try {
      await excluirCliente(id);
      await carregar();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      const mensagem = mensagemDeErro(err);
      setErro(
        mensagem.includes("ordens_servico")
          ? "Não é possível excluir esse cliente porque ele já tem Ordens de Serviço vinculadas."
          : mensagem,
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="font-titulo text-titulo font-bold text-texto">Clientes</h1>
            <p className="text-corpo text-texto-2">Cadastro de clientes e veículos</p>
          </div>
        </div>
        {!formulario && (
          <div className="flex items-center gap-3">
            {operador?.admin && (
              <Botao variante="secundario" onClick={() => setImportando(true)}>
                Importar planilha
              </Botao>
            )}
            <Botao variante="principal" onClick={() => setFormulario("novo")}>
              + Novo cliente
            </Botao>
          </div>
        )}
      </header>

      {formulario && (
        <div ref={caixaDoFormulario} className="scroll-mt-4">
          {/* key: a tabela fica na tela com o formulário aberto (só o cartão dos
              "sumidos" some), e sem ela trocar de canetinha mantinha os valores
              do anterior (defaultValues só valem na montagem); salvar gravava o
              cliente A por cima do B (#969). */}
          <ClienteForm
            key={formulario === "novo" ? "novo" : formulario.id}
            clienteExistente={formulario === "novo" ? undefined : formulario}
            onSalvar={handleSalvar}
            onCancelar={() => setFormulario(null)}
          />
        </div>
      )}

      {(erro || lista.erro) && (
        <AvisoDeErro>{erro || lista.erro}</AvisoDeErro>
      )}

      {temClientes && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* A busca vem primeiro: é o que se faz todo dia no balcão. O filtro
              dos que sumiram (uma vez por mês, no máximo) ficou ao lado dela,
              em vez de num cartão de largura inteira em cima. */}
          {!soSumidos && (
            <input
              type="search"
              value={lista.busca}
              onChange={(e) => lista.setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou CPF/CNPJ"
              aria-label="Buscar cliente"
              className="sakura-campo sakura-campo-filtro max-w-md flex-1 basis-72"
            />
          )}
          {!formulario && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <label className="flex items-center gap-2 text-corpo">
                <input
                  type="checkbox"
                  checked={soSumidos}
                  onChange={(e) => handleLigarSumidos(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-texto">Só os clientes que sumiram:</span>
              </label>
              <label className="flex items-center gap-2 text-corpo text-texto-2">
                sem vir há mais de
                <input
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={textoMeses}
                  onChange={(e) => setTextoMeses(e.target.value)}
                  aria-label="Meses sem vir"
                  className="sakura-campo sakura-campo-filtro !w-20"
                />
                meses
              </label>
            </div>
          )}
          {soSumidos && !formulario && (
            <p className="w-full text-rotulo text-texto-2">
              Conta as OS e vendas de balcão faturadas das lojas que você acessa.
            </p>
          )}
        </div>
      )}

      {(lista.carregando && lista.linhas.length === 0 && !soSumidos) ||
      (soSumidos && carregandoSumidos) ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : soSumidos && ordens ? (
        sumidos.length === 0 ? (
          <p className="text-corpo text-texto-2">
            Nenhum cliente sem vir há mais de {meses} {meses === 1 ? "mês" : "meses"}.
          </p>
        ) : (
          <div className="sakura-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="sakura-tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Última visita</th>
                    <th>Último serviço</th>
                    {podeVerValores && <th className="text-right">Total gasto</th>}
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sumidos.map(({ cliente, resumo }) => {
                    const ultimoChamado = ultimosChamados.get(cliente.id);
                    return (
                      <tr key={cliente.id}>
                        <td>
                          <LinkCliente clienteId={cliente.id} nome={cliente.nome} podeAbrir />
                        </td>
                        <td className="whitespace-nowrap">{cliente.telefone || "—"}</td>
                        <td className="whitespace-nowrap">{diaBrasileiro(resumo.ultimaVisita)}</td>
                        <td>{resumo.ultimoServico ?? "—"}</td>
                        {podeVerValores && (
                          <td className="whitespace-nowrap text-right font-medium text-texto">
                            {formatarMoeda(resumo.totalGasto)}
                          </td>
                        )}
                        <td className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-3">
                            {ultimoChamado && (
                              <Dica texto="O sistema só sabe que a conversa foi aberta — se a mensagem foi mesmo enviada, só você sabe.">
                                <span className="cursor-default text-rotulo text-texto-2" tabIndex={0}>
                                  chamado em {new Date(ultimoChamado).toLocaleDateString("pt-BR")}
                                </span>
                              </Dica>
                            )}
                            <BotaoWhatsapp
                              telefone={cliente.telefone}
                              texto={textoDoChamado(cliente, resumo.veiculo)}
                              rotulo="Chamar"
                              titulo="Abrir a conversa no WhatsApp com a mensagem pronta pra chamar o cliente de volta"
                              aoAbrir={() => {
                                if (!lojaAtual) return;
                                registrarMensagemAberta(
                                  lojaAtual.id,
                                  "cliente_sumido",
                                  cliente.id,
                                  cliente.telefone ?? null,
                                  operador?.id ?? null,
                                ).then(() =>
                                  ultimasMensagensPorReferencia(lojaAtual.id, "cliente_sumido")
                                    .then(setUltimosChamados)
                                    .catch((err) => console.error("Erro ao recarregar os chamados:", err)),
                                );
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : lista.total === 0 ? (
        <p className="text-corpo text-texto-2">
          {lista.buscaDaTela
            ? `Nenhum cliente encontrado com "${lista.buscaDaTela}".`
            : "Nenhum cliente cadastrado ainda."}
        </p>
      ) : (
        <div className="space-y-3">
          <div
            className={`sakura-card overflow-hidden ${lista.carregando ? "opacity-60" : ""}`}
            aria-busy={lista.carregando}
          >
            <div className="overflow-x-auto">
              <table className="sakura-tabela">
                <thead>
                  <tr>
                    <CabecalhoOrdenavel
                      coluna="nome"
                      rotulo="Nome"
                      ordem={lista.ordem}
                      aoClicar={lista.trocarOrdem}
                    />
                    <th>Telefone</th>
                    <CabecalhoOrdenavel
                      coluna="cidade"
                      rotulo="Cidade/UF"
                      ordem={lista.ordem}
                      aoClicar={lista.trocarOrdem}
                    />
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lista.linhas.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>
                        <LinkCliente clienteId={cliente.id} nome={cliente.nome} podeAbrir />
                      </td>
                      <td className="whitespace-nowrap">{cliente.telefone || "—"}</td>
                      <td>{cliente.cidade ? `${cliente.cidade}/${cliente.uf ?? ""}` : "—"}</td>
                      <td className="text-right">
                        <AcoesDaLinha
                          descricao={`o cliente ${cliente.nome}`}
                          acoes={[
                            ...(cliente.veiculos && cliente.veiculos.length > 0
                              ? [
                                  {
                                    tipo: "texto" as const,
                                    rotulo: "Ver veículos",
                                    aoClicar: () => setVeiculosDe(cliente),
                                  },
                                ]
                              : []),
                            { tipo: "editar", aoClicar: () => setFormulario(cliente) },
                            {
                              tipo: "menu",
                              rotulo: "Excluir cliente",
                              perigosa: true,
                              aoClicar: () => handleExcluir(cliente.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-corpo text-texto-2">
              Mostrando {numero(lista.primeira)} a {numero(lista.ultima)} de {numero(lista.total)}
            </p>
            <div className="flex gap-2">
              <Botao onClick={lista.anterior} disabled={!lista.temAnterior}>
                Anterior
              </Botao>
              <Botao onClick={lista.proxima} disabled={!lista.temProxima}>
                Próxima
              </Botao>
            </div>
          </div>
        </div>
      )}

      {veiculosDe && (
        <VeiculosDoClienteModal cliente={veiculosDe} onFechar={() => setVeiculosDe(null)} />
      )}

      {importando && operador?.admin && (
        <ImportarClientesModal onFechar={() => setImportando(false)} onConcluido={carregar} />
      )}
    </div>
  );
}

function numero(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** Um cabeçalho que ordena a tabela inteira (no banco) ao ser clicado. */
function CabecalhoOrdenavel({
  coluna,
  rotulo,
  ordem,
  aoClicar,
}: {
  coluna: ColunaDaListaDeClientes;
  rotulo: string;
  ordem: OrdemDaLista<ColunaDaListaDeClientes>;
  aoClicar: (coluna: ColunaDaListaDeClientes) => void;
}) {
  const ativa = ordem.coluna === coluna;
  return (
    <th aria-sort={ativa ? (ordem.crescente ? "ascending" : "descending") : "none"}>
      <Dica texto={`Ordenar por ${rotulo}`}>
        <button
          type="button"
          onClick={() => aoClicar(coluna)}
          className="inline-flex items-center gap-1 font-semibold hover:text-texto"
        >
          {rotulo}
          <span aria-hidden="true" className={ativa ? "text-texto" : "opacity-40"}>
            {ativa && !ordem.crescente ? "▼" : "▲"}
          </span>
        </button>
      </Dica>
    </th>
  );
}
