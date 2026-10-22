import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { avisoKmMenor, ultimoKmConhecido } from "@/schemas/avisosOrdemServico";
import type { OrdemServicoFormValues } from "@/schemas/ordemServico";
import type { Cliente } from "@/types/cliente";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { OrdemParaKmDoVeiculo } from "@/lib/ordensServico";
import { Campo, inputClasse } from "./FormCompartilhado";

export function DetalhesFields({
  register,
  watch,
  setValue,
  errors,
  clientes,
  funcionarios,
  ordens,
  ordemAtualId,
  onCadastrarCliente,
  onCadastrarVeiculo,
}: {
  register: UseFormRegister<OrdemServicoFormValues>;
  watch: UseFormWatch<OrdemServicoFormValues>;
  setValue: UseFormSetValue<OrdemServicoFormValues>;
  errors: FieldErrors<OrdemServicoFormValues>;
  clientes: Cliente[];
  funcionarios: FuncionarioPublico[];
  /** Ordens já existentes da loja — só pra saber o KM da última passagem. */
  ordens: OrdemParaKmDoVeiculo[];
  /** A OS aberta na tela, quando é edição: não serve de referência pra ela mesma. */
  ordemAtualId?: string;
  onCadastrarCliente: () => void;
  onCadastrarVeiculo: () => void;
}) {
  const clienteId = watch("cliente_id");
  const veiculoId = watch("veiculo_id");
  const kmDigitado = watch("km_entrada");

  const clienteEscolhido = clientes.find((c) => c.id === clienteId);
  const veiculosDoCliente = clienteEscolhido?.veiculos ?? [];

  const ultimoKm = ultimoKmConhecido(veiculoId, veiculosDoCliente, ordens, ordemAtualId);
  const avisoKm = avisoKmMenor(kmDigitado, ultimoKm);

  function escolherCliente(novoClienteId: string) {
    setValue("cliente_id", novoClienteId, { shouldValidate: true });

    // Cliente com um carro só não deveria exigir uma segunda escolha — é o
    // caso da esmagadora maioria, e cada campo a menos no balcão conta
    // (item TR-02.5 do guia: não pedir de novo o que o sistema já sabe).
    // Com dois ou mais, escolher por conta própria seria adivinhação.
    const veiculos = clientes.find((c) => c.id === novoClienteId)?.veiculos ?? [];
    setValue("veiculo_id", veiculos.length === 1 ? veiculos[0].id : "");
  }

  return (
    <section className="grid grid-cols-2 gap-4">
      <Campo label="Cliente" obrigatorio erro={errors.cliente_id?.message}>
        <Combobox
          opcoes={clientes.map((cliente) => ({ valor: cliente.id, rotulo: cliente.nome }))}
          valor={clienteId}
          onMudar={escolherCliente}
          opcaoVazia="Selecione o cliente"
          placeholder="Selecione o cliente"
          acaoExtra={{ rotulo: "+ Cadastrar cliente novo", onAcionar: onCadastrarCliente }}
        />
      </Campo>

      <Campo label="Veículo">
        <Combobox
          opcoes={veiculosDoCliente.map((veiculo) => ({
            valor: veiculo.id,
            rotulo: `${veiculo.placa} — ${veiculo.marca ?? ""} ${veiculo.modelo ?? ""}`,
          }))}
          valor={veiculoId}
          onMudar={(v) => setValue("veiculo_id", v)}
          desabilitado={!clienteId}
          opcaoVazia="Sem veículo vinculado"
          placeholder="Sem veículo vinculado"
          acaoExtra={
            clienteId
              ? { rotulo: "+ Cadastrar veículo novo", onAcionar: onCadastrarVeiculo }
              : undefined
          }
        />
      </Campo>

      {/* A referência de KM e o aviso ficam FORA do <label> do campo: um
          <button> dentro de um <label> é HTML inválido, e o clique nele
          acabaria rebatendo no próprio input. */}
      <div className="flex flex-col gap-1">
        <Campo label="KM de entrada">
          <input type="number" {...register("km_entrada")} className={inputClasse} />
        </Campo>

        {/* O KM anterior aparece como referência, e só entra no campo se
            alguém clicar em "usar" — de propósito. Preencher sozinho
            pareceria um atalho, mas o KM de entrada é o do painel do carro
            HOJE: aceitar o valor antigo no automático estragaria justamente
            o histórico que esse campo existe pra formar. */}
        {ultimoKm != null && (
          <p className="text-rotulo text-sakura-muted">
            Última passagem: {ultimoKm.toLocaleString("pt-BR")} km
            {kmDigitado.trim() === "" && (
              <button
                type="button"
                onClick={() => setValue("km_entrada", String(ultimoKm))}
                className="ml-2 font-medium text-sakura-pink hover:underline"
              >
                usar
              </button>
            )}
          </p>
        )}
        {avisoKm && <p className="text-rotulo text-amber-300">{avisoKm}</p>}
      </div>

      <Campo label="Vendedor / atendente">
        <Combobox
          opcoes={funcionarios.map((funcionario) => ({
            valor: funcionario.id,
            rotulo: funcionario.nome,
          }))}
          valor={watch("vendedor_id")}
          onMudar={(v) => setValue("vendedor_id", v)}
          placeholder="Selecione o vendedor"
        />
      </Campo>

      <Campo label="Observação" className="col-span-2">
        <textarea rows={2} {...register("descricao_problema")} className={inputClasse} />
      </Campo>
    </section>
  );
}
