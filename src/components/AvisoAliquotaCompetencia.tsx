import type { AvisoAliquota } from "@/schemas/aliquotaCompetencia";
import { AvisoDeAtencao } from "@/components/Aviso";

interface AvisoAliquotaCompetenciaProps {
  aviso: AvisoAliquota;
  /** Quando existe, mostra o botão "Já cadastrei" (só no Início). */
  onConfirmar?: () => void;
  confirmando?: boolean;
}

// O aviso de que falta cadastrar a alíquota daquele mês no portal da
// prefeitura. Aparece no Início (com o botão "Já cadastrei") e dentro da
// janela de emissão de NFS-e (só o texto — ali o que resolve é ir no portal,
// não dizer que já foi).
//
// Só texto e botão dentro da faixa: campo de formulário nunca vai dentro de
// uma faixa clara, porque `globals.css` força letra branca em todo input e o
// campo nasceria ilegível (PROJETO_STATUS.md, seção 6, item 47).
export function AvisoAliquotaCompetencia({
  aviso,
  onConfirmar,
  confirmando = false,
}: AvisoAliquotaCompetenciaProps) {
  if (!aviso.precisa) return null;

  return (
    <AvisoDeAtencao>
      <p className="font-semibold">
        Antes da primeira nota de serviço de {aviso.mes}, cadastre a alíquota da competência no
        portal da prefeitura.
      </p>
      <p className="mt-1 text-rotulo">
        Sem esse cadastro, a prefeitura recusa a NFS-e — é um cadastro por mês, feito no portal
        dela, não aqui no sistema.
      </p>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-rotulo text-atencao">
        {aviso.passoAPasso}
      </pre>
      {onConfirmar && (
        <button
          type="button"
          onClick={onConfirmar}
          disabled={confirmando}
          className="mt-3 rounded-xl bg-atencao px-4 py-2 text-rotulo font-semibold text-fundo hover:opacity-90 disabled:opacity-50"
        >
          {confirmando ? "Guardando..." : "Já cadastrei"}
        </button>
      )}
    </AvisoDeAtencao>
  );
}
