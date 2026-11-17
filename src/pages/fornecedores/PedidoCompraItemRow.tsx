import { useEffect, useState } from "react";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Dica } from "@/components/Dica";
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

const inputClasse = "sakura-campo";

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
    <div className="space-y-2 rounded-xl border border-linha p-3">
      {/* Cada campo tem o nome escrito em cima: antes só o que aparecia no
          campo vazio ("Qtde.", "Preço unit.") dizia o que era, e sumia ao
          digitar. */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="sakura-rotulo">
            Peça
            <Combobox
              opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
              valor={pecaId}
              onMudar={(v) => setValue(`itens.${index}.peca_id`, v)}
              placeholder="Selecione a peça"
            />
          </label>
          {erroPecaId && <span className="mt-1 block text-rotulo text-perigo">{erroPecaId}</span>}
        </div>
        <label className="sakura-rotulo w-28">
          Quantidade
          <input
            type="number"
            step="1"
            min="1"
            placeholder="Qtde."
            {...register(`itens.${index}.quantidade_pedida`)}
            className={inputClasse}
          />
        </label>
        <label className="sakura-rotulo w-32">
          Preço unitário
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Preço unit."
            {...register(`itens.${index}.preco_unitario`)}
            className={inputClasse}
          />
        </label>
        {podeRemover && (
          <Botao variante="fantasma" className="text-perigo! shrink-0" onClick={onRemover}>
            Remover
          </Botao>
        )}
      </div>

      {erroCotacoes && <p className="text-rotulo text-perigo">{erroCotacoes}</p>}

      {melhores.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-rotulo text-texto-2">
          <span className="text-texto-2">Cotações anteriores:</span>
          {melhores.map((cotacao) => (
            <Dica key={cotacao.fornecedor_id} texto="Usar esse preço">
              <button
                type="button"
                onClick={() =>
                  setValue(`itens.${index}.preco_unitario`, String(cotacao.preco))
                }
                className="rounded-full bg-passar px-2.5 py-1 font-medium text-texto transition-colors hover:bg-texto/15"
              >
                {cotacao.fornecedor?.nome ?? "Fornecedor"}: {formatarMoeda(cotacao.preco)} (
                {formatarDataCurta(cotacao.criado_em)})
              </button>
            </Dica>
          ))}
        </div>
      )}
    </div>
  );
}
