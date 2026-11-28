import { zodResolver } from "@hookform/resolvers/zod";
import { Info, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import { Modal } from "@/components/Modal";
import { CampoDoMolde } from "@/components/molde/CampoDoMolde";
import { mensagemDeErro } from "@/lib/errors";
import { FORMAS_DO_LANCAMENTO } from "@/schemas/caixa";
import {
  avisoDoValorDiferente,
  quitarContaSchema,
  quitarContaVazio,
  type QuitarContaValues,
} from "@/schemas/contas";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { ContaPagar } from "@/types/contaPagar";
import { fraseDoVencimento } from "./vencimento";

/**
 * A janela de quitar uma conta, a MESMA pra pagar (Contas a Pagar) e pra
 * receber (Contas a Receber), no visual da leva 8 (#1094):
 *
 * - o valor em campo grande, e logo embaixo dele, em amarelo, o aviso quando
 *   o valor digitado é diferente da conta ("R$ 30,00 a mais que a conta").
 *   É AVISO, nunca tranca: pagar com juros ou receber uma parte se salva
 *   assim mesmo (#1079, item 14);
 * - a forma de pagamento escolhida na lista do Caixa (#1089), em vez de digitada;
 * - os botões no rodapé, o principal por último; clicar 2 vezes não paga 2 vezes;
 * - enquanto grava, a janela não fecha (Esc, ✕, Cancelar): se o banco recusar,
 *   o erro aparece aqui.
 *
 * Quem grava continua sendo a tela (`pagarConta`/`receberConta`), do mesmo
 * jeito de antes: a janela só devolve o valor e a chave da forma.
 */
export function JanelaDeQuitarConta({
  titulo,
  resumo,
  valorDaConta,
  rotuloDoValor,
  frasesDoCaixa,
  rotuloDoBotao,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  /** A linha de cima: o que é a conta e quando vence. */
  resumo: ReactNode;
  valorDaConta: number;
  /** "Valor pago" ou "Valor recebido". */
  rotuloDoValor: string;
  /** "uma Saída" ou "uma Entrada": o que vai pro Caixa. */
  frasesDoCaixa: string;
  /** O verbo do botão: "Confirmar pagamento". */
  rotuloDoBotao: string;
  onConfirmar: (valor: number, formaPagamento: string) => Promise<void>;
  onFechar: () => void;
}) {
  const id = useId();
  const idDoForm = `quitar-${id}`;
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Clicar duas vezes (ou Enter + clique) não grava duas vezes.
  const gravando = useRef(false);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<QuitarContaValues>({
    resolver: zodResolver(quitarContaSchema),
    defaultValues: quitarContaVazio(valorDaConta),
  });

  // O foco vai pro valor: o `Modal` põe no ✕ ao abrir, e este efeito roda
  // depois do dele (o mesmo jeito da janela do lançamento do Caixa).
  // (Pelo `<form>`, e não pelo id: o id do campo é do `CampoDoMolde`, que liga o rótulo a ele.)
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const campo = formRef.current?.querySelector<HTMLInputElement>('input[type="number"]');
    campo?.focus();
    campo?.select();
  }, []);

  async function aoConfirmar(valores: QuitarContaValues) {
    if (gravando.current) return;
    gravando.current = true;
    setOcupado(true);
    setErro(null);
    try {
      await onConfirmar(Number(valores.valor), valores.formaPagamento);
    } catch (err) {
      console.error(`Erro ao ${rotuloDoBotao.toLowerCase()}:`, err);
      setErro(mensagemDeErro(err));
    } finally {
      gravando.current = false;
      setOcupado(false);
    }
  }

  function fecharSeLivre() {
    if (!gravando.current) onFechar();
  }

  const valorDigitado = Number(watch("valor"));
  const valorParaOCaixa = Number.isFinite(valorDigitado) && valorDigitado > 0 ? valorDigitado : 0;
  const aviso = avisoDoValorDiferente(valorDigitado, valorDaConta);
  const forma = watch("formaPagamento");

  return (
    <Modal
      titulo={titulo}
      total={{ rotulo: "Valor da conta", valor: formatarMoeda(valorDaConta) }}
      onFechar={fecharSeLivre}
      notaDoRodape={erro ? <AvisoDeErro className="text-rotulo">{erro}</AvisoDeErro> : undefined}
      rodape={
        <>
          <Botao variante="fantasma" tamanho="grande" onClick={fecharSeLivre} disabled={ocupado}>
            Cancelar
          </Botao>
          {/* `aria-disabled`, e não o `ocupado` (que desliga o botão): o botão
              focado não pode ser desligado, senão o foco cai no começo da tela
              e não volta se o banco recusar (o mesmo jeito do MoldeFormulario).
              Quem segura o segundo envio é o `gravando`. */}
          <Botao
            variante="principal"
            tamanho="grande"
            type="submit"
            form={idDoForm}
            aria-disabled={ocupado || undefined}
          >
            {ocupado ? "Confirmando..." : rotuloDoBotao}
          </Botao>
        </>
      }
    >
      <form ref={formRef} id={idDoForm} noValidate onSubmit={handleSubmit(aoConfirmar)} className="flex flex-col gap-6 text-corpo">
        <p className="text-texto-2">{resumo}</p>

        {/* O aviso do valor, falado na hora pelo leitor de tela (a região
            existe sempre; a que já nasce preenchida não é lida). */}
        <span role="status" className="sr-only">
          {aviso ?? ""}
        </span>

        <CampoDoMolde
          rotulo={rotuloDoValor}
          erro={errors.valor?.message}
          ajuda={
            aviso ? (
              // Amarelo e com o triângulo (nunca só a cor): é atenção, não erro.
              <span data-aviso-do-valor className="flex items-start gap-1.5 font-medium text-atencao">
                <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />
                <span>{aviso}</span>
              </span>
            ) : undefined
          }
        >
          {(campo) => (
            <input
              {...campo}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              {...register("valor")}
              className={`${campo.className} text-right text-destaque tabular-nums`}
            />
          )}
        </CampoDoMolde>

        <div className="flex flex-col gap-2">
          <p className="text-corpo font-medium text-texto">Forma de pagamento</p>
          <Chips
            rotulo="Forma de pagamento"
            opcoes={FORMAS_DO_LANCAMENTO}
            valor={forma}
            aoEscolher={(nova) => setValue("formaPagamento", nova, { shouldValidate: true })}
          />
          {errors.formaPagamento && (
            <span className="text-rotulo text-perigo">{errors.formaPagamento.message}</span>
          )}
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-poco px-4 py-2 text-rotulo text-texto-2">
          <Info aria-hidden="true" className="mt-px size-4 shrink-0 text-info" />
          <span>
            Isso lança {frasesDoCaixa} de{" "}
            <span className="font-semibold text-texto tabular-nums">{formatarMoeda(valorParaOCaixa)}</span> no
            Caixa automaticamente.
          </span>
        </p>
      </form>
    </Modal>
  );
}

interface PagarContaModalProps {
  conta: ContaPagar;
  /** O dia de hoje ("AAAA-MM-DD"), o mesmo que a lista usou pros selos. */
  hoje: string;
  onConfirmar: (valorPago: number, formaPagamento: string) => Promise<void>;
  onFechar: () => void;
}

export function PagarContaModal({ conta, hoje, onConfirmar, onFechar }: PagarContaModalProps) {
  return (
    <JanelaDeQuitarConta
      titulo="Pagar conta"
      resumo={
        <>
          <span className="font-medium text-texto">{conta.descricao}</span> —{" "}
          {fraseDoVencimento(conta.vencimento, hoje)}
          {conta.recorrente ? " · a próxima ocorrência já é criada automaticamente" : ""}
        </>
      }
      valorDaConta={conta.valor}
      rotuloDoValor="Valor pago"
      frasesDoCaixa="uma Saída"
      rotuloDoBotao="Confirmar pagamento"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
    />
  );
}
