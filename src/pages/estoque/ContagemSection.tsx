import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useAuth } from "@/contexts/AuthContext";
import { listarContagens, registrarContagem } from "@/lib/contagens";
import { mensagemDeErro } from "@/lib/errors";
import type { ContagemEstoque } from "@/types/contagem";
import type { Deposito } from "@/types/deposito";
import type { Peca } from "@/types/peca";

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
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function carregarHistorico() {
    setCarregandoHistorico(true);
    try {
      setContagens(await listarContagens(lojaId));
    } catch (err) {
      console.error("Erro ao carregar histórico de contagens:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregandoHistorico(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  const saldoSistema = saldosPorDeposito.get(pecaId)?.get(depositoId) ?? 0;
  const quantidadeNumero = Number(quantidadeContada);
  const diferenca =
    quantidadeContada !== "" && !isNaN(quantidadeNumero)
      ? quantidadeNumero - saldoSistema
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

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
      setSucesso("Contagem registrada.");
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
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Cadastre ao menos um produto na aba "Produtos" antes de fazer uma contagem.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="sakura-card space-y-4 p-6">
          <h2 className="text-corpo font-semibold text-sakura-purple-dark">
            Nova contagem
          </h2>
          <p className="text-rotulo text-sakura-muted">
            Confira a quantidade física do produto e compare com o saldo que o
            sistema calcula. Se houver diferença, um ajuste de estoque é lançado
            automaticamente.
          </p>

          {erro && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
          )}
          {sucesso && (
            <p className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
              {sucesso}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Produto</span>
              <Combobox
                opcoes={pecas.map((p) => ({ valor: p.id, rotulo: p.descricao }))}
                valor={pecaId}
                onMudar={setPecaId}
                placeholder="Selecione o produto"
              />
            </label>

            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Depósito</span>
              <select
                value={depositoId}
                onChange={(e) => setDepositoId(e.target.value)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
              >
                {depositos.map((deposito) => (
                  <option key={deposito.id} value={deposito.id}>
                    {deposito.nome}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Saldo no sistema</span>
              <p className="rounded-lg border border-transparent px-3 py-2 font-medium text-sakura-purple-dark">
                {saldoSistema} {peca?.unidade ?? ""}
              </p>
            </div>

            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Quantidade contada</span>
              <input
                type="number"
                step="1"
                min="0"
                value={quantidadeContada}
                onChange={(e) => setQuantidadeContada(e.target.value)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
              />
            </label>

            <div className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Diferença</span>
              <p
                className={`rounded-lg px-3 py-2 font-medium ${
                  diferenca === null || diferenca === 0
                    ? "text-sakura-purple-dark"
                    : diferenca > 0
                      ? "text-emerald-700"
                      : "text-red-600"
                }`}
              >
                {diferenca === null ? "—" : diferenca > 0 ? `+${diferenca}` : diferenca}
              </p>
            </div>

            <label className="col-span-2 flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">
                Observação (opcional)
              </span>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Registrar contagem"}
            </button>
          </div>
        </form>
      )}

      <section>
        <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
          Histórico de contagens
        </h2>
        {carregandoHistorico ? (
          <p className="text-corpo text-sakura-muted">Carregando...</p>
        ) : contagens.length === 0 ? (
          <p className="text-corpo text-sakura-muted">Nenhuma contagem registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Depósito</th>
                  <th className="px-4 py-3 font-medium">Contado</th>
                  <th className="px-4 py-3 font-medium">Sistema</th>
                  <th className="px-4 py-3 font-medium">Diferença</th>
                  <th className="px-4 py-3 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody>
                {contagens.map((contagem) => (
                  <tr key={contagem.id} className="border-t border-sakura-gray/20">
                    <td className="px-4 py-3">
                      {new Date(contagem.criado_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {pecas.find((p) => p.id === contagem.peca_id)?.descricao ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {depositos.find((d) => d.id === contagem.deposito_id)?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3">{contagem.quantidade_contada}</td>
                    <td className="px-4 py-3">{contagem.saldo_sistema}</td>
                    <td className="px-4 py-3">
                      {contagem.diferenca > 0
                        ? `+${contagem.diferenca}`
                        : contagem.diferenca}
                    </td>
                    <td className="px-4 py-3">{contagem.observacao || "—"}</td>
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
