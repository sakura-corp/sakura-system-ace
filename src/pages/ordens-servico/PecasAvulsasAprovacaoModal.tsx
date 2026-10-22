import { useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import {
  pendenciasDaAprovacao,
  vinculosDaAprovacao,
  type CaminhoAvulsa,
} from "@/schemas/orcamento";
import { formatarMoeda } from "@/schemas/dinheiro";
import { acharPecasParecidas } from "@/schemas/pecaParecida";
import type { ItemOS } from "@/types/os";
import type { Peca } from "@/types/peca";
import { CadastroPecaAvulsaModal } from "./CadastroPecaAvulsaModal";

type Modo = "existente" | "cadastrar" | "sem_cadastro";

const ROTULO_DO_MODO: Record<Modo, string> = {
  existente: "É uma peça que já tenho",
  cadastrar: "Cadastrar agora",
  sem_cadastro: "Seguir sem cadastro",
};

interface PecasAvulsasAprovacaoModalProps {
  /** As peças avulsas do orçamento (as que vieram sem `peca_id`). */
  itens: ItemOS[];
  /** O cadastro da loja: de onde se escolhe a peça que "já tenho". */
  pecas: Peca[];
  lojaId: string;
  /** Aprovando agora: trava os botões até a resposta voltar. */
  enviando: boolean;
  /** Erro da aprovação, mostrado aqui dentro pra janela não esconder. */
  erro: string | null;
  onConfirmar: (vinculos: { itemId: string; pecaId: string }[]) => void;
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
  enviando,
  erro,
  onConfirmar,
  onFechar,
}: PecasAvulsasAprovacaoModalProps) {
  const [modos, setModos] = useState<Record<string, Modo>>({});
  const [escolhidas, setEscolhidas] = useState<Record<string, string>>({});
  const [cadastradas, setCadastradas] = useState<Record<string, Peca>>({});
  const [cadastrando, setCadastrando] = useState<ItemOS | null>(null);

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
          {itens.map((item) => {
            const modo = modos[item.id];
            // As parecidas com o que foi digitado vão no topo da lista.
            const parecidas = acharPecasParecidas(
              { descricao: item.descricao, codigo_interno: null, codigo_barras: null, medida: null },
              pecasDaJanela,
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
              disabled={faltam > 0 || enviando}
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
          onCadastrada={(peca) => {
            setCadastradas((c) => ({ ...c, [cadastrando.id]: peca }));
            setModos((m) => ({ ...m, [cadastrando.id]: "cadastrar" }));
            setCadastrando(null);
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
