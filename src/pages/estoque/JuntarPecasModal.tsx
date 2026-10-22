import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { juntarPecas, listarPecas, resumoPecaParaJuntar } from "@/lib/pecas";
import {
  camposDaQueSai,
  camposDiferentes,
  escolhasPadrao,
  paresSuspeitos,
  previaDaJuntada,
  quemFicaPorPadrao,
  type EscolhasDaJuntada,
  type LadoEscolhido,
  type ParSuspeito,
  type ResumoPecaJuntar,
} from "@/schemas/juntarPecas";
import { formatarMoeda } from "@/schemas/dinheiro";
import { MOTIVO_PARECIDA_ROTULO } from "@/schemas/pecaParecida";
import type { Categoria } from "@/types/categoria";
import type { Peca } from "@/types/peca";

interface JuntarPecasModalProps {
  categorias: Categoria[];
  onFechar: () => void;
  /** Chamado depois de juntar, pra página do estoque recarregar tudo. */
  onJuntado: () => Promise<void> | void;
}

interface ParEmAnalise {
  fica: Peca;
  sai: Peca;
  resumoFica: ResumoPecaJuntar;
  resumoSai: ResumoPecaJuntar;
}

function nomeDaPeca(peca: Peca): string {
  return peca.ativo ? peca.descricao : `${peca.descricao} (inativa)`;
}

function codigosDaPeca(peca: Peca): string {
  const partes = [
    peca.codigo_barras ? `código de barras ${peca.codigo_barras}` : null,
    peca.codigo_interno ? `referência ${peca.codigo_interno}` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : "sem código";
}

function qtd(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function JuntarPecasModal({ categorias, onFechar, onJuntado }: JuntarPecasModalProps) {
  const [pares, setPares] = useState<ParSuspeito<Peca>[] | null>(null);
  const [analise, setAnalise] = useState<ParEmAnalise | null>(null);
  const [escolhas, setEscolhas] = useState<EscolhasDaJuntada>({});
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [juntando, setJuntando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [buscaFalhou, setBuscaFalhou] = useState(false);

  const procurar = useCallback(async () => {
    setPares(null);
    setBuscaFalhou(false);
    try {
      const pecas = await listarPecas();
      setPares(paresSuspeitos(pecas));
    } catch (err) {
      console.error("Erro ao procurar peças repetidas:", err);
      setErro(mensagemDeErro(err));
      setBuscaFalhou(true);
      setPares([]);
    }
  }, []);

  useEffect(() => {
    procurar();
  }, [procurar]);

  async function abrirPar(par: ParSuspeito<Peca>) {
    const chave = `${par.a.id}-${par.b.id}`;
    setAbrindo(chave);
    setErro(null);
    setSucesso(null);
    try {
      const { fica, sai } = quemFicaPorPadrao(par.a, par.b);
      const [resumoFica, resumoSai] = await Promise.all([
        resumoPecaParaJuntar(fica.id),
        resumoPecaParaJuntar(sai.id),
      ]);
      setAnalise({ fica, sai, resumoFica, resumoSai });
      setEscolhas(escolhasPadrao(fica, sai));
      setConfirmando(false);
    } catch (err) {
      console.error("Erro ao abrir o par de peças:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setAbrindo(null);
    }
  }

  function trocarQuemFica() {
    if (!analise) return;
    setAnalise({
      fica: analise.sai,
      sai: analise.fica,
      resumoFica: analise.resumoSai,
      resumoSai: analise.resumoFica,
    });
    setEscolhas(escolhasPadrao(analise.sai, analise.fica));
    setConfirmando(false);
  }

  function voltarParaLista() {
    setAnalise(null);
    setConfirmando(false);
    setErro(null);
  }

  const previa = useMemo(
    () =>
      analise
        ? previaDaJuntada({
            fica: analise.fica,
            sai: analise.sai,
            resumoFica: analise.resumoFica,
            resumoSai: analise.resumoSai,
            escolhas,
          })
        : null,
    [analise, escolhas],
  );
  const diferentes = useMemo(
    () => (analise ? camposDiferentes(analise.fica, analise.sai) : []),
    [analise],
  );

  function mostrarValor(campo: string, valor: unknown): string {
    if (valor === null || valor === undefined || String(valor).trim() === "") return "(vazio)";
    if (campo === "categoria_id") {
      return categorias.find((c) => c.id === valor)?.nome ?? "(categoria desconhecida)";
    }
    if (campo === "preco_custo" || campo === "preco_venda") return formatarMoeda(Number(valor));
    return String(valor);
  }

  async function handleJuntar() {
    if (!analise || !previa?.completa) return;
    setJuntando(true);
    setErro(null);
    try {
      await juntarPecas(analise.fica.id, analise.sai.id, camposDaQueSai(escolhas), {
        fica: analise.resumoFica,
        sai: analise.resumoSai,
      });
      setSucesso(
        `Pronto: "${analise.sai.descricao}" foi juntada em "${previa.descricaoFinal}". ` +
          "A peça repetida foi apagada.",
      );
      setAnalise(null);
      setConfirmando(false);
      await onJuntado();
      await procurar();
    } catch (err) {
      console.error("Erro ao juntar peças:", err);
      setErro(mensagemDeErro(err));
      setConfirmando(false);
    } finally {
      setJuntando(false);
    }
  }

  return (
    <Modal
      titulo="Juntar peças repetidas"
      descricao="O sistema procura peças que parecem ser a mesma. Nada é juntado sozinho: você confere e confirma uma de cada vez."
      largura="4xl"
      onFechar={juntando ? () => {} : onFechar}
    >
      <div className="space-y-4">
        {erro && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
            {erro}
          </p>
        )}
        {sucesso && (
          <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-corpo text-green-800">
            {sucesso}
          </p>
        )}

        {analise && previa ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={voltarParaLista}
              disabled={juntando}
              className="text-corpo font-medium text-sakura-purple-dark underline"
            >
              Voltar para a lista
            </button>

            <div className="grid gap-3 sm:grid-cols-2">
              <CartaoPeca titulo="Peça que fica" peca={analise.fica} />
              <CartaoPeca titulo="Peça que sai (será apagada)" peca={analise.sai} />
            </div>
            <button
              type="button"
              onClick={trocarQuemFica}
              disabled={juntando}
              className="rounded-xl border border-sakura-purple/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10 disabled:opacity-60"
            >
              Trocar: a outra é que fica
            </button>

            <p
              className={`rounded-xl px-4 py-3 text-corpo ${
                previa.completa ? "bg-sakura-pink-soft text-sakura-purple-dark" : "bg-amber-50 text-amber-800"
              }`}
            >
              {previa.frase}
            </p>

            {previa.completa && previa.estoquePorLoja.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-corpo">
                  <caption className="pb-2 text-left font-medium text-sakura-purple-dark">
                    Estoque por loja
                  </caption>
                  <thead>
                    <tr className="text-sakura-purple-dark/80">
                      <th scope="col" className="px-3 py-2 font-medium">Loja</th>
                      <th scope="col" className="px-3 py-2 font-medium">Peça que fica</th>
                      <th scope="col" className="px-3 py-2 font-medium">Peça que sai</th>
                      <th scope="col" className="px-3 py-2 font-medium">Depois de juntar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.estoquePorLoja.map((l) => (
                      <tr key={l.loja_id} className="border-t border-sakura-gray/30">
                        <th scope="row" className="px-3 py-2 font-normal">{l.loja_nome}</th>
                        <td className="px-3 py-2">{qtd(l.fica)}</td>
                        <td className="px-3 py-2">{qtd(l.sai)}</td>
                        <td className="px-3 py-2 font-medium">{qtd(l.depois)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previa.completa && (
              <section aria-labelledby="titulo-campos" className="space-y-3">
                <h3 id="titulo-campos" className="font-semibold text-sakura-purple-dark">
                  O que fica em cada campo
                </h3>
                {diferentes.length === 0 ? (
                  <p className="text-corpo text-sakura-muted">
                    As duas peças têm os mesmos dados. Não tem nada para escolher.
                  </p>
                ) : (
                  <>
                    <p className="text-corpo text-sakura-muted">
                      Estes campos são diferentes. Marque o valor que deve valer depois de juntar.
                    </p>
                    {diferentes.map((d) => {
                      const nome = `campo-${d.campo}`;
                      const escolhido: LadoEscolhido = escolhas[d.campo] ?? "fica";
                      return (
                        <fieldset key={d.campo} className="rounded-xl border border-sakura-gray/30 px-4 py-3">
                          <legend className="px-1 font-medium text-sakura-purple-dark">{d.rotulo}</legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(["fica", "sai"] as const).map((lado) => (
                              <label key={lado} className="flex items-start gap-2 text-corpo">
                                <input
                                  type="radio"
                                  name={nome}
                                  checked={escolhido === lado}
                                  onChange={() => setEscolhas({ ...escolhas, [d.campo]: lado })}
                                  className="mt-1 h-4 w-4"
                                />
                                <span>
                                  {lado === "fica" ? "Da peça que fica" : "Da peça que sai"}:{" "}
                                  <strong>{mostrarValor(d.campo, d[lado])}</strong>
                                </span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      );
                    })}
                  </>
                )}
              </section>
            )}

            {!previa.completa ? (
              <p className="text-corpo text-amber-800">
                Por isso o botão de juntar está desligado para este par.
              </p>
            ) : confirmando ? (
              <div role="group" aria-label="Confirmar a junção" className="space-y-3 rounded-xl border border-red-300 px-4 py-3">
                <p className="text-corpo">
                  Tem certeza? A peça <strong>{nomeDaPeca(analise.sai)}</strong> será apagada e não
                  dá para desfazer.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleJuntar}
                    disabled={juntando}
                    className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {juntando ? "Juntando..." : "Sim, juntar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    disabled={juntando}
                    className="rounded-xl border border-sakura-purple/40 px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
                  >
                    Não, voltar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
              >
                Juntar estas duas
              </button>
            )}
          </div>
        ) : pares === null ? (
          <p role="status" className="text-corpo text-sakura-muted">Procurando peças repetidas…</p>
        ) : buscaFalhou ? (
          <button
            type="button"
            onClick={() => {
              setErro(null);
              procurar();
            }}
            className="rounded-xl border border-sakura-purple/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
          >
            Tentar de novo
          </button>
        ) : pares.length === 0 ? (
          <p className="text-corpo text-sakura-muted">
            Não achei peças repetidas. Está tudo certo por aqui.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-corpo text-sakura-muted">
              {pares.length === 1 ? "Achei 1 par que parece repetido." : `Achei ${pares.length} pares que parecem repetidos.`}{" "}
              Escolha um para conferir.
            </p>
            <ul className="space-y-2">
              {pares.map((par) => {
                const chave = `${par.a.id}-${par.b.id}`;
                return (
                  <li
                    key={chave}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sakura-gray/30 px-4 py-3"
                  >
                    <div className="min-w-0 space-y-1 text-corpo">
                      <p className="font-medium text-sakura-purple-dark">{nomeDaPeca(par.a)}</p>
                      <p className="text-sakura-muted">{codigosDaPeca(par.a)}</p>
                      <p className="font-medium text-sakura-purple-dark">{nomeDaPeca(par.b)}</p>
                      <p className="text-sakura-muted">{codigosDaPeca(par.b)}</p>
                      <p>Motivo: {MOTIVO_PARECIDA_ROTULO[par.motivo]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirPar(par)}
                      disabled={abrindo !== null}
                      aria-label={`Conferir ${par.a.descricao} e ${par.b.descricao}`}
                      className="rounded-xl border border-sakura-purple/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10 disabled:opacity-60"
                    >
                      {abrindo === chave ? "Abrindo..." : "Conferir"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onFechar}
            disabled={juntando}
            className="disabled:opacity-60 rounded-xl border border-sakura-purple/40 px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CartaoPeca({ titulo, peca }: { titulo: string; peca: Peca }) {
  return (
    <div className="rounded-xl border border-sakura-gray/30 px-4 py-3 text-corpo">
      <p className="text-rotulo text-sakura-purple-dark/80">{titulo}</p>
      <p className="font-medium text-sakura-purple-dark">{nomeDaPeca(peca)}</p>
      <p className="text-sakura-muted">{codigosDaPeca(peca)}</p>
    </div>
  );
}
