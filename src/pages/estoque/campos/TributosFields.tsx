import { useEffect } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { OPCOES_ORIGEM } from "@/lib/origemMercadoria";
import type { PecaFormValues } from "@/schemas/peca";
import { motivoCfopIncompativel, motivoCodigoIncompativel, regimeUsaCsosn } from "@/schemas/tributacao";
import type { RegimeTributario } from "@/types/configuracao";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

// Estes campos são a maior fonte de erro do sistema, e o erro deles é
// silencioso: o cadastro fica com cara de preenchido e certo, e a conta só
// chega semanas depois, quando a SEFAZ recusa a nota no meio de uma OS — com
// uma mensagem que diz o NÚMERO do item, nunca o nome da peça
// (PROJETO_STATUS.md, seção 6, item 47). Uma frase por campo dizendo de onde
// tirar o valor é o que transforma "campo em branco que dá medo" em "é isso
// aqui, está na nota do fornecedor".
const EXPLICACAO = {
  ncm: "Código de 8 dígitos que diz o que é o produto para a Receita. Está na nota fiscal do fornecedor, na linha daquele item. A mesma peça tem sempre o mesmo NCM.",
  cest: "Código de 7 dígitos usado em produtos com substituição tributária (pneus e muita peça automotiva têm). Também vem da nota do fornecedor. Na dúvida, pergunte à contabilidade.",
  cfop: "Diz o tipo da operação na hora de vender. Para venda de peça dentro do próprio estado, o normal é 5102 (ou 5405, se a peça tem ICMS já pago antes, CSOSN 500); para outro estado, 6102 (ou 6404).",
  origem: "De onde a mercadoria veio: nacional, importada, ou nacional com conteúdo importado. Vem da nota do fornecedor.",
  aliquota:
    "Percentual de ICMS da peça. Quem é do Simples Nacional normalmente deixa em branco ou zero — o imposto já está no valor que a empresa recolhe pelo faturamento.",
} as const;

export function TributosFields({
  register,
  watch,
  setValue,
  errors,
  regime,
  csosnSugerido,
  editando,
}: {
  register: UseFormRegister<PecaFormValues>;
  watch: UseFormWatch<PecaFormValues>;
  setValue: UseFormSetValue<PecaFormValues>;
  errors: FieldErrors<PecaFormValues>;
  /** Regime da loja, de Configurações → Dados fiscais. */
  regime: RegimeTributario | null;
  /** O código que a própria loja mais usa no cadastro dela. */
  csosnSugerido: string | null;
  editando: boolean;
}) {
  const codigo = watch("cst_ou_csosn");
  const nomeDoCodigo = regime && !regimeUsaCsosn(regime) ? "CST" : "CSOSN";

  // Até aqui a sugestão de código existia só na importação de XML, e o
  // cadastro manual continuava sendo um campo em branco — ou seja, o caminho
  // mais usado era justamente o desprotegido. A sugestão é tirada do
  // cadastro DELA (o código que ela mesma mais usa), nunca inventada aqui.
  //
  // Só em peça NOVA: numa peça já cadastrada, o campo tem que mostrar o que
  // está gravado, mesmo que esteja errado — é assim que dá pra ver e
  // corrigir. E só quando está vazio, pra nunca passar por cima do que a
  // pessoa digitou.
  useEffect(() => {
    if (editando || !csosnSugerido) return;
    if (watch("cst_ou_csosn").trim() !== "") return;
    setValue("cst_ou_csosn", csosnSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csosnSugerido, editando]);

  const motivo = motivoCodigoIncompativel(codigo, regime);
  const cfop = watch("cfop_padrao");
  const motivoCfop = motivoCfopIncompativel(cfop, codigo, regime);

  return (
    <Secao titulo="Tributos">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="NCM" obrigatorio erro={errors.ncm?.message} explicacao={EXPLICACAO.ncm}>
          <input type="text" {...register("ncm")} className={inputClasse} />
        </Campo>
        <Campo label="C.E.S.T" obrigatorio erro={errors.cest?.message} explicacao={EXPLICACAO.cest}>
          <input type="text" {...register("cest")} className={inputClasse} />
        </Campo>
        {/* O aviso do CFOP mora na MESMA célula do campo (e não numa linha
            `col-span-2`), pra não abrir buraco ao lado do CFOP nem empurrar a
            Origem pra baixo. `min-w-0` deixa o texto quebrar de linha em vez de
            esticar a coluna (docs/licoes.md, item 81). O campo continua FORA da
            faixa amarela, pelo mesmo motivo do aviso do código (abaixo). */}
        <div className="flex min-w-0 flex-col gap-2">
          <Campo
            label="CFOP padrão"
            obrigatorio
            erro={errors.cfop_padrao?.message}
            explicacao={EXPLICACAO.cfop}
          >
            <input type="text" {...register("cfop_padrao")} className={inputClasse} />
          </Campo>
          {motivoCfop && (
            <p className="rounded-lg bg-amber-50 px-4 py-2 text-corpo text-amber-900">
              Atenção: {motivoCfop}. Dá para salvar assim mesmo, mas a nota fiscal desta peça
              provavelmente será recusada.
            </p>
          )}
        </div>
        <Campo
          label="Origem"
          obrigatorio
          erro={errors.origem?.message}
          explicacao={EXPLICACAO.origem}
        >
          <select {...register("origem")} className={inputClasse}>
            <option value="" disabled>
              Selecione
            </option>
            {OPCOES_ORIGEM.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          label="CST / CSOSN"
          obrigatorio
          erro={errors.cst_ou_csosn?.message}
          explicacao={
            regime
              ? `O código de ICMS da peça. Sua loja usa ${nomeDoCodigo}${
                  csosnSugerido ? `, e o que você mais usa no cadastro é o ${csosnSugerido}` : ""
                }. Quem é do Simples Nacional usa CSOSN (3 dígitos); quem é do regime normal usa CST (2 dígitos) — trocar um pelo outro faz a SEFAZ recusar a nota.`
              : "O código de ICMS da peça. Quem é do Simples Nacional usa CSOSN (3 dígitos); quem é do regime normal usa CST (2 dígitos). Preencha o regime em Configurações → Dados fiscais para o sistema conferir isso para você."
          }
        >
          <input type="text" {...register("cst_ou_csosn")} className={inputClasse} />
        </Campo>
        <Campo label="Alíquota ICMS (%)" explicacao={EXPLICACAO.aliquota}>
          <input type="number" step="0.01" {...register("aliquota_icms")} className={inputClasse} />
        </Campo>
      </div>

      {/* AVISO, nunca trava (PROJETO_STATUS.md, seção 6, itens 33 e 47): a
          lista de códigos válidos envelhece com mudança de legislação, e
          barrar o cadastro por um palpite daqui seria pior que deixar a
          SEFAZ decidir. O campo fica FORA desta faixa de propósito — faixa
          de aviso é clara, e `globals.css` força letra branca em todo campo,
          então campo dentro dela nasce ilegível (mesmo item 47). */}
      {motivo && codigo.trim() !== "" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-corpo text-amber-900">
          Atenção: este código {motivo}. Dá para salvar assim mesmo, mas a nota fiscal desta peça
          provavelmente será recusada.
        </p>
      )}
    </Secao>
  );
}
