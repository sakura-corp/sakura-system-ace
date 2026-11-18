import { Link } from "react-router-dom";
import type { AvisoTributos } from "@/schemas/avisoTributos";
import { AvisoDeAtencao } from "@/components/Aviso";

interface AvisoTributosDoMesProps {
  aviso: AvisoTributos;
  /** Nenhuma alíquota configurada: a nota sai sem a linha dos tributos. */
  semAliquota: boolean;
  /** Quando existe, mostra o botão de confirmar (só quem edita a config fiscal). */
  onConfirmar?: () => void;
  confirmando?: boolean;
  /** Link pra Configurações (quem pode editar ajusta o número lá). */
  linkConfiguracoes?: string;
}

// Aviso do mês dos tributos aproximados na nota (#1040). Só aviso: a emissão
// nunca espera por ele. Só texto, botão e link dentro da faixa (nunca campo).
export function AvisoTributosDoMes({
  aviso,
  semAliquota,
  onConfirmar,
  confirmando = false,
  linkConfiguracoes,
}: AvisoTributosDoMesProps) {
  if (!aviso.precisa) return null;

  return (
    <AvisoDeAtencao>
      <p className="font-semibold">
        Confira as alíquotas dos tributos aproximados de {aviso.mes}.
      </p>
      <p className="mt-1 text-rotulo">
        {semAliquota
          ? "Nenhuma alíquota está configurada: a nota está saindo sem a linha dos tributos. Peça os números do mês à contabilidade."
          : "A nota continua saindo com o último número salvo. Peça os números do mês à contabilidade e atualize, se mudaram."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {onConfirmar && (
          <button
            type="button"
            onClick={onConfirmar}
            disabled={confirmando}
            className="rounded-xl bg-atencao px-4 py-2 text-rotulo font-semibold text-fundo hover:opacity-90 disabled:opacity-50"
          >
            {confirmando ? "Guardando..." : "Confirmei a alíquota deste mês"}
          </button>
        )}
        {linkConfiguracoes && (
          <Link to={linkConfiguracoes} className="text-rotulo font-semibold text-atencao underline">
            Abrir Dados fiscais
          </Link>
        )}
      </div>
    </AvisoDeAtencao>
  );
}
