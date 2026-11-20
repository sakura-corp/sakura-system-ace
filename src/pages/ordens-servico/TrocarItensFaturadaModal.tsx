import { useMemo, useState } from "react";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { EstoqueNegativoNaTrocaError } from "@/lib/ordensServico";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  pecasQueFicamNegativas,
  problemaDaTroca,
  resumoDaTroca,
  totalDaLista,
  type ItemDaTroca,
} from "@/schemas/trocaFaturada";
import { somarValoresLiquidos, valorLiquidoDoItem } from "@/schemas/valorItem";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { ItemOS, OrdemServico, TipoItemOS } from "@/types/os";
import { nomeDocumento } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

/**
 * Trocar peça ou serviço de uma OS já faturada, com o total igual (#1145).
 *
 * Dois passos: (1) a lista de itens como deve ficar, com o total faturado e o
 * total novo lado a lado; (2) a conferência "antes e depois": o que sai, o
 * que entra, o total (igual), o aviso de estoque negativo e o motivo
 * obrigatório. Quem confere tudo de novo, com a OS travada, é o banco
 * (migration 0087); esta janela só avisa antes.
 */

interface Linha {
  chave: string;
  id?: string;
  tipo: TipoItemOS;
  peca_id: string;
  servico_id: string;
  tecnico_id: string;
  descricao: string;
  quantidade: string;
  preco_unitario: string;
  desconto: string;
  custo_unitario: number | null;
}

interface TrocarItensFaturadaModalProps {
  ordem: OrdemServico;
  pecas: PecaJanela[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  saldoPorPeca: Map<string, number>;
  /** Sem o saldo carregado a janela não avisa nada (o banco avisa, com SKNEG). */
  saldoCarregado: boolean;
  onConfirmar: (itens: ItemDaTroca[], motivo: string, aceitaEstoqueNegativo: boolean) => Promise<void>;
  onFechar: () => void;
}

const inputClasse = "rounded-lg border border-borda-campo px-2 py-1.5 text-corpo text-texto";

function numero(texto: string): number {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) ? valor : NaN;
}

function paraLinha(item: ItemOS): Linha {
  return {
    chave: item.id,
    id: item.id,
    tipo: item.tipo,
    peca_id: item.peca_id ?? "",
    servico_id: item.servico_id ?? "",
    tecnico_id: item.tecnico_id ?? "",
    descricao: item.descricao,
    quantidade: String(item.quantidade),
    preco_unitario: String(item.preco_unitario),
    desconto: String(item.desconto),
    custo_unitario: item.custo_unitario ?? null,
  };
}

function paraItem(linha: Linha): ItemDaTroca {
  return {
    ...(linha.id ? { id: linha.id } : {}),
    tipo: linha.tipo,
    peca_id: linha.tipo === "peca" ? linha.peca_id || null : null,
    servico_id: linha.tipo === "servico" ? linha.servico_id || null : null,
    tecnico_id: linha.tecnico_id || null,
    descricao: linha.descricao,
    quantidade: numero(linha.quantidade),
    preco_unitario: numero(linha.preco_unitario || "0"),
    desconto: numero(linha.desconto || "0"),
    custo_unitario: linha.tipo === "peca" && linha.peca_id ? null : linha.custo_unitario,
  };
}

function paraItemDoBanco(item: ItemOS): ItemDaTroca {
  return {
    id: item.id,
    tipo: item.tipo,
    peca_id: item.peca_id,
    servico_id: item.servico_id,
    tecnico_id: item.tecnico_id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto: item.desconto,
    custo_unitario: item.custo_unitario ?? null,
  };
}

let proximaChave = 0;

function ListaDeItens({ titulo, itens }: { titulo: string; itens: ItemDaTroca[] }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-poco p-3">
      <p className="mb-1 text-rotulo font-medium text-texto/85">{titulo}</p>
      {itens.length === 0 ? (
        <p className="text-rotulo text-texto-2">Nada.</p>
      ) : (
        <ul className="space-y-1 text-corpo text-texto">
          {itens.map((item, i) => (
            <li key={item.id ?? `novo-${i}`} className="flex justify-between gap-3">
              <span>
                {item.tipo === "peca" ? "Peça" : "Serviço"} — {item.descricao} ({item.quantidade}x)
              </span>
              <span className="shrink-0">{formatarMoeda(valorLiquidoDoItem(item))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrocarItensFaturadaModal({
  ordem,
  pecas,
  servicos,
  funcionarios,
  saldoPorPeca,
  saldoCarregado,
  onConfirmar,
  onFechar,
}: TrocarItensFaturadaModalProps) {
  const antes = useMemo(() => (ordem.itens ?? []).map(paraItemDoBanco), [ordem.itens]);
  const [linhas, setLinhas] = useState<Linha[]>(() => (ordem.itens ?? []).map(paraLinha));
  const [passo, setPasso] = useState<"editar" | "confirmar">("editar");
  const [motivo, setMotivo] = useState("");
  const [aceitaNegativo, setAceitaNegativo] = useState(false);
  const [bancoAvisouNegativo, setBancoAvisouNegativo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const depois = linhas.map(paraItem);
  const problema = problemaDaTroca(antes, depois);
  const totalFaturado = somarValoresLiquidos(antes);
  const totalNovo = totalDaLista(depois);
  const nomePorPeca = useMemo(() => new Map(pecas.map((p) => [p.id, p.descricao])), [pecas]);
  const negativas = saldoCarregado
    ? pecasQueFicamNegativas(antes, depois, saldoPorPeca, nomePorPeca)
    : [];
  const avulsasDeAntes = useMemo(
    () => new Set(antes.filter((i) => i.tipo === "peca" && !i.peca_id).map((i) => i.id)),
    [antes],
  );
  const { saem, entram } = resumoDaTroca(antes, depois);
  const precisaConfirmarEstoque = negativas.length > 0 || bancoAvisouNegativo !== null;

  // Mudou a lista: a confirmação de estoque dada antes não vale pra ela.
  function esquecerConfirmacao() {
    setAceitaNegativo(false);
    setBancoAvisouNegativo(null);
  }

  function mudar(chave: string, mudanca: Partial<Linha>) {
    esquecerConfirmacao();
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  function aoMudarTipo(chave: string, tipo: TipoItemOS) {
    mudar(chave, { tipo, peca_id: "", servico_id: "", descricao: "", custo_unitario: null });
  }

  function aoMudarPeca(chave: string, pecaId: string) {
    const peca = pecas.find((p) => p.id === pecaId);
    // O preço NÃO muda sozinho: a troca é com o total igual, então o preço que
    // vale é o que foi cobrado. Quem quiser, ajusta à mão.
    mudar(chave, { peca_id: pecaId, descricao: peca?.descricao ?? "", custo_unitario: null });
  }

  function aoMudarServico(chave: string, servicoId: string) {
    const servico = servicos.find((s) => s.id === servicoId);
    mudar(chave, { servico_id: servicoId, descricao: servico?.descricao ?? "" });
  }

  function acrescentar() {
    esquecerConfirmacao();
    proximaChave += 1;
    setLinhas((atuais) => [
      ...atuais,
      {
        chave: `nova-${proximaChave}`,
        tipo: "peca",
        peca_id: "",
        servico_id: "",
        tecnico_id: "",
        descricao: "",
        quantidade: "1",
        preco_unitario: "0",
        desconto: "0",
        custo_unitario: null,
      },
    ]);
  }

  async function confirmar() {
    setErro(null);
    if (motivo.trim().length < 3) {
      setErro('Diga o motivo da troca (por exemplo: "medida do pneu estava errada").');
      return;
    }
    if (precisaConfirmarEstoque && !aceitaNegativo) {
      setErro("Confirme que sabe que o estoque vai ficar negativo, ou volte e troque a peça.");
      return;
    }
    setEnviando(true);
    try {
      await onConfirmar(depois, motivo.trim(), aceitaNegativo);
    } catch (err) {
      console.error("Erro ao trocar itens da OS faturada:", err);
      if (err instanceof EstoqueNegativoNaTrocaError) {
        // O aviso amarelo já diz isso, com a caixinha: sem repetir no vermelho.
        setBancoAvisouNegativo(err.message);
        setErro(null);
      } else {
        setErro(mensagemDeErro(err));
      }
      setEnviando(false);
    }
  }

  const rodape =
    passo === "editar" ? (
      <>
        <Botao variante="fantasma" onClick={onFechar}>
          Cancelar
        </Botao>
        <Botao variante="principal" disabled={problema !== null} onClick={() => setPasso("confirmar")}>
          Conferir a troca
        </Botao>
      </>
    ) : (
      <>
        <Botao
          variante="fantasma"
          onClick={() => {
            esquecerConfirmacao();
            setPasso("editar");
          }}
          disabled={enviando}
        >
          Voltar
        </Botao>
        <Botao variante="principal" onClick={confirmar} disabled={enviando}>
          {enviando ? "Trocando..." : "Confirmar troca"}
        </Botao>
      </>
    );

  return (
    <Modal
      titulo={`Trocar peça ou serviço — ${nomeDocumento(ordem)}`}
      descricao="A OS já foi faturada: dá pra trocar peça ou serviço mantendo o mesmo total. O pagamento, o Caixa e a conta a receber não mudam."
      largura="4xl"
      total={{ rotulo: "Faturado", valor: formatarMoeda(totalFaturado) }}
      rodape={rodape}
      notaDoRodape={
        passo === "editar" ? (
          <span>
            Total novo: <strong>{totalNovo === null ? "—" : formatarMoeda(totalNovo)}</strong>
          </span>
        ) : undefined
      }
      onFechar={onFechar}
    >
      {passo === "editar" ? (
        <div className="space-y-3">
          {linhas.map((linha) => (
            <div key={linha.chave} className="space-y-2 rounded-lg border border-linha p-3">
              <div className="flex gap-2">
                <select
                  aria-label="Tipo do item"
                  value={linha.tipo}
                  onChange={(e) => aoMudarTipo(linha.chave, e.target.value as TipoItemOS)}
                  className={`w-28 shrink-0 ${inputClasse}`}
                >
                  <option value="peca">Peça</option>
                  <option value="servico">Serviço</option>
                </select>
                {linha.tipo === "peca" ? (
                  <Combobox
                    tamanho="filtro"
                    className="flex-1"
                    opcoes={pecas.map((p) => ({ valor: p.id, rotulo: p.descricao }))}
                    valor={linha.peca_id}
                    onMudar={(v) => aoMudarPeca(linha.chave, v)}
                    opcaoVazia={
                      linha.id && avulsasDeAntes.has(linha.id)
                        ? `Sem cadastro: ${linha.descricao}`
                        : "Selecione a peça"
                    }
                    placeholder="Selecione a peça"
                  />
                ) : (
                  <Combobox
                    tamanho="filtro"
                    className="flex-1"
                    opcoes={servicos.map((s) => ({ valor: s.id, rotulo: s.descricao }))}
                    valor={linha.servico_id}
                    onMudar={(v) => aoMudarServico(linha.chave, v)}
                    opcaoVazia="Serviço avulso (digitar abaixo)"
                    placeholder="Serviço avulso (digitar abaixo)"
                  />
                )}
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  onClick={() => {
                    esquecerConfirmacao();
                    setLinhas((atuais) => atuais.filter((l) => l.chave !== linha.chave));
                  }}
                >
                  Tirar
                </Botao>
              </div>

              {linha.tipo === "servico" && !linha.servico_id && (
                <input
                  type="text"
                  aria-label="Descrição do serviço"
                  placeholder="Descrição do serviço"
                  value={linha.descricao}
                  onChange={(e) => mudar(linha.chave, { descricao: e.target.value })}
                  className={`w-full ${inputClasse}`}
                />
              )}

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Quantidade
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={linha.quantidade}
                    onChange={(e) => mudar(linha.chave, { quantidade: e.target.value })}
                    className={inputClasse}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Preço unitário
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.preco_unitario}
                    onChange={(e) => mudar(linha.chave, { preco_unitario: e.target.value })}
                    className={inputClasse}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Desconto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.desconto}
                    onChange={(e) => mudar(linha.chave, { desconto: e.target.value })}
                    className={inputClasse}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Técnico
                  <Combobox
                    tamanho="filtro"
                    opcoes={funcionarios.map((f) => ({ valor: f.id, rotulo: f.nome }))}
                    valor={linha.tecnico_id}
                    onMudar={(v) => mudar(linha.chave, { tecnico_id: v })}
                    opcaoVazia="Sem técnico definido"
                    placeholder="Sem técnico definido"
                  />
                </label>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Botao tamanho="pequeno" onClick={acrescentar}>
              + adicionar item
            </Botao>
          </div>

          {problema && <AvisoDeAtencao>{problema}</AvisoDeAtencao>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <ListaDeItens titulo="Sai" itens={saem} />
            <ListaDeItens titulo="Entra" itens={entram} />
          </div>

          <p className="text-corpo text-texto">
            Total: <strong>{formatarMoeda(totalNovo ?? totalFaturado)}</strong> (igual ao faturado). O pagamento, o
            Caixa e a conta a receber não mudam. A peça que sai volta pro estoque e a que entra
            baixa.
          </p>

          {precisaConfirmarEstoque && (
            <AvisoDeAtencao>
              <p>
                {negativas.length > 0
                  ? `O estoque vai ficar negativo: ${negativas
                      .map((n) => `${n.descricao} (fica ${n.saldoDepois})`)
                      .join(", ")}.`
                  : bancoAvisouNegativo}
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aceitaNegativo}
                  onChange={(e) => setAceitaNegativo(e.target.checked)}
                />
                Sei disso e quero seguir assim
              </label>
            </AvisoDeAtencao>
          )}

          <label className="flex flex-col gap-1 text-rotulo text-texto/90">
            Motivo da troca (obrigatório)
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ex.: a medida do pneu estava errada"
              className={inputClasse}
            />
          </label>

          {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
        </div>
      )}
    </Modal>
  );
}
