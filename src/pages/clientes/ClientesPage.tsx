import { useEffect, useMemo, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { useAuth } from "@/contexts/AuthContext";
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
} from "@/lib/clientes";
import { listarOrdensFaturadasDosClientes } from "@/lib/clientesSumidos";
import { hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
  ultimasMensagensPorReferencia,
} from "@/lib/modelosWhatsapp";
import { isSupabaseConfigured } from "@/lib/supabase";
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
import { ClienteForm } from "./ClienteForm";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { VeiculosDoClienteModal } from "./VeiculosDoClienteModal";

/** Padrão do filtro "sumiram" — decisão da Sofia, 17/10/2026 (tarefa #455). */
const MESES_PADRAO = 6;

/** "2026-04-30" → "30/04/2026", sem passar por `new Date()` (que leria em UTC). */
function diaParaTela(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

export function ClientesPage() {
  const { operador, lojaAtual } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Cliente | null>(null);
  const [veiculosDe, setVeiculosDe] = useState<Cliente | null>(null);

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
    () => (ordens ? clientesSumidos(clientes, resumirPorCliente(ordens), hojeLocal(), meses) : []),
    [clientes, ordens, meses],
  );

  async function carregarSumidos() {
    setCarregandoSumidos(true);
    setErro(null);
    try {
      const [listaOrdens, modelos, chamados] = await Promise.all([
        listarOrdensFaturadasDosClientes(),
        lojaAtual ? listarModelosWhatsapp(lojaAtual.id) : Promise.resolve({}),
        lojaAtual
          ? ultimasMensagensPorReferencia(lojaAtual.id, "cliente_sumido")
          : Promise.resolve(new Map<string, string>()),
      ]);
      setOrdens(listaOrdens);
      setModelosWhatsapp(modelos);
      setUltimosChamados(chamados);
    } catch (err) {
      console.error("Erro ao carregar os clientes que sumiram:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregandoSumidos(false);
    }
  }

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

  async function carregar() {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      setClientes(await listarClientes());
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

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
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="text-titulo font-semibold text-sakura-purple-dark">
              Clientes
            </h1>
            <p className="text-corpo text-sakura-muted">
              Cadastro de clientes e veículos
            </p>
          </div>
        </div>
        {!formulario && (
          <button
            onClick={() => setFormulario("novo")}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Novo cliente
          </button>
        )}
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a salvar clientes de verdade.
        </p>
      )}

      {formulario && (
        <ClienteForm
          clienteExistente={formulario === "novo" ? undefined : formulario}
          onSalvar={handleSalvar}
          onCancelar={() => setFormulario(null)}
        />
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      {!formulario && clientes.length > 0 && (
        <div className="sakura-card flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
          <label className="flex items-center gap-2 text-corpo">
            <input
              type="checkbox"
              checked={soSumidos}
              onChange={(e) => handleLigarSumidos(e.target.checked)}
              className="h-4 w-4 rounded border-sakura-borda-campo text-sakura-purple focus:ring-sakura-purple"
            />
            <span className="text-sakura-purple-dark/80">Só os clientes que sumiram:</span>
          </label>
          <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
            sem vir há mais de
            <input
              type="number"
              min="1"
              max="120"
              step="1"
              value={textoMeses}
              onChange={(e) => setTextoMeses(e.target.value)}
              aria-label="Meses sem vir"
              className="w-20 rounded-lg border border-sakura-borda-campo px-3 py-1.5 focus:border-sakura-purple"
            />
            meses
          </label>
        </div>
      )}

      {carregando || (soSumidos && carregandoSumidos) ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : soSumidos && ordens ? (
        sumidos.length === 0 ? (
          <p className="text-corpo text-sakura-muted">
            Nenhum cliente sem vir há mais de {meses} {meses === 1 ? "mês" : "meses"}.
          </p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Última visita</th>
                  <th className="px-4 py-3 font-medium">Último serviço</th>
                  {podeVerValores && <th className="px-4 py-3 font-medium">Total gasto</th>}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sumidos.map(({ cliente, resumo }) => {
                  const ultimoChamado = ultimosChamados.get(cliente.id);
                  return (
                    <tr key={cliente.id} className="border-t border-sakura-gray/20">
                      <td className="px-4 py-3">{cliente.nome}</td>
                      <td className="whitespace-nowrap px-4 py-3">{cliente.telefone || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{diaParaTela(resumo.ultimaVisita)}</td>
                      <td className="px-4 py-3">{resumo.ultimoServico ?? "—"}</td>
                      {podeVerValores && (
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {formatarMoeda(resumo.totalGasto)}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ultimoChamado && (
                            <span
                              className="text-rotulo text-sakura-muted"
                              title="O sistema só sabe que a conversa foi aberta — se a mensagem foi mesmo enviada, só você sabe."
                            >
                              chamado em {new Date(ultimoChamado).toLocaleDateString("pt-BR")}
                            </span>
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
        )
      ) : clientes.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhum cliente cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Cidade/UF</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">{cliente.nome}</td>
                  <td className="px-4 py-3">{cliente.telefone || "—"}</td>
                  <td className="px-4 py-3">
                    {cliente.cidade ? `${cliente.cidade}/${cliente.uf ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
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
      )}

      {veiculosDe && (
        <VeiculosDoClienteModal cliente={veiculosDe} onFechar={() => setVeiculosDe(null)} />
      )}
    </div>
  );
}
