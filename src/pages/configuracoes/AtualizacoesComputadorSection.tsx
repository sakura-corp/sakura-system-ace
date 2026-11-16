import { Botao } from "@/components/Botao";
import { useEffect, useState } from "react";
import { useConexao } from "@/hooks/useConexao";
import { mensagemDeErro } from "@/lib/errors";
import {
  CANAIS_ATUALIZACAO,
  CANAL_ATUALIZACAO_DESCRICAO,
  CANAL_ATUALIZACAO_ROTULO,
  type CanalAtualizacao,
} from "@/schemas/canalAtualizacao";
import { AvisoDeAtencao, AvisoDeSalvo, MensagemDeErro } from "./pecas";

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
  // #374: aviso perto do botão; nada trava.
  const { semConexao } = useConexao();
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
      <p className="text-corpo text-texto-2">
        Esta escolha só existe no programa instalado — aqui não há atualização automática.
      </p>
    );
  }

  if (!atual || !escolha) {
    return erro ? (
      <MensagemDeErro>{erro}</MensagemDeErro>
    ) : (
      <p className="text-corpo text-texto-2">Carregando...</p>
    );
  }

  return (
    <>
      {erro && <MensagemDeErro className="mb-4">{erro}</MensagemDeErro>}
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Canal de atualização deste computador</legend>
        {CANAIS_ATUALIZACAO.map((canal) => (
          <label
            key={canal}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-corpo transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sakura-focus ${
              escolha === canal ? "border-acao bg-acao/10" : "border-linha-forte hover:bg-passar"
            }`}
          >
            <input
              type="radio"
              name="canal-atualizacao"
              checked={escolha === canal}
              onChange={() => {
                setEscolha(canal);
                setSalvo(false);
              }}
              className="mt-1 size-[18px] shrink-0 accent-acao"
            />
            <span>
              <span className="font-semibold text-texto">
                {CANAL_ATUALIZACAO_ROTULO[canal]}
                {canal === atual && (
                  <span className="ml-2 text-rotulo font-normal text-texto-2">
                    (escolha atual)
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-rotulo text-texto-2">
                {CANAL_ATUALIZACAO_DESCRICAO[canal]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {atual === "teste" && escolha === "normal" && (
        <p className="mt-4 text-rotulo text-texto-2">
          Se este computador já recebeu uma versão que ainda está em teste, ele continua nela até as
          outras lojas passarem dela — nunca volta sozinho para uma versão mais velha.
        </p>
      )}

      {semConexao && (
        <AvisoDeAtencao role="status" className="mt-4 text-rotulo">
          Sem internet o programa não procura atualização: ele procura sozinho da próxima vez que
          for aberto com internet. Trocar o canal aqui funciona mesmo assim.
        </AvisoDeAtencao>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {salvo && (
          <AvisoDeSalvo>Salvo. Vale a partir da próxima vez que o programa for aberto.</AvisoDeSalvo>
        )}
        <Botao type="button" variante="principal" onClick={handleSalvar} ocupado={salvando} disabled={escolha === atual}>
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
      </div>
    </>
  );
}
