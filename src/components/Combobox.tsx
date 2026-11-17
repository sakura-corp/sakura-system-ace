import { useMemo, useRef, useState } from "react";

export interface OpcaoCombobox {
  valor: string;
  rotulo: string;
}

interface ComboboxProps {
  opcoes: OpcaoCombobox[];
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  /** Rótulo do item "nenhum" (ex: "Sem categoria") — some vazio (`""`) como valor. */
  opcaoVazia?: string;
  desabilitado?: boolean;
  className?: string;
  /**
   * A altura do campo: `normal` é a dos outros campos do formulário (44 px);
   * `filtro` é a dos filtros em cima de uma lista (38 px).
   */
  tamanho?: "normal" | "filtro";
  id?: string;
  /**
   * Quando `true`, o campo não fica preso à lista de `opcoes`: se o que foi
   * digitado não bater com nenhuma opção, o texto digitado vira o próprio
   * valor ao sair do campo (ex: marca de veículo — a lista é só sugestão,
   * não cadastro fechado). Sem essa flag, sair do campo sem escolher uma
   * opção da lista desfaz o que foi digitado (comportamento de sempre).
   */
  permitirLivre?: boolean;
  /**
   * Botão fixo no fim da lista, pra uma ação que não é "escolher uma das
   * opções" — hoje o "+ Cadastrar novo cliente/veículo" da abertura de OS.
   * Fica no fim de propósito: quem procurou e não achou já rolou a lista
   * inteira, e é exatamente aí que a vontade de cadastrar aparece. Continua
   * aparecendo quando a busca não acha nada, que é o momento em que ele mais
   * importa.
   */
  acaoExtra?: { rotulo: string; onAcionar: () => void };
}

// Remove acento pra busca em português não exigir digitar "ç"/"ã" certinho
// (ex: "pneu" já acha "Pneus").
const CODIGO_MARCA_DIACRITICA_INICIO = 0x0300;
const CODIGO_MARCA_DIACRITICA_FIM = 0x036f;

function normalizar(texto: string): string {
  return Array.from(texto.normalize("NFD"))
    .filter((caractere) => {
      const codigo = caractere.codePointAt(0) ?? 0;
      return codigo < CODIGO_MARCA_DIACRITICA_INICIO || codigo > CODIGO_MARCA_DIACRITICA_FIM;
    })
    .join("")
    .toLowerCase();
}

// Select "de verdade" (nativo) some depois de escolher — a usuária pediu pra
// continuar mostrando a lista completa ao abrir, mas também deixar digitar
// pra filtrar (nenhum <select> HTML faz isso ao mesmo tempo). Sem biblioteca
// externa: input de texto + painel de opções, filtrado localmente por
// `opcoes` (poucas centenas de itens no máximo neste app, sem precisar de
// paginação/virtualização).
export function Combobox({
  opcoes,
  valor,
  onMudar,
  placeholder = "Selecione...",
  opcaoVazia,
  desabilitado,
  className,
  tamanho = "normal",
  id,
  permitirLivre,
  acaoExtra,
}: ComboboxProps) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const rotuloSelecionado =
    opcoes.find((o) => o.valor === valor)?.rotulo ??
    (valor === ""
      ? opcaoVazia
      : permitirLivre && valor
        ? valor
        : undefined);

  const opcoesFiltradas = useMemo(() => {
    if (filtro.trim() === "") return opcoes;
    const alvo = normalizar(filtro);
    return opcoes.filter((o) => normalizar(o.rotulo).includes(alvo));
  }, [opcoes, filtro]);

  const mostrarOpcaoVazia = opcaoVazia !== undefined && filtro.trim() === "";

  // Ordem dos itens navegáveis pelo teclado: [opção vazia?] → opções → [ação
  // extra?]. Guardar isso em duas constantes evita repetir a aritmética de
  // deslocamento em cada lugar que precisa dela.
  const deslocamento = mostrarOpcaoVazia ? 1 : 0;
  const indiceAcaoExtra = acaoExtra ? deslocamento + opcoesFiltradas.length : -1;

  function abrir() {
    if (desabilitado) return;
    setFiltro("");
    setIndiceAtivo(0);
    setAberto(true);
  }

  function selecionar(novoValor: string) {
    onMudar(novoValor);
    setFiltro("");
    setAberto(false);
  }

  function acionarExtra() {
    // Fecha a lista ANTES de chamar a ação: ela costuma abrir um modal, e
    // uma lista suspensa esquecida aberta por trás dele ficaria pendurada na
    // tela sem dono.
    setFiltro("");
    setAberto(false);

    // E TIRA O FOCO deste campo. Parece detalhe e não é — achado testando o
    // fluxo no app de verdade: o `Modal` devolve o foco pro elemento que o
    // abriu (é o que faz quem usa só teclado continuar de onde parou), e
    // esse elemento seria justo este input. Ao fechar o modal, o `onFocus`
    // daqui reabria a lista, e o campo voltava a mostrar o filtro VAZIO —
    // ou seja, logo depois de cadastrar um cliente o campo Cliente parecia
    // em branco, que é exatamente a impressão de "não funcionou" que o
    // cadastro rápido existe pra evitar.
    //
    // Sem foco aqui, o modal não tem pra onde devolver, e o campo fica
    // fechado mostrando o que foi escolhido. O preço é pequeno e conhecido:
    // quem cancelar o modal volta sem foco em campo nenhum, em vez de voltar
    // pra este. Uma tentativa anterior de resolver isso com uma "marca pra
    // ignorar o próximo foco" foi descartada por ser frágil — o clique que
    // sobra do próprio mousedown consumia a marca antes da hora, e o bug
    // voltava.
    inputRef.current?.blur();

    acaoExtra?.onAcionar();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        abrir();
      }
      return;
    }
    const total = deslocamento + opcoesFiltradas.length + (acaoExtra ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceAtivo((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (mostrarOpcaoVazia && indiceAtivo === 0) {
        selecionar("");
      } else if (acaoExtra && indiceAtivo === indiceAcaoExtra) {
        acionarExtra();
      } else {
        const opcao = opcoesFiltradas[indiceAtivo - deslocamento];
        if (opcao) {
          selecionar(opcao.valor);
        } else if (permitirLivre && filtro.trim()) {
          // Nenhuma opção da lista bate com o que foi digitado — usa o
          // próprio texto digitado como valor (ex: marca fora da lista).
          selecionar(filtro.trim());
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setFiltro("");
      setAberto(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div
      className={`relative ${className ?? ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          if (permitirLivre && filtro.trim()) {
            onMudar(filtro.trim());
          }
          setAberto(false);
          setFiltro("");
        }
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={desabilitado}
        value={aberto ? filtro : (rotuloSelecionado ?? "")}
        placeholder={rotuloSelecionado === undefined ? placeholder : undefined}
        onFocus={abrir}
        onClick={abrir}
        onChange={(e) => {
          setFiltro(e.target.value);
          setIndiceAtivo(0);
          if (!aberto) setAberto(true);
        }}
        onKeyDown={aoTeclar}
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        autoComplete="off"
        // O mesmo campo do resto do formulário (a classe `sakura-campo`, com o
        // anel laranja no foco), em vez da caixa mais baixa de antes.
        className={tamanho === "filtro" ? "sakura-campo sakura-campo-filtro" : "sakura-campo"}
      />

      {aberto && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-linha bg-janela py-1 shadow-xl">
          {mostrarOpcaoVazia && (
            <button
              type="button"
              onMouseDown={(e) => {
                // Seleciona já no mousedown (que dispara antes de qualquer
                // blur) em vez de esperar o click — se a lista fechasse por
                // perda de foco entre um evento e outro, o botão sumia do
                // DOM antes do click chegar a disparar, e o clique "não
                // fazia nada". preventDefault() aqui também evita o
                // input piscar sem foco por uma fração de segundo.
                e.preventDefault();
                selecionar("");
              }}
              className={`block w-full px-3 py-1.5 text-left text-corpo text-texto-2 ${
                indiceAtivo === 0 ? "bg-acao/20 text-acao-clara" : "hover:bg-texto/5"
              }`}
            >
              {opcaoVazia}
            </button>
          )}
          {opcoesFiltradas.length === 0 ? (
            permitirLivre && filtro.trim() ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selecionar(filtro.trim());
                }}
                className="block w-full px-3 py-1.5 text-left text-corpo text-acao-clara hover:bg-texto/5"
              >
                Usar "{filtro.trim()}"
              </button>
            ) : (
              <p className="px-3 py-1.5 text-corpo text-texto-2">Nenhum resultado encontrado</p>
            )
          ) : (
            opcoesFiltradas.map((opcao, indice) => {
              const indiceReal = indice + deslocamento;
              return (
                <button
                  type="button"
                  key={opcao.valor}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selecionar(opcao.valor);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-corpo text-texto/90 ${
                    indiceReal === indiceAtivo ? "bg-acao/20 text-acao-clara" : "hover:bg-texto/5"
                  }`}
                >
                  {opcao.rotulo}
                </button>
              );
            })
          )}

          {acaoExtra && (
            <button
              type="button"
              onMouseDown={(e) => {
                // Mesma razão do resto da lista: a seleção acontece no
                // mousedown, nunca num onClick separado — ver item 16 da
                // seção 6 do PROJETO_STATUS.md.
                e.preventDefault();
                acionarExtra();
              }}
              className={`block w-full border-t border-linha px-3 py-2 text-left text-corpo font-medium text-acao-clara ${
                indiceAtivo === indiceAcaoExtra ? "bg-acao/20" : "hover:bg-texto/5"
              }`}
            >
              {acaoExtra.rotulo}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
