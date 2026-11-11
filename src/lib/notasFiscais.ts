import { primeiroDiaDoMesLocal } from "./datas";
import {
  baixarArquivoNota,
  cancelarNFCe,
  cancelarNFSe,
  consultarNFCe,
  consultarNFSe,
  FocusNfeError,
} from "./focusNfe";
import { mensagemDeErro } from "./errors";
import { supabase } from "./supabase";
import { buscarPorIdsEmBlocos, buscarTudoEmPaginas } from "./paginacao";
import { salvarComoDownload } from "./download";
import { criarZip, type ArquivoParaZip } from "./zip";
import { motivoDanfeIndisponivel } from "@/schemas/danfe";
import {
  intervaloDoMes,
  mesPorExtenso,
  motivoSemPdf,
  nomeDoPacote,
  notasDoMes,
  planejarPacoteContabilidade,
  type ResultadoPdf,
} from "@/schemas/pacoteContabilidade";
import type { RespostaFocusNfe } from "@/types/focusNfe";
import type { NotaFiscalArquivo, TipoNotaFiscal } from "@/types/notaFiscal";
import type { OrdemParaNotas, StatusOS, TipoOrdem } from "@/types/os";

// A OS da nota vem pela janela `ordens_servico_notas` (migration 0075, #367):
// número, tipo e nome do cliente, pra quem tem Notas Fiscais mas não o módulo
// OS. O número entrou pela #876: a coluna mostrava só o cliente.
const SELECT_ARQUIVO =
  "*, ordem_servico:ordens_servico_notas(numero, tipo, cliente_nome), operador:operadores(nome)";

type ArquivoDaJanela = Omit<NotaFiscalArquivo, "ordem_servico"> & {
  ordem_servico?: {
    numero?: number | null;
    tipo?: TipoOrdem | null;
    cliente_nome: string | null;
  } | null;
};

/** Põe a OS no formato que a tela usa (`ordem_servico.numero`, `ordem_servico.cliente.nome`). */
export function arquivoDaJanela(linha: ArquivoDaJanela): NotaFiscalArquivo {
  const { ordem_servico: ordem, ...resto } = linha;
  return {
    ...resto,
    ordem_servico: ordem
      ? {
          numero: ordem.numero ?? null,
          tipo: ordem.tipo ?? null,
          cliente: ordem.cliente_nome != null ? { nome: ordem.cliente_nome } : null,
        }
      : null,
  };
}

/** A linha da janela `ordens_servico_notas` que o seletor "OS relacionada" usa. */
interface LinhaOrdemParaNotas {
  id: string;
  numero: number | null;
  tipo: TipoOrdem | null;
  status: StatusOS;
  data_abertura: string;
  cliente_nome: string | null;
}

/** As OS da loja pro seletor "OS relacionada" — só id, número, tipo, status, abertura e cliente. */
export async function listarOrdensParaNotas(lojaId: string): Promise<OrdemParaNotas[]> {
  const dados = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("ordens_servico_notas")
      .select("id, numero, tipo, status, data_abertura, cliente_nome")
      .eq("loja_id", lojaId)
      .order("data_abertura", { ascending: false })
      .order("id", { ascending: false })
      .range(de, ate),
  );
  return (dados as unknown as LinhaOrdemParaNotas[]).map((linha) => ({
    id: linha.id,
    numero: linha.numero,
    tipo: linha.tipo ?? undefined,
    status: linha.status,
    data_abertura: linha.data_abertura,
    ...(linha.cliente_nome != null ? { cliente: { nome: linha.cliente_nome } } : {}),
  }));
}

export async function listarArquivos(
  tipo: TipoNotaFiscal,
  lojaId: string,
): Promise<NotaFiscalArquivo[]> {
  // Por páginas: o Supabase corta em 1.000 linhas. `id` desempata a ordem.
  const data = await buscarTudoEmPaginas((de, ate) =>
    supabase
      .from("notas_fiscais_arquivos")
      .select(SELECT_ARQUIVO)
      .eq("tipo", tipo)
      .eq("loja_id", lojaId)
      .order("competencia", { ascending: false })
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true })
      .range(de, ate),
  );
  return (data as unknown as ArquivoDaJanela[]).map(arquivoDaJanela);
}

// As notas (NFC-e e NFS-e) de um mês da loja, pro pacote do contador (#383).
// Filtra no banco por intervalo, e não por `competencia = AAAA-MM-01`: nota
// emitida por versão antiga gravou o dia da emissão (ver lib/datas.ts).
export async function listarNotasDoMesParaPacote(
  lojaId: string,
  mes: string,
): Promise<NotaFiscalArquivo[]> {
  const { de, ateAntesDe } = intervaloDoMes(mes);
  const data = await buscarTudoEmPaginas((inicio, fim) =>
    supabase
      .from("notas_fiscais_arquivos")
      .select(SELECT_ARQUIVO)
      .eq("loja_id", lojaId)
      .gte("competencia", de)
      .lt("competencia", ateAntesDe)
      .order("tipo", { ascending: true })
      .order("criado_em", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, fim),
  );
  return (data as unknown as ArquivoDaJanela[]).map(arquivoDaJanela);
}

// As notas emitidas pelo sistema que voltaram com problema da Focus NFe, pra
// Central do dia do Início (#454). Filtra no banco: a lista inteira de notas
// da loja só cresce, e a central só quer estas.
export async function listarNotasComErro(lojaId: string): Promise<NotaFiscalArquivo[]> {
  const { data, error } = await supabase
    .from("notas_fiscais_arquivos")
    .select(SELECT_ARQUIVO)
    .eq("loja_id", lojaId)
    .eq("origem", "automatica")
    .in("status", ["erro_autorizacao", "erro_cancelamento", "denegado"])
    // As mais novas, se passar do limite; a central reordena depois.
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as ArquivoDaJanela[]).map(arquivoDaJanela);
}

// Notas ligadas a um conjunto de OS — usada pra saber, sem uma consulta por
// linha da lista, quais notas cada OS já tem (ver schemas/situacaoFiscal.ts).
// A lista de OS pode ter milhares: vai em blocos e por páginas (#498).
export async function listarArquivosDasOrdens(
  ordemIds: string[],
): Promise<NotaFiscalArquivo[]> {
  const data = await buscarPorIdsEmBlocos(ordemIds, (bloco, de, ate) =>
    supabase
      .from("notas_fiscais_arquivos")
      .select("*")
      .in("ordem_servico_id", bloco)
      .order("id")
      .range(de, ate),
  );
  return data as unknown as NotaFiscalArquivo[];
}

interface NovoEnvioArquivo {
  tipo: TipoNotaFiscal;
  competencia: string;
  arquivo: File;
  ordemServicoId: string | null;
  operadorId: string;
  lojaId: string;
}

export async function enviarArquivo({
  tipo,
  competencia,
  arquivo,
  ordemServicoId,
  operadorId,
  lojaId,
}: NovoEnvioArquivo): Promise<void> {
  const caminho = `${tipo}/${competencia.slice(0, 7)}/${crypto.randomUUID()}-${arquivo.name}`;

  const { error: erroUpload } = await supabase.storage
    .from("notas-fiscais")
    .upload(caminho, arquivo, { contentType: arquivo.type || "application/xml" });
  if (erroUpload) throw erroUpload;

  const { error: erroMetadados } = await supabase.from("notas_fiscais_arquivos").insert({
    tipo,
    competencia,
    nome_arquivo: arquivo.name,
    storage_path: caminho,
    ordem_servico_id: ordemServicoId,
    operador_id: operadorId,
    loja_id: lojaId,
  });
  if (erroMetadados) {
    await supabase.storage.from("notas-fiscais").remove([caminho]);
    throw erroMetadados;
  }
}

interface SalvarArquivoEmitidoParams {
  tipo: TipoNotaFiscal;
  resposta: RespostaFocusNfe;
  ordemServicoId: string;
  operadorId: string;
  lojaId: string;
}

// Na tabela a NFC-e aparece como "nfe" (a aba de Notas Fiscais é "NFC-e"); na
// Focus NFe, e portanto no porteiro, ela é "nfce".
function tipoNaFocusNfe(tipo: TipoNotaFiscal): "nfce" | "nfse" {
  return tipo === "nfe" ? "nfce" : "nfse";
}

// Depois de uma emissão automática autorizada (via emitirNFCe/emitirNFSe),
// baixa o XML que a Focus NFe hospeda e grava no mesmo bucket/tabela das
// notas enviadas manualmente — origem="automatica" é o que diferencia uma da
// outra na listagem (ver NotasFiscaisPage.tsx).
export async function salvarArquivoEmitido({
  tipo,
  resposta,
  ordemServicoId,
  operadorId,
  lojaId,
}: SalvarArquivoEmitidoParams): Promise<void> {
  if (!resposta.caminho_xml_nota_fiscal || !resposta.ref) {
    throw new Error(
      "A nota foi autorizada, mas a Focus NFe não devolveu o caminho do XML — não deu pra " +
        "guardar o arquivo. Consulte a nota direto no painel do Focus NFe.",
    );
  }

  // Mês de competência, sempre no dia 1º — é o mesmo formato que o upload
  // manual de XML grava, e a coluna é isso que representa. E sempre pelo dia
  // LOCAL, nunca `toISOString()` (que é UTC): uma nota emitida às 22h do dia
  // 31 seria arquivada na competência do mês seguinte. Ver lib/datas.ts.
  const competencia = primeiroDiaDoMesLocal();
  const nomeArquivo = `${tipo}-${resposta.numero ?? resposta.ref ?? "sem-numero"}.xml`;
  const caminho = `${tipo}/${competencia.slice(0, 7)}/${crypto.randomUUID()}-${nomeArquivo}`;

  const xml = await baixarArquivoNota(lojaId, tipoNaFocusNfe(tipo), resposta.ref, "xml");
  const { error: erroUpload } = await supabase.storage
    .from("notas-fiscais")
    .upload(caminho, xml, { contentType: "application/xml" });
  if (erroUpload) throw erroUpload;

  const { error: erroMetadados } = await supabase.from("notas_fiscais_arquivos").insert({
    tipo,
    competencia,
    nome_arquivo: nomeArquivo,
    storage_path: caminho,
    ordem_servico_id: ordemServicoId,
    operador_id: operadorId,
    loja_id: lojaId,
    origem: "automatica",
    numero: resposta.numero ?? null,
    chave_acesso: resposta.chave_nfe ?? null,
    status: resposta.status,
    focus_nfe_ref: resposta.ref ?? null,
  });
  if (erroMetadados) {
    await supabase.storage.from("notas-fiscais").remove([caminho]);
    throw erroMetadados;
  }
}

// Cancela uma nota emitida automaticamente pelo Sakura System (origem =
// "automatica") direto na Focus NFe, e atualiza o status guardado aqui.
// Precisa do `focus_nfe_ref` gravado na emissão (ver salvarArquivoEmitido) —
// notas enviadas manualmente (upload de XML) não têm esse dado e não têm
// como ser canceladas por aqui (cancelar/substituir é feito por fora, com
// quem emitiu a nota de verdade).
export async function cancelarArquivoEmitido(
  arquivo: NotaFiscalArquivo,
  justificativa: string,
): Promise<void> {
  if (arquivo.origem !== "automatica" || !arquivo.focus_nfe_ref) {
    throw new FocusNfeError(
      "Essa nota não foi emitida automaticamente pelo Sakura System — cancele direto onde ela " +
        "foi emitida.",
    );
  }

  const resposta =
    arquivo.tipo === "nfe"
      ? await cancelarNFCe(arquivo.focus_nfe_ref, justificativa, arquivo.loja_id)
      : await cancelarNFSe(arquivo.focus_nfe_ref, justificativa, arquivo.loja_id);

  // A Focus NFe pode responder HTTP 200 com um cancelamento recusado pela
  // SEFAZ/prefeitura (ex: prazo de cancelamento vencido) — mesmo cuidado já
  // tomado na emissão (EmitirNotaFiscalModal.tsx): só considerar sucesso de
  // verdade quando o status vier "cancelado".
  if (resposta.status !== "cancelado") {
    const mensagensErros = (resposta.erros ?? [])
      .map((e) => (e.campo ? `${e.campo}: ${e.mensagem}` : e.mensagem))
      .filter((m): m is string => Boolean(m))
      .join(" | ");
    throw new FocusNfeError(
      resposta.mensagem_sefaz ??
        (mensagensErros || undefined) ??
        resposta.mensagem ??
        `O cancelamento voltou com status "${resposta.status}".`,
    );
  }

  const { error } = await supabase
    .from("notas_fiscais_arquivos")
    .update({ status: resposta.status })
    .eq("id", arquivo.id);
  if (error) throw error;
}

export async function buscarConteudoArquivo(arquivo: NotaFiscalArquivo): Promise<string> {
  const { data, error } = await supabase.storage
    .from("notas-fiscais")
    .download(arquivo.storage_path);
  if (error) throw error;
  return data.text();
}

export async function baixarArquivo(arquivo: NotaFiscalArquivo): Promise<void> {
  const { data, error } = await supabase.storage
    .from("notas-fiscais")
    .download(arquivo.storage_path);
  if (error) throw error;

  salvarComoDownload(data, arquivo.nome_arquivo);
}

// Baixa de uma vez todos os XMLs de um mês, num .zip só — é o formato que a
// contabilidade costuma pedir, e evita clicar "Baixar XML" nota por nota.
export async function baixarZipDoMes(
  arquivos: NotaFiscalArquivo[],
  nomeZip: string,
): Promise<void> {
  if (arquivos.length === 0) return;

  // Em lotes, não todos de uma vez: um mês cheio pode ter dezenas de notas, e
  // disparar todas as requisições juntas costuma acabar em erro de limite.
  const TAMANHO_DO_LOTE = 5;
  const conteudos: ArquivoParaZip[] = [];

  for (let inicio = 0; inicio < arquivos.length; inicio += TAMANHO_DO_LOTE) {
    const lote = arquivos.slice(inicio, inicio + TAMANHO_DO_LOTE);
    const baixados = await Promise.all(
      lote.map(async (arquivo) => {
        const { data, error } = await supabase.storage
          .from("notas-fiscais")
          .download(arquivo.storage_path);
        if (error) throw error;
        return {
          nome: arquivo.nome_arquivo,
          conteudo: new Uint8Array(await data.arrayBuffer()),
        };
      }),
    );
    conteudos.push(...baixados);
  }

  salvarComoDownload(criarZip(conteudos), nomeZip);
}

export async function excluirArquivo(arquivo: NotaFiscalArquivo): Promise<void> {
  const { error: erroStorage } = await supabase.storage
    .from("notas-fiscais")
    .remove([arquivo.storage_path]);
  if (erroStorage) throw erroStorage;

  const { error: erroMetadados } = await supabase
    .from("notas_fiscais_arquivos")
    .delete()
    .eq("id", arquivo.id);
  if (erroMetadados) throw erroMetadados;
}

// Busca de novo o PDF de uma nota já emitida pelo sistema. O PDF não fica
// guardado aqui (o que é salvo é o XML, que é o documento que a lei manda
// guardar por 5 anos) — ele é pedido de volta pra Focus NFe pela
// `focus_nfe_ref` gravada na emissão. É o que permite reimprimir a nota
// quando o cliente volta e pede de novo, sem entrar no painel da Focus NFe.
export async function buscarDanfeEmitida(arquivo: NotaFiscalArquivo): Promise<Blob> {
  const motivo = motivoDanfeIndisponivel(arquivo);
  if (motivo) throw new FocusNfeError(motivo);

  const ref = arquivo.focus_nfe_ref as string;
  const resposta =
    arquivo.tipo === "nfe"
      ? await consultarNFCe(ref, arquivo.loja_id)
      : await consultarNFSe(ref, arquivo.loja_id);

  // NFS-e de algumas prefeituras não tem PDF pra baixar (o documento oficial
  // fica no portal do município) — não é erro, é como aquele município
  // funciona, então a mensagem aponta pro caminho que existe.
  if (!resposta.caminho_danfe) {
    throw new FocusNfeError(
      "A Focus NFe não devolveu um PDF pra essa nota. Isso é comum em NFS-e de prefeitura que " +
        'só mantém o documento no portal dela — nesse caso, use "Versão para o cliente" ou o ' +
        "XML original.",
    );
  }

  return baixarArquivoNota(arquivo.loja_id, tipoNaFocusNfe(arquivo.tipo), ref, "danfe");
}

// O mesmo tamanho de lote do "Baixar XMLs do mês": disparar tudo junto
// costuma acabar em erro de limite (aqui no Storage, e no porteiro da Focus).
const TAMANHO_DO_LOTE_DO_PACOTE = 5;

async function emLotes<T, R>(itens: T[], fazer: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (let inicio = 0; inicio < itens.length; inicio += TAMANHO_DO_LOTE_DO_PACOTE) {
    const lote = itens.slice(inicio, inicio + TAMANHO_DO_LOTE_DO_PACOTE);
    resultados.push(...(await Promise.all(lote.map(fazer))));
  }
  return resultados;
}

// O pacote do mês pro contador (#383): um .zip com as pastas nfce/ e nfse/, o
// XML de cada nota e, quando der, o PDF ao lado, mais um LEIA-ME.txt. Quem
// decide nome, pasta e o texto é `planejarPacoteContabilidade`
// (schemas/pacoteContabilidade.ts); aqui só se busca e se junta.
//
// XML e PDF não pesam igual: o XML é o documento que vale, e sem ele o pacote
// não serve (erro derruba, dizendo qual nota). O PDF é só a versão pra ler, e
// não fica guardado aqui (vem da Focus NFe, pelo porteiro, como no "Ver
// DANFE"): se falhar, a nota vai só com o XML e o motivo entra no LEIA-ME.
export async function gerarPacoteContabilidade({
  notas,
  mes,
  aoProgredir,
}: {
  notas: NotaFiscalArquivo[];
  /** "AAAA-MM" */
  mes: string;
  /** A cada PDF buscado na Focus NFe (pra tela mostrar "Buscando PDF 12 de 40"). */
  aoProgredir?: (feitos: number, total: number) => void;
}): Promise<{ semPdf: number }> {
  const doMes = notasDoMes(notas, mes);
  // Erro em vez de não fazer nada: quem chama (a tela, a Central do dia)
  // mostra a frase, e a pessoa entende por que nenhum arquivo apareceu.
  if (doMes.length === 0) {
    throw new Error(`Não há notas de ${mesPorExtenso(mes)} pra montar o pacote.`);
  }

  const xmls = await emLotes(doMes, async (nota) => {
    try {
      const { data, error } = await supabase.storage
        .from("notas-fiscais")
        .download(nota.storage_path);
      if (error) throw error;
      return new Uint8Array(await data.arrayBuffer());
    } catch (erro) {
      throw new Error(
        `Não deu pra baixar o XML da nota ${nota.nome_arquivo}: ${mensagemDeErro(erro)}`,
      );
    }
  });

  const pdfs = new Map<string, ResultadoPdf>();
  const conteudosPdf = new Map<string, Uint8Array>();
  const paraBuscar: NotaFiscalArquivo[] = [];
  for (const nota of doMes) {
    const motivo = motivoSemPdf(nota);
    if (motivo) pdfs.set(nota.id, { ok: false, motivo });
    else paraBuscar.push(nota);
  }

  let feitos = 0;
  aoProgredir?.(feitos, paraBuscar.length);
  await emLotes(paraBuscar, async (nota) => {
    try {
      const pdf = await buscarDanfeEmitida(nota);
      conteudosPdf.set(nota.id, new Uint8Array(await pdf.arrayBuffer()));
      pdfs.set(nota.id, { ok: true });
    } catch (erro) {
      pdfs.set(nota.id, { ok: false, motivo: mensagemDeErro(erro) });
    }
    feitos += 1;
    aoProgredir?.(feitos, paraBuscar.length);
  });

  const plano = planejarPacoteContabilidade({ mes, notas: doMes, pdfs });
  const xmlDaNota = new Map(doMes.map((nota, indice) => [nota.id, xmls[indice]]));
  const arquivos: ArquivoParaZip[] = plano.entradas.map((entrada) => ({
    nome: entrada.caminho,
    conteudo:
      (entrada.arquivo === "xml"
        ? xmlDaNota.get(entrada.nota.id)
        : conteudosPdf.get(entrada.nota.id)) ?? new Uint8Array(),
  }));
  // Com a marca de UTF-8 no começo, pro Bloco de Notas não estragar os acentos.
  arquivos.push({
    nome: "LEIA-ME.txt",
    conteudo: new TextEncoder().encode(`\uFEFF${plano.leiaMe}`),
  });

  salvarComoDownload(criarZip(arquivos), nomeDoPacote(mes));
  return { semPdf: doMes.length - conteudosPdf.size };
}
