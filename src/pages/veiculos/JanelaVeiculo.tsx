import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { CampoDoMolde } from "@/components/molde/CampoDoMolde";
import { MoldeFormulario, SecaoDoFormulario } from "@/components/molde/MoldeFormulario";
import { VeiculoIcone } from "@/components/VeiculoIcone";
import { corVeiculoParaHex } from "@/lib/corVeiculo";
import { hojeLocal } from "@/lib/datas";
import { acharModelo, anosDoModelo, modelosDaMarca, opcoesDeMarca, tipoDoModelo } from "@/lib/marcasVeiculo";
import { type VeiculoFormValues, veiculoFormSchema } from "@/schemas/cliente";
import { TIPO_VEICULO_LABEL, type TipoVeiculo } from "@/types/cliente";
import { mascararPlaca, placaNoPadrao } from "./placa";

/**
 * A janela própria do veículo (#1096, trilha C da leva 8).
 *
 *     Novo veículo                                                    ✕
 *     ────────────────────────────────────────────────────────────────
 *     Placa        Marca           │   ┌──────────────────────┐
 *     [ABC1D23]    [Fiat      ▾]   │   │      (o desenho)      │  ← a prévia, pintada
 *     Modelo       Ano             │   │   [ABC1D23]           │    na cor escolhida
 *     [Strada ▾]   [2015 ▾]        │   │   Fiat Strada · 2015  │
 *     Cor                          │   └──────────────────────┘
 *     ● ● ● ● ● ● ● ● ● ● ● ● ○    │   Tipo
 *     KM atual                     │   [hatch][sedã][SUV][picape][moto]
 *     ────────────────────────────────────────────────────────────────
 *                                          [Cancelar] [Salvar veículo]
 *
 * - **Escolher em vez de digitar, sem trancar**: marca → modelos da marca →
 *   anos do modelo, da lista de `src/lib/marcasVeiculo.ts`; tudo aceita texto
 *   livre (marca fora das 15, modelo que a lista não tem).
 * - **O tipo vem do modelo** e dá pra trocar clicando no desenho. Só os 5 que
 *   o banco aceita: um tipo de fora (vindo de fora da tela) sai vazio.
 * - **A cor em bolinhas** com o nome escrito; cor que não está nas bolinhas
 *   ("Prata metálico") fica em "Outra", com o texto do jeito que estava.
 * - **Não fala com o banco**: devolve o veículo pelo `aoSalvar`, no formato
 *   do formulário do cliente. Quem grava é o "Salvar cliente". Por isso a
 *   janela é desenhada FORA do `<form>` do cliente (#1130).
 */

const TIPOS: TipoVeiculo[] = ["hatch", "sedan", "suv", "picape", "moto"];

/** As cores das bolinhas, as mais comuns no pátio. O nome é o que vai pro banco. */
const CORES = [
  "Branco",
  "Prata",
  "Cinza",
  "Preto",
  "Vermelho",
  "Azul",
  "Verde",
  "Amarelo",
  "Laranja",
  "Marrom",
  "Bege",
  "Vinho",
];

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function corDaBolinha(cor: string): string | null {
  const chave = semAcento(cor);
  return CORES.find((nome) => semAcento(nome) === chave) ?? null;
}

/** Bolinha clara pede o visto escuro, e vice-versa (pela luminância da cor). */
function vistoEscuro(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

function ehTipo(valor: string): valor is TipoVeiculo {
  return (TIPOS as string[]).includes(valor);
}

function temAlgumDado(veiculo: VeiculoFormValues): boolean {
  return Object.entries(veiculo).some(([chave, valor]) => chave !== "id" && Boolean(valor?.trim()));
}

// Os campos de lista (Combobox) têm 44 px; os do molde, 48. A caixa de fora
// iguala a altura, pra a linha Placa | Marca ficar alinhada.
const COMBOBOX_DO_MOLDE = "[&_.sakura-campo]:!h-12";

export function JanelaVeiculo({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial: VeiculoFormValues;
  aoSalvar: (veiculo: VeiculoFormValues) => void;
  aoCancelar: () => void;
}) {
  const base = useId();
  const editando = Boolean(inicial.id) || temAlgumDado(inicial);
  const anoAtual = Number(hojeLocal().slice(0, 4));

  const { register, watch, setValue, handleSubmit } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoFormSchema),
    defaultValues: { ...inicial, tipo: ehTipo(inicial.tipo) ? inicial.tipo : "" },
  });

  const placa = watch("placa");
  const marca = watch("marca");
  const modelo = watch("modelo");
  const ano = watch("ano");
  const cor = watch("cor");
  const tipo = watch("tipo");

  // Cor que já veio escrita e não é de nenhuma bolinha: "Outra", com o texto.
  const [corLivre, setCorLivre] = useState(() => inicial.cor.trim() !== "" && !corDaBolinha(inicial.cor));
  // O último texto do "Outra": passar por uma bolinha e voltar não pode apagar o que estava escrito.
  const ultimaCorLivre = useRef(corLivre ? inicial.cor : "");
  const [erro, setErro] = useState<string | undefined>();

  const opcoesMarca = useMemo(() => opcoesDeMarca().map((m) => ({ valor: m, rotulo: m })), []);
  const opcoesModelo = useMemo(
    () => modelosDaMarca(marca).map((m) => ({ valor: m.nome, rotulo: m.nome })),
    [marca],
  );
  const opcoesAno = useMemo(
    // Até o ano que vem: o carro do ano-modelo seguinte já sai no fim do ano.
    () => anosDoModelo(marca, modelo, anoAtual + 1).map((a) => ({ valor: String(a), rotulo: String(a) })),
    [marca, modelo, anoAtual],
  );

  const tipoPeloModelo = tipoDoModelo(marca, modelo);
  const tipoDesenhado: TipoVeiculo | null = ehTipo(tipo) ? tipo : null;

  function mudarMarca(valor: string) {
    setValue("marca", valor, { shouldDirty: true });
    const doCatalogo = tipoDoModelo(valor, modelo);
    if (doCatalogo) setValue("tipo", doCatalogo, { shouldDirty: true });
  }

  function mudarModelo(valor: string) {
    // "strada" digitado vira "Strada": o nome do catálogo, igual pra todo mundo.
    setValue("modelo", acharModelo(marca, valor)?.nome ?? valor, { shouldDirty: true });
    const doCatalogo = tipoDoModelo(marca, valor);
    if (doCatalogo) setValue("tipo", doCatalogo, { shouldDirty: true });
  }

  function salvar(valores: VeiculoFormValues) {
    // Janela vazia: avisa, em vez de fechar e não aparecer nada na lista.
    if (!temAlgumDado(valores)) {
      setErro("Preencha pelo menos a placa, a marca ou o modelo.");
      return;
    }
    aoSalvar({ ...valores, tipo: ehTipo(valores.tipo) ? valores.tipo : "" });
  }

  const placaCampo = register("placa");
  const kmCampo = register("km_atual");
  const corCampo = register("cor");

  const nomeDaCor = corLivre ? cor.trim() : (corDaBolinha(cor) ?? cor.trim());
  const nomeDoTipo = tipoDesenhado ? TIPO_VEICULO_LABEL[tipoDesenhado] : "Veículo";
  const rotuloDoDesenho = `${nomeDoTipo} ${nomeDaCor ? nomeDaCor.toLowerCase() : "sem cor"}`;
  const descricaoDoCarro = [[marca, modelo].map((t) => t.trim()).filter(Boolean).join(" "), ano.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <MoldeFormulario
      em="janela"
      largura="4xl"
      titulo={editando ? "Editar veículo" : "Novo veículo"}
      descricao="O tipo e a cor desenham o carro no pátio do Início."
      rotuloDoEnviar="Salvar veículo"
      aoEnviar={handleSubmit(salvar)}
      aoCancelar={aoCancelar}
      erro={erro}
    >
      <div className="grid min-w-0 grid-cols-1 gap-8 @[44rem]:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <SecaoDoFormulario>
            <CampoDoMolde
              rotulo="Placa"
              ajuda={
                placa.trim() && !placaNoPadrao(placa)
                  ? "Confira: a placa tem 3 letras e 4 números ou letras (ABC1D23). Dá pra salvar assim mesmo."
                  : undefined
              }
            >
              {(campo) => (
                <input
                  {...campo}
                  {...placaCampo}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABC1D23"
                  className={`${campo.className} font-semibold tracking-[0.08em]`}
                  onChange={(e) => {
                    e.target.value = mascararPlaca(e.target.value);
                    void placaCampo.onChange(e);
                  }}
                />
              )}
            </CampoDoMolde>

            <CampoDoMolde rotulo="Marca">
              {(campo) => (
                <Combobox
                  id={campo.id}
                  className={COMBOBOX_DO_MOLDE}
                  opcoes={opcoesMarca}
                  valor={marca}
                  onMudar={mudarMarca}
                  placeholder="Escolha ou digite"
                  permitirLivre
                />
              )}
            </CampoDoMolde>

            <CampoDoMolde rotulo="Modelo">
              {(campo) => (
                <Combobox
                  id={campo.id}
                  className={COMBOBOX_DO_MOLDE}
                  opcoes={opcoesModelo}
                  valor={modelo}
                  onMudar={mudarModelo}
                  placeholder={opcoesModelo.length ? "Escolha ou digite" : "Digite o modelo"}
                  permitirLivre
                />
              )}
            </CampoDoMolde>

            <CampoDoMolde rotulo="Ano">
              {(campo) => (
                <Combobox
                  id={campo.id}
                  className={COMBOBOX_DO_MOLDE}
                  opcoes={opcoesAno}
                  valor={ano}
                  onMudar={(valor) =>
                    setValue("ano", valor.replace(/\D/g, "").slice(0, 4), { shouldDirty: true })
                  }
                  placeholder={opcoesAno.length ? "Escolha ou digite" : "Digite o ano"}
                  permitirLivre
                />
              )}
            </CampoDoMolde>
          </SecaoDoFormulario>

          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-corpo font-medium text-texto">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {CORES.map((nome) => {
                const hex = corVeiculoParaHex(nome);
                return (
                  <label
                    key={nome}
                    className="group flex w-14 cursor-pointer flex-col items-center gap-1 rounded-xl py-1 text-meta text-texto-2 has-[:checked]:font-semibold has-[:checked]:text-texto has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acao-clara"
                  >
                    <input
                      type="radio"
                      name={`${base}cor`}
                      className="sr-only"
                      checked={!corLivre && corDaBolinha(cor) === nome}
                      onChange={() => {
                        setCorLivre(false);
                        setValue("cor", nome, { shouldDirty: true });
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-full border border-linha-forte ring-offset-2 ring-offset-janela group-has-[:checked]:ring-2 group-has-[:checked]:ring-acao-clara"
                      style={{ backgroundColor: hex }}
                    >
                      <Check
                        className={`hidden size-4 group-has-[:checked]:block ${vistoEscuro(hex) ? "text-[#141418]" : "text-white"}`}
                        strokeWidth={3}
                      />
                    </span>
                    {nome}
                  </label>
                );
              })}
              <label className="group flex w-14 cursor-pointer flex-col items-center gap-1 rounded-xl py-1 text-meta text-texto-2 has-[:checked]:font-semibold has-[:checked]:text-texto has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acao-clara">
                <input
                  type="radio"
                  name={`${base}cor`}
                  className="sr-only"
                  checked={corLivre}
                  onChange={() => {
                    setCorLivre(true);
                    setValue("cor", ultimaCorLivre.current, { shouldDirty: true });
                  }}
                />
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full border border-dashed border-texto-2 text-corpo text-texto-2 ring-offset-2 ring-offset-janela group-has-[:checked]:ring-2 group-has-[:checked]:ring-acao-clara"
                >
                  …
                </span>
                Outra
              </label>
            </div>
            {corLivre && (
              <div className="mt-2 max-w-xs">
                <CampoDoMolde rotulo="Qual cor?">
                  {(campo) => (
                    <input
                      {...campo}
                      {...corCampo}
                      autoComplete="off"
                      placeholder="Azul Netuno"
                      onChange={(e) => {
                        ultimaCorLivre.current = e.target.value;
                        void corCampo.onChange(e);
                      }}
                    />
                  )}
                </CampoDoMolde>
              </div>
            )}
          </fieldset>

          <div className="max-w-[calc(50%-0.5rem)] min-w-48">
            <CampoDoMolde rotulo="KM atual" ajuda="O da OS mais recente vale mais que este.">
              {(campo) => (
                <input
                  {...campo}
                  {...kmCampo}
                  inputMode="numeric"
                  autoComplete="off"
                  className={`${campo.className} tabular-nums`}
                  onChange={(e) => {
                    // Até 7 algarismos: o banco guarda o KM num inteiro, e 9.999.999 km já sobra.
                    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 7);
                    void kmCampo.onChange(e);
                  }}
                />
              )}
            </CampoDoMolde>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <figure
            aria-label="Como o carro aparece no pátio"
            className="flex flex-col items-center gap-4 rounded-2xl border border-linha bg-poco px-6 pb-6 pt-8"
          >
            <VeiculoIcone
              tipo={tipoDesenhado}
              cor={nomeDaCor}
              rotulo={rotuloDoDesenho}
              className="h-32 w-full max-w-[17rem]"
            />
            <figcaption className="flex min-w-0 flex-col items-center gap-2 text-center">
              <span className="inline-flex h-8 flex-col overflow-hidden rounded-[7px] border border-linha-forte bg-placa">
                <span aria-hidden="true" className="block h-1 w-full shrink-0 bg-placa-faixa" />
                <span
                  className={`flex flex-1 items-center px-3 text-rotulo font-bold tracking-[0.08em] ${placa.trim() ? "text-texto" : "text-texto-2"}`}
                >
                  {placa.trim() || "SEM PLACA"}
                </span>
              </span>
              <span className="max-w-full truncate text-corpo text-texto-2">
                {descricaoDoCarro || "Escolha a marca e o modelo"}
              </span>
            </figcaption>
          </figure>

          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-corpo font-medium text-texto">Tipo</legend>
            <div className="grid grid-cols-5 gap-2">
              {TIPOS.map((opcao) => (
                <label
                  key={opcao}
                  className="flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-linha px-1 py-2 text-meta text-texto-2 transition-colors duration-150 hover:bg-passar has-[:checked]:border-acao-clara has-[:checked]:bg-acao/10 has-[:checked]:font-semibold has-[:checked]:text-texto has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acao-clara motion-reduce:transition-none"
                >
                  <input
                    type="radio"
                    name={`${base}tipo`}
                    className="sr-only"
                    checked={tipo === opcao}
                    onChange={() => setValue("tipo", opcao, { shouldDirty: true })}
                  />
                  <VeiculoIcone tipo={opcao} cor={nomeDaCor} className="h-6 w-full" />
                  {TIPO_VEICULO_LABEL[opcao]}
                </label>
              ))}
            </div>
            <p className="text-rotulo text-texto-2">
              {tipoPeloModelo && tipoPeloModelo === tipo
                ? "Veio do modelo. Clique em outro desenho pra trocar."
                : "Clique no desenho do tipo do carro."}
            </p>
          </fieldset>
        </div>
      </div>
    </MoldeFormulario>
  );
}
