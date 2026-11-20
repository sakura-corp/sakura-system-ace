import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Modal } from "@/components/Modal";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { ehErroDeRede, mensagemDeErro } from "@/lib/errors";
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
import { AvisoDeErro } from "@/components/Aviso";
import { TributosFields } from "./campos/TributosFields";

/** O nome da peça no aviso, com "(inativa)" quando ela está desativada (#708),
 *  igual à tela de juntar peças: "Abrir a que já existe" não pode levar a uma
 *  peça desativada sem a pessoa saber. */
function nomeNoAviso(peca: PecaJanela): string {
  return peca.ativo ? peca.descricao : `${peca.descricao} (inativa)`;
}

/** Quanto tempo o "Salvando..." espera o banco antes de desistir e avisar (#1129). */
const PRAZO_PARA_SALVAR_MS = 30_000;

const MENSAGEM_DEMOROU =
  "Salvar demorou demais e o programa parou de esperar. Confira a internet. Antes de tentar de novo, veja na lista se o produto já apareceu, pra não cadastrar duas vezes.";

/**
 * O nome de cada campo na lista de erros junto do botão (#1129), igual ao
 * rótulo da tela e na ordem dela. A lista existe porque só os 7 obrigatórios
 * mostram texto embaixo do campo; um campo inválido fora deles (rascunho
 * antigo restaurado, por exemplo) barrava o Salvar sem mensagem nenhuma.
 */
const NOME_DO_CAMPO: Record<keyof PecaFormValues, string> = {
  descricao: "Descrição",
  codigo_barras: "Código de barras",
  codigo_interno: "Referência",
  marca: "Marca",
  modelo: "Modelo",
  unidade: "Unidade",
  categoria_id: "Categoria",
  estoque_minimo: "Estoque mínimo",
  prazo_garantia_dias: "Garantia",
  aplicacao: "Aplicação",
  medida: "Medida",
  indice_carga_velocidade: "Índice de carga e velocidade",
  dot: "DOT",
  ncm: "NCM",
  cest: "C.E.S.T",
  cfop_padrao: "CFOP padrão",
  origem: "Origem",
  cst_ou_csosn: "CST / CSOSN",
  aliquota_icms: "Alíquota ICMS",
  preco_custo: "Aquisição (custo)",
  margem: "Acréscimo sobre o custo %",
  preco_venda: "Preço final",
  quantidade_inicial: "Qtde. estoque inicial",
};

const ORDEM_DOS_CAMPOS = Object.keys(NOME_DO_CAMPO) as (keyof PecaFormValues)[];

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
  /** Só pros testes: o prazo do "Salvando..." (o normal é 30 s). */
  prazoParaSalvarMs?: number;
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
  prazoParaSalvarMs = PRAZO_PARA_SALVAR_MS,
}: PecaFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
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
    // O foco no primeiro campo com erro é feito por `aoRecusar`, na ordem da
    // tela e rolando até ele; o do react-hook-form viria depois e passaria por cima.
    shouldFocusError: false,
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
    let relogio: ReturnType<typeof setTimeout> | undefined;
    const prazo = new Promise<"prazo">((resolver) => {
      relogio = setTimeout(() => resolver("prazo"), prazoParaSalvarMs);
    });
    const gravacao = onSalvar(paraNovaPeca(valores), paraQuantidadeInicial(valores));
    try {
      const resultado = await Promise.race([gravacao.then(() => "gravou" as const), prazo]);
      if (resultado === "prazo") {
        // "Salvando..." sem fim (#1129): solta o botão e diz o que aconteceu.
        // A gravação pode ainda chegar ao banco; por isso a mensagem manda
        // conferir a lista antes de tentar de novo.
        console.error(`Salvar peça passou do prazo de ${prazoParaSalvarMs} ms`);
        rascunho.salvarAgora();
        setErro(MENSAGEM_DEMOROU);
        gravacao.then(
          () => {
            rascunho.limpar();
            setErro(null);
          },
          (err) => {
            console.error("Erro ao salvar peça (depois do prazo):", err);
            setErro(mensagemDeErro(err));
          },
        );
        return;
      }
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao salvar peça:", err);
      // Sem rede: o que foi digitado vai pro rascunho na hora, não só aos 30 s.
      if (ehErroDeRede(err)) rascunho.salvarAgora();
      setErro(mensagemDeErro(err));
    } finally {
      clearTimeout(relogio);
    }
  }

  // Campo inválido (#1129): registra no log, rola até o primeiro da tela e
  // foca nele. A lista dos campos aparece junto do botão (ver o rodapé).
  function aoRecusar(erros: FieldErrors<PecaFormValues>) {
    console.error(
      "Peça não salva: campos com erro",
      Object.fromEntries(
        Object.entries(erros).map(([nome, e]) => [nome, String(e?.message || e?.type || "inválido")]),
      ),
    );
    const primeiro = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>("[name]") ?? [],
    ).find((campo) => (campo.getAttribute("name") ?? "") in erros);
    if (!primeiro) return;
    primeiro.focus({ preventScroll: true });
    primeiro.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }

  const camposComErro = ORDEM_DOS_CAMPOS.filter((nome) => errors[nome]);

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
      <form
        ref={formRef}
        onSubmit={handleSubmit(aoSubmeter, aoRecusar)}
        className="space-y-6 sakura-card p-6"
      >
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onCancelar} />
          <h2 className="font-titulo text-subtitulo font-semibold text-texto">
            {pecaExistente ? "Editar produto" : "Novo produto"}
          </h2>
        </div>

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

        {/* Os erros moram aqui, junto do botão Salvar, e não no topo (#1129):
            é pra onde a pessoa está olhando quando clica, e o topo de um
            formulário comprido fica fora da vista. */}
        <div data-testid="rodape-peca" className="space-y-3">
          {camposComErro.length > 0 && (
            <AvisoDeErro>
              <p>Não deu pra salvar. Confira {camposComErro.length === 1 ? "este campo" : "estes campos"}:</p>
              <ul className="mt-1 list-disc pl-5">
                {camposComErro.map((nome) => (
                  <li key={nome}>{NOME_DO_CAMPO[nome]}</li>
                ))}
              </ul>
            </AvisoDeErro>
          )}
          {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
          <div className="flex justify-end gap-3">
            <Botao variante="fantasma" onClick={onCancelar}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="principal" ocupado={isSubmitting}>
              {isSubmitting
                ? "Salvando..."
                : pecaExistente
                  ? "Salvar alterações"
                  : "Salvar peça"}
            </Botao>
          </div>
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
          rodape={
            <Botao variante="fantasma" onClick={cadastrarMesmoAssim} disabled={gravandoPendente}>
              {gravandoPendente ? "Salvando..." : "Cadastrar mesmo assim"}
            </Botao>
          }
        >
          <div className="space-y-4">
            <p className="text-corpo text-texto">
              Parece com <em className="font-semibold">{nomeNoAviso(pendente.parecidas[0].peca)}</em>. É a
              mesma?
            </p>
            <ul className="space-y-2">
              {pendente.parecidas.map(({ peca, motivo }, indice) => (
                <li
                  key={peca.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-linha px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="break-words text-corpo font-medium text-texto">
                      {nomeNoAviso(peca)}
                    </p>
                    <p className="break-words text-corpo text-texto-2">
                      {[
                        peca.codigo_interno && `Código ${peca.codigo_interno}`,
                        peca.codigo_barras && `Barras ${peca.codigo_barras}`,
                        MOTIVO_PARECIDA_ROTULO[motivo],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {/* Um laranja só: o da primeira peça parecida, que é a mais provável. */}
                  <Botao
                    variante={indice === 0 ? "principal" : "secundario"}
                    onClick={() => abrirExistente(peca)}
                    disabled={gravandoPendente}
                  >
                    Abrir a que já existe
                  </Botao>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </>
  );
}
