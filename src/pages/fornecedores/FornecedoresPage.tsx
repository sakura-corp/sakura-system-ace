import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarDepositos } from "@/lib/depositos";
import { mensagemDeErro } from "@/lib/errors";
import { listarFornecedores } from "@/lib/fornecedores";
import { listarPecasJanela } from "@/lib/pecas";
import { listarPedidos } from "@/lib/pedidosCompra";
import { temPermissao } from "@/types/operador";
import type { Deposito } from "@/types/deposito";
import type { Fornecedor } from "@/types/fornecedor";
import type { PedidoCompra } from "@/types/pedidoCompra";
import type { PecaJanela } from "@/types/peca";
import { FornecedoresSection } from "./FornecedoresSection";
import { PedidosCompraSection } from "./PedidosCompraSection";
import { SugestaoCompraSection } from "./SugestaoCompraSection";

type Aba = "cadastro" | "pedidos" | "sugestao";

export function FornecedoresPage() {
  const { lojaAtual, operador } = useAuth();
  // A Sugestão de compra lê saldo e saídas do estoque: só quem tem Estoque a vê
  // (a página já exige Fornecedores pela rota). Sem o módulo, a aba não existe.
  const podeSugestao = temPermissao(operador, "estoque");
  // A Central do dia manda pra cá já na aba da sugestão.
  const abaPedida = (useLocation().state as { aba?: string } | null)?.aba;
  const [aba, setAba] = useState<Aba>(abaPedida === "sugestao" && podeSugestao ? "sugestao" : "cadastro");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pecas, setPecas] = useState<PecaJanela[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // `semPiscar`: recarrega sem trocar a tela por "Carregando..." (a Sugestão de
  // compra precisa continuar na tela mostrando os pedidos que acabou de criar).
  async function carregar(semPiscar = false) {
    if (!lojaAtual) {
      setCarregando(false);
      return;
    }
    if (!semPiscar) setCarregando(true);
    setErro(null);
    try {
      const [fornecedoresCarregados, pecasCarregadas, pedidosCarregados, depositosCarregados] =
        await Promise.all([
          listarFornecedores(),
          listarPecasJanela(),
          listarPedidos(lojaAtual.id),
          listarDepositos(lojaAtual.id),
        ]);
      setFornecedores(fornecedoresCarregados);
      setPecas(pecasCarregadas);
      setPedidos(pedidosCarregados);
      setDepositos(depositosCarregados);
    } catch (err) {
      console.error("Erro ao carregar fornecedores:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Fornecedores</h1>
          <p className="text-corpo text-sakura-muted">
            Cadastro de fornecedores e pedidos de compra
          </p>
        </div>
      </header>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="Cadastro" ativa={aba === "cadastro"} onClick={() => setAba("cadastro")} />
        <AbaBotao
          label="Pedidos de compra"
          ativa={aba === "pedidos"}
          onClick={() => setAba("pedidos")}
        />
        {podeSugestao && (
          <AbaBotao
            label="Sugestão de compra"
            ativa={aba === "sugestao"}
            onClick={() => setAba("sugestao")}
          />
        )}
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : aba === "cadastro" ? (
        <FornecedoresSection fornecedores={fornecedores} onRecarregar={() => carregar()} />
      ) : !lojaAtual ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </p>
      ) : aba === "sugestao" && podeSugestao ? (
        <SugestaoCompraSection
          lojaId={lojaAtual.id}
          operadorId={operador?.id ?? null}
          onPedidosCriados={() => carregar(true)}
        />
      ) : (
        <PedidosCompraSection
          pedidos={pedidos}
          fornecedores={fornecedores}
          pecas={pecas}
          depositos={depositos}
          lojaId={lojaAtual.id}
          operadorId={operador?.id ?? null}
          onRecarregar={() => carregar()}
        />
      )}
    </div>
  );
}

function AbaBotao({
  label,
  ativa,
  onClick,
}: {
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-corpo font-medium transition-colors ${
        ativa
          ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
          : "text-sakura-purple-dark/85 hover:text-sakura-purple-dark"
      }`}
    >
      {label}
    </button>
  );
}
