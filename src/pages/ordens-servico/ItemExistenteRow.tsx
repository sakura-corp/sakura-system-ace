import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  itemExistenteFormSchema,
  paraDisplayNumero,
  paraPatchItem,
  paraValoresItemExistente,
  totalItensFormulario,
  type ItemFormValues,
} from "@/schemas/ordemServico";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { ItemOS, PatchItemOS, TipoItemOS } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

interface ItemExistenteRowProps {
  item: ItemOS;
  podeEditar: boolean;
  pecas: Peca[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  onSalvar: (item: ItemOS, patch: PatchItemOS) => Promise<void>;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const inputClasse =
  "rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo text-sakura-purple-dark";

// Uma linha da lista "Já lançados nesta OS". Em repouso é o mesmo texto de
// sempre; clicando em "Editar" ela vira um formulário só dela, salvo na hora
// (não espera o "Salvar alterações" da OS inteira, que só cuida dos campos de
// cima e dos itens novos).
//
// Não pode ser um <form> de verdade: a tela toda já é um <form> e HTML não
// aceita um dentro do outro — por isso o botão é type="button" chamando
// handleSubmit na mão.
export function ItemExistenteRow({
  item,
  podeEditar,
  pecas,
  servicos,
  funcionarios,
  onSalvar,
}: ItemExistenteRowProps) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemExistenteFormSchema),
    defaultValues: paraValoresItemExistente(item),
  });

  const tipo = watch("tipo");
  const pecaId = watch("peca_id");
  const servicoId = watch("servico_id");
  const servicoEhAvulso = tipo === "servico" && !servicoId;
  const valoresAtuais = watch();
  const totalItem = valoresAtuais ? totalItensFormulario([valoresAtuais]) : 0;

  function abrirEdicao() {
    // Recarrega do item atual: depois de salvar uma vez, os valores que o
    // formulário guarda são os antigos até alguém mandar recarregar.
    reset(paraValoresItemExistente(item));
    setErro(null);
    setEditando(true);
  }

  function aoMudarTipo(novoTipo: TipoItemOS) {
    setValue("tipo", novoTipo);
    setValue("peca_id", "");
    setValue("servico_id", "");
    setValue("descricao", "");
    setValue("preco_unitario", "");
  }

  function aoMudarPeca(novaPecaId: string) {
    const peca = pecas.find((p) => p.id === novaPecaId);
    setValue("peca_id", novaPecaId);
    setValue("descricao", peca?.descricao ?? "");
    setValue("preco_unitario", paraDisplayNumero(peca?.preco_venda ?? 0));
  }

  function aoMudarServico(novoServicoId: string) {
    const servico = servicos.find((s) => s.id === novoServicoId);
    setValue("servico_id", novoServicoId);
    setValue("descricao", servico?.descricao ?? "");
    setValue("preco_unitario", paraDisplayNumero(servico?.preco_padrao ?? 0));
  }

  async function aoSubmeter(valores: ItemFormValues) {
    setErro(null);
    try {
      await onSalvar(item, paraPatchItem(valores));
      setEditando(false);
    } catch (err) {
      console.error("Erro ao corrigir item da ordem de serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  if (!editando) {
    return (
      <div className="flex items-center justify-between gap-3 text-corpo text-sakura-purple-dark/80">
        <span>
          {item.tipo === "peca" ? "Peça" : "Serviço"} — {item.descricao} ({item.quantidade}x)
          {item.tecnico?.nome ? ` · técnico: ${item.tecnico.nome}` : ""}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span>{formatarMoeda(item.quantidade * item.preco_unitario - item.desconto)}</span>
          {podeEditar && (
            <button
              type="button"
              onClick={abrirEdicao}
              className="text-rotulo font-medium text-sakura-pink hover:underline"
            >
              Editar
            </button>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-sakura-pink/40 bg-black/20 p-3">
      <div className="flex gap-2">
        <select
          value={tipo}
          onChange={(e) => aoMudarTipo(e.target.value as TipoItemOS)}
          className={`w-28 shrink-0 ${inputClasse}`}
        >
          <option value="peca">Peça</option>
          <option value="servico">Serviço</option>
        </select>

        {tipo === "peca" ? (
          <Combobox
            className="flex-1"
            opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
            valor={pecaId}
            onMudar={aoMudarPeca}
            opcaoVazia="Selecione a peça"
            placeholder="Selecione a peça"
          />
        ) : (
          <Combobox
            className="flex-1"
            opcoes={servicos.map((servico) => ({ valor: servico.id, rotulo: servico.descricao }))}
            valor={servicoId}
            onMudar={aoMudarServico}
            opcaoVazia="Serviço avulso (digitar abaixo)"
            placeholder="Serviço avulso (digitar abaixo)"
          />
        )}
      </div>

      {servicoEhAvulso && (
        <input
          type="text"
          placeholder="Descrição do serviço"
          {...register("descricao")}
          className={`w-full ${inputClasse}`}
        />
      )}

      {/* A mesma grade do ItemOSRow: quatro colunas a partir de 1280 de
          janela, duas abaixo disso (#425). */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Quantidade
          <input type="number" min="0.01" step="0.01" {...register("quantidade")} className={inputClasse} />
        </label>

        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Preço unitário
          <input type="number" min="0" step="0.01" {...register("preco_unitario")} className={inputClasse} />
        </label>

        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Desconto
          <input type="number" min="0" step="0.01" {...register("desconto")} className={inputClasse} />
        </label>

        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Técnico
          <Combobox
            opcoes={funcionarios.map((funcionario) => ({
              valor: funcionario.id,
              rotulo: funcionario.nome,
            }))}
            valor={watch("tecnico_id")}
            onMudar={(v) => setValue("tecnico_id", v)}
            opcaoVazia="Sem técnico definido"
            placeholder="Sem técnico definido"
          />
        </label>
      </div>

      {(errors.descricao || errors.quantidade || errors.desconto) && (
        <p className="text-rotulo text-red-400">
          {errors.descricao?.message ?? errors.quantidade?.message ?? errors.desconto?.message}
        </p>
      )}
      {erro && <p className="text-rotulo text-red-400">{erro}</p>}

      <p className="text-rotulo text-sakura-muted">
        Trocar a peça ou a quantidade ajusta o estoque sozinho — a diferença aparece em Estoque →
        Movimentações.
      </p>

      <div className="flex items-center justify-between gap-3">
        <p className="text-rotulo text-sakura-purple-dark/90">
          Total deste item:{" "}
          <span className="font-semibold text-sakura-purple-dark">{formatarMoeda(totalItem)}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-lg px-3 py-1.5 text-rotulo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit(aoSubmeter)}
            disabled={isSubmitting}
            className="rounded-lg bg-sakura-pink px-3 py-1.5 text-rotulo font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Salvando..." : "Salvar item"}
          </button>
        </div>
      </div>
    </div>
  );
}
