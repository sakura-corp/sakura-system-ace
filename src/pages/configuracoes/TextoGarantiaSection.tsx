import { Botao } from "@/components/Botao";
import { useState } from "react";
import { mensagemDeErro } from "@/lib/errors";
import { salvarTextoGarantia } from "@/lib/configuracoes";
import { AvisoDeSalvo, MensagemDeErro } from "./pecas";

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
      {erro && <MensagemDeErro className="mt-3">{erro}</MensagemDeErro>}
      <textarea
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setSalvo(false);
        }}
        rows={8}
        aria-label="Texto de garantia"
        className="sakura-campo mt-4"
      />

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {salvo && (
          <AvisoDeSalvo>Texto de garantia salvo.</AvisoDeSalvo>
        )}
        <Botao type="button" variante="principal" onClick={handleSalvar} ocupado={salvando}>
          {salvando ? "Salvando..." : "Salvar texto"}
        </Botao>
      </div>
    </>
  );
}
