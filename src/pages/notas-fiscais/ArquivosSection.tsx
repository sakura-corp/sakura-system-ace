import { CircleX, Download, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { AcoesDaLinha, type AcaoDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Dica } from "@/components/Dica";
import { Selo } from "@/components/Selo";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { avisar } from "@/lib/avisoQueSome";
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
import { NOTA_LABEL, situacaoDaNota } from "@/schemas/situacaoFiscal";
import type { NotaFiscalArquivo, TipoNotaFiscal } from "@/types/notaFiscal";
import { nomeOrdem, type OrdemParaNotas } from "@/types/os";
import { AvisoDeErro } from "@/components/Aviso";
import { CancelarNotaModal } from "./CancelarNotaModal";
import { NotaFiscalVisualModal } from "./NotaFiscalVisualModal";
import { VerDanfeModal } from "./VerDanfeModal";

// A situação da nota no selo do visual novo (#990): cor, ícone e palavra
// (regra 4). As palavras são as de sempre (`situacaoDaNota`); só a cor e o
// ícone são desta tela. Verde = autorizada (vale, nada a fazer); vermelho =
// cancelada ou recusada; azul = ainda processando lá fora; cinza = enviada à
// mão (o programa não acompanha a situação dela) ou sem situação.
function SeloDaNota({ arquivo }: { arquivo: NotaFiscalArquivo }) {
  const situacao = situacaoDaNota(arquivo);
  if (situacao.tom === "autorizada") return <Selo tipo="ok" palavra={situacao.rotulo} />;
  if (situacao.tom === "cancelada") return <Selo tipo="perigo" palavra={situacao.rotulo} icone={CircleX} />;
  if (situacao.tom === "manual") return <Selo tipo="neutro" palavra={situacao.rotulo} icone={Upload} />;
  const status = arquivo.status ?? "";
  if (STATUS_COM_ERRO.has(status)) return <Selo tipo="perigo" palavra={situacao.rotulo} />;
  if (status.startsWith("processando_")) return <Selo tipo="info" palavra={situacao.rotulo} />;
  return <Selo tipo="neutro" palavra={situacao.rotulo} />;
}

// As situações de nota com erro: a mesma lista da Central do dia
// (`STATUS_DE_NOTA_COM_ERRO`, em src/schemas/centralDoDia.ts, que não é
// exportada; sugestão no PR: exportar de lá e usar aqui).
const STATUS_COM_ERRO = new Set(["erro_autorizacao", "erro_cancelamento", "denegado"]);

// A coluna "Nota": o número (o que o cliente e o contador falam), com o nome
// do arquivo embaixo, menor. Nota enviada à mão às vezes não tem número: aí
// fica só o arquivo, como antes.
function NomeDaNota({ arquivo }: { arquivo: NotaFiscalArquivo }) {
  if (!arquivo.numero) {
    return (
      <span className="block truncate text-texto" title={arquivo.nome_arquivo}>
        {arquivo.nome_arquivo}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col" title={arquivo.nome_arquivo}>
      <span className="whitespace-nowrap font-medium text-texto">Nº {arquivo.numero}</span>
      <span className="truncate text-meta text-texto-2">{arquivo.nome_arquivo}</span>
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
  if (!nome && !cliente) return <span className="text-texto-2">—</span>;
  return (
    <span className="flex min-w-0 items-baseline gap-2" title={[nome, cliente].filter(Boolean).join(" · ")}>
      {nome && <span className="whitespace-nowrap font-medium text-texto">{nome}</span>}
      {cliente && <span className="truncate text-texto-2">{cliente}</span>}
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
      avisar(`XML ${arquivoSelecionado.name} enviado`);
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
    // nota", logo acima de "Excluir nota" no "Mais ações".
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
      avisar(`Nota ${arquivo.nome_arquivo} excluída`);
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

  // O que vai na linha (visual novo, #990, e o pedido da Sofia de 15/11): à
  // vista, só o próximo passo de verdade, que é abrir a nota pra ver,
  // imprimir ou mandar pro cliente. Antes era "Ver DANFE", nome de quem
  // programa. O resto fica no "Mais ações", cada um dizendo o que faz e pra
  // quem. Nada saiu: "Versão para o cliente", "Baixar XML", "Cancelar nota" e
  // "Excluir nota" continuam lá (as mensagens de erro do PDF apontam pra
  // "Versão para o cliente" por esse nome, por isso ele ficou).
  function abrirANota(arquivo: NotaFiscalArquivo) {
    if (arquivo.origem === "automatica") setArquivoDanfe(arquivo);
    // Nota feita fora do programa não tem PDF guardado: o que dá pra mostrar
    // é o resumo montado do XML.
    else setArquivoVisualizando(arquivo);
  }

  function rotuloDoBotaoDaLinha(arquivo: NotaFiscalArquivo) {
    if (arquivo.origem === "automatica" && arquivo.status === "autorizado") return "Nota do cliente";
    return "Ver a nota";
  }

  // A dica começa pelo nome do botão: abaixo de 1280 o botão é só o ícone, e
  // é a dica que diz o que ele é.
  function dicaDoBotaoDaLinha(arquivo: NotaFiscalArquivo) {
    const nome = rotuloDoBotaoDaLinha(arquivo);
    if (arquivo.origem !== "automatica") {
      return `${nome}: abre o resumo feito do XML (nota feita fora do programa), pra ver, imprimir ou mandar`;
    }
    if (arquivo.status === "autorizado") return `${nome}: abre o PDF da nota, pra ver, imprimir ou mandar`;
    return `${nome}: abre o PDF da nota`;
  }

  function maisAcoes(arquivo: NotaFiscalArquivo): AcaoDaLinha[] {
    const acoes: AcaoDaLinha[] = [];
    // Na nota feita fora, a "Versão para o cliente" já é o botão da linha.
    if (arquivo.origem === "automatica") {
      acoes.push({
        tipo: "menu",
        rotulo: "Versão para o cliente (resumo do XML)",
        aoClicar: () => setArquivoVisualizando(arquivo),
      });
    }
    acoes.push({
      tipo: "menu",
      rotulo: "Baixar o XML (pro contador)",
      aoClicar: () => handleBaixar(arquivo),
    });
    if (arquivo.origem === "automatica" && arquivo.status === "autorizado") {
      acoes.push({
        tipo: "menu",
        rotulo: "Cancelar nota",
        perigosa: true,
        aoClicar: () => setArquivoCancelando(arquivo),
      });
    }
    acoes.push({
      tipo: "menu",
      rotulo: "Excluir nota",
      perigosa: true,
      aoClicar: () => handleExcluir(arquivo),
    });
    return acoes;
  }

  return (
    <div className="space-y-4">
      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {!mostrarFormulario && (
        <div className="flex justify-end">
          <Dica texto="Pra guardar aqui uma nota feita fora do programa (pela contabilidade, por exemplo)">
            <Botao icone={<Upload />} onClick={() => setMostrarFormulario(true)}>
              Enviar XML
            </Botao>
          </Dica>
        </div>
      )}

      {mostrarFormulario && (
        <form onSubmit={handleEnviar} className="space-y-4 sakura-card p-6">
          <div>
            <h2 className="text-corpo font-semibold text-texto">Enviar o XML de uma nota feita fora</h2>
            <p className="text-rotulo text-texto-2">
              Fica guardado junto com as outras, no mês que você escolher. A lei pede guardar o XML
              por 5 anos.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="sakura-rotulo">
              <span>
                Arquivo XML <span className="text-perigo">*</span>
              </span>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                required
                onChange={(e) => setArquivoSelecionado(e.target.files?.[0] ?? null)}
                className="sakura-campo cursor-pointer py-2.5 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-passar file:px-3 file:py-1 file:text-rotulo file:font-medium file:text-texto"
              />
            </label>
            <label className="sakura-rotulo">
              <span>
                Mês de competência <span className="text-perigo">*</span>
              </span>
              <input
                type="month"
                required
                value={competencia.slice(0, 7)}
                onChange={(e) => setCompetencia(`${e.target.value}-01`)}
                className="sakura-campo"
              />
            </label>
            <label className="sakura-rotulo">
              <span>Ordem de Serviço relacionada (opcional)</span>
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
            <Botao variante="fantasma" onClick={() => setMostrarFormulario(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="principal" icone={<Upload />} ocupado={enviando}>
              {enviando ? "Enviando..." : "Enviar"}
            </Botao>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : grupos.size === 0 ? (
        // Com erro, o aviso vermelho já diz o que houve: "nenhuma nota" ali
        // faria parecer que as notas sumiram.
        !erro && (
        <p className="text-corpo text-texto-2">
          Nenhuma nota {tipo === "nfe" ? "das peças" : "dos serviços"} ({NOTA_LABEL[tipo]}) ainda.
          As emitidas pelo programa aparecem aqui sozinhas.
        </p>
        )
      ) : (
        [...grupos.entries()].map(([chave, arquivosDoMes]) => {
          const mes = formatarCompetencia(arquivosDoMes[0].competencia);
          return (
            <section key={chave} aria-label={mes} className="overflow-hidden sakura-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha px-[1.125rem] py-3">
                <h2 className="text-corpo font-semibold text-texto">
                  {mes}{" "}
                  <span className="ml-1 text-rotulo font-medium text-texto-2">
                    {arquivosDoMes.length} {arquivosDoMes.length === 1 ? "nota" : "notas"}
                  </span>
                </h2>
                {/* O pacote do contador (pedido da Sofia, 15/11: cada botão de
                    baixar diz o que baixa e pra quem). */}
                <Dica
                  texto={`Baixa um .zip com os ${arquivosDoMes.length} XML de ${mes.toLowerCase()}: o arquivo que o contador pede`}
                >
                  <Botao
                    tamanho="pequeno"
                    icone={<Download />}
                    onClick={() => handleBaixarMes(chave, arquivosDoMes)}
                    disabled={mesBaixando !== null}
                    ocupado={mesBaixando === chave}
                  >
                    {mesBaixando === chave ? "Preparando..." : "Baixar os XML do mês, pro contador"}
                  </Botao>
                </Dica>
              </div>
              <div className="overflow-x-auto">
                {/* `table-fixed` com as larguras no cabeçalho: cada mês é uma
                    tabela separada, e no layout automático cada uma alinhava as
                    colunas pelo próprio conteúdo — uma embaixo da outra ficavam
                    tortas (#876). Assim todas têm as mesmas colunas. */}
                {/* A Situação e as ações têm largura fixa (o selo e o botão
                    da nota não podem quebrar nem vazar); as de texto se
                    repartem o resto e cortam com "…". Abaixo de 1280 de janela
                    o botão da nota fica só com o ícone (o nome continua na
                    dica e pro leitor de tela), pra caber em 1024 com o menu
                    aberto. Abaixo de 42rem (zoom alto) a tabela rola de lado,
                    como antes. */}
                <table className="sakura-tabela min-w-[42rem] table-fixed">
                  <thead>
                    <tr>
                      <th className="w-[20%]">Nota</th>
                      <th className="w-[9.5rem]">Situação</th>
                      <th>Ordem de Serviço</th>
                      <th className="w-[16%]">Enviado por</th>
                      <th className="w-[13.5rem] max-[1279px]:w-24">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {arquivosDoMes.map((arquivo) => (
                      <tr key={arquivo.id}>
                        <td>
                          <NomeDaNota arquivo={arquivo} />
                        </td>
                        <td className="overflow-hidden">
                          <SeloDaNota arquivo={arquivo} />
                        </td>
                        <td>
                          <OrdemDaNota arquivo={arquivo} />
                        </td>
                        <td className="truncate text-texto-2" title={arquivo.operador?.nome}>
                          {arquivo.operador?.nome ?? "—"}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <Dica texto={dicaDoBotaoDaLinha(arquivo)}>
                              <Botao
                                tamanho="pequeno"
                                icone={<FileText />}
                                aria-label={`${rotuloDoBotaoDaLinha(arquivo)} — ${arquivo.nome_arquivo}`}
                                onClick={() => abrirANota(arquivo)}
                                // O `relative` segura o nome escondido
                                // (`sr-only` é absoluto) dentro do botão: sem
                                // ele, o nome "vaza" e corta a tela em 1024
                                // (o mesmo cuidado da tarefa 7).
                                className="relative max-[1279px]:w-8 max-[1279px]:justify-center max-[1279px]:px-0"
                              >
                                <span className="max-[1279px]:sr-only">{rotuloDoBotaoDaLinha(arquivo)}</span>
                              </Botao>
                            </Dica>
                            <AcoesDaLinha
                              descricao={`a nota ${arquivo.nome_arquivo}`}
                              acoes={maisAcoes(arquivo)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
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
