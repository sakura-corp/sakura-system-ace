import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import {
  margemAPartirDoPreco,
  precoAbaixoDoCusto,
  precoAPartirDaMargem,
  type PecaFormValues,
} from "@/schemas/peca";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

export function PrecosFields({
  register,
  watch,
  setValue,
  editando = false,
}: {
  register: UseFormRegister<PecaFormValues>;
  watch: UseFormWatch<PecaFormValues>;
  setValue: UseFormSetValue<PecaFormValues>;
  editando?: boolean;
}) {
  const custo = register("preco_custo");
  const margem = register("margem");
  const precoVenda = register("preco_venda");

  // Erro de digitação em preço não dá erro em lugar nenhum: a peça só
  // passa a ser vendida com prejuízo, a cada venda, até alguém reparar no
  // relatório de lucratividade semanas depois. É AVISO, não trava — venda
  // abaixo do custo existe de verdade (queima de estoque parado), e barrar
  // seria decidir pelo dono da loja.
  const abaixoDoCusto = precoAbaixoDoCusto(watch("preco_custo"), watch("preco_venda"));

  return (
    <Secao titulo="Preços">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Aquisição (custo)">
          <input
            type="number"
            step="0.01"
            {...custo}
            onChange={(e) => {
              custo.onChange(e);
              const novoPreco = precoAPartirDaMargem(e.target.value, watch("margem"));
              if (novoPreco !== null) setValue("preco_venda", novoPreco);
            }}
            className={inputClasse}
          />
        </Campo>
        <Campo label="Acréscimo sobre o custo %">
          <input
            type="number"
            step="0.1"
            {...margem}
            onChange={(e) => {
              margem.onChange(e);
              const novoPreco = precoAPartirDaMargem(watch("preco_custo"), e.target.value);
              if (novoPreco !== null) setValue("preco_venda", novoPreco);
            }}
            className={inputClasse}
          />
        </Campo>
        <Campo label="Preço final">
          <input
            type="number"
            step="0.01"
            {...precoVenda}
            onChange={(e) => {
              precoVenda.onChange(e);
              setValue("margem", margemAPartirDoPreco(watch("preco_custo"), e.target.value));
            }}
            className={inputClasse}
          />
        </Campo>
        {!editando && (
          <Campo label="Qtde. estoque inicial">
            <input
              type="number"
              step="0.01"
              {...register("quantidade_inicial")}
              className={inputClasse}
            />
          </Campo>
        )}
      </div>

      {/* O aviso fica FORA do bloco dos campos: faixa de aviso é clara, e
          `globals.css` força letra branca em todo input, então campo dentro
          dela nasce ilegível (PROJETO_STATUS.md, seção 6, item 47). */}
      {abaixoDoCusto && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-corpo text-amber-900">
          Atenção: o preço final está <strong>abaixo do custo</strong> — cada venda desta peça dá
          prejuízo. Dá para salvar assim mesmo, se for de propósito.
        </p>
      )}
    </Secao>
  );
}
