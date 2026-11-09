import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { salvarJurosParcelas } from "@/lib/configuracoes";
import type { JurosParcela } from "@/types/configuracao";

interface JurosParcelasSectionProps {
  jurosParcelas: JurosParcela[];
  lojaId: string;
  onSalvo: () => Promise<void>;
}

const NUMEROS_PARCELA = Array.from({ length: 11 }, (_, i) => i + 2);

export function JurosParcelasSection({
  jurosParcelas,
  lojaId,
  onSalvo,
}: JurosParcelasSectionProps) {
  const [valores, setValores] = useState<Record<number, string>>(() => {
    const mapa: Record<number, string> = {};
    for (const n of NUMEROS_PARCELA) {
      mapa[n] = String(
        jurosParcelas.find((j) => j.numero_parcelas === n)?.juros_percentual ?? 0,
      );
    }
    return mapa;
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function handleSalvar() {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      const lista: Omit<JurosParcela, "loja_id">[] = NUMEROS_PARCELA.map((n) => ({
        numero_parcelas: n,
        juros_percentual: Number(valores[n]) || 0,
      }));
      await salvarJurosParcelas(lojaId, lista);
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar juros de parcelamento:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}
      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {NUMEROS_PARCELA.map((n) => (
          <label key={n} className="flex flex-col gap-1 text-rotulo">
            <span className="text-sakura-purple-dark/90">{n}x</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                value={valores[n]}
                onChange={(e) =>
                  setValores((atual) => ({ ...atual, [n]: e.target.value }))
                }
                className="w-full rounded-lg border border-sakura-borda-campo px-2 py-1.5 text-corpo text-sakura-purple-dark"
              />
              <span className="text-sakura-muted">%</span>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            Juros salvos.
          </p>
        )}
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar juros"}
        </button>
      </div>
    </>
  );
}
