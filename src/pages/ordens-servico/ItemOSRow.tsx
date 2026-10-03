import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { avisoPecaSemCusto, avisoSaldoInsuficiente } from "@/schemas/avisosOrdemServico";
import {
  paraDisplayNumero,
  totalItensFormulario,
  type OrdemServicoFormValues,
} from "@/schemas/ordemServico";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { TipoItemOS } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

interface ItemOSRowProps {
  index: number;
  register: UseFormRegister<OrdemServicoFormValues>;
  watch: UseFormWatch<OrdemServicoFormValues>;
  setValue: UseFormSetValue<OrdemServicoFormValues>;
  pecas: Peca[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  /**
   * Saldo em estoque por peça (id da peça → saldo da loja). Chega vazio
   * enquanto a consulta de movimentações não voltou — nesse meio-tempo os
   * avisos ficam calados, que é melhor que anunciar "estoque zerado" pra
   * tudo enquanto carrega.
   */
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  onRemover: () => void;
}

export function ItemOSRow({
  index,
  register,
  watch,
  setValue,
  pecas,
  servicos,
  funcionarios,
  saldoPorPeca,
  saldoCarregado,
  onRemover,
}: ItemOSRowProps) {
  const tipo = watch(`itens.${index}.tipo`);
  const pecaId = watch(`itens.${index}.peca_id`);
  const servicoId = watch(`itens.${index}.servico_id`);

  function aoMudarTipo(tipo: TipoItemOS) {
    setValue(`itens.${index}.tipo`, tipo);
    setValue(`itens.${index}.peca_id`, "");
    setValue(`itens.${index}.servico_id`, "");
    setValue(`itens.${index}.descricao`, "");
    setValue(`itens.${index}.preco_unitario`, "");
  }

  function aoMudarPeca(pecaId: string) {
    const peca = pecas.find((p) => p.id === pecaId);
    setValue(`itens.${index}.peca_id`, pecaId);
    setValue(`itens.${index}.descricao`, peca?.descricao ?? "");
    setValue(`itens.${index}.preco_unitario`, paraDisplayNumero(peca?.preco_venda ?? 0));
  }

  function aoMudarServico(servicoId: string) {
    const servico = servicos.find((s) => s.id === servicoId);
    setValue(`itens.${index}.servico_id`, servicoId);
    setValue(`itens.${index}.descricao`, servico?.descricao ?? "");
    setValue(`itens.${index}.preco_unitario`, paraDisplayNumero(servico?.preco_padrao ?? 0));
  }

  const servicoEhAvulso = tipo === "servico" && !servicoId;

  // Total da linha (quantidade x preço − desconto) — reaproveita a mesma
  // conta do total geral, com um item só, pra não haver duas fórmulas
  // diferentes convivendo. Ajuda a conferir par de peça (2x pneu, por ex.)
  // sem ter que multiplicar de cabeça.
  const item = watch(`itens.${index}`);
  const totalItem = item ? totalItensFormulario([item]) : 0;

  // Os dois avisos de peça (item TL-08 do guia). Nenhum deles impede de
  // salvar: o balcão não pode parar por causa de cadastro incompleto — a
  // regra é avisar enquanto ainda é barato consertar. As frases em si são
  // funções puras testadas em `schemas/avisosOrdemServico.ts`.
  const pecaEscolhida = tipo === "peca" ? pecas.find((p) => p.id === pecaId) : undefined;
  const saldoDaPeca = pecaEscolhida ? saldoPorPeca.get(pecaEscolhida.id) : undefined;
  const avisoEstoque =
    pecaEscolhida && saldoCarregado
      ? avisoSaldoInsuficiente(watch(`itens.${index}.quantidade`), saldoDaPeca)
      : null;
  const avisoCusto = avisoPecaSemCusto(pecaEscolhida);

  return (
    <div className="space-y-2 rounded-lg border border-sakura-gray/30 p-3">
      <div className="flex gap-2">
        <select
          value={tipo}
          onChange={(e) => aoMudarTipo(e.target.value as TipoItemOS)}
          className="w-28 shrink-0 rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo"
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

        <button
          type="button"
          onClick={onRemover}
          className="shrink-0 text-rotulo font-medium text-red-300 hover:underline"
        >
          Remover
        </button>
      </div>

      {servicoEhAvulso && (
        <input
          type="text"
          placeholder="Descrição do serviço"
          {...register(`itens.${index}.descricao`)}
          className="w-full rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo"
        />
      )}

      {/* Quatro colunas a partir de 1280 de janela; duas abaixo disso
          (#425). Era uma linha flex, e em 1024 o campo Técnico ficava
          espremido ("Ser") e saía pra fora do cartão. O item só aparece no
          formulário de OS, que ocupa a largura toda da tela, então a medida
          pela janela basta. */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Quantidade
          <input
            type="number"
            min="0.01"
            step="0.01"
            {...register(`itens.${index}.quantidade`)}
            className="rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo text-sakura-purple-dark"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Preço unitário
          <input
            type="number"
            min="0"
            step="0.01"
            {...register(`itens.${index}.preco_unitario`)}
            className="rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo text-sakura-purple-dark"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Desconto
          <input
            type="number"
            min="0"
            step="0.01"
            {...register(`itens.${index}.desconto`)}
            className="rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo text-sakura-purple-dark"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-sakura-purple-dark/90">
          Técnico
          <Combobox
            opcoes={funcionarios.map((funcionario) => ({
              valor: funcionario.id,
              rotulo: funcionario.nome,
            }))}
            valor={watch(`itens.${index}.tecnico_id`)}
            onMudar={(v) => setValue(`itens.${index}.tecnico_id`, v)}
            opcaoVazia="Sem técnico definido"
            placeholder="Sem técnico definido"
          />
        </label>
      </div>

      {(avisoEstoque || avisoCusto) && (
        <div className="space-y-1">
          {avisoEstoque && <p className="text-rotulo text-amber-300">{avisoEstoque}</p>}
          {avisoCusto && <p className="text-rotulo text-amber-300">{avisoCusto}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* O saldo só aparece aqui quando NÃO há aviso de estoque: o aviso
            já começa dizendo o saldo, e mostrar os dois seguidos era a mesma
            informação repetida em duas linhas coladas. */}
        <p className="text-rotulo text-sakura-muted">
          {pecaEscolhida && saldoCarregado && !avisoEstoque
            ? `Saldo em estoque: ${(saldoDaPeca ?? 0).toLocaleString("pt-BR")}${
                pecaEscolhida.unidade ? ` ${pecaEscolhida.unidade}` : ""
              }`
            : ""}
        </p>
        <p className="text-rotulo text-sakura-purple-dark/90">
          Total deste item:{" "}
          <span className="font-semibold text-sakura-purple-dark">
            {totalItem.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </p>
      </div>
    </div>
  );
}
