import { useEffect, useRef } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import {
  ORIGEM_CLIENTE_LABEL,
  ORIGENS_CLIENTE,
  ROTULO_SEM_ORIGEM,
  TAMANHO_MAXIMO_DETALHE_ORIGEM,
  origemAoTrocarCliente,
} from "@/schemas/origemCliente";

/**
 * O campo "De onde veio" (#1021): a lista fixa e o "qual anúncio ou quem
 * indicou". Um componente só, usado no cadastro de cliente, nos dois
 * cadastros rápidos, na OS/orçamento e na venda de balcão.
 *
 * Sempre opcional: "Não informado" é uma escolha válida e nunca impede salvar.
 * Ocupa a linha inteira de uma grade de 2 colunas (`col-span-2`), com os dois
 * campos lado a lado.
 *
 * Na OS, no orçamento e na venda NOVOS, o campo já vem com a origem do cliente
 * escolhido (`sugestao`, de `origemSugerida`). Ela entra quando o cliente muda
 * — inclusive pelo cadastro rápido, que escolhe o cliente sem passar pela
 * caixinha — e nunca passa por cima do que a pessoa escolheu à mão
 * (`origemAoTrocarCliente`). Na edição de uma OS que já existe, não se passa
 * `sugestao`: a origem é a gravada nela.
 */
export function CampoOrigem({
  registroOrigem,
  registroDetalhe,
  sugestao,
  origemAtual = "",
  onSugerir,
  className,
}: {
  registroOrigem: UseFormRegisterReturn;
  registroDetalhe: UseFormRegisterReturn;
  /** A origem do cliente escolhido ("" = nada a sugerir). Só na OS/venda nova. */
  sugestao?: string;
  /** O que está no campo agora (pra não passar por cima da escolha da pessoa). */
  origemAtual?: string;
  /** Põe a sugestão no campo (o `setValue` do formulário). */
  onSugerir?: (origem: string) => void;
  className?: string;
}) {
  // Começa em "" e não na sugestão de agora: assim a OS que já abre com um
  // cliente escolhido (e o campo vazio) também recebe a origem dele.
  const sugestaoAnterior = useRef("");
  useEffect(() => {
    if (sugestao === undefined || !onSugerir) return;
    const antes = sugestaoAnterior.current;
    sugestaoAnterior.current = sugestao;
    if (antes === sugestao) return;
    const nova = origemAoTrocarCliente(origemAtual, antes, sugestao);
    if (nova !== origemAtual) onSugerir(nova);
    // Só quando a sugestão muda (troca de cliente, ou a lista de clientes
    // chegando): reagir ao que a pessoa digita desfaria a escolha dela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugestao]);

  const veioDoCliente = !!sugestao && origemAtual === sugestao;

  return (
    <div className={`col-span-2 grid grid-cols-2 gap-4 ${className ?? ""}`}>
      <label className="sakura-rotulo">
        <span>De onde veio</span>
        <select {...registroOrigem} className="sakura-campo">
          <option value="">{ROTULO_SEM_ORIGEM}</option>
          {ORIGENS_CLIENTE.map((origem) => (
            <option key={origem} value={origem}>
              {ORIGEM_CLIENTE_LABEL[origem]}
            </option>
          ))}
        </select>
        {veioDoCliente && (
          <span className="text-rotulo text-texto-2">Veio do cadastro do cliente; dá pra trocar.</span>
        )}
      </label>
      <label className="sakura-rotulo">
        <span>Qual anúncio ou quem indicou</span>
        <input
          type="text"
          {...registroDetalhe}
          maxLength={TAMANHO_MAXIMO_DETALHE_ORIGEM}
          placeholder="Opcional. Ex.: IG-pneu-nov, Zé da padaria"
          className="sakura-campo"
        />
      </label>
    </div>
  );
}
