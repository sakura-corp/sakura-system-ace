import type { ContaReceber } from "@/types/contaReceber";
import { JanelaDeQuitarConta } from "@/pages/contas-pagar/PagarContaModal";
import { fraseDaPrevisao } from "@/pages/contas-pagar/vencimento";

interface ReceberContaModalProps {
  conta: ContaReceber;
  /** O dia de hoje ("AAAA-MM-DD"), o mesmo que a lista usou pros selos. */
  hoje: string;
  onConfirmar: (valorRecebido: number, formaPagamento: string) => Promise<void>;
  onFechar: () => void;
}

/**
 * Receber uma conta: a mesma janela de pagar (`JanelaDeQuitarConta`, #1094),
 * com as palavras de receber. O aviso do valor diferente e a forma de
 * pagamento em lista são os mesmos.
 */
export function ReceberContaModal({ conta, hoje, onConfirmar, onFechar }: ReceberContaModalProps) {
  return (
    <JanelaDeQuitarConta
      titulo="Receber conta"
      resumo={
        <>
          <span className="font-medium text-texto">{conta.descricao}</span> —{" "}
          {conta.cliente?.nome ?? "cliente"} · {fraseDaPrevisao(conta.vencimento, hoje)}
        </>
      }
      valorDaConta={conta.valor}
      rotuloDoValor="Valor recebido"
      frasesDoCaixa="uma Entrada"
      rotuloDoBotao="Confirmar recebimento"
      onConfirmar={onConfirmar}
      onFechar={onFechar}
    />
  );
}
