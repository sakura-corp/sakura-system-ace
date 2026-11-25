import { useMemo, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { AvisoDeErro } from "@/components/Aviso";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { useConfirmar } from "@/components/JanelaDeConfirmar";
import type { ItemDoMais } from "@/components/molde/LinhaDeLista";
import { listaDoPerfil, MoldePerfil, type NumeroDoPerfil } from "@/components/molde/MoldePerfil";
import { dataCurta, diaLocal, diasEntre, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { atualizarStatusPeca, excluirPeca } from "@/lib/pecas";
import { margemSobreAVenda } from "@/schemas/peca";
import { formatarQuantidade } from "@/schemas/quantidade";
import type { Categoria } from "@/types/categoria";
import type { Deposito } from "@/types/deposito";
import type { MovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { BarraDoEstoque } from "./BarraDoEstoque";
import { lerBarraDoEstoque } from "./barraDoEstoque";
import { LinhaDoMovimento } from "./MovimentacoesSection";
import { MOTIVO_DO_MOVIMENTO } from "./filtroDeMovimentos";

/**
 * O perfil da peça (#1093, molde de perfil da #1134): o que a pessoa vê ao
 * clicar no nome de uma peça no Estoque.
 *
 *     ← Pneu 175/70 R13 Pirelli  [Inativo]                [Comprar]  [⋯]
 *       Pneus · cód. PN-17570 · Pirelli
 *
 *     ┌ Saldo ────────────────┐ ┌ Preço de venda ┐ ┌ Última saída ┐
 *     │ 7 UN                  │ │ R$ 389,90      │ │ 20/11        │
 *     │ contra o mín. 10  ⚠ falta 3                  há 5 dias     │
 *     └───────────────────────┘ └────────────────┘ └──────────────┘
 *
 *     Movimentações                      Onde foi usada
 *
 * O saldo é o número grande, contra o mínimo; o preço e a última saída são
 * os de apoio. "Onde foi usada" são as saídas por OS e por venda, com a
 * referência que o movimento guarda (o número da OS ou da venda).
 * Nenhuma conta nova aqui: o saldo vem do `calcularSaldoPorPeca` da tela, e
 * a margem é a `margemSobreAVenda` de sempre.
 */
export function PerfilDaPeca({
  peca,
  saldo,
  movimentos,
  depositos,
  categorias,
  onVoltar,
  onEditar,
  onComprar,
  onRecarregar,
}: {
  peca: Peca;
  saldo: number;
  /** Os movimentos DESTA peça, do mais novo pro mais velho. */
  movimentos: MovimentoEstoque[];
  depositos: Deposito[];
  categorias: Categoria[];
  onVoltar: () => void;
  onEditar: () => void;
  /** Leva à Sugestão de compra. Sem ele (sem acesso a Fornecedores), não aparece. */
  onComprar?: () => void;
  onRecarregar: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const { confirmar, janela } = useConfirmar();
  const barra = lerBarraDoEstoque(saldo, peca.estoque_minimo);

  const categoria = categorias.find((c) => c.id === peca.categoria_id)?.nome;
  const detalhe = [
    categoria,
    peca.codigo_interno ? `cód. ${peca.codigo_interno}` : null,
    peca.marca,
    peca.medida && !peca.descricao.includes(peca.medida) ? peca.medida : null,
  ]
    .filter((parte): parte is string => !!parte)
    .join(" · ");

  const usos = useMemo(
    () => movimentos.filter((m) => m.tipo === "saida" && (m.motivo === "uso_em_os" || m.motivo === "venda")),
    [movimentos],
  );
  const ultimaSaida = movimentos.find((m) => m.tipo === "saida");

  async function alternarStatus() {
    setErro(null);
    try {
      await atualizarStatusPeca(peca.id, !peca.ativo);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao atualizar status do produto:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function excluir() {
    const sim = await confirmar({
      acao: "Excluir o produto",
      item: peca.descricao,
      explicacao: "Ele sai do cadastro. Isso não tem volta: se só parou de vender, prefira Inativar.",
      botao: "Excluir produto",
    });
    if (!sim) return;
    setErro(null);
    try {
      await excluirPeca(peca.id);
      onVoltar();
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      setErro(mensagemDeErro(err));
    }
  }

  // O próximo passo: comprar, quando falta; senão, editar.
  const comprarAgora = barra.precisaComprar && peca.ativo && onComprar !== undefined;
  const outrasAcoes: ItemDoMais[] = [
    ...(comprarAgora ? [{ rotulo: "Editar", aoClicar: onEditar }] : []),
    { rotulo: peca.ativo ? "Inativar" : "Reativar", aoClicar: alternarStatus },
    { rotulo: "Excluir produto", perigosa: true, aoClicar: excluir },
  ];

  const margem = margemSobreAVenda(peca.preco_custo?.toString() ?? "", peca.preco_venda?.toString() ?? "");
  const preco: NumeroDoPerfil = {
    rotulo: "Preço de venda",
    valor: peca.preco_venda === null ? "—" : <Valor valor={peca.preco_venda} />,
    detalhe:
      peca.preco_custo === null ? (
        "sem custo cadastrado"
      ) : (
        <>
          custo <Valor valor={peca.preco_custo} classeDeCor="text-texto-2" />
          {margem !== "" && ` · margem ${formatarQuantidade(Number(margem))}%`}
        </>
      ),
  };
  const diasDesdeASaida = ultimaSaida ? diasEntre(diaLocal(ultimaSaida.criado_em), hojeLocal()) : null;
  const saida: NumeroDoPerfil = {
    rotulo: "Última saída",
    valor: ultimaSaida ? dataCurta(ultimaSaida.criado_em) : "nenhuma",
    detalhe:
      diasDesdeASaida === null
        ? "a peça ainda não saiu"
        : diasDesdeASaida === 0
          ? "hoje"
          : `há ${diasDesdeASaida} ${diasDesdeASaida === 1 ? "dia" : "dias"}`,
  };

  const numeroDoSaldo = saldo < 0 ? `−${formatarQuantidade(-saldo)}` : formatarQuantidade(saldo);

  return (
    <div className="space-y-6">
      {janela}
      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
      <MoldePerfil
        nome={peca.descricao}
        detalhe={detalhe || undefined}
        selo={peca.ativo ? undefined : <Selo tipo="neutro" palavra="Inativo" />}
        acimaDoNome={
          <div className="flex items-center gap-2 text-rotulo text-texto-2">
            <BotaoVoltar onClick={onVoltar} />
            Estoque
          </div>
        }
        acaoPrincipal={
          comprarAgora ? { rotulo: "Comprar", aoClicar: onComprar } : { rotulo: "Editar produto", aoClicar: onEditar }
        }
        outrasAcoes={outrasAcoes}
        numeroPrincipal={{
          rotulo: "Saldo",
          valor: (
            <span className={saldo < 0 ? "text-perigo" : undefined}>
              {numeroDoSaldo}
              {peca.unidade && <span className="ml-2 text-corpo font-medium text-texto-2">{peca.unidade}</span>}
            </span>
          ),
          explicacao:
            "O que entrou menos o que saiu, somando os depósitos desta loja. O risquinho na barra é o estoque mínimo.",
          comparacao: <BarraDoEstoque saldo={saldo} estoqueMinimo={peca.estoque_minimo} semNumero className="w-full" />,
        }}
        numerosDeApoio={[preco, saida]}
        listas={[
          listaDoPerfil({
            titulo: "Movimentações",
            lista: {
              estado: "pronto",
              itens: movimentos,
              chave: (m: MovimentoEstoque) => m.id,
              linha: (m: MovimentoEstoque) => (
                <LinhaDoMovimento
                  movimento={m}
                  nome={MOTIVO_DO_MOVIMENTO[m.motivo] ?? m.motivo}
                  depositos={depositos}
                  mostrarMotivoNoDetalhe={false}
                />
              ),
              vazio: { frase: "Esta peça ainda não teve entrada nem saída." },
            },
          }),
          listaDoPerfil({
            titulo: "Onde foi usada",
            lista: {
              estado: "pronto",
              itens: usos,
              chave: (m: MovimentoEstoque) => m.id,
              linha: (m: MovimentoEstoque) => (
                <LinhaDoMovimento
                  movimento={m}
                  nome={m.referencia || MOTIVO_DO_MOVIMENTO[m.motivo]}
                  depositos={depositos}
                  mostrarMotivoNoDetalhe={!!m.referencia}
                  mostrarReferencia={false}
                />
              ),
              vazio: { frase: "Ainda não saiu em nenhuma OS nem venda." },
            },
          }),
        ]}
      />
    </div>
  );
}
