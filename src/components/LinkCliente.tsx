import { useNavigate } from "react-router-dom";
import { ehConsumidor } from "@/types/cliente";

/**
 * O nome do cliente como atalho pra ficha dele (#393), no mesmo jeito do
 * `LinkPlaca`: um botão (alvo de clique de 32px, funciona de teclado), com
 * `stopPropagation` porque mora dentro de linhas que já têm clique próprio
 * (em Contas a Receber, clicar na linha abre a OS).
 *
 * Vira texto comum, sem atalho, quando:
 *   - `podeAbrir` é falso: quem está na tela não tem Clientes nem Ordens de
 *     Serviço, e a ficha pede um dos dois (decidido pela Sofia em 10/11/2026,
 *     item 2 da #393) — um botão que leva a "sem acesso" só confunde. Quem
 *     calcula é a tela, que já sabe quem está nela (o formulário de OS nem lê
 *     o login: quem o vê já tem Ordens de Serviço);
 *   - é o "Consumidor" (migration 0064): ele não é uma pessoa, é "ninguém em
 *     particular", e a ficha dele juntaria toda venda anônima da loja;
 *   - `desligado` (a OS com alteração ainda não salva: sair da tela agora
 *     perderia o que foi digitado).
 */
export function LinkCliente({
  clienteId,
  nome,
  podeAbrir,
  desligado = false,
  motivoDesligado,
}: {
  clienteId: string | null | undefined;
  nome: string;
  /** Quem está na tela tem Clientes ou Ordens de Serviço. */
  podeAbrir: boolean;
  desligado?: boolean;
  motivoDesligado?: string;
}) {
  const navigate = useNavigate();

  if (!clienteId || !podeAbrir || ehConsumidor(clienteId)) return <>{nome}</>;
  if (desligado) {
    return <span title={motivoDesligado}>{nome}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/clientes/${clienteId}`);
      }}
      title={`Ver a ficha de ${nome}`}
      // Cara de link (sublinhado), e não de botão com caixa: no meio de uma
      // tabela, a caixa competia com os botões de verdade da linha. O alvo
      // de clique continua com 32 px de altura.
      className="inline-flex min-h-8 min-w-0 max-w-full items-center rounded-md text-left font-medium text-texto underline decoration-texto-3 decoration-1 underline-offset-4 transition-colors hover:text-acao hover:decoration-acao"
    >
      <span className="min-w-0 truncate">{nome}</span>
    </button>
  );
}
