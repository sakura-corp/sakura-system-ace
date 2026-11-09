import { useEffect, useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import {
  CANAIS_ATUALIZACAO,
  CANAL_ATUALIZACAO_DESCRICAO,
  CANAL_ATUALIZACAO_ROTULO,
  type CanalAtualizacao,
} from "@/schemas/canalAtualizacao";

// Por qual canal ESTE computador recebe versão nova (item TR-09.1). Diferente
// das outras seções de Configurações, isto não mora no banco: cada computador
// tem a sua escolha, guardada nele mesmo. É por isso que a seção não recebe
// `lojaId` nem `onSalvo`.
//
// Fica aqui, e não na tela de Diagnóstico (que todo operador vê), porque
// trocar de canal decide quem vai testar uma versão antes das outras lojas —
// não é coisa pra estar ao alcance de um clique distraído no balcão.
export function AtualizacoesComputadorSection() {
  const ponte = typeof window !== "undefined" ? window.sakuraApp : undefined;
  const disponivel = Boolean(ponte?.canalAtualizacao && ponte?.definirCanalAtualizacao);

  const [atual, setAtual] = useState<CanalAtualizacao | null>(null);
  const [escolha, setEscolha] = useState<CanalAtualizacao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!ponte?.canalAtualizacao) return;
    ponte
      .canalAtualizacao()
      .then((canal) => {
        setAtual(canal);
        setEscolha(canal);
      })
      .catch((err) => setErro(mensagemDeErro(err)));
    // A ponte não muda durante a vida da tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSalvar() {
    if (!escolha || !ponte?.definirCanalAtualizacao) return;
    if (
      escolha === "teste" &&
      !confirm(
        "Este computador vai passar a receber cada versão nova ANTES das outras lojas, pra testar no dia a dia. Continuar?",
      )
    ) {
      return;
    }
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      await ponte.definirCanalAtualizacao(escolha);
      setAtual(escolha);
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar o canal de atualização:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  if (!disponivel) {
    return (
      <p className="text-corpo text-sakura-muted">
        Esta escolha só existe no programa instalado — aqui não há atualização automática.
      </p>
    );
  }

  if (!atual || !escolha) {
    return erro ? (
      <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
    ) : (
      <p className="text-corpo text-sakura-muted">Carregando...</p>
    );
  }

  return (
    <>
      {erro && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}
      <fieldset className="space-y-3">
        <legend className="sr-only">Canal de atualização deste computador</legend>
        {CANAIS_ATUALIZACAO.map((canal) => (
          <label key={canal} className="flex items-start gap-3 text-corpo">
            <input
              type="radio"
              name="canal-atualizacao"
              checked={escolha === canal}
              onChange={() => {
                setEscolha(canal);
                setSalvo(false);
              }}
              className="mt-1 h-4 w-4 text-sakura-purple focus:ring-sakura-purple"
            />
            <span>
              <span className="font-medium text-sakura-purple-dark">
                {CANAL_ATUALIZACAO_ROTULO[canal]}
                {canal === atual && (
                  <span className="ml-2 text-rotulo font-normal text-sakura-muted">
                    (escolha atual)
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-rotulo text-sakura-muted">
                {CANAL_ATUALIZACAO_DESCRICAO[canal]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {atual === "teste" && escolha === "normal" && (
        <p className="mt-3 text-rotulo text-sakura-muted">
          Se este computador já recebeu uma versão que ainda está em teste, ele continua nela até as
          outras lojas passarem dela — nunca volta sozinho para uma versão mais velha.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            Salvo. Vale a partir da próxima vez que o programa for aberto.
          </p>
        )}
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando || escolha === atual}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </>
  );
}
