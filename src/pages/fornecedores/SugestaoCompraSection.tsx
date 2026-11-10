import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  carregarDadosDaSugestao,
  gerarPedidosDaSugestao,
  type DadosDaSugestao,
  type ResultadoDoGerarPedidos,
} from "@/lib/sugestaoCompra";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  DIAS_DE_FOLGA_SUGESTAO,
  DIAS_DO_RITMO_DE_SAIDA,
  agruparPorFornecedor,
  lerQuantidadeDigitada,
  montarSugestaoCompra,
  totalDaLinha,
} from "@/schemas/estoque";

interface Props {
  lojaId: string;
  operadorId: string | null;
  /** Avisa a página que há pedidos novos, pra ela recarregar a aba de pedidos. */
  onPedidosCriados: () => void;
}

const UM_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;

function juntarComE(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

export function SugestaoCompraSection({ lojaId, operadorId, onPedidosCriados }: Props) {
  const [dados, setDados] = useState<DadosDaSugestao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // O que a pessoa mudou nas quantidades, por peça. Quem não mexeu usa a sugerida.
  const [editadas, setEditadas] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDoGerarPedidos | null>(null);

  // A loja da última carga pedida: se a pessoa trocar de loja no meio, a
  // resposta da loja antiga chega depois e não pode tomar o lugar da nova
  // (o mesmo da #903, #927 e #967).
  const lojaDaCarga = useRef(lojaId);
  // A loja que está na tela agora: o "Gerar pedidos" que termina depois de a
  // pessoa trocar de loja não pode recarregar (nem mostrar) a loja antiga.
  const lojaNaTela = useRef(lojaId);
  lojaNaTela.current = lojaId;

  async function carregar() {
    const loja = lojaId;
    lojaDaCarga.current = loja;
    setErro(null);
    try {
      const novos = await carregarDadosDaSugestao(loja, hojeLocal());
      if (lojaDaCarga.current !== loja) return;
      setDados(novos);
      setEditadas({});
    } catch (err) {
      if (lojaDaCarga.current !== loja) return;
      console.error("Erro ao carregar a sugestão de compra:", err);
      setErro(mensagemDeErro(err));
    }
  }

  useEffect(() => {
    setDados(null);
    setResultado(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  const linhas = useMemo(
    () => (dados ? montarSugestaoCompra({ ...dados, hoje: hojeLocal() }) : []),
    [dados],
  );

  // null = o que foi digitado não dá pra pedir (a tela marca e trava o gerar).
  function quantidadeDa(pecaId: string, sugerida: number): number | null {
    return pecaId in editadas ? lerQuantidadeDigitada(editadas[pecaId]) : sugerida;
  }
  const invalidas = linhas.filter((l) => quantidadeDa(l.peca_id, l.quantidadeSugerida) === null).length;

  const grupos = useMemo(
    () =>
      agruparPorFornecedor(
        linhas.map((l) => ({
          peca_id: l.peca_id,
          descricao: l.descricao,
          quantidade: quantidadeDa(l.peca_id, l.quantidadeSugerida) ?? 0,
          fornecedor: l.fornecedor,
          preco: l.preco,
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quantidadeDa só lê `editadas`
    [linhas, editadas],
  );
  const semFornecedor = linhas.filter((l) => l.fornecedor === null).length;

  const textoDaConfirmacao = `Vai criar ${grupos.length} ${grupos.length === 1 ? "pedido" : "pedidos"}: ${juntarComE(
    grupos.map(
      (g) =>
        `${g.fornecedor.nome} (${g.itens.length} ${g.itens.length === 1 ? "item" : "itens"}, ${formatarMoeda(g.total)})`,
    ),
  )}. Criar?`;

  async function criar() {
    const loja = lojaId;
    setGerando(true);
    try {
      const r = await gerarPedidosDaSugestao(grupos, loja, operadorId);
      if (lojaNaTela.current !== loja) return;
      setConfirmando(false);
      setResultado(r);
      // Recarrega SEMPRE, com erro ou sem: o `criarPedido()` grava em partes,
      // então até o fornecedor que falhou pode ter ficado gravado. Com a lista
      // velha na tela, gerar de novo duplicaria o pedido. E o "Gerar pedidos"
      // só destrava depois da recarga (o `gerando` segue ligado até aqui).
      onPedidosCriados();
      await carregar();
    } finally {
      setGerando(false);
    }
  }

  if (erro && !dados) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>;
  }
  if (!dados) return <p className="text-corpo text-sakura-muted">Carregando...</p>;

  return (
    <div className="space-y-4">
      <p className="text-corpo text-sakura-muted">
        Peças no estoque mínimo ou que, no ritmo dos últimos {DIAS_DO_RITMO_DE_SAIDA} dias, acabam em
        menos de {DIAS_DE_FOLGA_SUGESTAO} dias. A quantidade sugerida cobre o mínimo mais o que sai em{" "}
        {DIAS_DE_FOLGA_SUGESTAO} dias, menos o que já foi pedido. O fornecedor e o preço são os da
        cotação mais barata.
      </p>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      {resultado && (
        <div
          className={`rounded-xl px-4 py-3 text-corpo ${
            resultado.erro ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
          }`}
        >
          {resultado.criados.length > 0 && (
            <>
              <p className="font-medium">Pedidos criados:</p>
              <ul className="list-inside list-disc">
                {resultado.criados.map((c) => (
                  <li key={c.numero}>
                    Pedido {c.numero} — {c.fornecedorNome}
                  </li>
                ))}
              </ul>
            </>
          )}
          {resultado.erro && (
            <>
              {resultado.comFalha && (
                <p className="mt-2 font-medium">
                  {resultado.comFalha.fornecedorNome}: deu erro, e o pedido pode ter ficado gravado
                  (inteiro ou sem itens). Confira na aba Pedidos de compra antes de gerar de novo.
                </p>
              )}
              {resultado.naoTentados.length > 0 && (
                <p className="mt-2 font-medium">
                  Não foram tentados: {resultado.naoTentados.map((n) => n.fornecedorNome).join(", ")}
                </p>
              )}
              <p>{resultado.erro}</p>
              <p>Nada foi repetido sozinho. A lista abaixo já foi atualizada com o que ficou pedido.</p>
            </>
          )}
        </div>
      )}

      {linhas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">Nenhuma peça precisa de compra agora.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-3 py-3 font-medium">Peça</th>
                <th className="px-3 py-3 font-medium">Saldo</th>
                <th className="px-3 py-3 font-medium">Mínimo</th>
                <th className="px-3 py-3 font-medium">Saída por mês</th>
                <th className="px-3 py-3 font-medium">Dias que faltam</th>
                <th className="px-3 py-3 font-medium">Já pedido</th>
                <th className="px-3 py-3 font-medium">Comprar</th>
                <th className="px-3 py-3 font-medium">Fornecedor</th>
                <th className="px-3 py-3 font-medium">Preço</th>
                <th className="px-3 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const quantidade = quantidadeDa(l.peca_id, l.quantidadeSugerida);
                return (
                  <tr key={l.peca_id} className="border-t border-sakura-gray/20 text-sakura-purple-dark">
                    <td className="px-3 py-3">{l.descricao}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {l.saldo}
                      {l.unidade ? ` ${l.unidade}` : ""}
                    </td>
                    <td className="px-3 py-3">{l.estoque_minimo ?? "—"}</td>
                    <td className="px-3 py-3">
                      {l.consumoPorDia > 0 ? (l.consumoPorDia * 30).toLocaleString("pt-BR", UM_DECIMAL) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {l.diasRestantes === null ? "—" : Math.floor(l.diasRestantes)}
                    </td>
                    <td className="px-3 py-3">{l.jaPedido}</td>
                    <td className="px-3 py-3">
                      <input
                        // Texto, e não "number": a caixa de número não aceita a vírgula
                        // do "2,5" (litro); quem confere é o lerQuantidadeDigitada.
                        type="text"
                        inputMode="decimal"
                        aria-label={`Quantidade de ${l.descricao}`}
                        value={l.peca_id in editadas ? editadas[l.peca_id] : String(l.quantidadeSugerida)}
                        aria-invalid={quantidade === null}
                        onChange={(e) => setEditadas((antes) => ({ ...antes, [l.peca_id]: e.target.value }))}
                        className={`h-9 w-20 rounded-lg border px-2 text-corpo ${
                          quantidade === null ? "border-red-500" : "border-sakura-borda-campo"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      {l.fornecedor ? l.fornecedor.nome : <span className="text-sakura-muted">sem cotação</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {l.preco === null ? "—" : formatarMoeda(l.preco)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {l.preco === null || quantidade === null
                        ? "—"
                        : formatarMoeda(totalDaLinha(quantidade, l.preco))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {grupos.length > 0 && (
        <div className="sakura-card space-y-1 p-4 text-corpo text-sakura-purple-dark">
          <p className="font-medium">Total por fornecedor</p>
          <ul>
            {grupos.map((g) => (
              <li key={g.fornecedor.id}>
                {g.fornecedor.nome}: {formatarMoeda(g.total)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {semFornecedor > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          {semFornecedor} {semFornecedor === 1 ? "peça fica fora dos pedidos" : "peças ficam fora dos pedidos"}{" "}
          por não ter fornecedor com cotação. Registre um preço num pedido de compra pra ela entrar.
        </p>
      )}

      {invalidas > 0 && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {invalidas === 1 ? "1 linha tem" : `${invalidas} linhas têm`} quantidade que não dá pra pedir
          (use número sem sinal, com até 2 casas, ex.: 3 ou 2,5). Corrija pra gerar os pedidos.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={gerando || invalidas > 0 || grupos.length === 0}
          className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Gerar pedidos
        </button>
      </div>

      {confirmando && (
        <Modal titulo="Gerar pedidos" onFechar={() => !gerando && setConfirmando(false)}>
          <div className="space-y-4 text-corpo text-sakura-purple-dark">
            <p>{textoDaConfirmacao}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={gerando}
                className="rounded-xl border border-sakura-purple/40 px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criar}
                disabled={gerando}
                className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {gerando ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
