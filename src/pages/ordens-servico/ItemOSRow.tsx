import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
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
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import {
  AvisoDaLinha,
  BotaoAbrirItem,
  CLASSE_CAMPO_DA_LINHA,
  LinhaDeItem,
} from "./campos/TabelaDeItens";

interface ItemOSRowProps {
  index: number;
  register: UseFormRegister<OrdemServicoFormValues>;
  watch: UseFormWatch<OrdemServicoFormValues>;
  setValue: UseFormSetValue<OrdemServicoFormValues>;
  pecas: PecaJanela[];
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
  /**
   * Só o orçamento (#655): a peça pode ser digitada sem estar no cadastro
   * ("peça avulsa"), com custo opcional. OS comum e balcão continuam só com
   * peça do cadastro.
   */
  permitePecaAvulsa?: boolean;
  onRemover: () => void;
}

/**
 * Uma linha de item NOVO da OS (ainda não gravado), na tabela de itens
 * (#1087). Quantidade, preço, desconto e técnico se editam na linha; o resto
 * (trocar tipo e peça/serviço, descrição, custo, saldo) fica no "Abrir o
 * item". Item sem cadastro já nasce aberto, pra digitar a descrição.
 */
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
  permitePecaAvulsa = false,
  onRemover,
}: ItemOSRowProps) {
  const tipo = watch(`itens.${index}.tipo`);
  const pecaId = watch(`itens.${index}.peca_id`);
  const servicoId = watch(`itens.${index}.servico_id`);
  const descricao = watch(`itens.${index}.descricao`);
  const item = watch(`itens.${index}`);
  const idDoTecnico = useId();

  const servicoEhAvulso = tipo === "servico" && !servicoId;
  const pecaEhAvulsa = permitePecaAvulsa && tipo === "peca" && !pecaId;
  const [aberto, setAberto] = useState(servicoEhAvulso || pecaEhAvulsa);

  function aoMudarTipo(novoTipo: TipoItemOS) {
    setValue(`itens.${index}.tipo`, novoTipo);
    setValue(`itens.${index}.peca_id`, "");
    setValue(`itens.${index}.servico_id`, "");
    setValue(`itens.${index}.descricao`, "");
    setValue(`itens.${index}.preco_unitario`, "");
    setValue(`itens.${index}.custo_unitario`, "");
  }

  function aoMudarPeca(novaPecaId: string) {
    const peca = pecas.find((p) => p.id === novaPecaId);
    setValue(`itens.${index}.peca_id`, novaPecaId);
    setValue(`itens.${index}.custo_unitario`, "");
    setValue(`itens.${index}.descricao`, peca?.descricao ?? "");
    setValue(`itens.${index}.preco_unitario`, paraDisplayNumero(peca?.preco_venda ?? 0));
  }

  function aoMudarServico(novoServicoId: string) {
    const servico = servicos.find((s) => s.id === novoServicoId);
    setValue(`itens.${index}.servico_id`, novoServicoId);
    setValue(`itens.${index}.descricao`, servico?.descricao ?? "");
    setValue(`itens.${index}.preco_unitario`, paraDisplayNumero(servico?.preco_padrao ?? 0));
  }

  const textoPecaVazia = permitePecaAvulsa ? "Peça sem cadastro (digitar abaixo)" : "Selecione a peça";
  const nome = descricao || "item novo";
  const totalItem = item ? totalItensFormulario([item]) : 0;

  // Os dois avisos de peça (item TL-08 do guia). Nenhum deles impede de
  // salvar: o balcão não pode parar por causa de cadastro incompleto — a
  // regra é avisar enquanto ainda é barato consertar. As frases em si são
  // funções puras testadas em `schemas/avisosOrdemServico.ts`.
  const pecaEscolhida = tipo === "peca" ? pecas.find((p) => p.id === pecaId) : undefined;
  const saldoDaPeca = pecaEscolhida ? saldoPorPeca.get(pecaEscolhida.id) : undefined;
  const avisoEstoque =
    pecaEscolhida && saldoCarregado
      ? avisoSaldoInsuficiente(item?.quantidade ?? "", saldoDaPeca)
      : null;
  const avisoCusto = avisoPecaSemCusto(pecaEscolhida);
  const semDescricao = (servicoEhAvulso || pecaEhAvulsa) && descricao.trim() === "";

  const detalhe = aberto && (
    <div className="space-y-3 rounded-xl bg-poco p-3">
      <div className="flex min-w-0 flex-wrap gap-3">
        <label className="sakura-rotulo w-32 shrink-0">
          Tipo
          <select
            value={tipo}
            onChange={(e) => aoMudarTipo(e.target.value as TipoItemOS)}
            className="sakura-campo"
          >
            <option value="peca">Peça</option>
            <option value="servico">Serviço</option>
          </select>
        </label>

        <div className="sakura-rotulo min-w-0 flex-1 basis-64">
          {tipo === "peca" ? "Peça do cadastro" : "Serviço do cadastro"}
          {tipo === "peca" ? (
            <Combobox
              opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
              valor={pecaId}
              onMudar={aoMudarPeca}
              opcaoVazia={textoPecaVazia}
              placeholder={textoPecaVazia}
            />
          ) : (
            <Combobox
              opcoes={servicos.map((servico) => ({ valor: servico.id, rotulo: servico.descricao }))}
              valor={servicoId}
              onMudar={aoMudarServico}
              opcaoVazia="Serviço avulso (digitar abaixo)"
              placeholder="Serviço avulso (digitar abaixo)"
            />
          )}
        </div>
      </div>

      {servicoEhAvulso && (
        <input
          type="text"
          placeholder="Descrição do serviço"
          aria-label="Descrição do serviço"
          {...register(`itens.${index}.descricao`)}
          className="sakura-campo"
        />
      )}

      {pecaEhAvulsa && (
        <div className="flex min-w-0 flex-wrap gap-3">
          <input
            type="text"
            placeholder="Descrição da peça"
            aria-label="Descrição da peça"
            {...register(`itens.${index}.descricao`)}
            className="sakura-campo min-w-0 flex-1 basis-64"
          />
          <label className="sakura-rotulo w-44 shrink-0">
            Custo (opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              {...register(`itens.${index}.custo_unitario`)}
              className="sakura-campo tabular-nums"
            />
          </label>
        </div>
      )}

      {/* O saldo só aparece aqui quando NÃO há aviso de estoque: o aviso já
          começa dizendo o saldo, e mostrar os dois seguidos era a mesma
          informação repetida em duas linhas coladas. */}
      {pecaEscolhida && saldoCarregado && !avisoEstoque && (
        <p className="text-rotulo text-texto-2">
          {`Saldo em estoque: ${(saldoDaPeca ?? 0).toLocaleString("pt-BR")}${
            pecaEscolhida.unidade ? ` ${pecaEscolhida.unidade}` : ""
          }`}
        </p>
      )}
    </div>
  );

  return (
    <LinhaDeItem
      comTecnico
      tipo={tipo}
      descricaoParaLeitor={nome}
      descricao={descricao || <span className="text-texto-2">Sem descrição ainda</span>}
      avisos={
        <>
          {avisoEstoque && <AvisoDaLinha>{avisoEstoque}</AvisoDaLinha>}
          {avisoCusto && <AvisoDaLinha>{avisoCusto}</AvisoDaLinha>}
          {semDescricao && (
            <AvisoDaLinha>Escreva a descrição: item sem descrição não é salvo.</AvisoDaLinha>
          )}
        </>
      }
      quantidade={
        <input
          type="number"
          min="0.01"
          step="0.01"
          aria-label={`Quantidade de ${nome}`}
          {...register(`itens.${index}.quantidade`)}
          className={CLASSE_CAMPO_DA_LINHA}
        />
      }
      preco={
        <input
          type="number"
          min="0"
          step="0.01"
          aria-label={`Preço de ${nome}`}
          {...register(`itens.${index}.preco_unitario`)}
          className={CLASSE_CAMPO_DA_LINHA}
        />
      }
      desconto={
        <input
          type="number"
          min="0"
          step="0.01"
          aria-label={`Desconto de ${nome}`}
          {...register(`itens.${index}.desconto`)}
          className={CLASSE_CAMPO_DA_LINHA}
        />
      }
      tecnico={
        <div className="flex min-w-0 items-center gap-2 xl:block">
          <label htmlFor={idDoTecnico} className="shrink-0 text-meta text-texto-2 xl:sr-only">
            Técnico
          </label>
          <Combobox
            id={idDoTecnico}
            className="min-w-0 flex-1"
            opcoes={funcionarios.map((funcionario) => ({
              valor: funcionario.id,
              rotulo: funcionario.nome,
            }))}
            valor={watch(`itens.${index}.tecnico_id`)}
            onMudar={(v) => setValue(`itens.${index}.tecnico_id`, v)}
            opcaoVazia="Sem técnico definido"
            placeholder="Sem técnico definido"
          />
        </div>
      }
      total={totalItem}
      acao={<BotaoAbrirItem aberto={aberto} nome={nome} aoClicar={() => setAberto((a) => !a)} />}
      noMenu={[
        {
          tipo: "menu",
          rotulo: "Tirar da OS",
          icone: <Trash2 />,
          perigosa: true,
          // Item novo, ainda não salvo: sem janela de confirmação, é desfeito só
          // tirando (e buscando de novo).
          aoClicar: onRemover,
        },
      ]}
      embaixo={detalhe}
    />
  );
}
