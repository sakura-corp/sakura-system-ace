import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Dica } from "@/components/Dica";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { listarModelosWhatsapp, textoDoModelo } from "@/lib/modelosWhatsapp";
import { abrirWhatsappSemNumero } from "@/lib/whatsapp";
import { MODULOS_QUE_LEEM_O_CAIXA } from "@/schemas/painelInicio";
import { temPermissao, type ModuloChave } from "@/types/operador";

export interface EscolhaResumoDono {
  rotulo: string;
  /**
   * Monta o texto. Recebe o modelo da loja (ou o padrão, ainda chegando), o nome da loja e o
   * "pode ver" de quem apertou: a montagem (`textoResumoDono`) tira do texto a
   * linha de cada número que a pessoa não pode ver.
   */
  montarTexto: (contexto: {
    modelo: Promise<string>;
    loja: string | null;
    podeVer: (modulo: ModuloChave) => boolean;
  }) => Promise<string> | string;
}

/**
 * O botão "Resumo pro dono" (#397): abre o WhatsApp SEM número, com o resumo
 * pronto, e a pessoa escolhe o contato e manda. Nada é enviado sozinho.
 *
 * Só aparece pra quem tem Caixa ou Relações (`MODULOS_QUE_LEEM_O_CAIXA`), a
 * mesma regra dos cartões de dinheiro do Início: pra quem não lê o Caixa
 * inteiro, recebido e lucro sairiam errados com cara de certos.
 *
 * Com uma escolha só (o Fechamento), é um botão; com mais (Hoje / Este mês,
 * no Início), um botão por escolha, lado a lado.
 */
export function BotaoResumoDono({ escolhas }: { escolhas: EscolhaResumoDono[] }) {
  const { operador, lojaAtual } = useAuth();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const podeVer = (modulo: ModuloChave) => temPermissao(operador, modulo);
  if (!MODULOS_QUE_LEEM_O_CAIXA.some(podeVer) || !lojaAtual) return null;

  async function abrir(escolha: EscolhaResumoDono) {
    if (!lojaAtual) return;
    setErro(null);
    setAbrindo(escolha.rotulo);
    try {
      // Sem os modelos da loja vale o texto padrão: não impede o resumo. O
      // modelo vai "a caminho" pra quem monta, que espera por ele junto com
      // os próprios dados (uma espera só, não duas seguidas).
      const modelo = listarModelosWhatsapp(lojaAtual.id)
        .catch((err) => {
          console.error("Erro ao carregar os modelos de WhatsApp:", err);
          return {} as Record<string, string>;
        })
        .then((modelos) => textoDoModelo(modelos, "resumo_dono"));
      const texto = await escolha.montarTexto({ modelo, loja: lojaAtual.nome ?? null, podeVer });
      await abrirWhatsappSemNumero(texto);
    } catch (err) {
      console.error("Erro ao abrir o resumo pro dono:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setAbrindo(null);
    }
  }

  const sozinho = escolhas.length === 1;

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {!sozinho && <span className="text-rotulo text-texto-2">Resumo pro dono:</span>}
        {escolhas.map((escolha) => (
          <Dica key={escolha.rotulo} texto="Abre o WhatsApp com o resumo pronto; você escolhe o contato e manda">
            <Botao
              variante="whatsapp"
              icone={<MessageCircle aria-hidden="true" />}
              onClick={() => abrir(escolha)}
              disabled={abrindo !== null}
            >
              {abrindo === escolha.rotulo ? "Abrindo..." : escolha.rotulo}
            </Botao>
          </Dica>
        ))}
      </div>
      {erro && <p className="rounded-lg bg-perigo/[0.13] px-3 py-1 text-rotulo text-perigo">{erro}</p>}
    </div>
  );
}
