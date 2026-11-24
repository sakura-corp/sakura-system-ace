import { useCallback, useEffect, useState } from "react";
import { quandoAvisouCarroPronto } from "@/lib/avisoDaOrdem";
import { listarArquivosDasOrdens } from "@/lib/notasFiscais";
import { passoDaOrdem, type PassoDaOs } from "@/schemas/passoDaOrdem";
import { situacaoFiscalOrdem } from "@/schemas/situacaoFiscal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { STATUS_COM_FECHAMENTO } from "@/types/os";

/**
 * O fechar a OS passo a passo (#1088): conferir peças e serviços → receber →
 * nota fiscal → garantia e avisar → pronto. Antes eram 3 telas soltas (a
 * janela "Faturar", a "Emitir nota" e a aba "Fechamento", escondida no "Mais
 * ações"); agora a OS mostra a trilha no topo e um botão laranja só, o do
 * próximo passo, embaixo à direita.
 *
 * Este arquivo guarda o que a trilha precisa saber (as notas da OS e se o
 * cliente já foi avisado); quem desenha é o `TrilhaDaOrdem.tsx`. O passo sai de
 * `schemas/passoDaOrdem.ts`, só do que já está gravado: fechar o programa no
 * meio e abrir a OS de novo mostra o passo em que ela parou.
 */

export type NotaDaOs = "NFC-e" | "NFS-e";

export interface FechamentoDaOrdem {
  /** O passo em que a OS está (null: orçamento/recusado, sem trilha). */
  passo: PassoDaOs | null;
  /** Ainda buscando as notas ou o aviso: o passo pode mudar quando chegarem. */
  carregando: boolean;
  notas: NotaFiscalArquivo[];
  recarregarNotas: () => Promise<void>;
  /** Quando o "carro pronto" desta OS foi aberto no WhatsApp (ou null). */
  avisadoEm: string | null;
  /** O aviso acabou de ser aberto aqui: a trilha anda sem esperar o banco. */
  marcarAvisado: () => void;
  /** "Concluir sem avisar" (cliente sem telefone, ou avisado de outro jeito). Vale até fechar a OS. */
  concluidoSemAviso: boolean;
  concluirSemAvisar: () => void;
  /** A nota que vai ser emitida (a janela "Emitir nota" aberta), ou null. */
  notaParaEmitir: NotaDaOs | null;
  setNotaParaEmitir: (nota: NotaDaOs | null) => void;
  /** A primeira nota que ainda falta (a do botão laranja), ou null. */
  proximaNota: NotaDaOs | null;
}

export function useFechamentoDaOrdem(ordem: OrdemServico | undefined): FechamentoDaOrdem {
  const id = ordem?.id;
  const status = ordem?.status;
  // A concluída e a faturada buscam as notas (a concluída pode ter emitido
  // nota antes de receber, como a venda de balcão que ficou sem pagamento); só
  // a faturada busca também o aviso, e só nela o passo depende dos dois.
  const buscar = !!status && STATUS_COM_FECHAMENTO.includes(status);
  const chave = buscar && id ? `${id}:${status}` : null;

  // Tudo que é desta OS zera quando outra OS abre na mesma tela (a busca do
  // Ctrl+K reaproveita o formulário): o "concluído sem avisar" de uma não pode
  // valer pra outra. É o ajuste de estado durante o desenho, do React.
  const [idDoEstado, setIdDoEstado] = useState(id);
  const [notas, setNotas] = useState<NotaFiscalArquivo[]>([]);
  const [avisadoEm, setAvisadoEm] = useState<string | null>(null);
  const [concluidoSemAviso, setConcluidoSemAviso] = useState(false);
  const [notaParaEmitir, setNotaParaEmitir] = useState<NotaDaOs | null>(null);
  // Pra qual OS e status a busca já terminou. Enquanto não bate com o atual,
  // está carregando: já no primeiro desenho, e não só depois que a busca
  // começa (senão a OS faturada aparecia um instante no passo errado).
  const [buscadoPara, setBuscadoPara] = useState<string | null>(null);
  if (id !== idDoEstado) {
    setIdDoEstado(id);
    setNotas([]);
    setAvisadoEm(null);
    setConcluidoSemAviso(false);
    setNotaParaEmitir(null);
  }
  const carregando = status === "faturada" && chave !== null && buscadoPara !== chave;

  useEffect(() => {
    if (!id || !chave) return;
    let ativo = true;
    const comAviso = status === "faturada";
    // Cada busca falha sozinha: sem as notas, a trilha fica na nota fiscal (o
    // passo mais cedo, que não promete o que não sabe); sem o aviso, fica em
    // "garantia e avisar". Aviso, nunca tranca (licoes.md, item 33).
    Promise.all([
      listarArquivosDasOrdens([id]).catch((err) => {
        console.error("Erro ao carregar as notas fiscais da OS:", err);
        return null;
      }),
      comAviso
        ? quandoAvisouCarroPronto(id).catch((err) => {
            console.error("Erro ao ver se o cliente já foi avisado:", err);
            return null;
          })
        : Promise.resolve(null),
    ]).then(([lista, avisado]) => {
      if (!ativo) return;
      if (lista) setNotas(lista);
      setAvisadoEm(avisado);
      setBuscadoPara(chave);
    });
    return () => {
      ativo = false;
    };
  }, [id, status, chave]);

  const recarregarNotas = useCallback(async () => {
    if (!id) return;
    try {
      setNotas(await listarArquivosDasOrdens([id]));
    } catch (err) {
      console.error("Erro ao carregar as notas fiscais da OS:", err);
    }
  }, [id]);

  const marcarAvisado = useCallback(() => setAvisadoEm(new Date().toISOString()), []);
  const concluirSemAvisar = useCallback(() => setConcluidoSemAviso(true), []);

  const situacao = situacaoFiscalOrdem(ordem?.itens ?? [], notas);
  const proximaNota: NotaDaOs | null =
    situacao.precisaNfce && !situacao.temNfce
      ? "NFC-e"
      : situacao.precisaNfse && !situacao.temNfse
        ? "NFS-e"
        : null;

  const passo = ordem
    ? passoDaOrdem(ordem, notas, avisadoEm ?? (concluidoSemAviso ? "agora" : null))
    : null;

  return {
    passo,
    carregando,
    notas,
    recarregarNotas,
    avisadoEm,
    marcarAvisado,
    concluidoSemAviso,
    concluirSemAvisar,
    notaParaEmitir,
    setNotaParaEmitir,
    proximaNota,
  };
}

