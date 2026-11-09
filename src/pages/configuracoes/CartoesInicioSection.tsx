import { useState } from "react";
import { salvarConfiguracaoPainelInicio } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { CARTAO_METRICA_LABEL, CARTOES_INICIO_PADRAO } from "@/types/configuracao";
import type { CartaoMetrica } from "@/types/configuracao";

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
      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {valores.map((valor, indice) => (
          <label key={indice} className="flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
            Cartão {indice + 1}
            <select
              value={valor}
              onChange={(e) => set(indice, e.target.value as CartaoMetrica)}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo text-sakura-purple-dark focus:border-sakura-purple"
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

      <div className="mt-4 flex items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            Cartões salvos.
          </p>
        )}
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar cartões"}
        </button>
      </div>
    </>
  );
}
