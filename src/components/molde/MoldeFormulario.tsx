import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type BaseSyntheticEvent,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { AvisoDeErro } from "../Aviso";
import { Botao } from "../Botao";
import { Modal } from "../Modal";

/**
 * O molde de formulário do visual da leva 8 (#1085, parte 3/5 #1134): o jeito
 * único de fazer formulário no programa. Cada tela troca pro molde na sua
 * tarefa.
 *
 * - **Curto (até uns 6 campos) abre em janela** (`em="janela"`, por dentro é
 *   o `Modal`): o foco já cai no primeiro campo, Esc fecha.
 * - **Longo abre em página própria** (`em="pagina"`): cada seção num cartão, e
 *   as ações num rodapé que fica à vista no fim da tela. Aqui o Esc NÃO fecha:
 *   uma tecla não pode jogar fora um cadastro comprido (erro evitado).
 *
 *     Novo cliente                                        ✕
 *     ─────────────────────────────────────────────────────
 *     Nome  obrigatório
 *     [ Maria Souza                                   ]  48 px
 *     Telefone
 *     [ (16) 99999-0000                               ]
 *     Com DDD.
 *     ─────────────────────────────────────────────────────
 *     △ Não deu pra salvar…        [Cancelar] [Salvar cliente]
 *
 * O padrão de formulário continua o de `docs/estrutura.md`: o `useForm` (com o
 * `zodResolver` do esquema em `src/schemas/`) é da tela; o molde só desenha e
 * cuida do envio. Os campos são `CampoDoMolde`, agrupados em
 * `SecaoDoFormulario`:
 *
 *     <MoldeFormulario em="janela" titulo="Novo cliente" rotuloDoEnviar="Salvar cliente"
 *       aoEnviar={handleSubmit(salvar)} aoCancelar={fechar} erro={erroAoSalvar}>
 *       <SecaoDoFormulario>
 *         <CampoDoMolde rotulo="Nome" obrigatorio erro={errors.nome?.message}>
 *           {(campo) => <input {...campo} {...register("nome")} />}
 *         </CampoDoMolde>
 *       </SecaoDoFormulario>
 *     </MoldeFormulario>
 *
 * **Teclado** (o balcão é operado sem mouse): o Enter anda de campo em campo e,
 * no último, vai pro botão principal (é o `useEnterParaProximoCampo` do
 * programa, que acha o botão mesmo no rodapé da janela, fora do `<form>`); mais
 * um Enter salva. **Clicar 2 vezes não salva 2 vezes**: enquanto o
 * `aoEnviar` não termina (ele devolve a promessa do `handleSubmit`), o botão
 * diz "Salvando…" e não aceita outro envio. O botão continua focável nesse
 * meio tempo (`aria-disabled`, e não `disabled`): desligar o botão focado
 * jogaria o foco pro começo da tela.
 *
 * **Janela com formulário nunca dentro de outro `<form>`** (#1130): o molde em
 * janela é desenhado DEPOIS do `</form>` da tela, como os outros modais.
 */
type Comum = {
  titulo: string;
  /** Uma linha embaixo do título (lida junto pelo leitor de tela, na janela). */
  descricao?: string;
  /**
   * O envio: o `handleSubmit(salvar)` do react-hook-form. Devolvendo uma
   * promessa, o molde segura o segundo envio até ela terminar.
   */
  aoEnviar: (evento?: BaseSyntheticEvent) => unknown;
  /** O verbo do botão principal: "Salvar cliente", "Cadastrar peça". Nunca "OK". */
  rotuloDoEnviar: string;
  /** O que o botão diz enquanto salva. */
  rotuloEnviando?: string;
  /**
   * O erro ao salvar (o `mensagemDeErro()` do Supabase): fica do lado do
   * botão, até a pessoa tentar de novo. Erro de campo vai no `CampoDoMolde`.
   */
  erro?: string;
  children: ReactNode;
};

export type PropsDoMoldeFormulario = Comum &
  (
    | {
        em: "janela";
        /** Fecha a janela: o "Cancelar", o ✕, o Esc e o clique fora. */
        aoCancelar: () => void;
        largura?: ComponentProps<typeof Modal>["largura"];
      }
    | {
        em: "pagina";
        /** Sem ele, a página não tem "Cancelar" (o voltar da tela já faz isso). */
        aoCancelar?: () => void;
        /** Em cima do título: o `BotaoVoltar` da tela. */
        acimaDoTitulo?: ReactNode;
      }
  );

const ModoDoFormulario = createContext<"janela" | "pagina">("janela");

const SELETOR_PRIMEIRO_CAMPO =
  'input:not([type="hidden"]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled):not([readonly])';

/** Segura o segundo envio enquanto o primeiro não termina. */
function useEnvioUnico(aoEnviar: Comum["aoEnviar"]) {
  const enviandoRef = useRef(false);
  const [enviando, setEnviando] = useState(false);

  function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    // Sempre: sem isto, um aoEnviar que não é o handleSubmit recarregaria a janela do programa.
    evento.preventDefault();
    if (enviandoRef.current) return;
    const resultado = aoEnviar(evento);
    if (typeof (resultado as PromiseLike<unknown> | undefined)?.then === "function") {
      enviandoRef.current = true;
      setEnviando(true);
      // O erro (se houver) segue pra quem chamou: o molde só destrava o botão.
      void Promise.resolve(resultado).finally(() => {
        enviandoRef.current = false;
        setEnviando(false);
      });
    }
  }

  return { enviando, aoSubmeter };
}

function BotaoDeEnviar({
  formId,
  enviando,
  rotulo,
  rotuloEnviando,
}: {
  formId: string;
  enviando: boolean;
  rotulo: string;
  rotuloEnviando: string;
}) {
  return (
    <Botao
      type="submit"
      form={formId}
      variante="principal"
      tamanho="grande"
      // Não é o `ocupado` do Botao: ele usa `disabled`, e o foco cairia.
      // (O `aria-busy` também fica de fora: o Botao reescreve o atributo pelo
      // `ocupado`. O "Salvando…" escrito já diz o que acontece.)
      aria-disabled={enviando || undefined}
    >
      {enviando ? rotuloEnviando : rotulo}
    </Botao>
  );
}

export function MoldeFormulario(props: PropsDoMoldeFormulario) {
  const { titulo, descricao, aoEnviar, rotuloDoEnviar, rotuloEnviando = "Salvando…", erro, children } = props;
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { enviando, aoSubmeter } = useEnvioUnico(aoEnviar);
  const naJanela = props.em === "janela";

  // Na janela, o foco vai pro primeiro campo. Este efeito roda DEPOIS do
  // efeito do Modal (o Modal é filho, e o efeito do filho roda antes), que
  // põe o foco no ✕: aqui ele é levado pro campo, que é por onde se começa.
  useEffect(() => {
    if (!naJanela) return;
    formRef.current?.querySelector<HTMLElement>(SELETOR_PRIMEIRO_CAMPO)?.focus();
    // Só ao abrir: depois, o foco é de quem digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const botaoDeEnviar = (
    <BotaoDeEnviar
      formId={formId}
      enviando={enviando}
      rotulo={rotuloDoEnviar}
      rotuloEnviando={rotuloEnviando}
    />
  );
  const avisoDeErro = erro ? <AvisoDeErro className="text-rotulo">{erro}</AvisoDeErro> : null;

  if (props.em === "janela") {
    return (
      <Modal
        titulo={titulo}
        descricao={descricao}
        largura={props.largura}
        onFechar={props.aoCancelar}
        notaDoRodape={avisoDeErro}
        rodape={
          <>
            <Botao variante="fantasma" tamanho="grande" onClick={props.aoCancelar}>
              Cancelar
            </Botao>
            {botaoDeEnviar}
          </>
        }
      >
        <ModoDoFormulario.Provider value="janela">
          <form
            ref={formRef}
            id={formId}
            noValidate
            onSubmit={aoSubmeter}
            aria-label={titulo}
            className="@container flex min-w-0 flex-col gap-8"
          >
            {children}
          </form>
        </ModoDoFormulario.Provider>
      </Modal>
    );
  }

  return (
    <ModoDoFormulario.Provider value="pagina">
      <form
        ref={formRef}
        id={formId}
        noValidate
        onSubmit={aoSubmeter}
        aria-labelledby={`${formId}titulo`}
        className="@container flex w-full min-w-0 max-w-5xl flex-col gap-6"
      >
        <header className="flex min-w-0 flex-col gap-2">
          {props.acimaDoTitulo}
          <h1 id={`${formId}titulo`} className="font-titulo text-titulo font-bold text-texto">
            {titulo}
          </h1>
          {descricao && <p className="text-corpo text-texto-2">{descricao}</p>}
        </header>
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
        {/* Fica colado embaixo enquanto a página rola: o "Salvar" sempre à
            vista no formulário comprido, no canto do próximo passo (embaixo à
            direita). */}
        <div
          data-rodape-do-formulario
          className="sticky bottom-0 z-[1] flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-linha bg-fundo py-4"
        >
          {avisoDeErro && <div className="mr-auto min-w-0">{avisoDeErro}</div>}
          {props.aoCancelar && (
            <Botao variante="fantasma" tamanho="grande" onClick={props.aoCancelar}>
              Cancelar
            </Botao>
          )}
          {botaoDeEnviar}
        </div>
      </form>
    </ModoDoFormulario.Provider>
  );
}

/**
 * Um grupo de campos do mesmo assunto ("Contato", "Endereço"), com o título
 * em cima. Dentro, os campos ficam juntos (16 px entre eles) e vão pra 2
 * colunas quando há largura (página, janela larga). Na página, cada seção é
 * um cartão; na janela, só o espaço separa (no máximo 2 caixas aninhadas).
 */
export function SecaoDoFormulario({
  titulo,
  descricao,
  children,
}: {
  /** Sem título, é só a grade dos campos (o formulário curto, de um assunto só). */
  titulo?: string;
  descricao?: string;
  children: ReactNode;
}) {
  const modo = useContext(ModoDoFormulario);
  const grade = <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">{children}</div>;
  const caixa = modo === "pagina" ? "sakura-card p-6" : "";

  if (!titulo) {
    return <div className={`min-w-0 ${caixa}`}>{grade}</div>;
  }
  return (
    <fieldset className={`min-w-0 ${caixa}`}>
      <legend className="float-left mb-4 w-full">
        <span className="block text-subtitulo font-semibold text-texto">{titulo}</span>
        {descricao && <span className="mt-1 block text-corpo text-texto-2">{descricao}</span>}
      </legend>
      {/* O `float` da legenda tira ela da borda do fieldset; a grade volta pra linha de baixo. */}
      <div className="clear-both">{grade}</div>
    </fieldset>
  );
}
