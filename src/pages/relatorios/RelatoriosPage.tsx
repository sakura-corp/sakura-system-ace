import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarMovimentosCaixa } from "@/lib/caixa";
import { listarContasPagar } from "@/lib/contasPagar";
import { listarContasReceber } from "@/lib/contasReceber";
import { mensagemDeErro } from "@/lib/errors";
import { listarOrdens } from "@/lib/ordensServico";
import { listarPecas } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import { temPermissao } from "@/types/operador";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { FluxoProjetadoSection } from "./FluxoProjetadoSection";
import { GraficosSection } from "./GraficosSection";
import { LucratividadeSection } from "./LucratividadeSection";

type Aba = "graficos" | "lucratividade" | "fluxo";

export function RelatoriosPage() {
  const { lojaAtual, operador } = useAuth();
  const podeVerPagar = temPermissao(operador, "contas_pagar");
  const podeVerReceber = temPermissao(operador, "contas_receber");
  const [aba, setAba] = useState<Aba>("graficos");
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[] | null>(null);
  const [contasReceber, setContasReceber] = useState<ContaReceber[] | null>(
    null,
  );
  const [erroContas, setErroContas] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!lojaAtual) {
        setCarregando(false);
        return;
      }
      // As contas vêm à parte: um erro nelas não pode apagar Gráficos e
      // Lucratividade, nem virar "Sem acesso" pra quem tem o acesso (#389).
      const contas = Promise.all([
        podeVerPagar ? listarContasPagar(lojaAtual.id) : Promise.resolve(null),
        podeVerReceber ? listarContasReceber(lojaAtual.id) : Promise.resolve(null),
      ])
        .then(([pagarCarregadas, receberCarregadas]) => {
          setContasPagar(pagarCarregadas);
          setContasReceber(receberCarregadas);
          setErroContas(null);
        })
        .catch((err) => {
          console.error("Erro ao carregar as contas do fluxo de caixa:", err);
          setErroContas(mensagemDeErro(err));
        });
      try {
        const [movimentosCarregados, ordensCarregadas, pecasCarregadas, servicosCarregados] =
          await Promise.all([
            listarMovimentosCaixa(lojaAtual.id),
            listarOrdens(lojaAtual.id),
            listarPecas(),
            listarServicos(),
          ]);
        setMovimentos(movimentosCarregados);
        setOrdens(ordensCarregadas);
        setPecas(pecasCarregadas);
        setServicos(servicosCarregados);
      } catch (err) {
        console.error("Erro ao carregar relações:", err);
        setErro(mensagemDeErro(err));
      } finally {
        await contas;
        setCarregando(false);
      }
    }
    carregar();
  }, [lojaAtual, podeVerPagar, podeVerReceber]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">
            Relações
          </h1>
          <p className="text-corpo text-sakura-muted">
            Vendas, custos, lucro e margem do negócio ao longo do tempo
          </p>
        </div>
      </header>

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao
          label="Gráficos"
          ativa={aba === "graficos"}
          onClick={() => setAba("graficos")}
        />
        <AbaBotao
          label="Lucratividade"
          ativa={aba === "lucratividade"}
          onClick={() => setAba("lucratividade")}
        />
        <AbaBotao
          label="Fluxo de caixa"
          ativa={aba === "fluxo"}
          onClick={() => setAba("fluxo")}
        />
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : aba === "graficos" ? (
        <GraficosSection
          movimentos={movimentos}
          ordens={ordens}
          pecas={pecas}
          servicos={servicos}
        />
      ) : aba === "lucratividade" ? (
        <LucratividadeSection
          ordens={ordens}
          pecas={pecas}
          servicos={servicos}
        />
      ) : erroContas ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          Não deu pra carregar as contas: {erroContas}
        </p>
      ) : (
        <FluxoProjetadoSection
          contasPagar={contasPagar}
          contasReceber={contasReceber}
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
