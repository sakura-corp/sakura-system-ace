import { useEffect, useState } from "react";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Selo } from "@/components/Selo";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { listarContagens, registrarContagem } from "@/lib/contagens";
import { avisar } from "@/lib/avisoQueSome";
import { mensagemDeErro } from "@/lib/errors";
import type { ContagemEstoque } from "@/types/contagem";
import type { Deposito } from "@/types/deposito";
import type { Peca } from "@/types/peca";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

interface ContagemSectionProps {
  pecas: Peca[];
  depositos: Deposito[];
  saldosPorDeposito: Map<string, Map<string, number>>;
  lojaId: string;
  onRecarregar: () => Promise<void>;
}

export function ContagemSection({
  pecas,
  depositos,
  saldosPorDeposito,
  lojaId,
  onRecarregar,
}: ContagemSectionProps) {
  const { operador } = useAuth();
  const [pecaId, setPecaId] = useState(pecas[0]?.id ?? "");
  const [depositoId, setDepositoId] = useState(depositos[0]?.id ?? "");
  const [quantidadeContada, setQuantidadeContada] = useState("");
  const [observacao, setObservacao] = useState("");
  const [contagens, setContagens] = useState<ContagemEstoque[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // #927: só a busca mais nova mexe na tela (trocar de loja com a anterior ainda andando).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaId);

  async function carregarHistorico() {
    // Um carregar guardado de antes da troca de loja nem começa.
    const carga = comecar(lojaId);
    if (!carga) return;
    setCarregandoHistorico(true);
    try {
      const lista = await listarContagens(carga.lojaId);
      if (!carga.aindaEhAtual()) return;
      setContagens(lista);
      carga.gravou();
    } catch (err) {
      console.error("Erro ao carregar histórico de contagens:", err);
      if (!carga.aindaEhAtual()) return;
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregandoHistorico(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  const saldoSistema = saldosPorDeposito.get(pecaId)?.get(depositoId) ?? 0;
  // Carga da loja nova com erro: o histórico da anterior não aparece.
  const contagensNaTela = dadosSaoDaLoja ? contagens : [];
  const quantidadeNumero = Number(quantidadeContada);
  const diferenca =
    quantidadeContada !== "" && !isNaN(quantidadeNumero)
      ? quantidadeNumero - saldoSistema
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!pecaId) {
      setErro("Selecione um produto.");
      return;
    }
    if (!depositoId) {
      setErro("Selecione um depósito.");
      return;
    }
    if (quantidadeContada === "" || isNaN(quantidadeNumero) || quantidadeNumero < 0) {
      setErro("Informe a quantidade contada.");
      return;
    }

    setSalvando(true);
    try {
      await registrarContagem(
        pecaId,
        depositoId,
        quantidadeNumero,
        saldoSistema,
        observacao.trim() || null,
        operador?.id ?? null,
        lojaId,
      );
      setQuantidadeContada("");
      setObservacao("");
      avisar("Contagem registrada.");
      await Promise.all([carregarHistorico(), onRecarregar()]);
    } catch (err) {
      console.error("Erro ao registrar contagem:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  const peca = pecas.find((p) => p.id === pecaId);

  return (
    <div className="space-y-6">
      {pecas.length === 0 ? (
        <AvisoDeAtencao>
          Cadastre ao menos um produto na aba "Produtos" antes de fazer uma contagem.
        </AvisoDeAtencao>
      ) : (
        <form onSubmit={handleSubmit} className="sakura-card space-y-4 p-6">
          <h2 className="font-titulo text-subtitulo font-semibold text-texto">Nova contagem</h2>
          <p className="text-rotulo text-texto-2">
            Confira a quantidade física do produto e compare com o saldo que o
            sistema calcula. Se houver diferença, um ajuste de estoque é lançado
            automaticamente.
          </p>

          {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

          <div className="grid grid-cols-2 gap-4">
            <label className="sakura-rotulo">
              Produto
              <Combobox
                opcoes={pecas.map((p) => ({ valor: p.id, rotulo: p.descricao }))}
                valor={pecaId}
                onMudar={setPecaId}
                placeholder="Selecione o produto"
              />
            </label>

            <label className="sakura-rotulo">
              Depósito
              <select
                value={depositoId}
                onChange={(e) => setDepositoId(e.target.value)}
                className="sakura-campo"
              >
                {depositos.map((deposito) => (
                  <option key={deposito.id} value={deposito.id}>
                    {deposito.nome}
                  </option>
                ))}
              </select>
            </label>

            {/* Saldo, quantidade e diferença lado a lado: é a conta que a pessoa faz. */}
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <div className="sakura-rotulo">
                Saldo no sistema
                <p className="flex h-11 items-center text-corpo font-semibold text-texto">
                  {saldoSistema} {peca?.unidade ?? ""}
                </p>
              </div>

              <label className="sakura-rotulo">
                Quantidade contada
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={quantidadeContada}
                  onChange={(e) => setQuantidadeContada(e.target.value)}
                  className="sakura-campo"
                />
              </label>

              <div className="sakura-rotulo">
                Diferença
                <p
                  className={`flex h-11 items-center gap-2 text-corpo font-semibold ${
                    diferenca === null || diferenca === 0
                      ? "text-texto"
                      : diferenca > 0
                        ? "text-ok"
                        : "text-perigo"
                  }`}
                >
                  {diferenca === null ? "—" : diferenca > 0 ? `+${diferenca}` : diferenca}
                  {diferenca !== null && diferenca !== 0 && <SeloDaDiferenca diferenca={diferenca} />}
                </p>
              </div>
            </div>

            <label className="sakura-rotulo col-span-2">
              Observação (opcional)
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="sakura-campo"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Botao type="submit" variante="principal" ocupado={salvando}>
              {salvando ? "Salvando..." : "Registrar contagem"}
            </Botao>
          </div>
        </form>
      )}

      <section>
        <h2 className="mb-3 font-titulo text-subtitulo font-semibold text-texto">
          Histórico de contagens
        </h2>
        {carregandoHistorico ? (
          <p className="text-corpo text-texto-2">Carregando...</p>
        ) : contagensNaTela.length === 0 ? (
          <p className="text-corpo text-texto-2">Nenhuma contagem registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Depósito</th>
                  <th className="text-right">Contado</th>
                  <th className="text-right">Sistema</th>
                  <th className="text-right">Diferença</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {contagensNaTela.map((contagem) => (
                  <tr key={contagem.id}>
                    <td className="whitespace-nowrap text-texto-2">
                      {new Date(contagem.criado_em).toLocaleString("pt-BR")}
                    </td>
                    <td>{pecas.find((p) => p.id === contagem.peca_id)?.descricao ?? "—"}</td>
                    <td className="text-texto-2">
                      {depositos.find((d) => d.id === contagem.deposito_id)?.nome ?? "—"}
                    </td>
                    <td className="text-right">{contagem.quantidade_contada}</td>
                    <td className="text-right">{contagem.saldo_sistema}</td>
                    <td
                      className={`text-right font-medium ${
                        contagem.diferenca === 0
                          ? ""
                          : contagem.diferenca > 0
                            ? "text-ok"
                            : "text-perigo"
                      }`}
                    >
                      <span className="inline-flex items-center justify-end gap-2">
                        {contagem.diferenca > 0 ? `+${contagem.diferenca}` : contagem.diferenca}
                        {contagem.diferenca !== 0 && <SeloDaDiferenca diferenca={contagem.diferenca} />}
                      </span>
                    </td>
                    <td className="text-texto-2">{contagem.observacao || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** O número da diferença já leva o sinal; o selo diz com palavra o que ele quer dizer (regra 4). */
function SeloDaDiferenca({ diferenca }: { diferenca: number }) {
  return diferenca > 0 ? (
    <Selo tipo="ok" palavra="Sobra" />
  ) : (
    <Selo tipo="perigo" palavra="Falta" />
  );
}
