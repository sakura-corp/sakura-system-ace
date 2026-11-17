import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  movimentoFormSchema,
  movimentoFormVazio,
  paraNovoMovimentoEstoque,
  type MovimentoFormValues,
} from "@/schemas/movimentoEstoque";
import type { Deposito } from "@/types/deposito";
import type { NovoMovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { AvisoDeErro } from "@/components/Aviso";

interface MovimentoFormProps {
  pecas: Peca[];
  depositos: Deposito[];
  onSalvar: (movimento: NovoMovimentoEstoque) => Promise<void>;
  onCancelar: () => void;
}

const motivos = [
  { valor: "compra", rotulo: "Compra (entrada de fornecedor)" },
  { valor: "venda", rotulo: "Venda" },
  { valor: "ajuste", rotulo: "Ajuste manual" },
  { valor: "uso_em_os", rotulo: "Uso em ordem de serviço" },
] as const;

export function MovimentoForm({ pecas, depositos, onSalvar, onCancelar }: MovimentoFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MovimentoFormValues>({
    resolver: zodResolver(movimentoFormSchema),
    defaultValues: movimentoFormVazio(pecas[0]?.id ?? "", depositos[0]?.id ?? ""),
  });

  async function aoSubmeter(valores: MovimentoFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoMovimentoEstoque(valores));
      setValue("quantidade", "");
      setValue("referencia", "");
    } catch (err) {
      console.error("Erro ao registrar movimentação:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">Nova movimentação</h2>
      </div>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo">
          Peça
          <Combobox
            opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
            valor={watch("peca_id")}
            onMudar={(v) => setValue("peca_id", v)}
            placeholder={pecas.length === 0 ? "Nenhuma peça cadastrada" : "Selecione a peça"}
          />
        </label>

        <label className="sakura-rotulo">
          Depósito
          <select
            {...register("deposito_id")}
            className="sakura-campo"
          >
            {depositos.map((deposito) => (
              <option key={deposito.id} value={deposito.id}>
                {deposito.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="sakura-rotulo">
          Tipo
          <select
            {...register("tipo")}
            className="sakura-campo"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <label className="sakura-rotulo">
          Quantidade
          <input
            type="number"
            step="1"
            min="1"
            {...register("quantidade")}
            aria-invalid={errors.quantidade ? true : undefined}
            className="sakura-campo"
          />
          {errors.quantidade && (
            <span className="text-rotulo text-perigo">{errors.quantidade.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          Motivo
          <select
            {...register("motivo")}
            className="sakura-campo"
          >
            {motivos.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="sakura-rotulo col-span-2">
          Referência (opcional — ex: nº da nota, nº da OS)
          <input
            type="text"
            {...register("referencia")}
            className="sakura-campo"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          type="submit"
          variante="principal"
          disabled={pecas.length === 0}
          ocupado={isSubmitting}
        >
          {isSubmitting ? "Salvando..." : "Registrar movimentação"}
        </Botao>
      </div>
    </form>
  );
}
