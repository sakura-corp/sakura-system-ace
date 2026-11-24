import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { temAlgumaNotaValida } from "@/schemas/situacaoFiscal";
import { motivoParaNaoTrocar } from "@/schemas/trocaFaturada";
import type { SituacaoDaCorrecao } from "@/lib/ordensServico";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import type { OrdemServico } from "@/types/os";
import { nomeDocumento } from "@/types/os";
import { FechamentoTab } from "./FechamentoTab";
import { SeloDaOrdem } from "./SeloDaOrdem";
import { TrocarItensFaturadaModal, type ConfirmacaoDaCorrecao } from "./TrocarItensFaturadaModal";

/** O que o botão "Corrigir a OS" precisa (#1182). Ausente = sem botão. */
export interface CorrecaoDaVenda {
  gerente: boolean;
  pecas: PecaJanela[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  buscarSituacao: () => Promise<SituacaoDaCorrecao>;
  onConfirmar: (correcao: ConfirmacaoDaCorrecao) => Promise<void>;
}

/**
 * Uma venda de balcão já registrada, aberta pela lista (item FN-09).
 *
 * Não reaproveita o formulário da OS de propósito: lá o que se faz é editar
 * cliente, veículo, KM e itens — e numa venda nada disso muda depois de
 * registrada. O que sobra pra fazer numa venda é o que está no fechamento:
 * emitir (ou reemitir) a NFC-e, ver o DANFE e imprimir a garantia. E, se o
 * pagamento não chegou a entrar, faturar.
 */
export function VendaBalcaoDetalhe({
  ordem,
  notas,
  onFaturar,
  onVoltar,
  pedirAvaliacao,
  correcao,
}: {
  ordem: OrdemServico;
  notas: NotaFiscalArquivo[];
  onFaturar: () => void;
  onVoltar: () => void;
  /**
   * O botão "Avaliação" (#459). Montado pela página só quando a loja tem o
   * link e o operador vê o cadastro; ausente = sem botão.
   */
  pedirAvaliacao?: { telefone: string | null | undefined; texto: string; aoAbrir: () => void };
  /** Corrigir peça, serviço e valor de uma venda já faturada (#1182). */
  correcao?: CorrecaoDaVenda;
}) {
  const [janelaCorrecao, setJanelaCorrecao] = useState(false);
  const temNota = temAlgumaNotaValida(notas);
  const porQueNaoCorrige = correcao
    ? motivoParaNaoTrocar({ faturada: ordem.status === "faturada", gerente: correcao.gerente, temNota })
    : null;
  const notaParaCancelar = notas.find((n) => temAlgumaNotaValida([n]));
  return (
    <div className="space-y-6 sakura-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-4">
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onVoltar} />
          <div>
            <p className="text-rotulo text-texto-2">
              {nomeDocumento(ordem)} · venda de balcão · registrada em{" "}
              {new Date(ordem.data_abertura).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <h2 className="text-subtitulo font-semibold text-texto">
              {ordem.cliente?.nome ?? "Cliente"}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SeloDaOrdem ordem={ordem} notas={notas} />
          {pedirAvaliacao && ordem.status === "faturada" && (
            <BotaoWhatsapp
              telefone={pedirAvaliacao.telefone}
              texto={pedirAvaliacao.texto}
              rotulo="Avaliação"
              titulo="Pedir ao cliente uma avaliação no Google pelo WhatsApp"
              aoAbrir={pedirAvaliacao.aoAbrir}
            />
          )}
          {ordem.status !== "faturada" && (
            <Botao variante="principal" onClick={onFaturar}>
              Faturar
            </Botao>
          )}
        </div>
      </div>

      {ordem.status !== "faturada" && (
        <p className="flex items-start gap-2 rounded-xl bg-atencao/[0.12] px-4 py-3 text-corpo text-atencao">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          O pagamento desta venda não chegou a entrar — as peças já saíram do estoque. Fature
          aqui; não registre a venda de novo.
        </p>
      )}

      {correcao && ordem.status === "faturada" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-linha p-3">
          <p className="text-rotulo text-texto-2">
            {porQueNaoCorrige ?? "Precisa corrigir? Peça, serviço ou valor"}
          </p>
          {porQueNaoCorrige === null && (
            <Botao tamanho="pequeno" onClick={() => setJanelaCorrecao(true)}>
              Corrigir a OS
            </Botao>
          )}
        </div>
      )}

      <FechamentoTab ordem={ordem} />

      {janelaCorrecao && correcao && (
        <TrocarItensFaturadaModal
          ordem={ordem}
          pecas={correcao.pecas}
          servicos={correcao.servicos}
          funcionarios={correcao.funcionarios}
          saldoPorPeca={correcao.saldoPorPeca}
          saldoCarregado={correcao.saldoCarregado}
          buscarSituacao={correcao.buscarSituacao}
          notaParaCancelar={notaParaCancelar}
          onConfirmar={async (c) => {
            await correcao.onConfirmar(c);
            setJanelaCorrecao(false);
          }}
          onFechar={() => setJanelaCorrecao(false)}
        />
      )}
    </div>
  );
}
