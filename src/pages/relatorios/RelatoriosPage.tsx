import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
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
import { CurvaABCSection } from "./CurvaABCSection";
import { FluxoProjetadoSection } from "./FluxoProjetadoSection";
import { GraficosSection } from "./GraficosSection";
import { LucratividadeSection } from "./LucratividadeSection";

type Aba = "graficos" | "lucratividade" | "curvaABC" | "fluxo";

const SEM_MOVIMENTOS: MovimentoCaixa[] = [];
const SEM_ORDENS: OrdemServico[] = [];
const SEM_PECAS: Peca[] = [];
const SEM_SERVICOS: Servico[] = [];

export function RelatoriosPage() {
  const { lojaAtual, operador } = useAuth();
  const podeVerPagar = temPermissao(operador, "contas_pagar");
  const podeVerReceber = temPermissao(operador, "contas_receber");
  const [aba, setAba] = useState<Aba>("graficos");
  // #927: só a carga mais nova mexe na tela; e se a da loja nova der erro, os
  // dados guardados (da loja anterior) não aparecem.
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  const [movimentosGuardados, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [ordensGuardadas, setOrdens] = useState<OrdemServico[]>([]);
  const [pecasGuardadas, setPecas] = useState<Peca[]>([]);
  const [servicosGuardados, setServicos] = useState<Servico[]>([]);
  const movimentos = dadosSaoDaLoja ? movimentosGuardados : SEM_MOVIMENTOS;
  const ordens = dadosSaoDaLoja ? ordensGuardadas : SEM_ORDENS;
  const pecas = dadosSaoDaLoja ? pecasGuardadas : SEM_PECAS;
  const servicos = dadosSaoDaLoja ? servicosGuardados : SEM_SERVICOS;
  const [contasPagar, setContasPagar] = useState<ContaPagar[] | null>(null);
  const [contasReceber, setContasReceber] = useState<ContaReceber[] | null>(null);
  const [erroContas, setErroContas] = useState<string | null>(null);
  const [carregandoContas, setCarregandoContas] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const carga = comecar(lojaAtual?.id);
      if (!carga) {
        if (!lojaAtual) setCarregando(false);
        return;
      }
      setErro(null);
      try {
        const [movimentosCarregados, ordensCarregadas, pecasCarregadas, servicosCarregados] =
          await Promise.all([
            listarMovimentosCaixa(carga.lojaId),
            listarOrdens(carga.lojaId),
            listarPecas(),
            listarServicos(),
          ]);
        if (!carga.aindaEhAtual()) return;
        setMovimentos(movimentosCarregados);
        setOrdens(ordensCarregadas);
        setPecas(pecasCarregadas);
        setServicos(servicosCarregados);
        carga.gravou();
      } catch (err) {
        if (!carga.aindaEhAtual()) return;
        console.error("Erro ao carregar relações:", err);
        setErro(mensagemDeErro(err));
      } finally {
        if (carga.aindaEhAtual()) setCarregando(false);
      }
    }
    carregar();
  }, [lojaAtual, comecar]);

  // As contas do Fluxo de caixa vêm à parte (#389): um erro nelas não pode
  // apagar Gráficos e Lucratividade, nem virar "Sem acesso" pra quem tem o
  // acesso; e os Gráficos não esperam por elas. `ativo` descarta a resposta
  // que chega depois de trocar de loja (senão a da loja antiga podia ganhar).
  useEffect(() => {
    if (!lojaAtual) {
      setCarregandoContas(false);
      return;
    }
    let ativo = true;
    setCarregandoContas(true);
    setErroContas(null);
    Promise.all([
      podeVerPagar ? listarContasPagar(lojaAtual.id) : Promise.resolve(null),
      podeVerReceber ? listarContasReceber(lojaAtual.id) : Promise.resolve(null),
    ])
      .then(([pagarCarregadas, receberCarregadas]) => {
        if (!ativo) return;
        setContasPagar(pagarCarregadas);
        setContasReceber(receberCarregadas);
      })
      .catch((err) => {
        if (!ativo) return;
        console.error("Erro ao carregar as contas do fluxo de caixa:", err);
        setErroContas(mensagemDeErro(err));
      })
      .finally(() => {
        if (ativo) setCarregandoContas(false);
      });
    return () => {
      ativo = false;
    };
  }, [lojaAtual, podeVerPagar, podeVerReceber]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="font-titulo text-titulo font-bold text-texto">Relações</h1>
          <p className="text-corpo text-texto-2">
            Vendas, custos, lucro e margem do negócio ao longo do tempo
          </p>
        </div>
      </header>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <div role="tablist" aria-label="O que mostrar" className="flex gap-1 border-b border-linha">
        {ABAS.map((a) => (
          <AbaBotao
            key={a.chave}
            label={a.texto}
            ativa={aba === a.chave}
            onClick={() => setAba(a.chave)}
          />
        ))}
      </div>

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : aba === "graficos" ? (
        <GraficosSection
          movimentos={movimentos}
          ordens={ordens}
          pecas={pecas}
          servicos={servicos}
        />
      ) : aba === "lucratividade" ? (
        <LucratividadeSection ordens={ordens} pecas={pecas} servicos={servicos} />
      ) : aba === "curvaABC" ? (
        <CurvaABCSection ordens={ordens} pecas={pecas} servicos={servicos} />
      ) : carregandoContas ? (
        <p className="text-corpo text-texto-2">Carregando as contas...</p>
      ) : erroContas ? (
        <AvisoDeErro>Não deu pra carregar as contas: {erroContas}</AvisoDeErro>
      ) : (
        <FluxoProjetadoSection
          contasPagar={contasPagar}
          contasReceber={contasReceber}
        />
      )}
    </div>
  );
}

const ABAS: { chave: Aba; texto: string }[] = [
  { chave: "graficos", texto: "Gráficos" },
  { chave: "lucratividade", texto: "Lucratividade" },
  { chave: "curvaABC", texto: "Curva ABC" },
  { chave: "fluxo", texto: "Fluxo de caixa" },
];

/** Erro que não some sozinho: ícone e palavra junto da cor (regra 4). */
function AvisoDeErro({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-perigo/[0.13] px-4 py-3 text-corpo text-perigo"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

// A aba do visual novo: o texto escuro/claro do tema, e o laranja só no
// traço de baixo da aba ligada (laranja é ação, regra 2). A ligada também
// fica em negrito, porque a cor sozinha não avisa (regra 4).
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
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={onClick}
      className={`relative rounded-t-[10px] px-4 pb-3 pt-2.5 text-corpo transition-colors duration-150 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-sm motion-reduce:transition-none ${
        ativa
          ? "font-semibold text-texto after:bg-acao"
          : "font-medium text-texto-2 after:bg-transparent hover:bg-passar hover:text-texto"
      }`}
    >
      {label}
    </button>
  );
}
