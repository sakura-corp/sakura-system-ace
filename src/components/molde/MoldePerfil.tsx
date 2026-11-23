import { useId, type ReactNode } from "react";
import { AcoesDaLinha } from "../AcoesDaLinha";
import { Botao } from "../Botao";
import { Explicacao } from "../Explicacao";
import type { ItemDoMais } from "./LinhaDeLista";
import { MoldeLista, type PropsDoMoldeLista } from "./MoldeLista";

/**
 * O molde de perfil do visual da leva 8 (#1085, parte 3/5 #1134): a ficha de
 * uma pessoa ou peça (cliente, veículo, funcionário, produto). Cada tela troca
 * pro molde na sua tarefa.
 *
 *     Maria Souza  [Selo]                           [Nova OS]  [⋯]
 *     (16) 99999-0000 · cliente desde 2021
 *
 *     ┌ Gasto no ano ─────────┐ ┌ OS ───┐ ┌ Última ──┐ ┌ Em aberto ┐
 *     │ R$ 4.210,00           │ │ 12    │ │ 03/11    │ │ R$ 0,00   │
 *     │ ↑ +16% contra 2025    │ └───────┘ └──────────┘ └───────────┘
 *     └───────────────────────┘
 *
 *     Últimas OS                        Veículos
 *     ┌──────────────────────┐          ┌──────────────────────┐
 *     │ 6 linhas             │          │ …                    │
 *     │      Ver todos (9)   │          └──────────────────────┘
 *     └──────────────────────┘
 *
 * - **Cabeçalho**: o nome é o título da tela; o detalhe embaixo confirma de
 *   quem é a ficha. **Uma** ação laranja (o próximo passo, "Nova OS"); o
 *   resto no "⋯" ("Apagar" vermelho e no fim, longe do dedo).
 * - **1 número grande + até 3 de apoio** (o tipo não deixa passar de 3): o
 *   número que decide é o maior, com rótulo e comparação ("contra o quê?").
 *   Os números vêm prontos de quem chama (um `<Valor />`, um `<Variacao />`):
 *   **conta de dinheiro nunca é feita aqui**.
 * - **As listas embaixo**: cada uma é um `MoldeLista` com 6 linhas e o "Ver
 *   todos" no fim (que abre ali, ou chama a tela com `aoVerTodos`). Os
 *   estados de carregando, vazio e erro são os do molde de lista.
 */
export type NumeroDoPerfil = {
  rotulo: string;
  /** O número pronto: um `<Valor />` ou um texto curto ("12", "03/11"). */
  valor: ReactNode;
  /** A frase do "?": o que este número quer dizer. */
  explicacao?: string;
  /** Uma linha embaixo do número ("2 em aberto"). */
  detalhe?: ReactNode;
};

export type NumeroPrincipalDoPerfil = NumeroDoPerfil & {
  /** Contra o quê: um `<Variacao contra="2025" />`, ou "contra 2025: R$ 3.630". */
  comparacao?: ReactNode;
};

/** 1 grande + no máximo 3 de apoio (leva 8, "Hierarquia e ordem de leitura"). */
export type NumerosDeApoio =
  | readonly []
  | readonly [NumeroDoPerfil]
  | readonly [NumeroDoPerfil, NumeroDoPerfil]
  | readonly [NumeroDoPerfil, NumeroDoPerfil, NumeroDoPerfil];

export type ListaDoPerfil<T> = {
  /** O título da lista ("Últimas OS", "Veículos"). */
  titulo: string;
  /** Com ele, o "Ver todos" chama a tela em vez de abrir ali. */
  aoVerTodos?: () => void;
  lista: Pick<
    PropsDoMoldeLista<T>,
    "estado" | "itens" | "chave" | "linha" | "vazio" | "erro" | "linhasNoEsqueleto"
  >;
};

export type PropsDoMoldePerfil = {
  nome: string;
  detalhe?: ReactNode;
  /** Ao lado do nome: um `<Selo palavra="Inativo" />`. */
  selo?: ReactNode;
  /** Em cima do nome: o `BotaoVoltar` da tela. */
  acimaDoNome?: ReactNode;
  /** O próximo passo: o único botão laranja da ficha. */
  acaoPrincipal?: { rotulo: string; aoClicar: () => void; desabilitada?: boolean };
  /** O resto das ações, no "⋯". */
  outrasAcoes?: ItemDoMais[];
  numeroPrincipal: NumeroPrincipalDoPerfil;
  numerosDeApoio?: NumerosDeApoio;
  // Cada lista tem o tipo dela (OS, veículos): o `any` é o "qualquer tipo"
  // da lista, e cada `ListaDoPerfil` continua conferida por dentro.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listas?: ReadonlyArray<ListaDoPerfil<any>>;
};

/** Quantas linhas cada lista mostra antes do "Ver todos". */
export const LINHAS_POR_LISTA_DO_PERFIL = 6;

// A grade dos números, por quantos de apoio há. Classes por extenso: o
// Tailwind só gera a classe que acha inteira no código. Estreito (< 42 rem):
// um embaixo do outro; médio: o grande numa linha só e os de apoio embaixo;
// largo (>= 64 rem): todos numa linha, o grande mais largo.
const GRADE_DOS_NUMEROS = [
  "grid-cols-1",
  "grid-cols-1 @2xl:grid-cols-1 @5xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]",
  "grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]",
  "grid-cols-1 @2xl:grid-cols-3 @5xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]",
] as const;

const VAO_DO_PRINCIPAL = ["", "", "@2xl:col-span-2 @5xl:col-span-1", "@2xl:col-span-3 @5xl:col-span-1"] as const;

function CartaoDoNumero({
  numero,
  grande,
  comparacao,
  className = "",
}: {
  numero: NumeroDoPerfil;
  grande: boolean;
  comparacao?: ReactNode;
  className?: string;
}) {
  const idDoRotulo = useId();
  return (
    <div
      role="group"
      aria-labelledby={idDoRotulo}
      className={`sakura-card min-w-0 ${grande ? "px-6 py-5" : "px-5 py-4"} ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <p id={idDoRotulo} className="text-rotulo font-medium text-texto-2">
          {numero.rotulo}
        </p>
        {numero.explicacao && <Explicacao titulo={numero.rotulo} texto={numero.explicacao} />}
      </div>
      <p
        data-numero
        className={`mt-2 whitespace-nowrap font-titulo font-bold tracking-[-0.02em] text-texto tabular-nums ${
          grande ? "text-metrica" : "text-destaque"
        }`}
      >
        {numero.valor}
      </p>
      {comparacao && <div className="mt-2 flex min-h-5 flex-wrap items-center text-rotulo text-texto-2">{comparacao}</div>}
      {numero.detalhe && <p className="mt-1 text-rotulo text-texto-2">{numero.detalhe}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SecaoDaLista({ lista }: { lista: ListaDoPerfil<any> }) {
  const idDoTitulo = useId();
  return (
    <section aria-labelledby={idDoTitulo} className="flex min-w-0 flex-col gap-4">
      <h2 id={idDoTitulo} className="text-subtitulo font-semibold text-texto">
        {lista.titulo}
      </h2>
      <MoldeLista
        {...lista.lista}
        rotulo={lista.titulo}
        limite={LINHAS_POR_LISTA_DO_PERFIL}
        aoVerTodos={lista.aoVerTodos}
      />
    </section>
  );
}

export function MoldePerfil({
  nome,
  detalhe,
  selo,
  acimaDoNome,
  acaoPrincipal,
  outrasAcoes,
  numeroPrincipal,
  numerosDeApoio = [],
  listas = [],
}: PropsDoMoldePerfil) {
  const quantos = numerosDeApoio.length;
  return (
    <div className="@container flex min-w-0 flex-col gap-8">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
          {acimaDoNome}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 break-words font-titulo text-titulo font-bold text-texto">{nome}</h1>
            {selo}
          </div>
          {detalhe && <p className="text-corpo text-texto-2">{detalhe}</p>}
        </div>
        {(acaoPrincipal || (outrasAcoes && outrasAcoes.length > 0)) && (
          // O "⋯" nasce com 32 px (o tamanho da tabela antiga); aqui ele vai
          // pra 40, o mínimo de alvo da leva 8, como na LinhaDeLista.
          <div className="flex shrink-0 items-center gap-2 [&_[aria-haspopup=menu]]:size-10">
            {acaoPrincipal && (
              <Botao
                variante="principal"
                tamanho="grande"
                onClick={acaoPrincipal.aoClicar}
                disabled={acaoPrincipal.desabilitada}
              >
                {acaoPrincipal.rotulo}
              </Botao>
            )}
            {outrasAcoes && outrasAcoes.length > 0 && (
              <AcoesDaLinha descricao={nome} acoes={outrasAcoes.map((acao) => ({ tipo: "menu" as const, ...acao }))} />
            )}
          </div>
        )}
      </header>

      <div className={`grid min-w-0 gap-4 ${GRADE_DOS_NUMEROS[quantos]}`}>
        <CartaoDoNumero
          numero={numeroPrincipal}
          grande
          comparacao={numeroPrincipal.comparacao}
          className={VAO_DO_PRINCIPAL[quantos]}
        />
        {numerosDeApoio.map((numero) => (
          <CartaoDoNumero key={numero.rotulo} numero={numero} grande={false} />
        ))}
      </div>

      {listas.length > 0 && (
        <div className={`grid min-w-0 grid-cols-1 gap-8 ${listas.length > 1 ? "@5xl:grid-cols-2" : ""}`}>
          {listas.map((lista) => (
            <SecaoDaLista key={lista.titulo} lista={lista} />
          ))}
        </div>
      )}
    </div>
  );
}
