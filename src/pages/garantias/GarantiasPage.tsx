import { useEffect, useMemo, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { LinkPlaca } from "@/components/LinkPlaca";
import { Selo } from "@/components/Selo";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { listarItensComGarantia, type ItemGarantia } from "@/lib/garantias";
import { garantiaVencida, vencimentoDaGarantia } from "@/schemas/garantia";
import { temPermissao } from "@/types/operador";
import { AvisoDeErro } from "../clientes/AvisoDeErro";

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
          <h1 className="font-titulo text-titulo font-bold text-texto">Garantias</h1>
          <p className="text-corpo text-texto-2">
            Peças vendidas com prazo de garantia definido no cadastro
          </p>
        </div>
      </header>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <div role="tablist" aria-label="Situação da garantia" className="flex gap-1 border-b border-linha">
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
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : linhasFiltradas.length === 0 ? (
        <p className="text-corpo text-texto-2">
          {linhas.length === 0
            ? "Nenhuma peça vendida com garantia cadastrada ainda. Defina o prazo de garantia no cadastro do produto (aba Estoque → Produtos)."
            : "Nenhum item nessa situação."}
        </p>
      ) : (
        <div className="sakura-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th>Fechamento da OS</th>
                  <th>Vence em</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map(({ item, vencimento, vencida }) => (
                  <tr key={item.id}>
                    <td className="font-medium text-texto">{item.peca?.descricao ?? "—"}</td>
                    <td>{item.ordem?.cliente?.nome ?? "—"}</td>
                    <td>
                      {item.ordem?.veiculo && podeVerFicha ? (
                        <LinkPlaca
                          veiculoId={item.ordem.veiculo.id}
                          placa={item.ordem.veiculo.placa}
                        />
                      ) : (
                        (item.ordem?.veiculo?.placa ?? "—")
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {item.ordem?.data_fechamento
                        ? new Date(item.ordem.data_fechamento).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap">{diaBrasileiro(vencimento)}</td>
                    <td>
                      {vencida ? (
                        <Selo tipo="perigo" palavra="Vencida" />
                      ) : (
                        <Selo tipo="ok" palavra="Dentro do prazo" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      type="button"
      role="tab"
      aria-selected={ativo}
      onClick={onClick}
      className={`-mb-px px-4 py-2.5 text-corpo font-medium transition-colors ${
        ativo
          ? "border-b-2 border-acao text-texto"
          : "border-b-2 border-transparent text-texto-2 hover:text-texto"
      }`}
    >
      {label}
    </button>
  );
}
