import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { mensagemDeErro } from "@/lib/errors";
import { buscarEnderecoPorCep } from "@/lib/viaCep";
import {
  fornecedorFormSchema,
  paraNovoFornecedor,
  paraValoresFormulario,
  type FornecedorFormValues,
} from "@/schemas/fornecedor";
import type { Fornecedor, NovoFornecedor } from "@/types/fornecedor";

interface FornecedorFormProps {
  fornecedorExistente?: Fornecedor;
  onSalvar: (fornecedor: NovoFornecedor) => Promise<void>;
  onCancelar: () => void;
}

const inputClasse =
  "rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple";

export function FornecedorForm({
  fornecedorExistente,
  onSalvar,
  onCancelar,
}: FornecedorFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorFormSchema),
    defaultValues: paraValoresFormulario(fornecedorExistente),
  });
  const ufField = register("uf");
  const cepField = register("cep");

  async function aoSairDoCep(cep: string) {
    const endereco = await buscarEnderecoPorCep(cep);
    if (!endereco) return;
    setValue("rua", endereco.logradouro);
    setValue("bairro", endereco.bairro);
    setValue("cidade", endereco.localidade);
    setValue("uf", endereco.uf);
  }

  async function aoSubmeter(valores: FornecedorFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoFornecedor(valores));
    } catch (err) {
      console.error("Erro ao salvar fornecedor:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
          {fornecedorExistente ? "Editar fornecedor" : "Novo fornecedor"}
        </h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <section>
        <h3 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Dados do fornecedor</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">
              Nome / Razão social <span className="text-red-500">*</span>
            </span>
            <input type="text" {...register("nome")} className={inputClasse} />
            {errors.nome && <span className="text-rotulo text-red-600">{errors.nome.message}</span>}
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">CNPJ</span>
            <input type="text" {...register("cnpj")} className={inputClasse} />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Telefone</span>
            <input type="text" {...register("telefone")} className={inputClasse} />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">E-mail</span>
            <input type="email" {...register("email")} className={inputClasse} />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Endereço</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">CEP</span>
            <input
              type="text"
              {...cepField}
              onBlur={(e) => {
                cepField.onBlur(e);
                aoSairDoCep(e.target.value);
              }}
              className={inputClasse}
            />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Rua</span>
            <input type="text" {...register("rua")} className={inputClasse} />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Número</span>
            <input type="text" {...register("numero")} className={inputClasse} />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Bairro</span>
            <input type="text" {...register("bairro")} className={inputClasse} />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Cidade</span>
            <input type="text" {...register("cidade")} className={inputClasse} />
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">UF</span>
            <input
              type="text"
              maxLength={2}
              {...ufField}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                ufField.onChange(e);
              }}
              className={inputClasse}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting
            ? "Salvando..."
            : fornecedorExistente
              ? "Salvar alterações"
              : "Salvar fornecedor"}
        </button>
      </div>
    </form>
  );
}
