import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { buscarCustoDasOrdens, criarMovimentoCaixa, listarMovimentosCaixa } from "@/lib/caixa";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import { hojeLocal } from "@/lib/datas";
import { listarFechamentosCaixa } from "@/lib/fechamentoCaixa";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { CustoDoBanco } from "@/schemas/metricasCaixa";
import { DiarioSection } from "./DiarioSection";
import { EntradaSaidaSection } from "./EntradaSaidaSection";
import { FechamentoSection } from "./FechamentoSection";

type Aba = "diario" | "entradas" | "saidas" | "fechamento";

export function CaixaPage() {
  const { lojaAtual, operador } = useAuth();
  const [aba, setAba] = useState<Aba>("diario");
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>([]);
  // Custo de cada OS que aparece nos lançamentos, calculado pelo banco
  // (`custo_das_ordens`): o Caixa não lê o cadastro de peças (#366).
  const [custoDasOrdens, setCustoDasOrdens] = useState<CustoDoBanco>(() => new Map());
  const [categorias, setCategorias] = useState<CategoriaCaixa[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoCaixa[]>([]);
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
      const [movimentosCarregados, categoriasCarregadas] = await Promise.all([
        listarMovimentosCaixa(lojaAtual.id),
        listarCategoriasCaixa(),
      ]);
      // Sem o custo o lucro sairia inflado: se falhar, a tela mostra o erro.
      const custos = await buscarCustoDasOrdens(
        movimentosCarregados.flatMap((m) => (m.ordem_servico_id ? [m.ordem_servico_id] : [])),
      );
      setMovimentos(movimentosCarregados);
      setCustoDasOrdens(custos);
      setCategorias(categoriasCarregadas);
      // O fechamento vem à parte e não derruba a tela: num banco que ainda
      // não recebeu a migration 0058, a tabela não existe — o Caixa continua
      // funcionando e a faixa de "banco desatualizado" já explica o resto.
      try {
        setFechamentos(await listarFechamentosCaixa(lojaAtual.id));
      } catch (err) {
        console.error("Erro ao carregar fechamentos de caixa:", err);
        setFechamentos([]);
      }
    } catch (err) {
      console.error("Erro ao carregar caixa:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  async function handleSalvar(movimento: NovoMovimentoCaixa) {
    if (!lojaAtual) return;
    // Lançar depois do fechamento não é proibido (regra 7 do guia: aviso,
    // nunca tranca) — mas é o que faz a gaveta deixar de bater com o que foi
    // contado, então pede confirmação e o lançamento aparece marcado.
    const fechamentoDeHoje = fechamentos.find((f) => f.data === hojeLocal());
    if (
      fechamentoDeHoje &&
      !confirm(
        `O caixa de hoje já foi fechado às ${new Date(fechamentoDeHoje.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.\n\n` +
          "Este lançamento vai aparecer marcado como feito depois do fechamento. Lançar mesmo assim?",
      )
    ) {
      return;
    }
    await criarMovimentoCaixa(movimento, lojaAtual.id);
    await carregar();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">
            Caixa Diário
          </h1>
          <p className="text-corpo text-sakura-muted">
            Vendas e movimentação do dia, nascendo das ordens de serviço faturadas
          </p>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a registrar o caixa de verdade.
        </p>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="Diário" ativa={aba === "diario"} onClick={() => setAba("diario")} />
        <AbaBotao label="Entradas" ativa={aba === "entradas"} onClick={() => setAba("entradas")} />
        <AbaBotao label="Saídas" ativa={aba === "saidas"} onClick={() => setAba("saidas")} />
        <AbaBotao label="Fechamento" ativa={aba === "fechamento"} onClick={() => setAba("fechamento")} />
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : aba === "diario" ? (
        <DiarioSection
          movimentos={movimentos}
          custoDasOrdens={custoDasOrdens}
          categorias={categorias}
          fechamentos={fechamentos}
          onSalvar={handleSalvar}
        />
      ) : aba === "fechamento" && lojaAtual ? (
        <FechamentoSection
          lojaId={lojaAtual.id}
          movimentos={movimentos}
          fechamentos={fechamentos}
          podeDesfazer={operador?.admin === true}
          onAtualizado={carregar}
        />
      ) : aba === "entradas" ? (
        <EntradaSaidaSection
          tipo="entrada"
          movimentos={movimentos}
          categorias={categorias}
          onSalvar={handleSalvar}
          onAtualizado={carregar}
        />
      ) : (
        <EntradaSaidaSection
          tipo="saida"
          movimentos={movimentos}
          categorias={categorias}
          onSalvar={handleSalvar}
          onAtualizado={carregar}
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
