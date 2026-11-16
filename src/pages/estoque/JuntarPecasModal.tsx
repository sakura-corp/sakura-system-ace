import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { buscarPecasPorIds, juntarPecas, resumoPecaParaJuntar } from "@/lib/pecas";
import {
  avisoDoCusto,
  camposDaQueSai,
  camposDiferentes,
  escolhasPadrao,
  paresSuspeitos,
  pecaVista,
  previaDaJuntada,
  quemFicaPorPadrao,
  type EscolhasDaJuntada,
  type LadoEscolhido,
  type ParSuspeito,
  type ResumoPecaJuntar,
} from "@/schemas/juntarPecas";
import { formatarMoeda } from "@/schemas/dinheiro";
import { formatarQuantidade as qtd } from "@/schemas/quantidade";
import { MOTIVO_PARECIDA_ROTULO } from "@/schemas/pecaParecida";
import type { Categoria } from "@/types/categoria";
import type { Peca } from "@/types/peca";
import { AvisoDeAtencao, AvisoDeCerto, AvisoDeErro } from "./avisosEAbas";

interface JuntarPecasModalProps {
  categorias: Categoria[];
  /**
   * O catálogo que a tela de Estoque já carregou (#721): a janela procura os
   * pares nele, em vez de buscar tudo de novo.
   */
  pecas: Peca[];
  /** A tela está carregando (ou recarregando) o catálogo. */
  carregando: boolean;
  /** O catálogo não carregou: a janela não diz "está tudo certo". */
  erroAoCarregar: string | null;
  onFechar: () => void;
  /**
   * Pede pra tela de Estoque recarregar tudo (depois de juntar, ou no "Tentar
   * de novo"). É a ÚNICA recarga: a lista nova volta por `pecas`.
   */
  onRecarregar: () => Promise<void> | void;
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

/** A recusa do banco quando alguém mexeu nas peças depois da prévia (0067). */
function ePreviaVelha(mensagem: string): boolean {
  return mensagem.includes("mudaram desde a prévia");
}

export function JuntarPecasModal({
  categorias,
  pecas,
  carregando,
  erroAoCarregar,
  onFechar,
  onRecarregar,
}: JuntarPecasModalProps) {
  // Só refaz quando a lista muda (a tela recarregou), não a cada clique. Com
  // erro, nem procura: a lista que sobrou é a velha, e a tela mostra o erro.
  const pares = useMemo<ParSuspeito<Peca>[] | null>(
    () => (carregando || erroAoCarregar ? null : paresSuspeitos(pecas)),
    [pecas, carregando, erroAoCarregar],
  );
  const [analise, setAnalise] = useState<ParEmAnalise | null>(null);
  const [escolhas, setEscolhas] = useState<EscolhasDaJuntada>({});
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [juntando, setJuntando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
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
  const aviso = useMemo(
    () => (analise ? avisoDoCusto(analise.fica, analise.sai, escolhas) : null),
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
        fica: { ...analise.resumoFica, peca: pecaVista(analise.fica) },
        sai: { ...analise.resumoSai, peca: pecaVista(analise.sai) },
      });
      setSucesso(
        `Pronto: "${analise.sai.descricao}" foi juntada em "${previa.descricaoFinal}". ` +
          "A peça repetida foi apagada.",
      );
      setAnalise(null);
      setConfirmando(false);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao juntar peças:", err);
      const mensagem = mensagemDeErro(err);
      setConfirmando(false);
      // Prévia velha: mandar de novo a mesma seria recusado toda vez. Busca
      // as peças e a prévia de agora, pra pessoa conferir e juntar com elas.
      if (ePreviaVelha(mensagem)) await atualizarPrevia(analise, mensagem);
      else setErro(mensagem);
    } finally {
      setJuntando(false);
    }
  }

  async function atualizarPrevia(atual: ParEmAnalise, mensagem: string) {
    try {
      const [duas, resumoFica, resumoSai] = await Promise.all([
        buscarPecasPorIds([atual.fica.id, atual.sai.id]),
        resumoPecaParaJuntar(atual.fica.id),
        resumoPecaParaJuntar(atual.sai.id),
      ]);
      const fica = duas.find((p) => p.id === atual.fica.id);
      const sai = duas.find((p) => p.id === atual.sai.id);
      if (!fica || !sai) {
        // outro computador já juntou ou apagou uma delas: o par não existe mais
        setAnalise(null);
        setErro("Uma das peças não existe mais (outro computador pode ter juntado ou apagado). Procurei os pares de novo.");
        await onRecarregar();
        return;
      }
      setAnalise({ fica, sai, resumoFica, resumoSai });
      setErro(`${mensagem} Atualizei a prévia abaixo com os números de agora: confira e junte de novo.`);
    } catch (err) {
      console.error("Erro ao buscar a prévia de novo:", err);
      setErro(`${mensagem} Não consegui buscar a prévia de novo: volte para a lista e abra o par outra vez.`);
    }
  }

  return (
    <Modal
      titulo="Juntar peças repetidas"
      descricao="O sistema procura peças que parecem ser a mesma. Nada é juntado sozinho: você confere e confirma uma de cada vez."
      largura="4xl"
      onFechar={juntando ? () => {} : onFechar}
      rodape={
        <Botao onClick={onFechar} disabled={juntando}>
          Fechar
        </Botao>
      }
    >
      <div className="space-y-4">
        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
        {sucesso && <AvisoDeCerto>{sucesso}</AvisoDeCerto>}

        {analise && previa ? (
          <div className="space-y-5">
            <Botao
              variante="fantasma"
              icone={<ArrowLeft />}
              onClick={voltarParaLista}
              disabled={juntando}
            >
              Voltar para a lista
            </Botao>

            <div className="grid gap-3 sm:grid-cols-2">
              <CartaoPeca titulo="Peça que fica" peca={analise.fica} />
              <CartaoPeca titulo="Peça que sai (será apagada)" peca={analise.sai} />
            </div>
            <Botao onClick={trocarQuemFica} disabled={juntando}>
              Trocar: a outra é que fica
            </Botao>

            {previa.completa ? (
              <p className="rounded-xl bg-passar px-4 py-3 text-corpo text-texto">{previa.frase}</p>
            ) : (
              <AvisoDeAtencao>{previa.frase}</AvisoDeAtencao>
            )}
            {previa.completa && aviso && <AvisoDeAtencao>{aviso}</AvisoDeAtencao>}

            {previa.completa && previa.estoquePorLoja.length > 0 && (
              <div className="sakura-card overflow-x-auto">
                <table className="sakura-tabela">
                  <caption className="px-4.5 py-3 text-left font-titulo text-corpo font-semibold text-texto">
                    Estoque por loja
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Loja</th>
                      <th scope="col" className="text-right">Peça que fica</th>
                      <th scope="col" className="text-right">Peça que sai</th>
                      <th scope="col" className="text-right">Depois de juntar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.estoquePorLoja.map((l) => (
                      <tr key={l.loja_id}>
                        <th scope="row" className="font-normal! text-texto!">{l.loja_nome}</th>
                        <td className="text-right">{qtd(l.fica)}</td>
                        <td className="text-right">{qtd(l.sai)}</td>
                        <td className="text-right font-semibold">{qtd(l.depois)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previa.completa && (
              <section aria-labelledby="titulo-campos" className="space-y-3">
                <h3 id="titulo-campos" className="font-titulo text-corpo font-semibold text-texto">
                  O que fica em cada campo
                </h3>
                {diferentes.length === 0 ? (
                  <p className="text-corpo text-texto-2">
                    As duas peças têm os mesmos dados. Não tem nada para escolher.
                  </p>
                ) : (
                  <>
                    <p className="text-corpo text-texto-2">
                      Estes campos são diferentes. Marque o valor que deve valer depois de juntar.
                    </p>
                    {diferentes.map((d) => {
                      const nome = `campo-${d.campo}`;
                      const escolhido: LadoEscolhido = escolhas[d.campo] ?? "fica";
                      return (
                        <fieldset key={d.campo} className="rounded-xl border border-linha px-4 py-3">
                          <legend className="px-1 font-medium text-texto">{d.rotulo}</legend>
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
              <AvisoDeAtencao>Por isso o botão de juntar está desligado para este par.</AvisoDeAtencao>
            ) : confirmando ? (
              <div role="group" aria-label="Confirmar a junção" className="space-y-3 rounded-xl border border-perigo/40 px-4 py-3">
                <p className="text-corpo">
                  Tem certeza? A peça <strong>{nomeDaPeca(analise.sai)}</strong> será apagada e não
                  dá para desfazer.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Botao variante="principal" onClick={handleJuntar} ocupado={juntando}>
                    {juntando ? "Juntando..." : "Sim, juntar"}
                  </Botao>
                  <Botao onClick={() => setConfirmando(false)} disabled={juntando}>
                    Não, voltar
                  </Botao>
                </div>
              </div>
            ) : (
              <Botao variante="principal" onClick={() => setConfirmando(true)}>
                Juntar estas duas
              </Botao>
            )}
          </div>
        ) : erroAoCarregar ? (
          <div className="space-y-3">
            <AvisoDeErro>Não consegui carregar as peças: {erroAoCarregar}</AvisoDeErro>
            <Botao
              onClick={() => {
                setErro(null);
                onRecarregar();
              }}
            >
              Tentar de novo
            </Botao>
          </div>
        ) : pares === null ? (
          <p role="status" className="text-corpo text-texto-2">Procurando peças repetidas…</p>
        ) : pares.length === 0 ? (
          <p className="text-corpo text-texto-2">
            Não achei peças repetidas. Está tudo certo por aqui.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-corpo text-texto-2">
              {pares.length === 1 ? "Achei 1 par que parece repetido." : `Achei ${pares.length} pares que parecem repetidos.`}{" "}
              Escolha um para conferir.
            </p>
            <ul className="space-y-2">
              {pares.map((par) => {
                const chave = `${par.a.id}-${par.b.id}`;
                return (
                  <li
                    key={chave}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linha px-4 py-3"
                  >
                    <div className="min-w-0 space-y-1 text-corpo">
                      <p className="font-medium text-texto">{nomeDaPeca(par.a)}</p>
                      <p className="text-texto-2">{codigosDaPeca(par.a)}</p>
                      <p className="font-medium text-texto">{nomeDaPeca(par.b)}</p>
                      <p className="text-texto-2">{codigosDaPeca(par.b)}</p>
                      <p>Motivo: {MOTIVO_PARECIDA_ROTULO[par.motivo]}</p>
                    </div>
                    <Botao
                      onClick={() => abrirPar(par)}
                      disabled={abrindo !== null}
                      aria-label={`Conferir ${par.a.descricao} e ${par.b.descricao}`}
                    >
                      {abrindo === chave ? "Abrindo..." : "Conferir"}
                    </Botao>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CartaoPeca({ titulo, peca }: { titulo: string; peca: Peca }) {
  return (
    <div className="rounded-xl border border-linha px-4 py-3 text-corpo">
      <p className="text-rotulo text-texto-2">{titulo}</p>
      <p className="font-medium text-texto">{nomeDaPeca(peca)}</p>
      <p className="text-texto-2">{codigosDaPeca(peca)}</p>
    </div>
  );
}
