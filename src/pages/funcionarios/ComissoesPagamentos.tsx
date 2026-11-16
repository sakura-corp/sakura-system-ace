// As peças da tela de Comissões que tratam de comissão JÁ PAGA (item TL-46.1):
// registrar o pagamento, o recibo pra imprimir e o histórico. As contas
// (retrato, comparação, "já pago em outro período") estão em
// schemas/comissoesPagas.ts — aqui é só tela.
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { diaBrasileiro as dataBr, hojeLocal } from "@/lib/datas";
import { desfazerComissaoPaga, registrarComissaoPaga } from "@/lib/comissoesFechamentos";
import { mensagemDeErro } from "@/lib/errors";
import { montarHtmlReciboComissao } from "@/lib/reciboComissao";
import type { ComissaoFuncionario } from "@/schemas/comissoes";
import { retratoDaLinha, type JaPagoEmOutroPeriodo } from "@/schemas/comissoesPagas";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import { AvisoDaTela } from "./AvisoDaTela";

const campo = "sakura-campo";

const pagamentoSchema = z.object({
  valorPago: z.string().refine((v) => v.trim() !== "" && Number(v) >= 0, "Informe o valor pago (pode ser zero)."),
  dataPagamento: z.string().min(1, "Informe a data do pagamento."),
  observacao: z.string(),
});
type PagamentoValues = z.infer<typeof pagamentoSchema>;

export function RegistrarPagamentoModal({
  lojaId,
  linha,
  de,
  ate,
  jaPago,
  onRegistrado,
  onFechar,
}: {
  lojaId: string;
  linha: ComissaoFuncionario;
  de: string;
  ate: string;
  jaPago: JaPagoEmOutroPeriodo;
  onRegistrado: () => Promise<void>;
  onFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PagamentoValues>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: {
      valorPago: String(Math.max(0, linha.comissaoTotal)),
      dataPagamento: hojeLocal(),
      observacao: "",
    },
  });

  async function aoRegistrar(valores: PagamentoValues) {
    setErro(null);
    try {
      await registrarComissaoPaga({
        loja_id: lojaId,
        funcionario_id: linha.funcionarioId,
        funcionario_nome: linha.nome,
        periodo_inicio: de,
        periodo_fim: ate,
        percentual: linha.percentual,
        valor_calculado: linha.comissaoTotal,
        valor_pago: Number(valores.valorPago),
        data_pagamento: valores.dataPagamento,
        observacao: valores.observacao.trim() || null,
        snapshot: retratoDaLinha(linha),
      });
      await onRegistrado();
    } catch (err) {
      console.error("Erro ao registrar pagamento de comissão:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <Modal
      titulo="Registrar pagamento de comissão"
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-registrar-pagamento" variante="principal" ocupado={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar pagamento"}
          </Botao>
        </>
      }
    >
      <form id="form-registrar-pagamento" onSubmit={handleSubmit(aoRegistrar)} className="space-y-3 text-corpo">
        <p className="text-texto-2">
          <strong className="text-texto">{linha.nome}</strong> — de {dataBr(de)} a {dataBr(ate)}.
          Calculado: <strong className="text-texto">{formatarMoeda(linha.comissaoTotal)}</strong>.
        </p>
        <p className="text-rotulo text-texto-2">
          O sistema guarda um retrato das OS que formaram esse valor. Se alguma delas for editada
          depois, esta tela avisa — o valor pago não muda sozinho.
        </p>

        {jaPago.valor !== 0 && (
          <AvisoDaTela tipo="atencao">
            Cuidado: {formatarMoeda(jaPago.valor)} desse valor vem de OS que já entraram num pagamento
            anterior (OS {jaPago.numeros.join(", ")}). Confira pra não pagar duas vezes.
          </AvisoDaTela>
        )}

        {erro && <AvisoDaTela tipo="perigo">{erro}</AvisoDaTela>}

        <div className="grid grid-cols-2 gap-4">
          <label className="sakura-rotulo">
            Valor pago
            <input
              type="number"
              min="0"
              step="0.01"
              aria-invalid={errors.valorPago ? true : undefined}
              {...register("valorPago")}
              className={campo}
            />
            {errors.valorPago && <MensagemDeErro>{errors.valorPago.message}</MensagemDeErro>}
          </label>
          <label className="sakura-rotulo">
            Data do pagamento
            <input
              type="date"
              aria-invalid={errors.dataPagamento ? true : undefined}
              {...register("dataPagamento")}
              className={campo}
            />
            {errors.dataPagamento && <MensagemDeErro>{errors.dataPagamento.message}</MensagemDeErro>}
          </label>
          <label className="sakura-rotulo col-span-2">
            Observação (opcional — vale, adiantamento…)
            <input type="text" {...register("observacao")} className={campo} />
          </label>
        </div>
      </form>
    </Modal>
  );
}

/** A mensagem de um campo recusado: ícone e palavra junto da cor (regra 4). */
function MensagemDeErro({ children }: { children?: string }) {
  return (
    <span role="alert" className="flex items-center gap-1.5 text-rotulo text-perigo">
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

export function ReciboComissaoModal({
  nomeLoja,
  pagamento,
  onFechar,
}: {
  nomeLoja: string;
  pagamento: ComissaoFechamento;
  onFechar: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = montarHtmlReciboComissao({ nomeLoja, pagamento });
  return (
    <Modal
      titulo={`Recibo de comissão — ${pagamento.funcionario_nome}`}
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Fechar
          </Botao>
          <Botao variante="principal" onClick={() => iframeRef.current?.contentWindow?.print()}>
            Imprimir
          </Botao>
        </>
      }
    >
      {/* O recibo é um papel: fica branco nos dois temas, porque é o que sai na impressora. */}
      <iframe
        ref={iframeRef}
        title="Pré-visualização do recibo de comissão"
        srcDoc={html}
        className="h-96 w-full rounded-xl border border-linha-forte bg-white"
      />
    </Modal>
  );
}

export function HistoricoPagamentos({
  pagamentos,
  podeDesfazer,
  onRecibo,
  onDesfeito,
}: {
  pagamentos: ComissaoFechamento[];
  podeDesfazer: boolean;
  onRecibo: (p: ComissaoFechamento) => void;
  onDesfeito: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  if (pagamentos.length === 0) return null;

  async function desfazer(p: ComissaoFechamento) {
    if (
      !confirm(
        `Desfazer o registro do pagamento de ${p.funcionario_nome} (${dataBr(p.periodo_inicio)} a ${dataBr(p.periodo_fim)}, ${formatarMoeda(p.valor_pago)})?\n\n` +
          "Isso só apaga o REGISTRO — não mexe no dinheiro. Fica gravado na Auditoria quem desfez.",
      )
    ) {
      return;
    }
    setErro(null);
    try {
      await desfazerComissaoPaga(p.id);
      await onDesfeito();
    } catch (err) {
      console.error("Erro ao desfazer pagamento de comissão:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-corpo font-semibold text-texto">Pagamentos já registrados</h2>
      {erro && (
        <AvisoDaTela tipo="perigo" className="mb-3">
          {erro}
        </AvisoDaTela>
      )}
      <div className="sakura-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Período</th>
                <th className="text-right">Pago</th>
                <th>Em</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-texto">{p.funcionario_nome}</td>
                  <td>
                    {dataBr(p.periodo_inicio)} a {dataBr(p.periodo_fim)}
                  </td>
                  <td className="text-right">{formatarMoeda(p.valor_pago)}</td>
                  <td>{dataBr(p.data_pagamento)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Botao variante="secundario" tamanho="pequeno" onClick={() => onRecibo(p)}>
                        Recibo
                      </Botao>
                      {podeDesfazer && (
                        <Botao variante="fantasma" tamanho="pequeno" onClick={() => desfazer(p)}>
                          Desfazer
                        </Botao>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
