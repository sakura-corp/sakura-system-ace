import { useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { cadastrarPecaDoItem } from "@/lib/ordensServico";
import {
  pendenciasDaAprovacao,
  vinculosDaAprovacao,
  type CaminhoAvulsa,
} from "@/schemas/orcamento";
import { formatarMoeda } from "@/schemas/dinheiro";
import { acharPecasParecidas, LIMITE_NOME_PARA_ORDENAR } from "@/schemas/pecaParecida";
import type { ItemOS } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import { CadastroPecaAvulsaModal } from "./CadastroPecaAvulsaModal";
import {
  AVISO_PECA_SOBROU,
  type EscolhasDaJanela,
  type ModoAvulsa as Modo,
} from "./escolhasAvulsas";

const ROTULO_DO_MODO: Record<Modo, string> = {
  existente: "É uma peça que já tenho",
  cadastrar: "Cadastrar agora",
  sem_cadastro: "Seguir sem cadastro",
};

interface PecasAvulsasAprovacaoModalProps {
  /** As peças avulsas do orçamento (as que vieram sem `peca_id`). */
  itens: ItemOS[];
  /** O cadastro da loja: de onde se escolhe a peça que "já tenho". */
  pecas: PecaJanela[];
  lojaId: string;
  /**
   * O que a pessoa já escolheu nesta aprovação. Mora em quem abre a janela,
   * não nela: com "Voltar" a janela fecha, e as escolhas (principalmente a
   * peça já cadastrada) têm que estar lá quando ela abrir de novo, senão a
   * pessoa cadastra outra e a primeira sobra no cadastro (#720).
   */
  escolhas: EscolhasDaJanela;
  onMudarEscolhas: (mudar: (atual: EscolhasDaJanela) => EscolhasDaJanela) => void;
  /** Aprovando agora: trava os botões até a resposta voltar. */
  enviando: boolean;
  /** Erro da aprovação, mostrado aqui dentro pra janela não esconder. */
  erro: string | null;
  onConfirmar: (vinculos: { itemId: string; pecaId: string }[]) => void;
  /**
   * A peça cadastrada aqui foi ligada ao item na hora (#720), ou o item já
   * não era avulso: ele sai da lista, e quem abriu a janela recarrega o
   * orçamento.
   */
  onItemLigado: (itemId: string) => void | Promise<void>;
  onFechar: () => void;
}

/**
 * A janela da aprovação do orçamento com peça sem cadastro (#655). Cada peça
 * avulsa precisa de um caminho antes de aprovar: escolher uma do cadastro,
 * cadastrar agora ou seguir sem cadastro (sem estoque e sem nota). As regras
 * (o que falta, o que vincula) são de `schemas/orcamento.ts`; aqui só a tela.
 */
export function PecasAvulsasAprovacaoModal({
  itens,
  pecas,
  lojaId,
  escolhas: escolhasDaJanela,
  onMudarEscolhas,
  enviando,
  erro,
  onConfirmar,
  onItemLigado,
  onFechar,
}: PecasAvulsasAprovacaoModalProps) {
  const { operador } = useAuth();
  const { modos, escolhidas, cadastradas } = escolhasDaJanela;
  const setModos = (mudar: (m: Record<string, Modo>) => Record<string, Modo>) =>
    onMudarEscolhas((e) => ({ ...e, modos: mudar(e.modos) }));
  const setEscolhidas = (mudar: (m: Record<string, string>) => Record<string, string>) =>
    onMudarEscolhas((e) => ({ ...e, escolhidas: mudar(e.escolhidas) }));
  const setCadastradas = (
    mudar: (m: Record<string, PecaJanela>) => Record<string, PecaJanela>,
  ) => onMudarEscolhas((e) => ({ ...e, cadastradas: mudar(e.cadastradas) }));
  const [cadastrando, setCadastrando] = useState<ItemOS | null>(null);
  // A peça foi cadastrada, mas o estoque inicial não entrou (#909): só avisa,
  // um aviso por item (pra um não apagar o outro). Fica na área de avisos da
  // janela, e não na linha do item: ligada a peça (#720), o item sai da lista.
  const [avisosEstoqueInicial, setAvisosEstoqueInicial] = useState<Record<string, string>>({});
  // Quantas peças recém-cadastradas estão sendo ligadas agora: o Aprovar
  // espera TODAS, pra não mandar o vínculo de um item que o banco está ligando
  // (uma contagem, e não sim/não: a primeira a acabar não pode soltar o botão).
  const [ligando, setLigando] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  // O que a pessoa escolheu, no formato que as regras entendem. "Existente"
  // sem peça escolhida e "cadastrar" sem peça criada ficam com id vazio, e
  // as regras os contam como pendência.
  const escolhas = useMemo(() => {
    const mapa = new Map<string, CaminhoAvulsa>();
    for (const item of itens) {
      const modo = modos[item.id];
      if (modo === "existente") {
        mapa.set(item.id, { caminho: "existente", pecaId: escolhidas[item.id] ?? "" });
      } else if (modo === "cadastrar") {
        mapa.set(item.id, { caminho: "cadastrar", pecaId: cadastradas[item.id]?.id ?? "" });
      } else if (modo === "sem_cadastro") {
        mapa.set(item.id, { caminho: "sem_cadastro" });
      }
    }
    return mapa;
  }, [itens, modos, escolhidas, cadastradas]);

  const faltam = pendenciasDaAprovacao(itens, escolhas).length;

  // O cadastro da loja mais as peças cadastradas nesta janela: duas linhas
  // avulsas da mesma peça não podem virar dois cadastros — a segunda acha a
  // primeira no "já tenho" e no aviso de parecida.
  const pecasDaJanela = useMemo(() => {
    const ids = new Set(pecas.map((peca) => peca.id));
    const novas = Object.values(cadastradas).filter((peca) => !ids.has(peca.id));
    return [...pecas, ...new Map(novas.map((peca) => [peca.id, peca])).values()];
  }, [pecas, cadastradas]);

  // A peça nasceu no cadastro: liga ao item JÁ (#720), como a janela da nota
  // faz. Esperar a aprovação deixava a peça solta se a pessoa fechasse o
  // orçamento ou outro computador aprovasse antes. Em orçamento o banco só
  // liga, sem baixar (migration 0079); a aprovação é que baixa.
  async function aoCadastrar(item: ItemOS, peca: PecaJanela) {
    // Guardada como caminho antes de tudo: se ligar falhar, a aprovação liga.
    setCadastradas((c) => ({ ...c, [item.id]: peca }));
    setModos((m) => ({ ...m, [item.id]: "cadastrar" }));
    setCadastrando(null);
    setAviso(null);
    if (!operador) {
      setAviso("A peça foi cadastrada, mas não foi ligada ao item agora: o login caiu. Ao aprovar, ela é ligada.");
      return;
    }
    setLigando((n) => n + 1);
    try {
      const ligou = await cadastrarPecaDoItem(item.id, peca.id, operador.id);
      if (!ligou) setAviso(AVISO_PECA_SOBROU);
    } catch (err) {
      console.error("Erro ao ligar a peça cadastrada ao item do orçamento:", err);
      setAviso(
        `A peça foi cadastrada, mas não foi ligada ao item agora: ${mensagemDeErro(err)}. ` +
          "Ao aprovar, ela é ligada.",
      );
      return;
    } finally {
      setLigando((n) => n - 1);
    }
    // Ligou (ou o item já não era avulso): sai da lista e o orçamento recarrega.
    await onItemLigado(item.id);
  }

  function escolherPeca(itemId: string, pecaId: string) {
    setModos((m) => ({ ...m, [itemId]: "existente" }));
    setEscolhidas((e) => ({ ...e, [itemId]: pecaId }));
  }

  return (
    <>
      <Modal
        titulo="Peças sem cadastro"
        descricao="Estas peças foram digitadas no orçamento. Diga o que fazer com cada uma antes de aprovar."
        largura="4xl"
        onFechar={() => {
          if (!enviando) onFechar();
        }}
      >
        <div className="space-y-4">
          {itens.length === 0 && (
            <p className="text-corpo text-sakura-purple-dark">
              Não sobrou nenhuma peça sem cadastro. Pode aprovar.
            </p>
          )}
          {itens.map((item) => {
            const modo = modos[item.id];
            // As parecidas com o que foi digitado vão no topo da lista. Aqui só ordena, então o limite é mais baixo (#741).
            const parecidas = acharPecasParecidas(
              { descricao: item.descricao, codigo_interno: null, codigo_barras: null, medida: null },
              pecasDaJanela,
              { limiteNome: LIMITE_NOME_PARA_ORDENAR },
            ).map(({ peca }) => peca);
            const idsParecidas = new Set(parecidas.map((peca) => peca.id));
            const opcoes = [
              ...parecidas.map((peca) => ({
                valor: peca.id,
                rotulo: `${peca.descricao} (parecida)`,
              })),
              ...pecasDaJanela
                .filter((peca) => !idsParecidas.has(peca.id))
                .map((peca) => ({ valor: peca.id, rotulo: peca.descricao })),
            ];

            return (
              <fieldset
                key={item.id}
                className="space-y-3 rounded-xl border border-sakura-gray/30 p-4"
              >
                <legend className="px-1 text-corpo font-semibold text-sakura-purple-dark">
                  {item.descricao}
                </legend>
                <p className="text-rotulo text-sakura-muted">
                  {item.quantidade}x · {formatarMoeda(item.preco_unitario)} cada
                </p>

                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {(Object.keys(ROTULO_DO_MODO) as Modo[]).map((opcao) => (
                    <label
                      key={opcao}
                      className="flex items-center gap-2 text-corpo text-sakura-purple-dark"
                    >
                      <input
                        type="radio"
                        name={`caminho-${item.id}`}
                        checked={modo === opcao}
                        onChange={() => setModos((m) => ({ ...m, [item.id]: opcao }))}
                      />
                      {ROTULO_DO_MODO[opcao]}
                    </label>
                  ))}
                </div>

                {modo === "existente" && (
                  <div className="space-y-1">
                    <Combobox
                      opcoes={opcoes}
                      valor={escolhidas[item.id] ?? ""}
                      onMudar={(pecaId) => escolherPeca(item.id, pecaId)}
                      opcaoVazia="Escolha a peça do cadastro"
                      placeholder="Escolha a peça do cadastro"
                    />
                    {parecidas.length > 0 && (
                      <p className="text-rotulo text-sakura-muted">
                        As que parecem com “{item.descricao}” estão no topo da lista.
                      </p>
                    )}
                    <p className="text-rotulo text-sakura-muted">
                      Ao aprovar, ela sai do estoque.
                    </p>
                  </div>
                )}

                {modo === "cadastrar" && (
                  <div className="space-y-1">
                    {cadastradas[item.id] ? (
                      <p className="text-corpo text-emerald-300">
                        Peça cadastrada: {cadastradas[item.id].descricao}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCadastrando(item)}
                        className="rounded-xl border border-sakura-purple/40 px-4 py-2 text-corpo font-medium text-sakura-purple hover:bg-sakura-purple/10"
                      >
                        Cadastrar a peça
                      </button>
                    )}
                    <p className="text-rotulo text-sakura-muted">
                      O nome e o preço já vêm preenchidos. Ao aprovar, ela sai do estoque.
                    </p>
                  </div>
                )}

                {modo === "sem_cadastro" && (
                  <p className="text-rotulo text-sakura-muted">
                    Não mexe no estoque e não sai na nota fiscal até ser cadastrada.
                  </p>
                )}
              </fieldset>
            );
          })}

          {Object.entries(avisosEstoqueInicial).map(([itemId, avisoDoEstoque]) => (
            <p key={itemId} className="rounded-lg bg-amber-50 px-4 py-2 text-corpo text-amber-800">
              {`${cadastradas[itemId] ? `${cadastradas[itemId].descricao}: ` : ""}${avisoDoEstoque}`}
            </p>
          ))}
          {aviso && (
            <p className="rounded-lg bg-amber-50 px-4 py-2 text-corpo text-amber-800">{aviso}</p>
          )}
          {erro && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
          )}
          {faltam > 0 && (
            <p className="text-rotulo text-amber-300">
              {faltam === 1
                ? "Falta escolher o que fazer com 1 peça."
                : `Faltam ${faltam} peças para escolher o que fazer.`}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              disabled={enviando}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => onConfirmar(vinculosDaAprovacao(itens, escolhas))}
              disabled={faltam > 0 || enviando || ligando > 0}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? "Aprovando..." : "Aprovar orçamento"}
            </button>
          </div>
        </div>
      </Modal>

      {cadastrando && (
        <CadastroPecaAvulsaModal
          item={cadastrando}
          pecas={pecasDaJanela}
          lojaId={lojaId}
          onCadastrada={(peca, avisoDoEstoque) => {
            if (avisoDoEstoque) {
              setAvisosEstoqueInicial((a) => ({ ...a, [cadastrando.id]: avisoDoEstoque }));
            }
            void aoCadastrar(cadastrando, peca);
          }}
          onAbrirExistente={(peca) => {
            escolherPeca(cadastrando.id, peca.id);
            setCadastrando(null);
          }}
          onFechar={() => setCadastrando(null)}
        />
      )}
    </>
  );
}
