import { ChevronRight, Printer } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { hojeLocal } from "@/lib/datas";
import {
  GRUPOS_COM_PERCENTUAL_DO_RESULTADO_BRUTO,
  montarHtmlDre,
} from "@/lib/dreDocumento";
import { mensagemDeErro } from "@/lib/errors";
import { carregarDadosDoDre } from "@/lib/relatorios";
import { formatarMoeda, formatarPercentual } from "@/schemas/dinheiro";
import {
  FRASE_DO_MES_DO_DRE,
  MESES_PADRAO,
  MAXIMO_DE_MESES,
  mesesEntre,
  montarDre,
  rotuloDoMes,
  ultimosMeses,
  type CategoriaDoDre,
  type Dre,
  type LinhaDre,
  type TaxaGravada,
  type ValorDoMesDre,
} from "@/schemas/dre";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

const SEM_CATEGORIAS: CategoriaDoDre[] = [];
const SEM_TAXAS: TaxaGravada[] = [];

const MARCA_DO_SINAL = { "+": "(+)", "-": "(−)", "=": "(=)" } as const;

const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

function periodoPadrao(): { de: string; ate: string } {
  const meses = ultimosMeses(hojeLocal(), MESES_PADRAO);
  return { de: meses[0], ate: meses[meses.length - 1] };
}

function percentual(v: number | null, sufixo: string) {
  return v === null ? "—" : `${formatarPercentual(v)} ${sufixo}`;
}

function Celula({
  v,
  comResultadoBruto,
  forte,
}: {
  v: ValorDoMesDre;
  comResultadoBruto: boolean;
  forte: boolean;
}) {
  if (v.naoInformado) {
    return <span className="text-corpo text-texto-2">não informadas</span>;
  }
  return (
    <>
      <span
        className={`block text-corpo text-texto ${forte ? "font-bold" : ""}`}
      >
        {formatarMoeda(v.valor)}
        {v.parcial && (
          <span className="block text-meta font-normal text-texto-2">
            (parte não informada)
          </span>
        )}
      </span>
      <span className="block text-meta font-normal text-texto-2">
        {percentual(v.sobreReceita, "da receita")}
      </span>
      {comResultadoBruto && (
        <span className="block text-meta font-normal text-texto-2">
          {percentual(v.sobreResultadoBruto, "do resultado bruto")}
        </span>
      )}
    </>
  );
}

function Linhas({
  linha,
  nivel,
  comResultadoBruto,
  abertas,
  alternar,
}: {
  linha: LinhaDre;
  nivel: number;
  comResultadoBruto: boolean;
  abertas: ReadonlySet<string>;
  alternar: (chave: string) => void;
}) {
  const forte = linha.sinal === "=";
  const temFilhas = linha.filhas.length > 0;
  const aberta = abertas.has(linha.chave);
  const filhasComResultadoBruto =
    comResultadoBruto ||
    GRUPOS_COM_PERCENTUAL_DO_RESULTADO_BRUTO.includes(linha.chave);
  const recuo = nivel === 0 ? "" : nivel === 1 ? "pl-8" : "pl-14";
  const rotulo = (
    <>
      <span className="font-normal text-texto-2">
        {MARCA_DO_SINAL[linha.sinal]}
      </span>{" "}
      {linha.rotulo}
    </>
  );
  return (
    <Fragment>
      <tr className="border-b border-linha align-top">
        <th
          scope="row"
          className={`sticky left-0 z-10 min-w-56 bg-cartao px-4 py-3 text-left text-corpo text-texto ${recuo} ${
            forte ? "font-bold" : "font-medium"
          }`}
        >
          {temFilhas ? (
            <button
              type="button"
              aria-expanded={aberta}
              onClick={() => alternar(linha.chave)}
              className="-m-1 flex items-start gap-1 rounded-lg p-1 text-left hover:bg-passar"
            >
              <ChevronRight
                aria-hidden="true"
                className={`mt-1 size-4 shrink-0 text-texto-2 transition-transform motion-reduce:transition-none ${
                  aberta ? "rotate-90" : ""
                }`}
              />
              <span>{rotulo}</span>
            </button>
          ) : (
            <span className="pl-6">{rotulo}</span>
          )}
        </th>
        {linha.colunas.map((v, i) => (
          <td
            key={i}
            className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
              i === linha.colunas.length - 1 ? "font-semibold" : ""
            }`}
          >
            <Celula v={v} comResultadoBruto={comResultadoBruto} forte={forte} />
          </td>
        ))}
      </tr>
      {temFilhas &&
        aberta &&
        linha.filhas.map((f) => (
          <Linhas
            key={f.chave}
            linha={f}
            nivel={nivel + 1}
            comResultadoBruto={filhasComResultadoBruto}
            abertas={abertas}
            alternar={alternar}
          />
        ))}
    </Fragment>
  );
}

function JanelaDeImprimir({
  dre,
  nomeDaLoja,
  lojaId,
  onFechar,
}: {
  dre: Dre;
  nomeDaLoja: string;
  lojaId: string;
  onFechar: () => void;
}) {
  const [cabecalho, setCabecalho] = useState<
    ConfiguracaoFiscalLoja | null | undefined
  >(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let ativo = true;
    // Sem os dados fiscais o documento sai só com o nome da loja.
    buscarConfiguracaoFiscal(lojaId)
      .catch(() => null)
      .then((loja) => ativo && setCabecalho(loja));
    return () => {
      ativo = false;
    };
  }, [lojaId]);

  const html = useMemo(
    () =>
      cabecalho === undefined
        ? null
        : montarHtmlDre({
            dre,
            nomeDaLoja,
            cabecalho,
            geradoEm: new Date().toLocaleDateString("pt-BR"),
          }),
    [dre, nomeDaLoja, cabecalho],
  );

  return (
    <Modal
      titulo="DRE pra imprimir"
      largura="5xl"
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Fechar
          </Botao>
          <Botao
            variante="principal"
            disabled={!html}
            onClick={() => iframeRef.current?.contentWindow?.print()}
          >
            Imprimir
          </Botao>
        </>
      }
    >
      {html ? (
        <iframe
          ref={iframeRef}
          title="Pré-visualização do DRE"
          srcDoc={html}
          className="h-96 w-full rounded-lg border border-linha bg-white"
        />
      ) : (
        <p className="text-corpo text-texto-2">Gerando pré-visualização...</p>
      )}
    </Modal>
  );
}

/**
 * O DRE (#388): o resumo do dinheiro da loja, mês a mês. Toda conta está em
 * `montarDre` (src/schemas/dre.ts); aqui só se mostra.
 *
 * Recebe o que Relações já carregou (OS, Caixa, peças e serviços, com a
 * guarda de troca de loja da #927) e carrega o resto (categorias e taxas) com
 * a mesma guarda: dados de outra loja nunca aparecem.
 */
export function DreSection({
  ordens,
  movimentos,
  pecas,
  servicos,
}: {
  ordens: OrdemServico[];
  movimentos: MovimentoCaixa[];
  pecas: Peca[];
  servicos: Servico[];
}) {
  const { lojaAtual, operador } = useAuth();
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState(periodoPadrao);
  const [campos, setCampos] = useState(periodo);
  const meses = useMemo(() => mesesEntre(periodo.de, periodo.ate), [periodo]);
  // mesesEntre fica só com os mais novos quando passa do máximo: a tela avisa.
  const periodoCortado = meses.length > 0 && meses[0] !== periodo.de;

  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  const [categoriasGuardadas, setCategorias] =
    useState<CategoriaDoDre[]>(SEM_CATEGORIAS);
  const [taxasGuardadas, setTaxas] = useState<TaxaGravada[]>(SEM_TAXAS);
  const categorias = dadosSaoDaLoja ? categoriasGuardadas : SEM_CATEGORIAS;
  const taxas = dadosSaoDaLoja ? taxasGuardadas : SEM_TAXAS;
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    async function carregar() {
      const carga = comecar(lojaAtual?.id);
      if (!carga) {
        if (!lojaAtual) setCarregando(false);
        return;
      }
      setCarregando(true);
      setErro(null);
      try {
        const dados = await carregarDadosDoDre(carga.lojaId);
        if (!carga.aindaEhAtual()) return;
        setCategorias(dados.categorias);
        setTaxas(dados.taxas);
        carga.gravou();
      } catch (err) {
        if (!carga.aindaEhAtual()) return;
        console.error("Erro ao carregar os dados do DRE:", err);
        setErro(mensagemDeErro(err));
      } finally {
        if (carga.aindaEhAtual()) setCarregando(false);
      }
    }
    carregar();
  }, [lojaAtual, comecar, tentativa]);

  const custoPeca = useMemo(() => mapaCustoPecas(pecas), [pecas]);
  const custoServico = useMemo(() => mapaCustoServicos(servicos), [servicos]);

  // Se a conta jogar erro, só o DRE avisa: a página de Relações continua de pé.
  const { dre, erroDaConta } = useMemo((): {
    dre: Dre | null;
    erroDaConta: string | null;
  } => {
    if (meses.length === 0 || erro || carregando)
      return { dre: null, erroDaConta: null };
    try {
      return {
        dre: montarDre({
          meses,
          ordens,
          movimentos,
          categorias,
          taxas,
          custoPeca,
          custoServico,
        }),
        erroDaConta: null,
      };
    } catch (err) {
      console.error("Erro ao montar o DRE:", err);
      return { dre: null, erroDaConta: mensagemDeErro(err) };
    }
  }, [
    meses,
    ordens,
    movimentos,
    categorias,
    taxas,
    custoPeca,
    custoServico,
    erro,
    carregando,
  ]);
  // Algum mês com venda no cartão sem taxa: na tela fechada as Deduções não mostram isso.
  const taxaFaltando = !!dre?.linhas
    .find((l) => l.chave === "deducoes")
    ?.filhas.find((f) => f.chave === "taxa_maquininha")
    ?.colunas.some((c) => c.naoInformado || c.parcial);


  const [abertas, setAbertas] = useState<ReadonlySet<string>>(() => new Set());
  const [imprimindo, setImprimindo] = useState(false);

  function alternar(chave: string) {
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(chave)) novo.add(chave);
      return novo;
    });
  }

  // Os campos guardam o que a pessoa digita; o período só muda com dois meses
  // de verdade e De ≤ Até (o campo manda "" no meio da digitação).
  function mudar(campo: "de" | "ate", valor: string) {
    const novos = { ...campos, [campo]: valor };
    setCampos(novos);
    if (
      MES_VALIDO.test(novos.de) &&
      MES_VALIDO.test(novos.ate) &&
      novos.de <= novos.ate
    )
      setPeriodo(novos);
  }

  const deDepoisDeAte =
    MES_VALIDO.test(campos.de) &&
    MES_VALIDO.test(campos.ate) &&
    campos.de > campos.ate;
  const ehAdmin = Boolean(operador?.admin);

  return (
    <section className="space-y-6" aria-labelledby="titulo-dre">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="titulo-dre"
            className="font-titulo text-subtitulo font-semibold text-texto"
          >
            DRE
          </h2>
          <p className="text-corpo text-texto-2">
            O resumo do dinheiro da loja, mês a mês
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="sakura-rotulo w-44">
            De
            <input
              type="month"
              value={campos.de}
              onChange={(e) => mudar("de", e.target.value)}
              className="sakura-campo sakura-campo-filtro"
            />
          </label>
          <label className="sakura-rotulo w-44">
            Até
            <input
              type="month"
              value={campos.ate}
              onChange={(e) => mudar("ate", e.target.value)}
              className="sakura-campo sakura-campo-filtro"
            />
          </label>
          <Botao
            variante="secundario"
            disabled={!dre || !lojaAtual}
            onClick={() => setImprimindo(true)}
          >
            <Printer aria-hidden="true" className="mr-2 size-4" />
            Imprimir / salvar em PDF
          </Botao>
        </div>
      </div>

      {deDepoisDeAte && (
        <AvisoDeAtencao role="alert">
          O mês De precisa ser antes do Até. Os números ainda são do período
          anterior.
        </AvisoDeAtencao>
      )}

      {erro ? (
        <div className="space-y-4">
          <AvisoDeErro>
            Não deu pra carregar o DRE: {erro}. Confira a internet e tente de
            novo.
          </AvisoDeErro>
          <Botao
            variante="secundario"
            onClick={() => setTentativa((n) => n + 1)}
          >
            Tentar de novo
          </Botao>
        </div>
      ) : erroDaConta ? (
        <AvisoDeErro>Não deu pra montar o DRE: {erroDaConta}.</AvisoDeErro>
      ) : carregando || !dre ? (
        <p className="text-corpo text-texto-2">Carregando o DRE...</p>
      ) : (
        <>
          {periodoCortado && (
            <AvisoDeAtencao>
              O DRE mostra no máximo {MAXIMO_DE_MESES} meses: ficaram os mais
              novos, de {rotuloDoMes(dre.meses[0])} a{" "}
              {rotuloDoMes(dre.meses[dre.meses.length - 1])}. O Total soma só
              esses meses.
            </AvisoDeAtencao>
          )}

          {taxaFaltando && (
            <AvisoDeAtencao>
              Falta a taxa da maquininha de parte das vendas no cartão: as
              Deduções podem estar menores do que são. Abra “Deduções” pra ver
              em que meses.
            </AvisoDeAtencao>
          )}

          {dre.semGrupo.quantidade > 0 && (
            <AvisoDeAtencao>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {formatarMoeda(dre.semGrupo.total)} em{" "}
                  {dre.semGrupo.quantidade}{" "}
                  {dre.semGrupo.quantidade === 1 ? "lançamento" : "lançamentos"}{" "}
                  ainda sem grupo: não entram no DRE. Pode ser categoria em “A
                  classificar” (acerta em Configurações → Categorias de caixa) ou
                  lançamento sem categoria nenhuma (acerta no Caixa, em
                  “Categorizar agora”).
                  {!ehAdmin &&
                    " Peça a quem administra a loja pra classificar em Configurações → Categorias de caixa."}
                </span>
                {ehAdmin && (
                  <Botao
                    variante="secundario"
                    tamanho="pequeno"
                    onClick={() =>
                      navigate("/configuracoes?secao=categorias-caixa")
                    }
                  >
                    Classificar
                  </Botao>
                )}
              </div>
            </AvisoDeAtencao>
          )}

          {dre.algumCustoNaoInformado && (
            <AvisoDeAtencao>
              Há peça avulsa sem custo informado: o custo dela fica de fora e o
              resultado aparece maior do que é.
            </AvisoDeAtencao>
          )}

          <div className="sakura-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <caption className="sr-only">
                  O DRE de cada mês e o total do período
                </caption>
                <thead>
                  <tr className="border-b border-linha">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-cartao px-4 py-3 text-left text-rotulo font-medium text-texto-2"
                    >
                      Linha
                    </th>
                    {dre.meses.map((m) => (
                      <th
                        key={m}
                        scope="col"
                        className="px-4 py-3 text-right text-rotulo font-medium text-texto-2"
                      >
                        {rotuloDoMes(m)}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-rotulo font-semibold text-texto-2"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dre.linhas.map((l) => (
                    <Linhas
                      key={l.chave}
                      linha={l}
                      nivel={0}
                      comResultadoBruto={false}
                      abertas={abertas}
                      alternar={alternar}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-rotulo text-texto-2">
            {FRASE_DO_MES_DO_DRE} Categorias em “Fora do resultado” não entram.
            {dre.foraDoResultado.quantidade > 0 &&
              ` Elas somam ${formatarMoeda(dre.foraDoResultado.total)} em ${dre.foraDoResultado.quantidade} ${
                dre.foraDoResultado.quantidade === 1
                  ? "lançamento"
                  : "lançamentos"
              }.`}
            {dre.devolucoesDeOs.quantidade > 0 &&
              ` As devoluções de OS corrigida (${formatarMoeda(dre.devolucoesDeOs.total)}) também não são despesa: a venda da OS já entra corrigida na Receita bruta.`}
          </p>
        </>
      )}

      {imprimindo && dre && lojaAtual && (
        <JanelaDeImprimir
          dre={dre}
          nomeDaLoja={lojaAtual.nome}
          lojaId={lojaAtual.id}
          onFechar={() => setImprimindo(false)}
        />
      )}
    </section>
  );
}
