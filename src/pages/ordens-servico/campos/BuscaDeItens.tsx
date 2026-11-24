import { Search } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from "react";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  buscarNoCatalogo,
  itemDoEnter,
  type ResultadoDaBusca,
} from "@/schemas/buscaDeItens";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

/**
 * A busca única de peça e serviço (#1087): um campo só, sem escolher o tipo
 * antes. Serve a OS, o orçamento e a venda de balcão.
 *
 * - O resultado diz "Peça" ou "Serviço" com a PALAVRA (a cor sozinha não
 *   avisa, regra 4 do visual novo).
 * - Teclado: setas andam pela lista, Enter põe o destacado; sem destaque, o
 *   Enter faz o que o leitor de código de barras precisa (o código exato põe
 *   a peça; um resultado só põe ele; mais de um, nada: nunca chutar).
 * - O Enter PARA de subir (`stopPropagation`): senão o atalho global do app
 *   (Enter pula pro próximo campo, `useEnterParaProximoCampo`) tiraria o foco
 *   da busca a cada peça, e a segunda peça passada no leitor cairia no campo
 *   errado. E não envia o formulário (`preventDefault`).
 * - Sem `servicos` (a venda de balcão só vende peça): só peça, e nada de
 *   "sem cadastro".
 */

export type OpcaoAvulsa = { tipo: "peca" | "servico"; descricao: string };

type Opcao =
  | { origem: "catalogo"; resultado: ResultadoDaBusca }
  | { origem: "avulso"; avulso: OpcaoAvulsa };

interface BuscaDeItensProps {
  pecas: PecaJanela[];
  /** Sem isto a busca é só de peça (venda de balcão). */
  servicos?: Servico[];
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  /** Só o orçamento (#655): peça digitada sem cadastro. */
  permitePecaAvulsa?: boolean;
  desabilitado?: boolean;
  onEscolher: (escolha: ResultadoDaBusca) => void;
  /** Sem isto não há "sem cadastro" (a venda de balcão não tem). */
  onAvulso?: (tipo: "peca" | "servico", descricao: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

export function BuscaDeItens({
  pecas,
  servicos,
  saldoPorPeca,
  saldoCarregado,
  permitePecaAvulsa = false,
  desabilitado,
  onEscolher,
  onAvulso,
  inputRef,
  className = "",
}: BuscaDeItensProps) {
  const [termo, setTermo] = useState("");
  const [destaque, setDestaque] = useState(-1);
  const [aviso, setAviso] = useState<string | null>(null);
  const idDaLista = useId();
  const comServicos = servicos !== undefined;
  const listaDeServicos = useMemo(() => servicos ?? [], [servicos]);
  const termoLimpo = termo.trim();

  const resultados = useMemo(
    () => (termoLimpo === "" ? [] : buscarNoCatalogo(pecas, listaDeServicos, termoLimpo, 8)),
    [pecas, listaDeServicos, termoLimpo],
  );

  const opcoes: Opcao[] = useMemo(() => {
    const lista: Opcao[] = resultados.map((resultado) => ({ origem: "catalogo", resultado }));
    if (termoLimpo !== "" && comServicos) {
      lista.push({ origem: "avulso", avulso: { tipo: "servico", descricao: termoLimpo } });
      if (permitePecaAvulsa) {
        lista.push({ origem: "avulso", avulso: { tipo: "peca", descricao: termoLimpo } });
      }
    }
    return lista;
  }, [resultados, termoLimpo, comServicos, permitePecaAvulsa]);

  const semResultado = termoLimpo !== "" && resultados.length === 0;
  const textoSemResultado = `Nenhuma peça com “${termoLimpo}”. Procurei no nome, código, marca e medida.`;

  function limpar() {
    setTermo("");
    setDestaque(-1);
    setAviso(null);
  }

  function escolher(opcao: Opcao) {
    if (opcao.origem === "catalogo") onEscolher(opcao.resultado);
    else onAvulso?.(opcao.avulso.tipo, opcao.avulso.descricao);
    limpar();
    // O foco volta pra busca: o próximo item (ou a próxima passada do leitor)
    // começa onde terminou o anterior.
    inputRef?.current?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      if (termo !== "") {
        // Esc com texto limpa a busca; o Esc de uma janela por cima não é daqui.
        evento.preventDefault();
        evento.stopPropagation();
      }
      limpar();
      return;
    }
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      if (opcoes.length === 0) return;
      evento.preventDefault();
      setDestaque((atual) =>
        evento.key === "ArrowDown"
          ? Math.min(atual + 1, opcoes.length - 1)
          : Math.max(atual - 1, 0),
      );
      return;
    }
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    evento.stopPropagation();
    if (termoLimpo === "") return;

    if (destaque >= 0 && opcoes[destaque]) {
      escolher(opcoes[destaque]);
      return;
    }
    const direto = itemDoEnter(pecas, listaDeServicos, termoLimpo);
    if (direto) {
      escolher({ origem: "catalogo", resultado: direto });
      return;
    }
    setAviso(
      resultados.length === 0
        ? textoSemResultado
        : comServicos
          ? "Mais de um item parecido: escolha na lista."
          : "Mais de uma peça parecida: escolha na lista.",
    );
  }

  const idDaOpcao = (indice: number) => `${idDaLista}-${indice}`;

  return (
    <div className={`min-w-0 ${className}`}>
      <label className="sakura-rotulo">
        {comServicos ? "Buscar peça ou serviço" : "Buscar peça"}
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-texto-3"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={comServicos ? "Buscar peça ou serviço" : "Buscar peça"}
            aria-expanded={opcoes.length > 0}
            aria-controls={idDaLista}
            aria-autocomplete="list"
            aria-activedescendant={destaque >= 0 ? idDaOpcao(destaque) : undefined}
            value={termo}
            disabled={desabilitado}
            onChange={(e) => {
              setTermo(e.target.value);
              setDestaque(-1);
              setAviso(null);
            }}
            onKeyDown={aoTeclar}
            placeholder="Nome, código, medida ou passe o leitor"
            autoComplete="off"
            className="sakura-campo !h-12 !pl-10"
          />
        </span>
      </label>

      {(aviso || semResultado) && (
        <p role="status" className="mt-2 text-rotulo text-atencao">
          {aviso ?? textoSemResultado}
        </p>
      )}

      {opcoes.length > 0 && (
        <ul
          id={idDaLista}
          role="listbox"
          aria-label="Resultados da busca"
          className="mt-2 divide-y divide-linha overflow-hidden rounded-xl border border-linha bg-janela"
        >
          {opcoes.map((opcao, indice) => (
            <li
              key={
                opcao.origem === "catalogo"
                  ? `${opcao.resultado.tipo}-${opcao.resultado.id}`
                  : `avulso-${opcao.avulso.tipo}`
              }
              id={idDaOpcao(indice)}
              role="option"
              aria-selected={indice === destaque}
              // Escolhe no "apertar" do mouse, como o Combobox: o blur do
              // campo não pode fechar a lista antes do clique chegar.
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(opcao);
              }}
              onMouseEnter={() => setDestaque(indice)}
              className={`flex min-h-10 cursor-pointer items-center gap-3 px-3 py-2 text-corpo ${
                indice === destaque ? "bg-passar" : "hover:bg-passar"
              }`}
            >
              {opcao.origem === "catalogo" ? (
                <LinhaDoResultado
                  resultado={opcao.resultado}
                  saldo={
                    opcao.resultado.tipo === "peca" && saldoCarregado
                      ? (saldoPorPeca.get(opcao.resultado.id) ?? 0)
                      : null
                  }
                />
              ) : (
                <span className="min-w-0 text-texto-2">
                  {opcao.avulso.tipo === "servico" ? "Serviço sem cadastro" : "Peça sem cadastro"}
                  {`: "${opcao.avulso.descricao}"`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinhaDoResultado({
  resultado,
  saldo,
}: {
  resultado: ResultadoDaBusca;
  saldo: number | null;
}) {
  return (
    <>
      <span className="w-14 shrink-0 text-meta font-semibold text-texto-2">
        {resultado.tipo === "peca" ? "Peça" : "Serviço"}
      </span>
      <span className="min-w-0 flex-1 text-texto">
        {resultado.descricao}
        {resultado.codigo && <span className="text-texto-2"> · {resultado.codigo}</span>}
      </span>
      {saldo !== null && (
        <span className="shrink-0 text-rotulo text-texto-2">
          saldo {saldo.toLocaleString("pt-BR")}
        </span>
      )}
      <span className="w-28 shrink-0 text-right tabular-nums text-texto">
        {resultado.preco != null ? formatarMoeda(resultado.preco) : "sem preço"}
      </span>
    </>
  );
}
