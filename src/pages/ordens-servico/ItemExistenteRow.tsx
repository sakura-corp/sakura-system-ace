import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import { ehPecaAvulsa } from "@/schemas/orcamento";
import { valorLiquidoDoItem } from "@/schemas/valorItem";
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
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { LinhaDeItem } from "./campos/TabelaDeItens";

interface ItemExistenteRowProps {
  item: ItemOS;
  podeEditar: boolean;
  pecas: PecaJanela[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  /**
   * Só o orçamento (#655): a peça pode ser trocada por uma sem cadastro. Um
   * item que JÁ é avulso (OS que nasceu de orçamento com "seguir sem
   * cadastro") continua editável como avulso mesmo fora do orçamento.
   */
  permitePecaAvulsa?: boolean;
  onSalvar: (item: ItemOS, patch: PatchItemOS) => Promise<void>;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numeroPtBr(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

const inputClasse = "sakura-campo";

// Uma linha dos itens já lançados, na mesma tabela dos novos (#1087). Em
// repouso é uma linha de leitura (as mesmas colunas); clicando em "Editar" ela vira um formulário só dela, salvo na hora
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
  permitePecaAvulsa = false,
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
  const avulsaPermitida = permitePecaAvulsa || ehPecaAvulsa(item);
  const pecaEhAvulsa = avulsaPermitida && tipo === "peca" && !pecaId;
  const textoPecaVazia = avulsaPermitida ? "Peça sem cadastro (digitar abaixo)" : "Selecione a peça";
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
    setValue("custo_unitario", "");
  }

  function aoMudarPeca(novaPecaId: string) {
    const peca = pecas.find((p) => p.id === novaPecaId);
    setValue("peca_id", novaPecaId);
    setValue("custo_unitario", "");
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
      <LinhaDeItem
        comTecnico
        tipo={item.tipo}
        descricaoParaLeitor={item.descricao}
        descricao={item.descricao}
        avisos={
          ehPecaAvulsa(item) && item.custo_unitario != null ? (
            <p className="text-rotulo text-texto-2">custo {formatarMoeda(item.custo_unitario)}</p>
          ) : null
        }
        quantidade={<span className="w-full text-right tabular-nums">{numeroPtBr(item.quantidade)}</span>}
        preco={<span className="w-full text-right tabular-nums">{formatarMoeda(item.preco_unitario)}</span>}
        desconto={
          <span className="w-full text-right tabular-nums text-texto-2">
            {item.desconto > 0 ? formatarMoeda(item.desconto) : "—"}
          </span>
        }
        tecnico={
          <p className="min-h-11 py-3 text-corpo text-texto-2 xl:py-3">
            <span className="xl:hidden">Técnico: </span>
            {item.tecnico?.nome ?? "sem técnico"}
          </p>
        }
        total={valorLiquidoDoItem(item)}
        acao={
          podeEditar ? (
            <Botao variante="fantasma" tamanho="pequeno" onClick={abrirEdicao}>
              Editar
            </Botao>
          ) : null
        }
      />
    );
  }

  return (
    <div role="row" className="p-2">
    <div role="cell" className="space-y-2 rounded-xl border border-linha-forte bg-poco p-3">
      <div className="flex gap-2">
        <div className="w-28 shrink-0">
          <select
            value={tipo}
            aria-label="Tipo do item"
            onChange={(e) => aoMudarTipo(e.target.value as TipoItemOS)}
            className={inputClasse}
          >
            <option value="peca">Peça</option>
            <option value="servico">Serviço</option>
          </select>
        </div>

        {tipo === "peca" ? (
          <Combobox
            className="flex-1"
            opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
            valor={pecaId}
            onMudar={aoMudarPeca}
            opcaoVazia={textoPecaVazia}
            placeholder={textoPecaVazia}
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
          className={`${inputClasse}`}
        />
      )}

      {pecaEhAvulsa && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Descrição da peça"
            {...register("descricao")}
            className={`min-w-0 flex-1 ${inputClasse}`}
          />
          <label className="sakura-rotulo w-44 shrink-0">
            Custo (opcional)
            <input type="number" min="0" step="0.01" {...register("custo_unitario")} className={inputClasse} />
          </label>
        </div>
      )}

      {/* A mesma grade do ItemOSRow: quatro colunas a partir de 1280 de
          janela, duas abaixo disso (#425). */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <label className="sakura-rotulo min-w-0">
          Quantidade
          <input type="number" min="0.01" step="0.01" {...register("quantidade")} className={inputClasse} />
        </label>

        <label className="sakura-rotulo min-w-0">
          Preço unitário
          <input type="number" min="0" step="0.01" {...register("preco_unitario")} className={inputClasse} />
        </label>

        <label className="sakura-rotulo min-w-0">
          Desconto
          <input type="number" min="0" step="0.01" {...register("desconto")} className={inputClasse} />
        </label>

        <label className="sakura-rotulo min-w-0">
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

      {(errors.descricao || errors.quantidade || errors.desconto || errors.custo_unitario) && (
        <p className="text-rotulo text-perigo">
          {errors.descricao?.message ??
            errors.quantidade?.message ??
            errors.desconto?.message ??
            errors.custo_unitario?.message}
        </p>
      )}
      {erro && <p className="text-rotulo text-perigo">{erro}</p>}

      <p className="text-rotulo text-texto-2">
        Trocar a peça ou a quantidade ajusta o estoque sozinho — a diferença aparece em Estoque →
        Movimentações.
      </p>

      <div className="flex items-center justify-between gap-3">
        <p className="text-rotulo text-texto/90">
          Total deste item:{" "}
          <span className="font-semibold text-texto">{formatarMoeda(totalItem)}</span>
        </p>
        <div className="flex gap-2">
          <Botao variante="fantasma" onClick={() => setEditando(false)}>
            Cancelar
          </Botao>
          {/* Secundário: o laranja da tela é o "Salvar" da barra de baixo. */}
          <Botao variante="secundario" onClick={handleSubmit(aoSubmeter)} ocupado={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar item"}
          </Botao>
        </div>
      </div>
    </div>
    </div>
  );
}
