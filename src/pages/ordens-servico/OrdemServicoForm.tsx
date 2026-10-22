import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { mensagemDeErro } from "@/lib/errors";
import {
  ordemServicoFormSchema,
  paraCamposComuns,
  paraItensValidos,
  problemaDoItem,
  paraValoresFormulario,
  totaisDaOrdem,
  type OrdemServicoFormValues,
} from "@/schemas/ordemServico";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
import type { FuncionarioPublico } from "@/types/funcionario";
import type {
  ItemOS,
  NovaOrdemServico,
  NovoItemOS,
  OrdemServico,
  PatchItemOS,
  PatchOrdemServico,
} from "@/types/os";
import { STATUS_COM_FECHAMENTO, STATUS_LABEL, nomeDocumento } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { NovoClienteRapidoModal, NovoVeiculoRapidoModal } from "./CadastroRapidoModais";
import { DetalhesFields } from "./campos/DetalhesFields";
import { ItensFields } from "./campos/ItensFields";
import { FechamentoTab } from "./FechamentoTab";

interface OrdemServicoFormProps {
  clientes: Cliente[];
  pecas: Peca[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  funcionarioAtualId: string;
  /** OS já existentes da loja — usadas só pra saber o KM da última passagem do carro. */
  ordens: OrdemServico[];
  /** Saldo em estoque por peça, pro aviso de estoque ao lançar um item. */
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  ordemExistente?: OrdemServico;
  /** Se a OS já tem nota fiscal válida (não cancelada) ligada a ela. */
  temNotaEmitida?: boolean;
  abaInicial?: "detalhes" | "fechamento";
  onSalvarNova: (ordem: NovaOrdemServico, itens: NovoItemOS[]) => Promise<void>;
  onSalvarEdicao: (
    id: string,
    patch: PatchOrdemServico,
    novosItens: NovoItemOS[],
  ) => Promise<void>;
  onEditarItem: (item: ItemOS, patch: PatchItemOS) => Promise<void>;
  onEncerrar: (ordem: OrdemServico) => Promise<void>;
  /**
   * Cadastro rápido feito de dentro da OS. As duas devolvem o id do registro
   * criado pra que o formulário já deixe ele escolhido — sair da OS pra
   * cadastrar e voltar do zero é exatamente o que o item TL-08 veio matar.
   */
  onCadastrarCliente: (
    cliente: NovoCliente,
    veiculos: VeiculoFormulario[],
  ) => Promise<{ clienteId: string; veiculoId: string | null }>;
  onCadastrarVeiculo: (clienteId: string, veiculo: VeiculoFormulario) => Promise<string>;
  onCancelar: () => void;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdemServicoForm({
  clientes,
  pecas,
  servicos,
  funcionarios,
  funcionarioAtualId,
  ordens,
  saldoPorPeca,
  saldoCarregado,
  ordemExistente,
  temNotaEmitida = false,
  abaInicial = "detalhes",
  onSalvarNova,
  onSalvarEdicao,
  onEditarItem,
  onEncerrar,
  onCadastrarCliente,
  onCadastrarVeiculo,
  onCancelar,
}: OrdemServicoFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [cadastroRapido, setCadastroRapido] = useState<"cliente" | "veiculo" | null>(null);
  const temFechamento =
    !!ordemExistente && STATUS_COM_FECHAMENTO.includes(ordemExistente.status);
  const [aba, setAba] = useState<"detalhes" | "fechamento">(
    temFechamento ? abaInicial : "detalhes",
  );

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: paraValoresFormulario(ordemExistente, funcionarioAtualId),
  });

  const rascunho = useRascunho(
    `rascunho-os-${ordemExistente?.id ?? "nova"}`,
    watch,
    reset,
  );

  const itensExistentes = ordemExistente?.itens ?? [];

  // Depois de faturada, o pagamento já entrou no Caixa com o total daquele
  // momento — mexer nos itens deixaria os dois discordando (ver
  // PROJETO_STATUS.md, seção 6, item 31). Corrigir um item já lançado tem
  // ainda uma trava a mais: se a nota fiscal já saiu, o que está na nota
  // deixaria de bater com a OS, e isso não se conserta sozinho.
  const ehFaturada = ordemExistente?.status === "faturada";
  const podeAdicionarItem = !ehFaturada;
  const podeEditarItem = !!ordemExistente && !ehFaturada && !temNotaEmitida;
  const avisoItens = ehFaturada
    ? "Esta OS já foi faturada — o pagamento já foi lançado no Caixa com o total de então, " +
      "então não dá pra acrescentar nem corrigir item. Pra qualquer mudança, abra uma OS nova."
    : temNotaEmitida
      ? "Esta OS já tem nota fiscal emitida — corrigir um item aqui deixaria a nota diferente " +
        "da OS. Cancele a nota em Notas Fiscais antes de mexer."
      : null;

  async function aoSubmeter(valores: OrdemServicoFormValues) {
    setErro(null);
    const camposComuns = paraCamposComuns(valores);
    const itensValidos = paraItensValidos(valores.itens);
    // Antes de gravar, e não depois: o banco recusaria o item (travas da
    // migration 0060), mas aí a OS nova já teria sido criada sem ele.
    const itemRuim = itensValidos.find((item) => problemaDoItem(item));
    if (itemRuim) {
      setErro(`Item "${itemRuim.descricao}": ${problemaDoItem(itemRuim)}`);
      return;
    }
    try {
      if (ordemExistente) {
        await onSalvarEdicao(ordemExistente.id, camposComuns, itensValidos);
      } else {
        await onSalvarNova(camposComuns, itensValidos);
      }
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao salvar ordem de serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleEncerrar() {
    if (!ordemExistente) return;
    setErro(null);
    setEncerrando(true);
    try {
      await onEncerrar(ordemExistente);
    } catch (err) {
      console.error("Erro ao encerrar ordem de serviço:", err);
      setErro(mensagemDeErro(err));
      setEncerrando(false);
    }
  }

  // Cadastrar de dentro da OS só vale a pena se o registro novo já entrar
  // escolhido — senão o operador ainda teria que procurá-lo na lista.
  async function cadastrarClienteRapido(
    cliente: NovoCliente,
    veiculos: VeiculoFormulario[],
  ) {
    const { clienteId, veiculoId } = await onCadastrarCliente(cliente, veiculos);
    setValue("cliente_id", clienteId, { shouldValidate: true });
    setValue("veiculo_id", veiculoId ?? "");
    setCadastroRapido(null);
  }

  async function cadastrarVeiculoRapido(veiculo: VeiculoFormulario) {
    const veiculoId = await onCadastrarVeiculo(watch("cliente_id"), veiculo);
    setValue("veiculo_id", veiculoId);
    setCadastroRapido(null);
  }

  const totais = totaisDaOrdem(itensExistentes, watch("itens"));
  const nomeDoClienteEscolhido =
    clientes.find((c) => c.id === watch("cliente_id"))?.nome ?? "este cliente";

  return (
    <>
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6 shadow-sm">
      {ordemExistente ? (
        <div className="flex items-center justify-between border-b border-sakura-gray/20 pb-4">
          <div className="flex items-center gap-3">
            <BotaoVoltar onClick={onCancelar} />
            <div>
              <p className="text-rotulo text-sakura-muted">
                {nomeDocumento(ordemExistente)} · aberta em{" "}
                {formatarData(ordemExistente.data_abertura)} · criado por{" "}
                {ordemExistente.criado_por?.nome ?? "—"}
              </p>
              <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
                {ordemExistente.cliente?.nome ?? "Cliente"}
                {ordemExistente.veiculo?.placa ? ` — ${ordemExistente.veiculo.placa}` : ""}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sakura-pink-soft px-3 py-1 text-rotulo font-medium text-sakura-purple-dark">
              {STATUS_LABEL[ordemExistente.status]}
            </span>
            {ordemExistente.status === "em_andamento" && (
              <button
                type="button"
                onClick={handleEncerrar}
                disabled={encerrando}
                className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {encerrando ? "Encerrando..." : "Encerrar OS"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onCancelar} />
          <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">Nova ordem de serviço</h2>
        </div>
      )}

      {erro && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="desta ordem de serviço"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      {temFechamento && (
        <div className="flex gap-2 border-b border-sakura-gray/20">
          <button
            type="button"
            onClick={() => setAba("detalhes")}
            className={`px-4 py-2 text-corpo font-medium ${
              aba === "detalhes"
                ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
                : "text-sakura-purple-dark/75 hover:text-sakura-purple-dark"
            }`}
          >
            Detalhes
          </button>
          <button
            type="button"
            onClick={() => setAba("fechamento")}
            className={`px-4 py-2 text-corpo font-medium ${
              aba === "fechamento"
                ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
                : "text-sakura-purple-dark/75 hover:text-sakura-purple-dark"
            }`}
          >
            Fechamento
          </button>
        </div>
      )}

      {aba === "fechamento" && ordemExistente && <FechamentoTab ordem={ordemExistente} />}

      {aba === "detalhes" && (
        <div className="space-y-6">
          <DetalhesFields
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            clientes={clientes}
            funcionarios={funcionarios}
            ordens={ordens}
            ordemAtualId={ordemExistente?.id}
            onCadastrarCliente={() => setCadastroRapido("cliente")}
            onCadastrarVeiculo={() => setCadastroRapido("veiculo")}
          />

          <ItensFields
            control={control}
            register={register}
            watch={watch}
            setValue={setValue}
            itensExistentes={itensExistentes}
            podeAdicionarItem={podeAdicionarItem}
            podeEditarItem={podeEditarItem}
            avisoItens={avisoItens}
            onEditarItem={onEditarItem}
            pecas={pecas}
            servicos={servicos}
            funcionarios={funcionarios}
            saldoPorPeca={saldoPorPeca}
            saldoCarregado={saldoCarregado}
          />
        </div>
      )}

      {/* Barra fixa do rodapé: o total ficava no meio da tela, logo abaixo
          da lista de itens — então com a OS cheia de peça ele saía de vista,
          que é justamente quando importa. Grudada aqui embaixo, ele (e o
          botão de salvar) acompanham a rolagem.

          `sticky` e não `fixed` de propósito: elemento `fixed` dentro de um
          `sakura-card` se prende ao card por causa do `backdrop-filter`
          (PROJETO_STATUS.md, seção 6, item 51), e o resultado seria uma
          barra flutuando no lugar errado. O fundo precisa ser opaco porque a
          lista de itens passa POR TRÁS dela ao rolar. */}
      <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sakura-gray/25 bg-[#160f16] px-4 py-3">
        {aba === "detalhes" ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-rotulo text-sakura-muted">
              Peças {formatarMoeda(totais.pecas)}
            </span>
            <span className="text-rotulo text-sakura-muted">
              Serviços {formatarMoeda(totais.servicos)}
            </span>
            <span className="text-corpo font-semibold text-sakura-purple-dark">
              Total {ordemExistente ? "geral" : "previsto"} {formatarMoeda(totais.total)}
            </span>
          </div>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Cancelar
          </button>
          {aba === "detalhes" && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting
                ? "Salvando..."
                : ordemExistente
                  ? "Salvar alterações"
                  : "Abrir ordem de serviço"}
            </button>
          )}
        </div>
      </div>
    </form>

    {/* Os modais ficam FORA do <form> da OS: um <form> dentro de outro é
        HTML inválido, e é isso que deixa cada modal ter o próprio botão de
        enviar — o que faz o Enter avançar de campo aqui dentro igual ao
        resto do app, sem tratamento especial. */}
    {cadastroRapido === "cliente" && (
      <NovoClienteRapidoModal
        onFechar={() => setCadastroRapido(null)}
        onCadastrar={cadastrarClienteRapido}
      />
    )}
    {cadastroRapido === "veiculo" && (
      <NovoVeiculoRapidoModal
        nomeDoCliente={nomeDoClienteEscolhido}
        onFechar={() => setCadastroRapido(null)}
        onCadastrar={cadastrarVeiculoRapido}
      />
    )}
    </>
  );
}
