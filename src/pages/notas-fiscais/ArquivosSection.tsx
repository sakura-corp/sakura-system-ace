import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { mensagemDeErro } from "@/lib/errors";
import {
  baixarArquivo,
  baixarZipDoMes,
  enviarArquivo,
  excluirArquivo,
  listarArquivos,
  listarOrdensParaNotas,
} from "@/lib/notasFiscais";
import { contaNosNumeros } from "@/schemas/orcamento";
import { situacaoDaNota, type TomSituacaoNota } from "@/schemas/situacaoFiscal";
import type { NotaFiscalArquivo, TipoNotaFiscal } from "@/types/notaFiscal";
import { nomeOrdem, type OrdemParaNotas } from "@/types/os";
import { CancelarNotaModal } from "./CancelarNotaModal";
import { NotaFiscalVisualModal } from "./NotaFiscalVisualModal";
import { VerDanfeModal } from "./VerDanfeModal";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

// Verde no mesmo tom do "Finalizada" da lista de OS; vermelho no mesmo tom
// do "cancelada" da janela da nota (VerDanfeModal), pra a mesma situação ter
// a mesma cara nos dois lugares.
const COR_SITUACAO: Record<TomSituacaoNota, string> = {
  autorizada: "bg-emerald-100 text-emerald-900",
  cancelada: "bg-red-500/15 text-red-400",
  manual: "bg-white/10 text-sakura-purple-dark",
  outra: "bg-white/10 text-sakura-purple-dark",
};

function EtiquetaSituacao({ arquivo }: { arquivo: NotaFiscalArquivo }) {
  const situacao = situacaoDaNota(arquivo);
  return (
    <span
      title={situacao.rotulo}
      className={`inline-block max-w-full truncate whitespace-nowrap rounded-full px-2.5 py-1 align-middle text-rotulo font-medium ${COR_SITUACAO[situacao.tom]}`}
    >
      {situacao.rotulo}
    </span>
  );
}

// A coluna "Ordem de Serviço": o número da OS (ou da venda de balcão), com o
// cliente ao lado, mais apagado, cortado com "…" se não couber (#876 — antes
// mostrava só o nome do cliente, e o dono da loja procurava a OS e não achava).
function OrdemDaNota({ arquivo }: { arquivo: NotaFiscalArquivo }) {
  const ordem = arquivo.ordem_servico;
  const nome = ordem?.numero != null ? nomeOrdem(ordem.numero, ordem.tipo) : null;
  const cliente = ordem?.cliente?.nome ?? null;
  if (!nome && !cliente) return <>—</>;
  return (
    <span className="flex min-w-0 items-baseline gap-2" title={[nome, cliente].filter(Boolean).join(" · ")}>
      {nome && <span className="whitespace-nowrap font-medium">{nome}</span>}
      {cliente && <span className="truncate text-sakura-muted">{cliente}</span>}
    </span>
  );
}

interface ArquivosSectionProps {
  tipo: TipoNotaFiscal;
}

function competenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const SEM_ARQUIVOS: NotaFiscalArquivo[] = [];
const SEM_ORDENS: OrdemParaNotas[] = [];

export function ArquivosSection({ tipo }: ArquivosSectionProps) {
  const { operador, lojaAtual } = useAuth();
  // #927: só a carga mais nova mexe na tela; e se a da loja nova der erro, os
  // dados da loja anterior (guardados no estado) não aparecem.
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  const [arquivosGuardados, setArquivos] = useState<NotaFiscalArquivo[]>([]);
  const [ordensGuardadas, setOrdens] = useState<OrdemParaNotas[]>([]);
  const arquivos = dadosSaoDaLoja ? arquivosGuardados : SEM_ARQUIVOS;
  const ordens = dadosSaoDaLoja ? ordensGuardadas : SEM_ORDENS;
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [ordemServicoId, setOrdemServicoId] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [arquivoVisualizando, setArquivoVisualizando] = useState<NotaFiscalArquivo | null>(null);
  const [arquivoCancelando, setArquivoCancelando] = useState<NotaFiscalArquivo | null>(null);
  const [arquivoDanfe, setArquivoDanfe] = useState<NotaFiscalArquivo | null>(null);
  const [mesBaixando, setMesBaixando] = useState<string | null>(null);

  async function carregar() {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [listaArquivos, listaOrdens] = await Promise.all([
        listarArquivos(tipo, carga.lojaId),
        listarOrdensParaNotas(carga.lojaId),
      ]);
      if (!carga.aindaEhAtual()) return;
      setArquivos(listaArquivos);
      setOrdens(listaOrdens);
      carga.gravou();
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar notas fiscais:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    setMostrarFormulario(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, lojaAtual?.id]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivoSelecionado || !operador || !lojaAtual) return;
    setErro(null);
    setEnviando(true);
    try {
      await enviarArquivo({
        tipo,
        competencia,
        arquivo: arquivoSelecionado,
        ordemServicoId: ordemServicoId || null,
        operadorId: operador.id,
        lojaId: lojaAtual.id,
      });
      setMostrarFormulario(false);
      setArquivoSelecionado(null);
      setOrdemServicoId("");
      await carregar();
    } catch (err) {
      console.error("Erro ao enviar XML:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  async function handleBaixar(arquivo: NotaFiscalArquivo) {
    try {
      await baixarArquivo(arquivo);
    } catch (err) {
      console.error("Erro ao baixar XML:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleBaixarMes(chave: string, arquivosDoMes: NotaFiscalArquivo[]) {
    setErro(null);
    setMesBaixando(chave);
    try {
      await baixarZipDoMes(arquivosDoMes, `${tipo}-${chave}.zip`);
    } catch (err) {
      console.error("Erro ao baixar os XMLs do mês:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setMesBaixando(null);
    }
  }

  async function handleExcluir(arquivo: NotaFiscalArquivo) {
    // Excluir aqui apaga só o registro e o XML guardados no sistema — não
    // desfaz nada na SEFAZ/prefeitura. Numa nota emitida pelo sistema e
    // ainda autorizada isso é quase sempre um engano: a nota continua
    // valendo lá fora, o XML (que precisa ser guardado por 5 anos) some, e a
    // OS volta a aparecer como "falta nota", convidando a emitir uma
    // segunda nota pra mesma venda. Quem quer desfazer a nota usa "Cancelar
    // nota", que é o botão do lado.
    const emitidaEValida = arquivo.origem === "automatica" && arquivo.status === "autorizado";
    const aviso = emitidaEValida
      ? `A nota "${arquivo.nome_arquivo}" foi emitida por aqui e está AUTORIZADA.\n\n` +
        "Excluir apaga só o registro no sistema — a nota continua valendo na SEFAZ/prefeitura, " +
        "o XML sai do arquivo (a lei pede pra guardar por 5 anos) e a OS volta a aparecer como " +
        "\"falta nota\", o que pode acabar em duas notas pra mesma venda.\n\n" +
        "Pra desfazer a nota de verdade, use \"Cancelar nota\".\n\nExcluir mesmo assim?"
      : `Excluir o arquivo "${arquivo.nome_arquivo}"?`;
    if (!confirm(aviso)) return;
    try {
      await excluirArquivo(arquivo);
      await carregar();
    } catch (err) {
      console.error("Erro ao excluir XML:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const grupos = new Map<string, NotaFiscalArquivo[]>();
  for (const arquivo of arquivos) {
    const chave = arquivo.competencia.slice(0, 7);
    const grupo = grupos.get(chave) ?? [];
    grupo.push(arquivo);
    grupos.set(chave, grupo);
  }

  return (
    <div className="space-y-4">
      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>
      )}

      <div className="flex justify-end">
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Enviar XML
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleEnviar} className="space-y-4 sakura-card p-6 shadow-sm">
          <h3 className="text-corpo font-semibold text-sakura-purple-dark">Enviar arquivo XML</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">
                Arquivo <span className="text-red-500">*</span>
              </span>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                required
                onChange={(e) => setArquivoSelecionado(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
              />
            </label>
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">
                Mês de competência <span className="text-red-500">*</span>
              </span>
              <input
                type="month"
                required
                value={competencia.slice(0, 7)}
                onChange={(e) => setCompetencia(`${e.target.value}-01`)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
              />
            </label>
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">
                Ordem de Serviço relacionada (opcional)
              </span>
              <Combobox
                opcoes={ordens.filter(contaNosNumeros).map((ordem) => ({
                  valor: ordem.id,
                  rotulo: [
                    ordem.numero != null ? nomeOrdem(ordem.numero, ordem.tipo) : null,
                    ordem.cliente?.nome ?? "Cliente",
                    new Date(ordem.data_abertura).toLocaleDateString("pt-BR"),
                  ]
                    .filter(Boolean)
                    .join(" — "),
                }))}
                valor={ordemServicoId}
                onMudar={setOrdemServicoId}
                opcaoVazia="Nenhuma"
                placeholder="Nenhuma"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : grupos.size === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhum arquivo enviado ainda.</p>
      ) : (
        [...grupos.entries()].map(([chave, arquivosDoMes]) => (
          <div key={chave} className="overflow-hidden sakura-card">
            <div className="flex items-center justify-between gap-3 bg-sakura-pink-soft px-4 py-3">
              <h3 className="text-corpo font-semibold text-sakura-purple-dark">
                {formatarCompetencia(arquivosDoMes[0].competencia)}
              </h3>
              <button
                onClick={() => handleBaixarMes(chave, arquivosDoMes)}
                disabled={mesBaixando !== null}
                className="text-rotulo font-medium text-sakura-purple hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {mesBaixando === chave
                  ? "Preparando..."
                  : `Baixar XMLs do mês (${arquivosDoMes.length})`}
              </button>
            </div>
            <div className="overflow-x-auto">
              {/* `table-fixed` com as larguras no cabeçalho: cada mês é uma
                  tabela separada, e no layout automático cada uma alinhava as
                  colunas pelo próprio conteúdo — uma embaixo da outra ficavam
                  tortas (#876). Assim todas têm as mesmas colunas. */}
              {/* A Situação e as ações têm largura fixa (a etiqueta e o
                  "Ver DANFE" não podem quebrar nem vazar); as de texto se
                  repartem o resto e cortam com "…". Abaixo de 42rem (zoom
                  alto, janela estreita) a tabela rola de lado, como antes. */}
              <table className="w-full min-w-[42rem] table-fixed text-left text-corpo">
                <thead className="text-sakura-purple-dark/90">
                  <tr>
                    <th className="w-[20%] px-4 py-2 font-medium">Arquivo</th>
                    <th className="w-[9.5rem] px-4 py-2 font-medium">Situação</th>
                    <th className="px-4 py-2 font-medium">Ordem de Serviço</th>
                    <th className="w-[16%] px-4 py-2 font-medium">Enviado por</th>
                    <th className="w-[11.5rem] px-4 py-2">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arquivosDoMes.map((arquivo) => (
                    <tr key={arquivo.id} className="border-t border-sakura-gray/20">
                      <td className="truncate px-4 py-3" title={arquivo.nome_arquivo}>
                        {arquivo.nome_arquivo}
                      </td>
                      <td className="overflow-hidden px-4 py-3">
                        <EtiquetaSituacao arquivo={arquivo} />
                      </td>
                      <td className="px-4 py-3">
                        <OrdemDaNota arquivo={arquivo} />
                      </td>
                      <td className="truncate px-4 py-3" title={arquivo.operador?.nome}>
                        {arquivo.operador?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AcoesDaLinha
                          descricao={`a nota ${arquivo.nome_arquivo}`}
                          acoes={[
                            ...(arquivo.origem === "automatica"
                              ? [
                                  {
                                    tipo: "texto" as const,
                                    rotulo: tipo === "nfe" ? "Ver DANFE" : "Ver PDF",
                                    aoClicar: () => setArquivoDanfe(arquivo),
                                  },
                                ]
                              : []),
                            {
                              tipo: "menu",
                              rotulo: "Versão para o cliente",
                              aoClicar: () => setArquivoVisualizando(arquivo),
                            },
                            {
                              tipo: "menu",
                              rotulo: "Baixar XML",
                              aoClicar: () => handleBaixar(arquivo),
                            },
                            ...(arquivo.origem === "automatica" && arquivo.status === "autorizado"
                              ? [
                                  {
                                    tipo: "menu" as const,
                                    rotulo: "Cancelar nota",
                                    perigosa: true,
                                    aoClicar: () => setArquivoCancelando(arquivo),
                                  },
                                ]
                              : []),
                            {
                              tipo: "menu",
                              rotulo: "Excluir nota",
                              perigosa: true,
                              aoClicar: () => handleExcluir(arquivo),
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
        ))
      )}

      {arquivoVisualizando && (
        <NotaFiscalVisualModal
          arquivo={arquivoVisualizando}
          onFechar={() => setArquivoVisualizando(null)}
        />
      )}

      {arquivoDanfe && (
        <VerDanfeModal arquivo={arquivoDanfe} onFechar={() => setArquivoDanfe(null)} />
      )}

      {arquivoCancelando && (
        <CancelarNotaModal
          arquivo={arquivoCancelando}
          onFechar={() => setArquivoCancelando(null)}
          onCancelado={carregar}
        />
      )}
    </div>
  );
}
