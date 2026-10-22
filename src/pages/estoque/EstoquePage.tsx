import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarCategorias } from "@/lib/categorias";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { listarDepositos } from "@/lib/depositos";
import { mensagemDeErro } from "@/lib/errors";
import {
  calcularSaldoPorPeca,
  calcularSaldoPorPecaEDeposito,
  listarMovimentos,
} from "@/lib/estoque";
import { listarPecas } from "@/lib/pecas";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { Deposito } from "@/types/deposito";
import type { MovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { JuntarPecasModal } from "./JuntarPecasModal";
import { ContagemSection } from "./ContagemSection";
import { MovimentacoesSection } from "./MovimentacoesSection";
import { ProdutosSection } from "./ProdutosSection";
import { RelatoriosEstoqueSection } from "./RelatoriosEstoqueSection";

type Aba = "produtos" | "movimentacoes" | "contagem" | "relatorios";

export function EstoquePage() {
  const { lojaAtual, operador } = useAuth();
  const [juntando, setJuntando] = useState(false);
  const [aba, setAba] = useState<Aba>("produtos");
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  // O regime da loja decide se o código de ICMS de uma peça é CSOSN ou CST
  // — é o que alimenta o aviso do cadastro de produto (item TL-12).
  const [regime, setRegime] = useState<RegimeTributario | null>(null);
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
      const [
        pecasCarregadas,
        movimentosCarregados,
        categoriasCarregadas,
        depositosCarregados,
        configFiscal,
      ] = await Promise.all([
        listarPecas(),
        listarMovimentos(lojaAtual.id),
        listarCategorias(),
        listarDepositos(lojaAtual.id),
        buscarConfiguracaoFiscal(lojaAtual.id),
      ]);
      setPecas(pecasCarregadas);
      setMovimentos(movimentosCarregados);
      setCategorias(categoriasCarregadas);
      setDepositos(depositosCarregados);
      setRegime(configFiscal?.regime_tributario ?? null);
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  const saldos = calcularSaldoPorPeca(movimentos);
  const saldosPorDeposito = calcularSaldoPorPecaEDeposito(movimentos);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <BotaoVoltar />
        <div className="mr-auto">
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">
            Estoque
          </h1>
          <p className="text-corpo text-sakura-muted">
            Produtos, peças e movimentações de estoque
          </p>
        </div>
        {operador?.admin === true && isSupabaseConfigured && (
          <button
            onClick={() => setJuntando(true)}
            className="rounded-xl border border-sakura-purple/40 px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
          >
            Juntar peças repetidas
          </button>
        )}
      </header>

      {juntando && (
        <JuntarPecasModal
          categorias={categorias}
          onFechar={() => setJuntando(false)}
          onJuntado={carregar}
        />
      )}

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a usar o estoque de verdade.
        </p>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="Produtos" ativa={aba === "produtos"} onClick={() => setAba("produtos")} />
        <AbaBotao
          label="Movimentações"
          ativa={aba === "movimentacoes"}
          onClick={() => setAba("movimentacoes")}
        />
        <AbaBotao
          label="Contagem"
          ativa={aba === "contagem"}
          onClick={() => setAba("contagem")}
        />
        <AbaBotao
          label="Relatórios"
          ativa={aba === "relatorios"}
          onClick={() => setAba("relatorios")}
        />
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : !lojaAtual ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </p>
      ) : aba === "produtos" ? (
        <ProdutosSection
          pecas={pecas}
          categorias={categorias}
          saldos={saldos}
          regime={regime}
          lojaId={lojaAtual.id}
          onRecarregar={carregar}
        />
      ) : aba === "movimentacoes" ? (
        <MovimentacoesSection
          pecas={pecas}
          movimentos={movimentos}
          depositos={depositos}
          lojaId={lojaAtual.id}
          onRecarregar={carregar}
        />
      ) : aba === "contagem" ? (
        <ContagemSection
          pecas={pecas}
          depositos={depositos}
          saldosPorDeposito={saldosPorDeposito}
          lojaId={lojaAtual.id}
          onRecarregar={carregar}
        />
      ) : (
        <RelatoriosEstoqueSection
          pecas={pecas}
          movimentos={movimentos}
          saldos={saldos}
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
