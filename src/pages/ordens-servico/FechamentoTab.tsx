import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { buscarTextoGarantia } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { montarTextoGarantia } from "@/lib/garantiaTexto";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { PassoDaOs } from "@/schemas/passoDaOrdem";
import { situacaoFiscalOrdem } from "@/schemas/situacaoFiscal";
import { valorLiquidoDoItem } from "@/schemas/valorItem";
import { VerDanfeModal } from "@/pages/notas-fiscais/VerDanfeModal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { ehVendaBalcao, totalOrdem } from "@/types/os";
import { Botao } from "@/components/Botao";
import { EmitirNotaFiscalModal } from "./EmitirNotaFiscalModal";
import { GarantiaVisualModal } from "./GarantiaVisualModal";
import { useFechamentoDaOrdem, type FechamentoDaOrdem, type NotaDaOs } from "./useFechamentoDaOrdem";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

/**
 * O que a OS mostra em cada passo do fechamento depois do "conferir" (#1088):
 * receber, nota fiscal, garantia e avisar, e o resumo do fim ("pronto"). Era a
 * aba "Fechamento"; nenhum campo nem ação sumiu, cada um foi pro seu passo.
 *
 * O botão laranja do passo (Receber R$ …, Emitir NFC-e, Avisar o cliente,
 * Pronto) não mora aqui: fica no rodapé da OS, embaixo à direita, um só por
 * tela. Aqui ficam o número que decide, o que já foi feito e as ações de apoio
 * (ver DANFE, ver garantia, emitir a outra nota), todas discretas.
 */
interface FechamentoTabProps {
  ordem: OrdemServico;
  /**
   * O passo que a pessoa está vendo (o atual, ou um feito que ela clicou na
   * trilha). "tudo" (o padrão) é a tela da venda de balcão, que não tem trilha:
   * itens, notas e garantia de uma vez, como era a aba antes.
   */
  passo?: Exclude<PassoDaOs, "conferir"> | "tudo";
  /** O estado do fechamento, de quem desenha a trilha. Sem ele, esta tela busca sozinha. */
  fechamento?: FechamentoDaOrdem;
  /** O erro do "Avisar o cliente" (telefone sem DDD, WhatsApp não abriu). */
  erroAviso?: string | null;
  /** Uma peça avulsa ganhou cadastro na janela da nota (#655): recarrega a OS. */
  onItensMudaram?: () => void | Promise<void>;
  /**
   * Ir pra garantia e o aviso com a nota ainda faltando (#1203): a nota que
   * não sai não segura o carro. Sem isto (a venda de balcão), não aparece.
   */
  aoAdiantarGarantia?: () => void;
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Uma linha do que já foi feito: ✓ verde e a palavra, ou ! amarelo e "falta" (cor nunca sozinha). */
function LinhaFeito({
  feito,
  titulo,
  detalhe,
  children,
}: {
  /** null: sem marca (o que o programa não tem como saber se foi feito, como entregar a garantia). */
  feito: boolean | null;
  titulo: string;
  detalhe?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
      <div className="flex min-w-0 items-start gap-2">
        {feito === null ? (
          <span aria-hidden="true" className="size-4 shrink-0" />
        ) : feito ? (
          <Check aria-hidden="true" strokeWidth={3} className="mt-0.5 size-4 shrink-0 text-ok" />
        ) : (
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-atencao" />
        )}
        <div className="min-w-0">
          <p className="text-corpo font-medium text-texto">
            {titulo}
            {feito !== null && (
              <span className={`ml-2 text-rotulo font-semibold ${feito ? "text-ok" : "text-atencao"}`}>
                {feito ? "feito" : "falta"}
              </span>
            )}
          </p>
          {detalhe && <p className="text-rotulo text-texto-2">{detalhe}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap justify-end gap-2">{children}</div>}
    </li>
  );
}

export function FechamentoTab(props: FechamentoTabProps) {
  if (props.fechamento) return <PainelDoFechamento {...props} fechamento={props.fechamento} />;
  return <FechamentoSemTrilha {...props} />;
}

/** A venda de balcão: sem trilha, o estado do fechamento é buscado aqui. */
function FechamentoSemTrilha(props: FechamentoTabProps) {
  const fechamento = useFechamentoDaOrdem(props.ordem);
  return <PainelDoFechamento {...props} passo="tudo" fechamento={fechamento} />;
}

function PainelDoFechamento({
  ordem,
  passo = "tudo",
  fechamento,
  erroAviso,
  onItensMudaram,
  aoAdiantarGarantia,
}: FechamentoTabProps & { fechamento: FechamentoDaOrdem }) {
  const tudo = passo === "tudo";
  const itens = ordem.itens ?? [];
  // Venda de balcão (migration 0064) usa esta mesma tela: muda só a palavra,
  // e no lugar do veículo (que ela não tem) aparece quem vendeu.
  const ehVenda = ehVendaBalcao(ordem);
  const estaOrdem = ehVenda ? "Esta venda" : "Esta OS";
  const { notas, recarregarNotas, notaParaEmitir, setNotaParaEmitir, proximaNota } = fechamento;
  const [templateGarantia, setTemplateGarantia] = useState("");
  const [previewGarantiaAberta, setPreviewGarantiaAberta] = useState(false);
  const [notaParaVerDanfe, setNotaParaVerDanfe] = useState<NotaFiscalArquivo | null>(null);
  const [erro, setErro] = useState("");

  // Quais notas essa OS precisa sai do que ela tem dentro (peça → NFC-e,
  // serviço → NFS-e); o que já saiu vem das notas ligadas a ela.
  const situacao = situacaoFiscalOrdem(itens, notas);
  const notasComPdf = notas.filter(
    (nota) => nota.origem === "automatica" && nota.status !== "cancelado",
  );
  const total = totalOrdem(itens);
  const faturada = ordem.status === "faturada";

  useEffect(() => {
    async function carregar() {
      try {
        setTemplateGarantia(await buscarTextoGarantia(ordem.loja_id));
      } catch (err) {
        console.error("Erro ao carregar texto de garantia:", err);
        setErro(mensagemDeErro(err));
      }
    }
    carregar();
  }, [ordem.loja_id]);

  const textoGarantia = useMemo(
    () => (templateGarantia ? montarTextoGarantia(templateGarantia, ordem) : ""),
    [templateGarantia, ordem],
  );

  const botoesDanfe = (tipo: "nfe" | "nfse") =>
    notasComPdf
      .filter((nota) => nota.tipo === tipo)
      .map((nota) => (
        <Botao key={nota.id} tamanho="medio" onClick={() => setNotaParaVerDanfe(nota)}>
          {nota.tipo === "nfe" ? "Ver DANFE" : "Ver PDF da NFS-e"}
        </Botao>
      ));

  // Uma linha por nota que a OS precisa. A que é o próximo passo é emitida
  // pelo botão laranja do rodapé; a outra (OS com peça e serviço) tem o seu
  // botão aqui, discreto. Nota já emitida ainda pode ser emitida de novo (o
  // botão de antes continuava ali), mas como ação rara, sem destaque.
  function linhaDaNota(nota: NotaDaOs, precisa: boolean, tem: boolean, tipo: "nfe" | "nfse") {
    if (!precisa) return null;
    return (
      <LinhaFeito
        key={nota}
        feito={tem}
        titulo={nota}
        detalhe={tem ? "emitida" : !tudo && proximaNota === nota ? "é o próximo passo" : undefined}
      >
        {tem && botoesDanfe(tipo)}
        {tem && (
          <Botao
            variante="fantasma"
            tamanho="medio"
            aria-label={`Emitir a ${nota} de novo`}
            onClick={() => setNotaParaEmitir(nota)}
          >
            Emitir de novo
          </Botao>
        )}
        {!tem && (tudo || proximaNota !== nota) && (
          // Sem trilha (venda de balcão), a nota que falta é o próximo passo
          // da tela: o laranja dela, como o botão de antes.
          <Botao
            variante={tudo && proximaNota === nota ? "principal" : "secundario"}
            tamanho="medio"
            onClick={() => setNotaParaEmitir(nota)}
          >
            Emitir {nota}
          </Botao>
        )}
      </LinhaFeito>
    );
  }

  const notasNecessarias = [
    linhaDaNota("NFC-e", situacao.precisaNfce, situacao.temNfce, "nfe"),
    linhaDaNota("NFS-e", situacao.precisaNfse, situacao.temNfse, "nfse"),
  ];
  const nenhumaNota = !situacao.precisaNfce && !situacao.precisaNfse;

  const avisado = fechamento.avisadoEm
    ? `Cliente avisado em ${formatarData(fechamento.avisadoEm)}`
    : fechamento.concluidoSemAviso
      ? "Concluído sem o aviso pelo WhatsApp"
      : undefined;

  return (
    <div className="space-y-6">
      {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}


      {passo === "receber" && (
        <section aria-label="Receber" className="space-y-6 rounded-2xl border border-linha p-6">
          {/* O número que decide (a receber) em cima à esquerda, grande; o
              total e o que já foi pago de apoio, à direita. */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-rotulo font-semibold text-texto-2">
                {faturada ? "Total da OS" : "A receber"}
              </p>
              <p className="text-metrica font-semibold tabular-nums text-texto">{formatarMoeda(total)}</p>
              {faturada && (
                <p className="mt-1 flex items-center gap-1 text-rotulo font-semibold text-ok">
                  <Check aria-hidden="true" strokeWidth={3} className="size-4" />
                  Faturada em {formatarData(ordem.data_fechamento)}
                </p>
              )}
            </div>
            {!faturada && (
              <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-corpo">
                <dt className="text-texto-2">Total {ehVenda ? "da venda" : "da OS"}</dt>
                <dd className="text-right font-semibold tabular-nums text-texto">{formatarMoeda(total)}</dd>
                <dt className="text-texto-2">Já pago</dt>
                <dd className="text-right font-semibold tabular-nums text-texto">{formatarMoeda(0)}</dd>
              </dl>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-corpo font-semibold text-texto">Peças e serviços</h3>
            <ul className="divide-y divide-linha">
              {itens.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-corpo">
                  <span className="min-w-0 text-texto">
                    {item.tipo === "peca" ? "Peça" : "Serviço"} — {item.descricao} ({item.quantidade}x)
                    {item.tecnico?.nome ? (
                      <span className="text-texto-2"> · técnico: {item.tecnico.nome}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-texto">{formatarMoeda(valorLiquidoDoItem(item))}</span>
                </li>
              ))}
            </ul>
          </div>
          {!faturada && (
            // O que a aba Fechamento já deixava fazer antes de receber continua
            // aqui, discreto: a nota e a garantia não precisam esperar o
            // pagamento (nenhuma ação sumiu, #1088).
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-linha pt-4">
              <p className="text-rotulo text-texto-2">Dá pra adiantar a nota e a garantia antes de receber.</p>
              <div className="flex flex-wrap justify-end gap-2">
                {situacao.precisaNfce && !situacao.temNfce && (
                  <Botao tamanho="medio" onClick={() => setNotaParaEmitir("NFC-e")}>
                    Emitir NFC-e
                  </Botao>
                )}
                {situacao.precisaNfse && !situacao.temNfse && (
                  <Botao tamanho="medio" onClick={() => setNotaParaEmitir("NFS-e")}>
                    Emitir NFS-e
                  </Botao>
                )}
                {botoesDanfe("nfe")}
                {botoesDanfe("nfse")}
                <Botao tamanho="medio" onClick={() => setPreviewGarantiaAberta(true)}>
                  Ver garantia
                </Botao>
              </div>
            </div>
          )}
        </section>
      )}

      {tudo && (
        <section aria-label="Peças e serviços" className="rounded-2xl border border-linha p-6">
          <h3 className="mb-2 text-corpo font-semibold text-texto">Peças e serviços</h3>
          <ul className="divide-y divide-linha">
            {itens.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-corpo">
                <span className="min-w-0 text-texto">
                  {item.tipo === "peca" ? "Peça" : "Serviço"} — {item.descricao} ({item.quantidade}x)
                  {item.tecnico?.nome ? <span className="text-texto-2"> · técnico: {item.tecnico.nome}</span> : null}
                </span>
                <span className="shrink-0 tabular-nums text-texto">{formatarMoeda(valorLiquidoDoItem(item))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right text-corpo font-semibold tabular-nums text-texto">
            Total geral: {formatarMoeda(total)}
          </p>
        </section>
      )}

      {(passo === "nota" || tudo) && (
        <section aria-label="Nota fiscal" className="space-y-2 rounded-2xl border border-linha p-6">
          <h3 className="text-corpo font-semibold text-texto">Nota fiscal</h3>
          <p className="text-rotulo text-texto-2">
            {nenhumaNota
              ? `${estaOrdem} não tem peça nem serviço lançado.`
              : situacao.pendentes.length === 0
                ? `Todas as notas ${ehVenda ? "desta venda" : "desta OS"} já foram emitidas.`
                : `${estaOrdem} precisa de ${situacao.pendentes.join(" e ")}.`}
          </p>
          {!nenhumaNota && <ul className="divide-y divide-linha">{notasNecessarias}</ul>}
          {passo === "nota" && aoAdiantarGarantia && situacao.pendentes.length > 0 && (
            // A nota não saiu (a prefeitura recusou, a SEFAZ fora do ar): a
            // garantia e o aviso não esperam por ela (#1203). Discreto: o
            // caminho normal é emitir a nota.
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-linha pt-4">
              <p className="text-rotulo text-texto-2">
                {avisado
                  ? `${avisado}; a nota continua faltando aqui.`
                  : "A nota não saiu? Dá pra entregar a garantia e avisar o cliente; a nota continua faltando aqui."}
              </p>
              <Botao tamanho="medio" onClick={aoAdiantarGarantia}>
                {avisado ? "Ver a garantia" : "Garantia e avisar sem a nota"}
              </Botao>
            </div>
          )}
        </section>
      )}

      {tudo && (
        <section aria-label="Garantia" className="rounded-2xl border border-linha p-6">
          <ul>
            <LinhaFeito feito={null} titulo="Garantia" detalhe="o documento pro cliente assinar">
              <Botao tamanho="medio" onClick={() => setPreviewGarantiaAberta(true)}>
                Ver garantia
              </Botao>
            </LinhaFeito>
          </ul>
        </section>
      )}

      {passo === "garantia" && (
        <section aria-label="Garantia e avisar" className="space-y-2 rounded-2xl border border-linha p-6">
          <h3 className="text-corpo font-semibold text-texto">Garantia e avisar</h3>
          <p className="text-rotulo text-texto-2">
            Entregue a garantia pro cliente assinar e avise que o carro está pronto.
          </p>
          {situacao.pendentes.length > 0 && (
            // Adiantado com a nota faltando (#1203): a nota continua à vista.
            <AvisoDeAtencao className="text-corpo">
              {situacao.pendentes.length > 1
                ? `Ainda faltam a ${situacao.pendentes.join(" e a ")}: elas continuam no passo da nota fiscal.`
                : `Ainda falta a ${situacao.pendentes[0]}: ela continua no passo da nota fiscal.`}
            </AvisoDeAtencao>
          )}
          <ul className="divide-y divide-linha">
            <LinhaFeito feito={null} titulo="Garantia" detalhe="o documento pro cliente assinar">
              <Botao tamanho="medio" onClick={() => setPreviewGarantiaAberta(true)}>
                Ver garantia
              </Botao>
            </LinhaFeito>
            <LinhaFeito
              feito={!!avisado}
              titulo="Avisar o cliente"
              detalhe={avisado ?? "pelo WhatsApp, com a mensagem de carro pronto"}
            />
          </ul>
          {erroAviso && <AvisoDeErro className="text-corpo">{erroAviso}</AvisoDeErro>}
        </section>
      )}

      {passo === "pronto" && (
        // O fim claro (pico-fim): o que foi feito, cada coisa com ✓.
        <section aria-label="Resumo do fechamento" className="space-y-2 rounded-2xl border border-ok/40 p-6">
          <h3 className="flex items-center gap-2 text-subtitulo font-semibold text-texto">
            <Check aria-hidden="true" strokeWidth={3} className="size-5 text-ok" />
            {estaOrdem} está fechada
          </h3>
          <ul className="divide-y divide-linha">
            <LinhaFeito
              feito
              titulo={`Faturada: total ${formatarMoeda(total)}`}
              detalhe={`em ${formatarData(ordem.data_fechamento)} (com os juros do cartão, se houve, o cobrado é maior)`}
            />
            <LinhaFeito
              feito
              titulo="Nota fiscal"
              detalhe={nenhumaNota ? "sem nota (nenhuma peça nem serviço)" : `${[situacao.precisaNfce && "NFC-e", situacao.precisaNfse && "NFS-e"].filter(Boolean).join(" e ")} emitida${situacao.precisaNfce && situacao.precisaNfse ? "s" : ""}`}
            >
              {botoesDanfe("nfe")}
              {botoesDanfe("nfse")}
            </LinhaFeito>
            <LinhaFeito feito titulo="Garantia e aviso" detalhe={avisado}>
              <Botao tamanho="medio" onClick={() => setPreviewGarantiaAberta(true)}>
                Ver garantia
              </Botao>
            </LinhaFeito>
          </ul>
        </section>
      )}

      {/* Quem e quando: o mesmo de antes, em qualquer passo. Embaixo, de apoio:
          em cima fica o que decide o passo, pra caber em 1366 × 768 com o
          botão do próximo passo à vista. */}
      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-linha p-4 text-corpo lg:grid-cols-4">
        <div className="min-w-0">
          <p className="text-rotulo text-texto-2">Cliente</p>
          <p className="truncate font-medium text-texto">{ordem.cliente?.nome ?? "—"}</p>
        </div>
        {ehVenda ? (
          <div className="min-w-0">
            <p className="text-rotulo text-texto-2">Vendedor</p>
            <p className="truncate font-medium text-texto">{ordem.vendedor?.nome ?? "—"}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-rotulo text-texto-2">Veículo</p>
            <p className="font-medium text-texto">{ordem.veiculo?.placa ?? "—"}</p>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-rotulo text-texto-2">{ehVenda ? "Registrada em" : "Aberta em"}</p>
          <p className="font-medium tabular-nums text-texto">{formatarData(ordem.data_abertura)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-rotulo text-texto-2">Fechada em</p>
          <p className="font-medium tabular-nums text-texto">{formatarData(ordem.data_fechamento)}</p>
        </div>
      </section>

      {notaParaEmitir && (
        <EmitirNotaFiscalModal
          ordem={ordem}
          tipoNota={notaParaEmitir}
          onFechar={() => setNotaParaEmitir(null)}
          onEmitido={() => {
            void recarregarNotas();
          }}
          onItensMudaram={onItensMudaram}
        />
      )}

      {notaParaVerDanfe && (
        <VerDanfeModal arquivo={notaParaVerDanfe} onFechar={() => setNotaParaVerDanfe(null)} />
      )}

      {previewGarantiaAberta && (
        <GarantiaVisualModal
          ordem={ordem}
          textoGarantia={textoGarantia}
          onFechar={() => setPreviewGarantiaAberta(false)}
        />
      )}
    </div>
  );
}
