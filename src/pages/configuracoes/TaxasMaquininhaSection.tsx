import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { salvarTaxasMaquininha } from "@/lib/taxasMaquininha";
import { mensagemDeErro } from "@/lib/errors";
import {
  paraTaxasMaquininha,
  paraValoresFormularioTaxas,
  rotuloLinhaTaxa,
  taxasMaquininhaFormSchema,
  type TaxaMaquininha,
  type TaxasMaquininhaFormValues,
} from "@/schemas/taxaMaquininha";
import { AvisoDeSalvo } from "./pecas";

interface TaxasMaquininhaSectionProps {
  /** A tabela da loja; `null` quando não deu pra ler (banco ainda sem a migration 0088, por exemplo). */
  tabela: TaxaMaquininha[] | null;
  lojaId: string;
  /** Só o admin da loja grava (a RLS também recusa os outros). */
  podeEditar: boolean;
  onSalvo: () => Promise<void>;
}

const CAIXINHA = "size-[18px] shrink-0 rounded accent-acao";

export function TaxasMaquininhaSection({
  tabela,
  lojaId,
  podeEditar,
  onSalvo,
}: TaxasMaquininhaSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaxasMaquininhaFormValues>({
    resolver: zodResolver(taxasMaquininhaFormSchema),
    defaultValues: paraValoresFormularioTaxas(tabela ?? []),
  });
  const { fields } = useFieldArray({ control, name: "linhas" });

  async function aoSalvar(valores: TaxasMaquininhaFormValues) {
    setErro(null);
    setSalvo(false);
    try {
      await salvarTaxasMaquininha(lojaId, paraTaxasMaquininha(valores));
      reset(valores);
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar as taxas da maquininha:", err);
      setErro(mensagemDeErro(err));
    }
  }

  if (tabela === null) {
    return (
      <AvisoDeErro>
        Não foi possível ler as taxas da maquininha agora. Se o banco desta empresa ainda não foi
        atualizado, peça pra quem cuida dele atualizar.
      </AvisoDeErro>
    );
  }

  return (
    <>
      <p className="text-rotulo text-texto-2">
        É o que a maquininha cobra da loja em cada venda no cartão e em quantos dias o dinheiro cai
        na conta. Linha em branco = o programa não calcula. Isto não muda o que o cliente paga nem
        o que o Caixa lança: serve só pra mostrar, em Caixa → Cartão a receber, quanto vai cair e
        quando.
      </p>

      {erro && <AvisoDeErro className="mt-4">{erro}</AvisoDeErro>}
      {!podeEditar && (
        <p className="mt-4 text-rotulo text-texto-2">
          Só quem é administrador da loja pode mudar as taxas da maquininha.
        </p>
      )}

      <form onSubmit={handleSubmit(aoSalvar)} onChange={() => setSalvo(false)} noValidate>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-linha">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Forma</th>
                <th>Taxa (%)</th>
                <th>Cai em (dias)</th>
                <th>Recebo tudo de uma vez</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((campo, i) => {
                const rotulo = rotuloLinhaTaxa(campo.forma, campo.parcelas);
                const erroTaxa = errors.linhas?.[i]?.taxa?.message;
                const erroPrazo = errors.linhas?.[i]?.prazo?.message;
                return (
                  <tr key={campo.id}>
                    <td className="font-medium text-texto">{rotulo}</td>
                    <td className="align-top">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label={`Taxa do ${rotulo}, em porcentagem`}
                        aria-invalid={erroTaxa ? true : undefined}
                        disabled={!podeEditar}
                        placeholder="ex: 3,49"
                        {...register(`linhas.${i}.taxa`)}
                        className="sakura-campo w-28"
                      />
                      {erroTaxa && (
                        <span role="alert" className="mt-1 block max-w-[16rem] text-rotulo text-perigo">
                          {erroTaxa}
                        </span>
                      )}
                    </td>
                    <td className="align-top">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-label={`Prazo do ${rotulo}, em dias`}
                        aria-invalid={erroPrazo ? true : undefined}
                        disabled={!podeEditar}
                        placeholder="ex: 30"
                        {...register(`linhas.${i}.prazo`)}
                        className="sakura-campo w-24"
                      />
                      {erroPrazo && (
                        <span role="alert" className="mt-1 block max-w-[16rem] text-rotulo text-perigo">
                          {erroPrazo}
                        </span>
                      )}
                    </td>
                    <td>
                      {campo.parcelas > 1 ? (
                        <input
                          type="checkbox"
                          aria-label={`${rotulo}: recebo tudo de uma vez`}
                          disabled={!podeEditar}
                          {...register(`linhas.${i}.recebe_tudo_de_uma_vez`)}
                          className={CAIXINHA}
                        />
                      ) : (
                        <span aria-hidden="true" className="text-texto-2">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-rotulo text-texto-2">
          "Recebo tudo de uma vez": no crédito parcelado, a maquininha paga o valor inteiro numa
          data só, e não parcela por parcela. No débito e no crédito à vista não se aplica.
        </p>

        {podeEditar && (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            {salvo && <AvisoDeSalvo>Taxas salvas.</AvisoDeSalvo>}
            <Botao type="submit" variante="principal" ocupado={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar taxas"}
            </Botao>
          </div>
        )}
      </form>
    </>
  );
}
