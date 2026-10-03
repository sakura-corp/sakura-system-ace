import { useEffect, useMemo, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { LinkPlaca } from "@/components/LinkPlaca";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { listarItensComGarantia, type ItemGarantia } from "@/lib/garantias";
import { isSupabaseConfigured } from "@/lib/supabase";
import { garantiaVencida, vencimentoDaGarantia } from "@/schemas/garantia";
import { temPermissao } from "@/types/operador";

type FiltroStatus = "todos" | "dentro_do_prazo" | "vencida";

export function GarantiasPage() {
  const [itens, setItens] = useState<ItemGarantia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const { operador } = useAuth();
  // A ficha do veículo é de Clientes e de Ordens de Serviço; quem só tem
  // Garantias vê a placa como texto, em vez de um atalho que daria em
  // "sem permissão".
  const podeVerFicha =
    temPermissao(operador, "clientes") || temPermissao(operador, "ordens_servico");

  useEffect(() => {
    async function carregar() {
      if (!isSupabaseConfigured) {
        setCarregando(false);
        return;
      }
      try {
        setItens(await listarItensComGarantia());
      } catch (err) {
        console.error("Erro ao carregar garantias:", err);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // A conta do vencimento é a mesma da ficha do veículo (schemas/garantia.ts)
  // — em dia de calendário, valendo o último dia inteiro.
  const linhas = useMemo(() => {
    const hoje = hojeLocal();
    return itens
      .map((item) => {
        const prazoDias = item.peca?.prazo_garantia_dias ?? 0;
        const dataFechamento = item.ordem?.data_fechamento ?? "";
        const vencimento = vencimentoDaGarantia(dataFechamento, prazoDias);
        const vencida = garantiaVencida(vencimento, hoje);
        return { item, vencimento, vencida };
      })
      .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  }, [itens]);

  const linhasFiltradas = linhas.filter(({ vencida }) => {
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "dentro_do_prazo") return !vencida;
    return vencida;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Garantias</h1>
          <p className="text-corpo text-sakura-muted">
            Peças vendidas com prazo de garantia definido no cadastro
          </p>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para ver as garantias de verdade.
        </p>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>
      )}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <FiltroBotao
          label={`Todos (${linhas.length})`}
          ativo={filtroStatus === "todos"}
          onClick={() => setFiltroStatus("todos")}
        />
        <FiltroBotao
          label={`Dentro do prazo (${linhas.filter((l) => !l.vencida).length})`}
          ativo={filtroStatus === "dentro_do_prazo"}
          onClick={() => setFiltroStatus("dentro_do_prazo")}
        />
        <FiltroBotao
          label={`Vencida (${linhas.filter((l) => l.vencida).length})`}
          ativo={filtroStatus === "vencida"}
          onClick={() => setFiltroStatus("vencida")}
        />
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : linhasFiltradas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          {linhas.length === 0
            ? "Nenhuma peça vendida com garantia cadastrada ainda. Defina o prazo de garantia no cadastro do produto (aba Estoque → Produtos)."
            : "Nenhum item nessa situação."}
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Veículo</th>
                <th className="px-4 py-3 font-medium">Fechamento da OS</th>
                <th className="px-4 py-3 font-medium">Vence em</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.map(({ item, vencimento, vencida }) => (
                <tr key={item.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">{item.peca?.descricao ?? "—"}</td>
                  <td className="px-4 py-3">{item.ordem?.cliente?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    {item.ordem?.veiculo && podeVerFicha ? (
                      <LinkPlaca
                        veiculoId={item.ordem.veiculo.id}
                        placa={item.ordem.veiculo.placa}
                      />
                    ) : (
                      (item.ordem?.veiculo?.placa ?? "—")
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.ordem?.data_fechamento
                      ? new Date(item.ordem.data_fechamento).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{diaBrasileiro(vencimento)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                        vencida
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {vencida ? "Vencida" : "Dentro do prazo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FiltroBotao({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-corpo font-medium transition-colors ${
        ativo
          ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
          : "text-sakura-purple-dark/85 hover:text-sakura-purple-dark"
      }`}
    >
      {label}
    </button>
  );
}
