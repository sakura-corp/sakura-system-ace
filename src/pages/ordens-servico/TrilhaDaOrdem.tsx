import { Botao } from "@/components/Botao";
import { Passos } from "@/components/Passos";
import { indiceDoPasso, PASSOS_DA_OS, type PassoDaOs } from "@/schemas/passoDaOrdem";

/**
 * A trilha no topo da OS: "Passo 2 de 4 · Receber" e os 4 passos. O passo
 * feito fica verde com ✓, o atual azul (em andamento: o laranja da tela é o
 * botão do próximo passo, embaixo). Clicar num passo feito mostra o que foi
 * feito nele; "Voltar pro passo atual" volta.
 */
export function TrilhaDaOrdem({
  passo,
  carregando,
  passoVisto,
  aoVer,
}: {
  passo: PassoDaOs;
  carregando: boolean;
  passoVisto: PassoDaOs;
  aoVer: (passo: PassoDaOs | null) => void;
}) {
  const indice = indiceDoPasso(passo);
  const total = PASSOS_DA_OS.length;
  const pronto = passo === "pronto";
  const vendoOutro = passoVisto !== passo;

  return (
    <section
      aria-label="Fechar a OS"
      data-trilha-da-os
      className="space-y-4 rounded-2xl border border-linha px-4 py-4"
    >
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-rotulo text-texto-2" aria-live="polite">
          {carregando ? (
            "Vendo em que passo a OS está…"
          ) : pronto ? (
            <span className="font-semibold text-ok">✓ Tudo feito: OS fechada</span>
          ) : (
            <>
              <span className="font-semibold text-texto">
                Passo {indice + 1} de {total}
              </span>{" "}
              · {PASSOS_DA_OS[indice].nome}
            </>
          )}
        </p>
        {vendoOutro && !carregando && (
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => aoVer(null)}>
            {pronto ? "Voltar pro resumo" : `Voltar pro passo atual: ${PASSOS_DA_OS[indice].nome}`}
          </Botao>
        )}
      </div>
      {carregando ? (
        // O esqueleto tem a altura da trilha: a tela não pula quando ela chega.
        <div aria-hidden="true" className="h-[60px] animate-pulse rounded-xl bg-poco motion-reduce:animate-none" />
      ) : (
        <Passos
          rotulo="Passos pra fechar a OS"
          passos={PASSOS_DA_OS}
          atual={indice}
          tomDoAtual="andamento"
          aoVoltar={(i) => aoVer(PASSOS_DA_OS[i].passo)}
        />
      )}
    </section>
  );
}
