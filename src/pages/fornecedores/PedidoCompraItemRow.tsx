import { useEffect, useState } from "react";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { listarCotacoesPorPeca, melhorCotacaoPorFornecedor } from "@/lib/cotacoesPecas";
import { mensagemDeErro } from "@/lib/errors";
import type { PedidoCompraFormValues } from "@/schemas/pedidoCompra";
import type { CotacaoPeca } from "@/types/cotacaoPeca";
import type { PecaJanela } from "@/types/peca";

interface PedidoCompraItemRowProps {
  index: number;
  register: UseFormRegister<PedidoCompraFormValues>;
  watch: UseFormWatch<PedidoCompraFormValues>;
  setValue: UseFormSetValue<PedidoCompraFormValues>;
  pecas: PecaJanela[];
  podeRemover: boolean;
  onRemover: () => void;
  erroPecaId?: string;
}

const inputClasse =
  "rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function PedidoCompraItemRow({
  index,
  register,
  watch,
  setValue,
  pecas,
  podeRemover,
  onRemover,
  erroPecaId,
}: PedidoCompraItemRowProps) {
  const pecaId = watch(`itens.${index}.peca_id`);
  const [cotacoes, setCotacoes] = useState<CotacaoPeca[]>([]);
  const [erroCotacoes, setErroCotacoes] = useState<string | null>(null);

  useEffect(() => {
    if (!pecaId) {
      setCotacoes([]);
      return;
    }
    let ativo = true;
    listarCotacoesPorPeca(pecaId)
      .then((resultado) => {
        if (ativo) setCotacoes(resultado);
      })
      .catch((err) => {
        console.error("Erro ao carregar cotações da peça:", err);
        if (ativo) setErroCotacoes(mensagemDeErro(err));
      });
    return () => {
      ativo = false;
    };
  }, [pecaId]);

  const melhores = melhorCotacaoPorFornecedor(cotacoes);

  return (
    <div className="space-y-2 rounded-lg border border-sakura-gray/30 p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Combobox
            opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
            valor={pecaId}
            onMudar={(v) => setValue(`itens.${index}.peca_id`, v)}
            placeholder="Selecione a peça"
          />
          {erroPecaId && <span className="text-rotulo text-red-600">{erroPecaId}</span>}
        </div>
        <div className="w-28">
          <input
            type="number"
            step="1"
            min="1"
            placeholder="Qtde."
            {...register(`itens.${index}.quantidade_pedida`)}
            className={`w-full ${inputClasse}`}
          />
        </div>
        <div className="w-32">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Preço unit."
            {...register(`itens.${index}.preco_unitario`)}
            className={`w-full ${inputClasse}`}
          />
        </div>
        {podeRemover && (
          <button
            type="button"
            onClick={onRemover}
            className="shrink-0 text-rotulo font-medium text-red-600 hover:underline"
          >
            Remover
          </button>
        )}
      </div>

      {erroCotacoes && <p className="text-rotulo text-red-600">{erroCotacoes}</p>}

      {melhores.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-rotulo text-sakura-purple-dark/85">
          <span className="text-sakura-muted">Cotações anteriores:</span>
          {melhores.map((cotacao) => (
            <button
              key={cotacao.fornecedor_id}
              type="button"
              title="Usar esse preço"
              onClick={() =>
                setValue(`itens.${index}.preco_unitario`, String(cotacao.preco))
              }
              className="rounded-full bg-sakura-pink-soft px-2.5 py-1 font-medium hover:opacity-80"
            >
              {cotacao.fornecedor?.nome ?? "Fornecedor"}: {formatarMoeda(cotacao.preco)} (
              {formatarDataCurta(cotacao.criado_em)})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
