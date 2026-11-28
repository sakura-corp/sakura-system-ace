import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Aviso } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import {
  caixaFormSchema,
  caixaFormVazio,
  FORMAS_DO_LANCAMENTO,
  paraNovoMovimentoCaixa,
  type CaixaFormValues,
} from "@/schemas/caixa";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { NovoMovimentoCaixa, TipoCaixa } from "@/types/caixa";

const TIPOS = [
  { valor: "entrada", nome: "Entrada" },
  { valor: "saida", nome: "Saída" },
] as const;

interface CaixaFormProps {
  /** O `id` do <form>: o botão de enviar fica no rodapé da janela, fora dele. */
  idDoForm: string;
  /** O `id` do campo Valor, que recebe o foco ao abrir a janela. */
  idDoValor: string;
  categorias: CategoriaCaixa[];
  tipoInicial?: TipoCaixa;
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
  /** Avisa a janela que está gravando (o botão do rodapé fica ocupado). */
  onOcupado?: (ocupado: boolean) => void;
}

/**
 * O formulário do lançamento manual, na ordem da conversa do balcão: tipo,
 * valor, forma de pagamento, categoria, descrição. react-hook-form + zod; a
 * forma de pagamento e o tipo são `Chips` (não usam `register`: `watch` e
 * `setValue`).
 */
export function CaixaForm({
  idDoForm,
  idDoValor,
  categorias,
  tipoInicial = "entrada",
  onSalvar,
  onOcupado,
}: CaixaFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const idDaCategoria = useId();
  // Clicar duas vezes (ou Enter + clique) não grava duas vezes.
  const gravando = useRef(false);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CaixaFormValues>({
    resolver: zodResolver(caixaFormSchema),
    defaultValues: caixaFormVazio(tipoInicial),
  });

  useEffect(() => onOcupado?.(isSubmitting), [isSubmitting, onOcupado]);

  const tipo = watch("tipo");
  const forma = watch("forma_pagamento");
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  async function aoSubmeter(valores: CaixaFormValues) {
    if (gravando.current) return;
    gravando.current = true;
    setErro(null);
    try {
      await onSalvar(paraNovoMovimentoCaixa(valores));
    } catch (err) {
      console.error("Erro ao registrar movimento de caixa:", err);
      setErro(mensagemDeErro(err));
    } finally {
      gravando.current = false;
    }
  }

  return (
    <form id={idDoForm} onSubmit={handleSubmit(aoSubmeter)} className="space-y-6">
      {erro && (
        <Aviso tipo="perigo" role="alert" className="text-corpo">
          {erro}
        </Aviso>
      )}

      <div className="space-y-2">
        <p className="sakura-rotulo">Tipo</p>
        <Chips
          rotulo="Tipo"
          opcoes={TIPOS}
          valor={tipo}
          aoEscolher={(novo) => {
            setValue("tipo", novo);
            setValue("categoria_id", "");
          }}
        />
      </div>

      <label className="sakura-rotulo">
        Valor
        <input
          id={idDoValor}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          placeholder="0,00"
          aria-invalid={errors.valor ? true : undefined}
          {...register("valor")}
          className="sakura-campo h-12! text-right text-destaque tabular-nums"
        />
        {errors.valor && <span className="text-rotulo text-perigo">{errors.valor.message}</span>}
      </label>

      <div className="space-y-2">
        <p className="sakura-rotulo">Forma de pagamento</p>
        <Chips
          rotulo="Forma de pagamento"
          opcoes={FORMAS_DO_LANCAMENTO}
          valor={forma}
          aoEscolher={(nova) => setValue("forma_pagamento", nova, { shouldValidate: true })}
        />
        {errors.forma_pagamento && (
          <span className="text-rotulo text-perigo">{errors.forma_pagamento.message}</span>
        )}
      </div>

      {/* Categoria e descrição lado a lado: assim a janela cabe inteira em
          1366 × 700 sem rolar (antes a Descrição ficava escondida embaixo). */}
      <div className="grid grid-cols-2 items-start gap-4">
        <div className="sakura-rotulo min-w-0">
          <label htmlFor={idDaCategoria}>Categoria</label>
          <Combobox
            id={idDaCategoria}
            opcoes={categoriasDoTipo.map((categoria) => ({
              valor: categoria.id,
              rotulo: categoria.nome,
            }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v, { shouldValidate: true })}
            placeholder="Escolha uma categoria"
            desabilitado={categoriasDoTipo.length === 0}
          />
          {categoriasDoTipo.length === 0 ? (
            <span className="flex items-start gap-2 text-rotulo font-normal text-atencao">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                Nenhuma categoria de {tipo === "saida" ? "saída" : "entrada"} cadastrada ainda — um
                administrador cria em Configurações → Categorias de caixa.
              </span>
            </span>
          ) : (
            errors.categoria_id && (
              <span className="text-rotulo text-perigo">{errors.categoria_id.message}</span>
            )
          )}
        </div>

        <label className="sakura-rotulo min-w-0">
          Descrição
          <input type="text" {...register("descricao")} className="sakura-campo" />
        </label>
      </div>
    </form>
  );
}

interface JanelaDoLancamentoProps {
  categorias: CategoriaCaixa[];
  tipoInicial: TipoCaixa;
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
  onFechar: () => void;
}

/**
 * A janela "Novo lançamento". O foco vai pro Valor: o `Modal` põe o foco no ✕
 * ao abrir (de propósito), e o efeito do pai roda depois do dele, por isso o
 * foco do Valor mora aqui e não no formulário (o mesmo jeito da
 * `JanelaDeConfirmar`).
 */
export function JanelaDoLancamento({ categorias, tipoInicial, onSalvar, onFechar }: JanelaDoLancamentoProps) {
  const id = useId();
  const idDoForm = `lancamento-${id}`;
  const idDoValor = `lancamento-valor-${id}`;
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    document.getElementById(idDoValor)?.focus();
  }, [idDoValor]);

  // Enquanto grava, a janela não fecha (Cancelar, ✕ e Esc): se o banco
  // recusar, o erro tem de aparecer aqui, e não num formulário que já sumiu.
  function fecharSeLivre() {
    if (!ocupado) onFechar();
  }

  return (
    <Modal
      titulo="Novo lançamento"
      onFechar={fecharSeLivre}
      rodape={
        <>
          <Botao variante="fantasma" onClick={fecharSeLivre} disabled={ocupado}>
            Cancelar
          </Botao>
          <Botao variante="principal" type="submit" form={idDoForm} ocupado={ocupado}>
            {ocupado ? "Salvando..." : "Registrar lançamento"}
          </Botao>
        </>
      }
    >
      <CaixaForm
        idDoForm={idDoForm}
        idDoValor={idDoValor}
        categorias={categorias}
        tipoInicial={tipoInicial}
        onSalvar={onSalvar}
        onOcupado={setOcupado}
      />
    </Modal>
  );
}
