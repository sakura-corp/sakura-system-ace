import { Botao } from "@/components/Botao";
import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { salvarJurosParcelas } from "@/lib/configuracoes";
import type { JurosParcela } from "@/types/configuracao";
import { AvisoDeSalvo } from "./pecas";
import { AvisoDeErro } from "@/components/Aviso";

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
      {erro && <AvisoDeErro className="mb-4">{erro}</AvisoDeErro>}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {NUMEROS_PARCELA.map((n) => (
          <label key={n} className="sakura-rotulo">
            <span>{n}x</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                value={valores[n]}
                onChange={(e) => {
                  setValores((atual) => ({ ...atual, [n]: e.target.value }));
                  setSalvo(false);
                }}
                className="sakura-campo"
              />
              <span className="text-texto-2">%</span>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {salvo && (
          <AvisoDeSalvo>Juros salvos.</AvisoDeSalvo>
        )}
        <Botao type="button" variante="principal" onClick={handleSalvar} ocupado={salvando}>
          {salvando ? "Salvando..." : "Salvar juros"}
        </Botao>
      </div>
    </>
  );
}
