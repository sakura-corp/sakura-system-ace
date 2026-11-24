import { useCallback, useEffect, useState } from "react";
import { quandoAvisouCarroPronto } from "@/lib/avisoDaOrdem";
import { listarArquivosDasOrdens } from "@/lib/notasFiscais";
import { passoDaOrdem, type PassoDaOs } from "@/schemas/passoDaOrdem";
import { situacaoFiscalOrdem } from "@/schemas/situacaoFiscal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";

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
  const [notas, setNotas] = useState<NotaFiscalArquivo[]>([]);
  const [avisadoEm, setAvisadoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [concluidoSemAviso, setConcluidoSemAviso] = useState(false);
  const [notaParaEmitir, setNotaParaEmitir] = useState<NotaDaOs | null>(null);

  const id = ordem?.id;
  const status = ordem?.status;
  // Só a OS faturada depende das notas e do aviso pra saber o passo; as outras
  // (em andamento, concluída) não buscam nada no banco.
  const buscar = status === "faturada";

  useEffect(() => {
    if (!id || !buscar) return;
    let ativo = true;
    setCarregando(true);
    // Cada busca falha sozinha: sem as notas, a trilha fica na nota fiscal (o
    // passo mais cedo, que não promete o que não sabe); sem o aviso, fica em
    // "garantia e avisar". Aviso, nunca tranca (licoes.md, item 33).
    Promise.all([
      listarArquivosDasOrdens([id]).catch((err) => {
        console.error("Erro ao carregar as notas fiscais da OS:", err);
        return null;
      }),
      quandoAvisouCarroPronto(id).catch((err) => {
        console.error("Erro ao ver se o cliente já foi avisado:", err);
        return null;
      }),
    ]).then(([lista, avisado]) => {
      if (!ativo) return;
      if (lista) setNotas(lista);
      setAvisadoEm(avisado);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [id, status, buscar]);

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

