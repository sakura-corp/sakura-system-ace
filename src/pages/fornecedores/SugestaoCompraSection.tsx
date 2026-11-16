import { useEffect, useMemo, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { Selo } from "@/components/Selo";
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
import { AvisoDeAtencao, AvisoDeCerto, AvisoDeErro } from "@/pages/estoque/avisosEAbas";

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

  // Trava contra o segundo clique no "Criar" antes de o React redesenhar o
  // botão desligado (o `gerando` é estado, e estado só muda no próximo desenho).
  const criando = useRef(false);

  /** @returns se a lista nova chegou (falso se deu erro ou se a loja mudou). */
  async function carregar(): Promise<boolean> {
    const loja = lojaId;
    lojaDaCarga.current = loja;
    setErro(null);
    try {
      const novos = await carregarDadosDaSugestao(loja, hojeLocal());
      if (lojaDaCarga.current !== loja) return false;
      setDados(novos);
      setEditadas({});
      return true;
    } catch (err) {
      if (lojaDaCarga.current !== loja) return false;
      console.error("Erro ao carregar a sugestão de compra:", err);
      setErro(mensagemDeErro(err));
      return false;
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
  // Só conta quem iria pro pedido: linha com 0 (tudo já pedido) não "fica fora" de nada.
  const semFornecedor = linhas.filter(
    (l) => l.fornecedor === null && (quantidadeDa(l.peca_id, l.quantidadeSugerida) ?? 0) > 0,
  ).length;

  const textoDaConfirmacao = `Vai criar ${grupos.length} ${grupos.length === 1 ? "pedido" : "pedidos"}: ${juntarComE(
    grupos.map(
      (g) =>
        `${g.fornecedor.nome} (${g.itens.length} ${g.itens.length === 1 ? "item" : "itens"}, ${formatarMoeda(g.total)})`,
    ),
  )}. Criar?`;

  async function criar() {
    if (criando.current) return;
    criando.current = true;
    const loja = lojaId;
    setGerando(true);
    try {
      const r = await gerarPedidosDaSugestao(grupos, loja, operadorId);
      // Fecha a confirmação em qualquer caminho: se a loja mudou no meio, ela
      // ficaria aberta com os grupos da loja nova (revisão do #989).
      setConfirmando(false);
      if (lojaNaTela.current !== loja) return;
      setResultado(r);
      // Recarrega SEMPRE, com erro ou sem: o `criarPedido()` grava em partes,
      // então até o fornecedor que falhou pode ter ficado gravado. E o "Gerar
      // pedidos" só destrava depois da recarga (o `gerando` segue ligado).
      onPedidosCriados();
      const recarregou = await carregar();
      // Se a recarga falhou, a lista na tela é a de ANTES dos pedidos (com o
      // "Já pedido" zerado): gerar de novo dali duplicaria tudo. Ela sai da
      // tela, e só volta com um "Tentar de novo" que dê certo.
      if (!recarregou && lojaNaTela.current === loja) setDados(null);
    } finally {
      criando.current = false;
      setGerando(false);
    }
  }

  // O aviso do que o "Gerar pedidos" fez. `listaAtualizada` é falso quando a
  // recarga falhou: aí não se pode dizer que a lista abaixo está em dia.
  function avisoDoResultado(listaAtualizada: boolean) {
    if (!resultado) return null;
    const Aviso = resultado.erro ? AvisoDeErro : AvisoDeCerto;
    return (
      <Aviso>
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
            <p>
              Nada foi repetido sozinho.
              {listaAtualizada && " A lista abaixo já foi atualizada com o que ficou pedido."}
            </p>
          </>
        )}
      </Aviso>
    );
  }

  if (erro && !dados) {
    return (
      <div className="space-y-4">
        {avisoDoResultado(false)}
        <AvisoDeErro>
          <p>Não deu pra carregar a sugestão de compra: {erro}</p>
          {resultado && (
            <p className="mt-1">
              A lista some até carregar de novo, pra não pedir em dobro o que acabou de ser pedido.
            </p>
          )}
        </AvisoDeErro>
        <Botao onClick={() => carregar()}>Tentar de novo</Botao>
      </div>
    );
  }
  if (!dados) return <p className="text-corpo text-texto-2">Carregando...</p>;

  return (
    <div className="space-y-4">
      <p className="text-corpo text-texto-2">
        Peças no estoque mínimo ou que, no ritmo dos últimos {DIAS_DO_RITMO_DE_SAIDA} dias, acabam em
        menos de {DIAS_DE_FOLGA_SUGESTAO} dias. A quantidade sugerida cobre o mínimo mais o que sai em{" "}
        {DIAS_DE_FOLGA_SUGESTAO} dias, menos o que já foi pedido. O fornecedor e o preço são os da
        cotação mais barata.
      </p>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {avisoDoResultado(true)}

      {linhas.length === 0 ? (
        <p className="text-corpo text-texto-2">Nenhuma peça precisa de compra agora.</p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Peça</th>
                <th className="text-right">Saldo</th>
                <th className="text-right">Mínimo</th>
                <th className="text-right">Saída por mês</th>
                <th className="text-right">Dias que faltam</th>
                <th className="text-right">Já pedido</th>
                <th>Comprar</th>
                <th>Fornecedor</th>
                <th className="text-right">Preço</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const quantidade = quantidadeDa(l.peca_id, l.quantidadeSugerida);
                return (
                  <tr key={l.peca_id}>
                    <td className="font-medium">{l.descricao}</td>
                    <td className="whitespace-nowrap text-right">
                      {l.saldo}
                      {l.unidade ? ` ${l.unidade}` : ""}
                    </td>
                    <td className="text-right">{l.estoque_minimo ?? "—"}</td>
                    <td className="text-right">
                      {l.consumoPorDia > 0 ? (l.consumoPorDia * 30).toLocaleString("pt-BR", UM_DECIMAL) : "—"}
                    </td>
                    <td className="text-right">
                      {l.diasRestantes === null ? "—" : Math.floor(l.diasRestantes)}
                    </td>
                    <td className="text-right">{l.jaPedido}</td>
                    <td>
                      <input
                        // Texto, e não "number": a caixa de número não aceita a vírgula
                        // do "2,5" (litro); quem confere é o lerQuantidadeDigitada.
                        type="text"
                        inputMode="decimal"
                        aria-label={`Quantidade de ${l.descricao}`}
                        value={l.peca_id in editadas ? editadas[l.peca_id] : String(l.quantidadeSugerida)}
                        aria-invalid={quantidade === null}
                        onChange={(e) => setEditadas((antes) => ({ ...antes, [l.peca_id]: e.target.value }))}
                        className="sakura-campo sakura-campo-filtro w-24! px-2!"
                      />
                    </td>
                    <td>
                      {l.fornecedor ? l.fornecedor.nome : <Selo tipo="atencao" palavra="Sem cotação" />}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {l.preco === null ? "—" : formatarMoeda(l.preco)}
                    </td>
                    <td className="whitespace-nowrap text-right">
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
        <div className="sakura-card space-y-1 p-4 text-corpo text-texto">
          <p className="font-titulo font-semibold">Total por fornecedor</p>
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
        <AvisoDeAtencao>
          {semFornecedor} {semFornecedor === 1 ? "peça fica fora dos pedidos" : "peças ficam fora dos pedidos"}{" "}
          por não ter fornecedor com cotação. Registre um preço num pedido de compra pra ela entrar.
        </AvisoDeAtencao>
      )}

      {invalidas > 0 && (
        <AvisoDeErro>
          {invalidas === 1 ? "1 linha tem" : `${invalidas} linhas têm`} quantidade que não dá pra pedir
          (use número sem sinal, com até 2 casas, ex.: 3 ou 2,5). Corrija pra gerar os pedidos.
        </AvisoDeErro>
      )}

      <div className="flex justify-end">
        <Botao
          variante="principal"
          onClick={() => setConfirmando(true)}
          disabled={gerando || invalidas > 0 || grupos.length === 0}
        >
          Gerar pedidos
        </Botao>
      </div>

      {confirmando && (
        <Modal
          titulo="Gerar pedidos"
          onFechar={() => !gerando && setConfirmando(false)}
          rodape={
            <>
              <Botao onClick={() => setConfirmando(false)} disabled={gerando}>
                Cancelar
              </Botao>
              <Botao variante="principal" onClick={criar} ocupado={gerando}>
                {gerando ? "Criando..." : "Criar"}
              </Botao>
            </>
          }
        >
          <p className="text-corpo text-texto">{textoDaConfirmacao}</p>
        </Modal>
      )}
    </div>
  );
}
