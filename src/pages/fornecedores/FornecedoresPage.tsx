import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarDepositos } from "@/lib/depositos";
import { mensagemDeErro } from "@/lib/errors";
import { listarFornecedores } from "@/lib/fornecedores";
import { listarPecasJanela } from "@/lib/pecas";
import { listarPedidos } from "@/lib/pedidosCompra";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Deposito } from "@/types/deposito";
import type { Fornecedor } from "@/types/fornecedor";
import type { PedidoCompra } from "@/types/pedidoCompra";
import type { PecaJanela } from "@/types/peca";
import { FornecedoresSection } from "./FornecedoresSection";
import { PedidosCompraSection } from "./PedidosCompraSection";

type Aba = "cadastro" | "pedidos";

export function FornecedoresPage() {
  const { lojaAtual, operador } = useAuth();
  const [aba, setAba] = useState<Aba>("cadastro");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pecas, setPecas] = useState<PecaJanela[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    if (!isSupabaseConfigured || !lojaAtual) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
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

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a usar fornecedores de verdade.
        </p>
      )}

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="Cadastro" ativa={aba === "cadastro"} onClick={() => setAba("cadastro")} />
        <AbaBotao
          label="Pedidos de compra"
          ativa={aba === "pedidos"}
          onClick={() => setAba("pedidos")}
        />
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : aba === "cadastro" ? (
        <FornecedoresSection fornecedores={fornecedores} onRecarregar={carregar} />
      ) : !lojaAtual ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </p>
      ) : (
        <PedidosCompraSection
          pedidos={pedidos}
          fornecedores={fornecedores}
          pecas={pecas}
          depositos={depositos}
          lojaId={lojaAtual.id}
          operadorId={operador?.id ?? null}
          onRecarregar={carregar}
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
