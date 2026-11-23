import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import {
  clienteFormSchema,
  paraNovoCliente,
  paraValoresFormulario,
  paraVeiculosPreenchidos,
  veiculoFormSchema,
  veiculoFormVazio,
  type ClienteFormValues,
  type VeiculoFormValues,
} from "@/schemas/cliente";
import type { NovoCliente, VeiculoFormulario } from "@/types/cliente";
import { CamposVeiculoRapido } from "./CamposVeiculoRapido";
import { Campo, inputClasse } from "./campos/FormCompartilhado";
import { AvisoDeErro } from "@/components/Aviso";
import { CampoOrigem } from "@/components/CampoOrigem";

/**
 * Cadastro rápido de cliente e de veículo, sem sair da ordem de serviço
 * (item TL-08 do guia de melhorias).
 *
 * O gesto que isso resolve é o mais comum do balcão: chega um carro de
 * cliente novo. Antes era preciso abandonar a OS pela metade, ir em Clientes,
 * cadastrar, voltar e recomeçar do zero — perdendo tudo o que já tinha sido
 * digitado.
 *
 * **Não duplicam schema nenhum**: os dois usam os mesmos `clienteFormSchema`/
 * `veiculoFormSchema` e as mesmas funções de conversão do cadastro completo
 * (`src/schemas/cliente.ts`). A diferença é só quantos campos aparecem na
 * tela — os que ficam de fora entram como o formulário completo já os
 * deixaria (string vazia → `null`). O resto do cadastro (CPF, endereço,
 * aniversário) segue sendo preenchido em Clientes, quando der tempo.
 *
 * Os dois são renderizados FORA do `<form>` da OS, de propósito: um `<form>`
 * dentro de outro é HTML inválido, e é o que permite cada modal ter o
 * próprio botão de enviar — o que por sua vez faz o Enter avançar de campo
 * aqui dentro igual ao resto do app (`useEnterParaProximoCampo`), sem
 * nenhum tratamento especial.
 */

function BotoesDoModal({
  salvando,
  rotulo,
  onFechar,
}: {
  salvando: boolean;
  rotulo: string;
  onFechar: () => void;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-linha pt-4">
      <button
        type="button"
        onClick={onFechar}
        className="rounded-xl px-4 py-2 text-corpo font-medium text-texto/90 hover:bg-passar"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={salvando}
        className="rounded-xl bg-acao px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
      >
        {salvando ? "Salvando..." : rotulo}
      </button>
    </div>
  );
}

export function NovoClienteRapidoModal({
  onFechar,
  onCadastrar,
}: {
  onFechar: () => void;
  onCadastrar: (cliente: NovoCliente, veiculos: VeiculoFormulario[]) => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: paraValoresFormulario(),
  });

  async function aoSubmeter(valores: ClienteFormValues) {
    setErro(null);
    try {
      await onCadastrar(paraNovoCliente(valores), paraVeiculosPreenchidos(valores.veiculos));
    } catch (err) {
      // Sem isto, um cliente que o banco recusa (rede caída, RLS) pareceria
      // simplesmente "não fazer nada" — o erro sumiria sem aparecer em lugar
      // nenhum (PROJETO_STATUS.md, seção 6, item 11).
      console.error("Erro ao cadastrar cliente pela ordem de serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <Modal titulo="Cadastrar cliente" onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
        {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}

        <Campo label="Nome" obrigatorio erro={errors.nome?.message}>
          <input type="text" {...register("nome")} className={inputClasse} />
        </Campo>

        <Campo label="Telefone">
          <input type="text" {...register("telefone")} className={inputClasse} />
        </Campo>

        <CampoOrigem
          registroOrigem={register("origem")}
          registroDetalhe={register("origem_detalhe")}
        />

        <div className="space-y-3 rounded-xl border border-linha p-3">
          <p className="text-rotulo font-medium text-texto-2">
            Veículo — dá pra deixar em branco e cadastrar depois
          </p>
          <CamposVeiculoRapido
            register={register}
            watch={watch}
            setValue={setValue}
            prefixo="veiculos.0"
          />
        </div>

        <p className="text-rotulo text-texto-2">
          O resto do cadastro (CPF/CNPJ, endereço, aniversário) fica pra quando der tempo, na
          tela de Clientes.
        </p>

        <BotoesDoModal
          salvando={isSubmitting}
          rotulo="Cadastrar e usar nesta OS"
          onFechar={onFechar}
        />
      </form>
    </Modal>
  );
}

export function NovoVeiculoRapidoModal({
  nomeDoCliente,
  onFechar,
  onCadastrar,
}: {
  nomeDoCliente: string;
  onFechar: () => void;
  onCadastrar: (veiculo: VeiculoFormulario) => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoFormSchema),
    defaultValues: veiculoFormVazio,
  });

  async function aoSubmeter(valores: VeiculoFormValues) {
    setErro(null);
    // Reaproveita a mesma regra do cadastro completo pra decidir se a linha
    // tem conteúdo de verdade (`veiculoTemAlgumDadoPreenchido`, por trás de
    // paraVeiculosPreenchidos) — assim "veículo em branco" significa a mesma
    // coisa nas duas telas.
    const [veiculo] = paraVeiculosPreenchidos([valores]);
    if (!veiculo) {
      setErro("Preencha pelo menos a placa do veículo.");
      return;
    }
    try {
      await onCadastrar(veiculo);
    } catch (err) {
      console.error("Erro ao cadastrar veículo pela ordem de serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <Modal titulo="Cadastrar veículo" onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
        {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}

        <p className="text-corpo text-texto-2">
          Vai ficar no cadastro de <span className="font-medium">{nomeDoCliente}</span>.
        </p>

        <CamposVeiculoRapido
          register={register}
          watch={watch}
          setValue={setValue}
          prefixo=""
        />

        <BotoesDoModal
          salvando={isSubmitting}
          rotulo="Cadastrar e usar nesta OS"
          onFechar={onFechar}
        />
      </form>
    </Modal>
  );
}

/**
 * Cadastro rápido de cliente de dentro da VENDA DE BALCÃO (item FN-09).
 *
 * Irmão do `NovoClienteRapidoModal`, com a diferença que importa no balcão:
 * aqui o motivo de identificar o cliente é quase sempre "CPF na nota", então
 * o CPF/CNPJ aparece — e o veículo não, porque quem compra no balcão não
 * deixou carro nenhum. Mesmo schema e mesma conversão do cadastro completo.
 */
export function NovoClienteVendaModal({
  onFechar,
  onCadastrar,
}: {
  onFechar: () => void;
  onCadastrar: (cliente: NovoCliente) => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: paraValoresFormulario(),
  });
  const juridica = watch("tipo_pessoa") === "juridica";

  async function aoSubmeter(valores: ClienteFormValues) {
    setErro(null);
    try {
      await onCadastrar(paraNovoCliente(valores));
    } catch (err) {
      console.error("Erro ao cadastrar cliente pela venda de balcão:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <Modal titulo="Cliente da venda" onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
        {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}

        <Campo label={juridica ? "Razão social" : "Nome"} obrigatorio erro={errors.nome?.message}>
          <input type="text" {...register("nome")} className={inputClasse} />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Tipo">
            <select {...register("tipo_pessoa")} className={inputClasse}>
              <option value="fisica">Pessoa física</option>
              <option value="juridica">Empresa</option>
            </select>
          </Campo>
          <Campo label={juridica ? "CNPJ" : "CPF"}>
            <input type="text" {...register("cpf_cnpj")} className={inputClasse} />
          </Campo>
        </div>

        <Campo label="Telefone">
          <input type="text" {...register("telefone")} className={inputClasse} />
        </Campo>

        <CampoOrigem
          registroOrigem={register("origem")}
          registroDetalhe={register("origem_detalhe")}
        />

        <p className="text-rotulo text-texto-2">
          O {juridica ? "CNPJ" : "CPF"} é o que vai na nota. O resto do cadastro (endereço,
          aniversário) fica pra quando der tempo, na tela de Clientes.
        </p>

        <BotoesDoModal
          salvando={isSubmitting}
          rotulo="Cadastrar e usar nesta venda"
          onFechar={onFechar}
        />
      </form>
    </Modal>
  );
}
