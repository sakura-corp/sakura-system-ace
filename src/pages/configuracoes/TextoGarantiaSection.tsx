import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { salvarTextoGarantia } from "@/lib/configuracoes";

interface TextoGarantiaSectionProps {
  texto: string;
  lojaId: string;
  onSalvo: () => Promise<void>;
}

export function TextoGarantiaSection({
  texto,
  lojaId,
  onSalvo,
}: TextoGarantiaSectionProps) {
  const [valor, setValor] = useState(texto);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function handleSalvar() {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      await salvarTextoGarantia(lojaId, valor);
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar texto de garantia:", err);
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
      <textarea
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setSalvo(false);
        }}
        rows={8}
        className="mt-4 w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo text-sakura-purple-dark focus:border-sakura-purple"
      />

      <div className="mt-4 flex items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            Texto de garantia salvo.
          </p>
        )}
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar texto"}
        </button>
      </div>
    </>
  );
}
