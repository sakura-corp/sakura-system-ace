import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Modal } from "@/components/Modal";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { mensagemDeErro } from "@/lib/errors";
import {
  ehCategoriaDePneu,
  paraNovaPeca,
  paraQuantidadeInicial,
  paraValoresFormulario,
  pecaFormSchema,
  type PecaFormValues,
} from "@/schemas/peca";
import { acharPecasParecidas, MOTIVO_PARECIDA_ROTULO } from "@/schemas/pecaParecida";
import type { PecaParecida } from "@/schemas/pecaParecida";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { NovaPeca, Peca, PecaJanela } from "@/types/peca";
import { DadosCadastraisFields } from "./campos/DadosCadastraisFields";
import { PneuFields } from "./campos/PneuFields";
import { PrecosFields } from "./campos/PrecosFields";
import { TributosFields } from "./campos/TributosFields";

interface PecaFormProps {
  pecaExistente?: Peca;
  /** Campos já preenchidos numa peça NOVA (ex.: nome e preço da peça avulsa
   *  do orçamento, #655). Ignorado ao editar. */
  valoresIniciais?: Partial<PecaFormValues>;
  categorias: Categoria[];
  /** Regime da loja (Configurações → Dados fiscais) — decide se o código de
   *  ICMS desta peça é CSOSN ou CST, e alimenta o aviso de incompatível. */
  regime: RegimeTributario | null;
  /** O código de ICMS que a própria loja mais usa no cadastro dela, usado
   *  pra pré-preencher uma peça nova em vez de deixar o campo em branco. */
  csosnSugerido: string | null;
  /** O cadastro de peças da loja, pra avisar quando a peça NOVA parece com uma
   *  que já existe. Sem isso (ou editando), não há aviso. */
  // Só precisa do que a janela de peças traz (#366): serve pro Estoque e pra
  // quem cadastra peça rápida sem ter o módulo Estoque.
  pecasDoCadastro?: PecaJanela[];
  /** O caminho do aviso "Abrir a que já existe": quem usa o formulário abre a
   *  peça escolhida em vez de cadastrar uma repetida. */
  onAbrirExistente?: (peca: PecaJanela) => void;
  onSalvar: (peca: NovaPeca, quantidadeInicial: number | null) => Promise<void>;
  onCancelar: () => void;
}

export function PecaForm({
  pecaExistente,
  valoresIniciais,
  categorias,
  regime,
  csosnSugerido,
  pecasDoCadastro,
  onAbrirExistente,
  onSalvar,
  onCancelar,
}: PecaFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  // Quando o aviso de "peça parecida" está aberto, guarda o que foi digitado
  // e as parecidas; o modal fechado volta pro formulário sem perder nada.
  const [pendente, setPendente] = useState<{
    valores: PecaFormValues;
    parecidas: PecaParecida<PecaJanela>[];
  } | null>(null);
  const [gravandoPendente, setGravandoPendente] = useState(false);

  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PecaFormValues>({
    resolver: zodResolver(pecaFormSchema),
    defaultValues: pecaExistente
      ? paraValoresFormulario(pecaExistente)
      : { ...paraValoresFormulario(undefined), ...valoresIniciais },
  });

  const rascunho = useRascunho(
    // Peça nova vinda de um item avulso tem rascunho próprio: não mistura com
    // o do cadastro de Estoque (e o aviso "restaurar" não sobrepõe o nome).
    `rascunho-peca-${pecaExistente?.id ?? (valoresIniciais ? `avulsa-${valoresIniciais.descricao ?? ""}` : "nova")}`,
    watch,
    reset,
  );

  async function gravar(valores: PecaFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovaPeca(valores), paraQuantidadeInicial(valores));
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao salvar peça:", err);
      setErro(mensagemDeErro(err));
    }
  }

  // Aviso, nunca tranca (item 33 do docs/licoes.md): só ao salvar peça NOVA, e
  // a pessoa pode seguir com "Cadastrar mesmo assim". Editar nunca pergunta.
  async function aoSubmeter(valores: PecaFormValues) {
    if (!pecaExistente && pecasDoCadastro && pecasDoCadastro.length > 0) {
      const parecidas = acharPecasParecidas(paraNovaPeca(valores), pecasDoCadastro).slice(0, 3);
      if (parecidas.length > 0) {
        setPendente({ valores, parecidas });
        return;
      }
    }
    await gravar(valores);
  }

  async function cadastrarMesmoAssim() {
    if (!pendente) return;
    setGravandoPendente(true);
    try {
      await gravar(pendente.valores);
    } finally {
      setGravandoPendente(false);
      setPendente(null);
    }
  }

  function abrirExistente(peca: PecaJanela) {
    rascunho.limpar();
    setPendente(null);
    onAbrirExistente?.(peca);
  }

  return (
    <>
      <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onCancelar} />
          <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
            {pecaExistente ? "Editar produto" : "Novo produto"}
          </h2>
        </div>

        {erro && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
        )}

        {rascunho.rascunho && (
          <AvisoRascunho
            descricao="deste produto"
            onRestaurar={rascunho.restaurar}
            onDescartar={rascunho.descartar}
          />
        )}

        <DadosCadastraisFields
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          categorias={categorias}
        />
        {/* O bloco de pneu só aparece quando a categoria escolhida é a de
            pneus — é a peça que essa loja mais vende, e a medida ficava
            afogada na descrição em texto livre. */}
        {ehCategoriaDePneu(categorias.find((c) => c.id === watch("categoria_id"))?.nome) && (
          <PneuFields register={register} />
        )}
        <TributosFields
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          regime={regime}
          csosnSugerido={csosnSugerido}
          editando={Boolean(pecaExistente)}
        />
        <PrecosFields
          register={register}
          watch={watch}
          setValue={setValue}
          editando={Boolean(pecaExistente)}
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting
              ? "Salvando..."
              : pecaExistente
                ? "Salvar alterações"
                : "Salvar peça"}
          </button>
        </div>
      </form>

      {/* Fora do <form> de propósito: o card do formulário (sakura-card) vira a
          "moldura" de tudo que é position:fixed dentro dele, e o aviso ficava
          preso no meio do card em vez de cobrir a janela. Os botões do aviso
          são type="button" e não precisam do formulário. */}
      {pendente && (
        <Modal
          titulo="Peça parecida"
          // Enquanto grava, fechar não desfaz a gravação: o aviso fica aberto
          // mostrando o "Salvando..." até terminar.
          onFechar={() => {
            if (!gravandoPendente) setPendente(null);
          }}
        >
          <div className="space-y-4">
            <p className="text-corpo text-sakura-purple-dark">
              Parece com <em className="font-semibold">{pendente.parecidas[0].peca.descricao}</em>. É a
              mesma?
            </p>
            <ul className="space-y-2">
              {pendente.parecidas.map(({ peca, motivo }) => (
                <li
                  key={peca.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-sakura-gray/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="break-words text-corpo font-medium text-sakura-purple-dark">
                      {peca.descricao}
                    </p>
                    <p className="break-words text-corpo text-sakura-muted">
                      {[
                        peca.codigo_interno && `Código ${peca.codigo_interno}`,
                        peca.codigo_barras && `Barras ${peca.codigo_barras}`,
                        MOTIVO_PARECIDA_ROTULO[motivo],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirExistente(peca)}
                    disabled={gravandoPendente}
                    className="shrink-0 rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Abrir a que já existe
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={cadastrarMesmoAssim}
                disabled={gravandoPendente}
                className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10 disabled:opacity-50"
              >
                {gravandoPendente ? "Salvando..." : "Cadastrar mesmo assim"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
