import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { buscarGlobal } from "@/lib/buscaGlobal";
import {
  AVISO_BUSCA_SEM_BANCO,
  agruparResultados,
  buscaAindaNaoNoBanco,
  destinoDoResultado,
  filtrarPorPermissao,
  moverSelecao,
  termoDaBusca,
  tiposVisiveis,
  type ItemDoGrupo,
  type ResultadoBusca,
} from "@/schemas/buscaGlobal";

const ESPERA_DA_DIGITACAO_MS = 250;

function ehAbort(erro: unknown): boolean {
  return erro instanceof Error && erro.name === "AbortError";
}

/**
 * A busca geral (#372): um campo no topo da área principal e o atalho
 * `Ctrl+K` (ou `Cmd+K`) que abrem a mesma caixa, de qualquer tela. Procura
 * placa, cliente, OS, peça e fornecedor de uma vez, só do que a pessoa pode ver.
 *
 * A caixa NÃO fica dentro de um `<form>` nem usa portal: o atalho global do
 * Enter (`useEnterParaProximoCampo`) acharia o formulário da tela de trás e
 * pularia de campo; por isso o input para a propagação do Enter e das setas.
 */
export function BuscaGlobal() {
  const { operador, lojaAtual } = useAuth();
  const navigate = useNavigate();
  const [aberta, setAberta] = useState(false);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const quemTinhaOFoco = useRef<HTMLElement | null>(null);
  const listaId = useId();

  const lojaId = lojaAtual?.id ?? null;
  const temTipos = tiposVisiveis(operador).length > 0;
  const habilitada = Boolean(lojaId) && temTipos;

  const abrir = useCallback(() => {
    quemTinhaOFoco.current = document.activeElement as HTMLElement | null;
    setAberta(true);
  }, []);

  const fechar = useCallback(() => {
    setAberta(false);
    setTexto("");
    setResultados([]);
    setErro(null);
    setAviso(null);
    setBuscando(false);
    setSelecionado(-1);
    const volta = quemTinhaOFoco.current;
    quemTinhaOFoco.current = null;
    if (volta && document.contains(volta)) volta.focus();
  }, []);

  // O atalho global, de qualquer tela.
  useEffect(() => {
    if (!habilitada) return;
    function aoTeclar(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((jaAberta) => {
          if (!jaAberta) quemTinhaOFoco.current = document.activeElement as HTMLElement | null;
          return true;
        });
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [habilitada]);

  useEffect(() => {
    if (aberta) inputRef.current?.focus();
  }, [aberta]);

  // A busca: espera a pessoa parar de digitar e cancela a anterior.
  useEffect(() => {
    if (!aberta || !lojaId) return;
    const termo = termoDaBusca(texto);
    if (termo === null) {
      setResultados([]);
      setBuscando(false);
      setErro(null);
      setAviso(null);
      return;
    }
    const controle = new AbortController();
    setBuscando(true);
    const espera = setTimeout(() => {
      buscarGlobal(termo, lojaId, controle.signal)
        .then((linhas) => {
          if (controle.signal.aborted) return;
          setResultados(filtrarPorPermissao(linhas, operador));
          setSelecionado(-1);
          setErro(null);
          setAviso(null);
          setBuscando(false);
        })
        .catch((err: unknown) => {
          if (controle.signal.aborted || ehAbort(err)) return;
          setResultados([]);
          if (buscaAindaNaoNoBanco(err)) {
            setErro(null);
            setAviso(AVISO_BUSCA_SEM_BANCO);
          } else {
            setAviso(null);
            setErro(mensagemDeErro(err));
          }
          setBuscando(false);
        });
    }, ESPERA_DA_DIGITACAO_MS);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [texto, aberta, lojaId, operador]);

  const grupos = useMemo(() => agruparResultados(resultados), [resultados]);
  const itens = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);

  function abrirItem(item: ItemDoGrupo | undefined) {
    if (!item) return;
    const destino = destinoDoResultado(item, operador);
    if (!destino) return;
    fechar();
    navigate(destino.rota, destino.state ? { state: destino.state } : undefined);
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setSelecionado((atual) => moverSelecao(atual, itens.length, e.key === "ArrowDown" ? 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        abrirItem(itens[selecionado] ?? itens[0]);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        fechar();
        break;
      case "Tab":
        // Só o campo recebe foco aqui dentro: o Tab não deve escapar pra tela de trás.
        e.preventDefault();
        break;
    }
  }

  if (!habilitada) return null;

  const termoValido = termoDaBusca(texto) !== null;
  const idDaOpcao = (i: number) => `${listaId}-opcao-${i}`;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="mb-4 flex min-h-[40px] w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-sakura-borda-campo px-3 py-2 text-left text-corpo text-sakura-muted hover:border-sakura-purple"
      >
        <span className="min-w-0 truncate">Buscar placa, cliente, OS, peça… (Ctrl+K)</span>
      </button>

      {aberta && (
        <div className="sakura-modal-fundo items-start pt-[12vh]" onClick={fechar}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Busca geral"
            className="sakura-modal max-h-[70vh] w-full max-w-xl overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Buscar placa, cliente, OS, peça ou fornecedor"
              aria-expanded={itens.length > 0}
              aria-controls={listaId}
              aria-autocomplete="list"
              aria-activedescendant={selecionado >= 0 ? idDaOpcao(selecionado) : undefined}
              autoComplete="off"
              placeholder="Buscar placa, cliente, OS, peça…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
              className="min-h-[40px] w-full rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
            />

            <div className="mt-2" aria-live="polite">
              {erro && (
                <p role="alert" className="px-2 py-2 text-corpo text-red-400">
                  {erro}
                </p>
              )}
              {!erro && buscando && <p className="px-2 py-2 text-corpo text-sakura-muted">Buscando…</p>}
              {!erro && !buscando && aviso && <p className="px-2 py-2 text-corpo text-sakura-muted">{aviso}</p>}
              {!erro && !aviso && !buscando && termoValido && itens.length === 0 && (
                <p className="px-2 py-2 text-corpo text-sakura-muted">Nada encontrado</p>
              )}
            </div>

            <div id={listaId} role="listbox" aria-label="Resultados">
              {grupos.map((grupo) => (
                <div key={grupo.tipo} role="group" aria-label={grupo.rotulo}>
                  <p className="px-2 pb-1 pt-2 text-rotulo font-semibold uppercase text-sakura-muted" aria-hidden="true">
                    {grupo.rotulo}
                  </p>
                  {grupo.itens.map((item) => {
                    const destino = destinoDoResultado(item, operador);
                    const ativo = item.indice === selecionado;
                    return (
                      <div
                        key={`${item.tipo}-${item.id}`}
                        id={idDaOpcao(item.indice)}
                        role="option"
                        aria-selected={ativo}
                        aria-disabled={destino ? undefined : true}
                        onMouseEnter={() => destino && setSelecionado(item.indice)}
                        onClick={() => abrirItem(item)}
                        className={`flex min-h-[40px] min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
                          destino ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                        } ${ativo ? "bg-sakura-purple/20" : ""}`}
                      >
                        <span className="min-w-0 truncate text-corpo text-sakura-purple-dark">
                          {item.tipo === "os" ? `OS ${item.titulo}` : item.titulo}
                        </span>
                        {item.detalhe && (
                          <span className="min-w-0 shrink truncate text-rotulo text-sakura-muted">{item.detalhe}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
