import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { AvisoDeErro } from "@/components/Aviso";
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

const inputClasse = "sakura-campo";

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
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">
          {fornecedorExistente ? "Editar fornecedor" : "Novo fornecedor"}
        </h2>
      </div>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <section>
        <h3 className="mb-3 font-titulo text-corpo font-semibold text-texto">Dados do fornecedor</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="sakura-rotulo">
            <span>Nome / Razão social <span className="text-perigo">*</span></span>
            <input
              type="text"
              {...register("nome")}
              aria-invalid={errors.nome ? true : undefined}
              className={inputClasse}
            />
            {errors.nome && <span className="text-rotulo text-perigo">{errors.nome.message}</span>}
          </label>
          <label className="sakura-rotulo">
            CNPJ
            <input type="text" {...register("cnpj")} className={inputClasse} />
          </label>
          <label className="sakura-rotulo">
            Telefone
            <input type="text" {...register("telefone")} className={inputClasse} />
          </label>
          <label className="sakura-rotulo">
            E-mail
            <input type="email" {...register("email")} className={inputClasse} />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-titulo text-corpo font-semibold text-texto">Endereço</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="sakura-rotulo">
            CEP
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
          <label className="sakura-rotulo">
            Rua
            <input type="text" {...register("rua")} className={inputClasse} />
          </label>
          <label className="sakura-rotulo">
            Número
            <input type="text" {...register("numero")} className={inputClasse} />
          </label>
          <label className="sakura-rotulo">
            Bairro
            <input type="text" {...register("bairro")} className={inputClasse} />
          </label>
          <label className="sakura-rotulo">
            Cidade
            <input type="text" {...register("cidade")} className={inputClasse} />
          </label>
          <label className="sakura-rotulo">
            UF
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
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting
            ? "Salvando..."
            : fornecedorExistente
              ? "Salvar alterações"
              : "Salvar fornecedor"}
        </Botao>
      </div>
    </form>
  );
}
