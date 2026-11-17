import { Botao } from "@/components/Botao";
import { useState } from "react";
import { salvarConfiguracaoPainelInicio } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { CARTAO_METRICA_LABEL, CARTOES_INICIO_PADRAO } from "@/types/configuracao";
import type { CartaoMetrica } from "@/types/configuracao";
import { AvisoDeSalvo } from "./pecas";
import { AvisoDeErro } from "@/components/Aviso";

interface CartoesInicioSectionProps {
  cartoes: CartaoMetrica[];
  lojaId: string;
  onSalvo: () => Promise<void>;
}

const OPCOES = Object.keys(CARTAO_METRICA_LABEL) as CartaoMetrica[];

export function CartoesInicioSection({
  cartoes,
  lojaId,
  onSalvo,
}: CartoesInicioSectionProps) {
  const [valores, setValores] = useState<CartaoMetrica[]>(() => {
    const base = [...cartoes];
    while (base.length < 3) base.push(CARTOES_INICIO_PADRAO[base.length] ?? OPCOES[0]);
    return base.slice(0, 3);
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function set(indice: number, valor: CartaoMetrica) {
    setValores((atual) => atual.map((v, i) => (i === indice ? valor : v)));
    setSalvo(false);
  }

  async function handleSalvar() {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      await salvarConfiguracaoPainelInicio(lojaId, valores);
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar cartões do Início:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
      <div className="grid gap-4 sm:grid-cols-3">
        {valores.map((valor, indice) => (
          <label key={indice} className="sakura-rotulo">
            Cartão {indice + 1}
            <select
              value={valor}
              onChange={(e) => set(indice, e.target.value as CartaoMetrica)}
              className="sakura-campo"
            >
              {OPCOES.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {CARTAO_METRICA_LABEL[opcao]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {salvo && (
          <AvisoDeSalvo>Cartões salvos.</AvisoDeSalvo>
        )}
        <Botao type="button" variante="principal" onClick={handleSalvar} ocupado={salvando}>
          {salvando ? "Salvando..." : "Salvar cartões"}
        </Botao>
      </div>
    </>
  );
}
