import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import { Combobox } from "@/components/Combobox";
import { LinhaDeLista } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";
import { criarMovimento } from "@/lib/estoque";
import { formatarQuantidade } from "@/schemas/quantidade";
import type { Deposito } from "@/types/deposito";
import type { MovimentoEstoque, NovoMovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { MovimentoForm } from "./MovimentoForm";
import { filtrarMovimentos, MOTIVO_DO_MOVIMENTO, type TipoDoFiltro } from "./filtroDeMovimentos";
import { AvisoDeAtencao } from "@/components/Aviso";

interface MovimentacoesSectionProps {
  pecas: Peca[];
  movimentos: MovimentoEstoque[];
  depositos: Deposito[];
  lojaId: string;
  onRecarregar: () => Promise<void>;
  /** Clicar no nome do produto abre o perfil da peça. */
  onAbrirPeca?: (peca: Peca) => void;
}

/**
 * A quantidade do movimento com o sinal e o ícone (#1093): entrada "+3" em
 * verde, saída "−2". **Nunca só a cor**: o sinal, a seta e a palavra (pro
 * leitor de tela) dizem o mesmo. A saída não é vermelha: sair peça é o normal
 * de uma loja, não prejuízo.
 */
export function QuantidadeDoMovimento({ movimento }: { movimento: MovimentoEstoque }) {
  const entrada = movimento.tipo === "entrada";
  const Icone = entrada ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <span
      className={`inline-flex w-20 items-center justify-end gap-1.5 font-semibold tabular-nums ${
        entrada ? "text-ok" : "text-texto"
      }`}
    >
      <Icone aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only">{entrada ? "Entrada de" : "Saída de"} </span>
      {entrada ? "+" : "−"}
      {formatarQuantidade(movimento.quantidade)}
    </span>
  );
}

function dataEHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Uma linha de movimento: o que é (o produto, ou o motivo no perfil) em cima; quando, onde e de onde veio embaixo. */
export function LinhaDoMovimento({
  movimento,
  nome,
  depositos,
  aoAbrir,
  mostrarMotivoNoDetalhe = true,
  mostrarReferencia = true,
}: {
  movimento: MovimentoEstoque;
  nome: string;
  depositos: Deposito[];
  aoAbrir?: () => void;
  mostrarMotivoNoDetalhe?: boolean;
  /** A referência já é o nome da linha ("Onde foi usada"): não repete embaixo. */
  mostrarReferencia?: boolean;
}) {
  const deposito = depositos.find((d) => d.id === movimento.deposito_id)?.nome;
  const partes = [
    dataEHora(movimento.criado_em),
    mostrarMotivoNoDetalhe ? MOTIVO_DO_MOVIMENTO[movimento.motivo] : null,
    deposito,
    mostrarReferencia ? movimento.referencia : null,
  ].filter((parte): parte is string => !!parte);
  return (
    <LinhaDeLista
      nome={nome}
      descricao={`o movimento de ${nome}`}
      detalhe={partes.join(" · ")}
      aoAbrir={aoAbrir}
      lado={<QuantidadeDoMovimento movimento={movimento} />}
    />
  );
}

const OPCOES_DE_TIPO = [
  { valor: "tudo" as const, nome: "Tudo" },
  { valor: "entrada" as const, nome: "Entradas" },
  { valor: "saida" as const, nome: "Saídas" },
];

export function MovimentacoesSection({
  pecas,
  movimentos,
  depositos,
  lojaId,
  onRecarregar,
  onAbrirPeca,
}: MovimentacoesSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroPecaId, setFiltroPecaId] = useState("");
  const [tipo, setTipo] = useState<TipoDoFiltro>("tudo");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  async function handleSalvar(movimento: NovoMovimentoEstoque) {
    await criarMovimento(movimento, lojaId);
    await onRecarregar();
  }

  const pecaPorId = useMemo(() => new Map(pecas.map((p) => [p.id, p])), [pecas]);
  const movimentosFiltrados = useMemo(
    () => filtrarMovimentos(movimentos, { tipo, de, ate, pecaId: filtroPecaId }),
    [movimentos, tipo, de, ate, filtroPecaId],
  );
  const filtroAtivo = tipo !== "tudo" || de !== "" || ate !== "" || filtroPecaId !== "";

  return (
    <div className="space-y-6">
      {pecas.length === 0 ? (
        <AvisoDeAtencao>
          Cadastre ao menos um produto antes de registrar movimentações de estoque.
        </AvisoDeAtencao>
      ) : (
        !mostrarFormulario && (
          <div className="flex justify-end">
            <Botao variante="principal" icone={<Plus />} onClick={() => setMostrarFormulario(true)}>
              Registrar movimentação
            </Botao>
          </div>
        )
      )}

      {mostrarFormulario && (
        <MovimentoForm
          pecas={pecas}
          depositos={depositos}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      <section className="space-y-4">
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">Histórico de movimentações</h2>
        <MoldeLista
          rotulo="Movimentações"
          estado="pronto"
          itens={movimentosFiltrados}
          chave={(m) => m.id}
          limite={50}
          linha={(movimento) => {
            const peca = pecaPorId.get(movimento.peca_id);
            return (
              <LinhaDoMovimento
                movimento={movimento}
                nome={peca?.descricao ?? "Produto apagado"}
                depositos={depositos}
                aoAbrir={peca && onAbrirPeca ? () => onAbrirPeca(peca) : undefined}
              />
            );
          }}
          filtros={
            movimentos.length > 0 && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <Chips rotulo="Tipo de movimento" opcoes={OPCOES_DE_TIPO} valor={tipo} aoEscolher={setTipo} />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    aria-label="De"
                    value={de}
                    onChange={(e) => setDe(e.target.value)}
                    className="sakura-campo sakura-campo-filtro !h-10 !w-44"
                  />
                  <span className="text-rotulo text-texto-2">até</span>
                  <input
                    type="date"
                    aria-label="Até"
                    value={ate}
                    onChange={(e) => setAte(e.target.value)}
                    className="sakura-campo sakura-campo-filtro !h-10 !w-44"
                  />
                </div>
                <label className="flex items-center gap-2 text-rotulo font-medium text-texto-2">
                  Produto
                  <Combobox
                    className="w-56"
                    tamanho="filtro"
                    opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
                    valor={filtroPecaId}
                    onMudar={setFiltroPecaId}
                    opcaoVazia="Todos"
                    placeholder="Todos"
                  />
                </label>
              </div>
            )
          }
          filtroAtivo={filtroAtivo}
          aoLimparFiltros={() => {
            setTipo("tudo");
            setDe("");
            setAte("");
            setFiltroPecaId("");
          }}
          vazio={{ frase: "Nenhuma movimentação registrada ainda." }}
        />
      </section>
    </div>
  );
}
