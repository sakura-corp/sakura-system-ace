import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { buscarCustoDasOrdens, criarMovimentoCaixa, listarMovimentosCaixa } from "@/lib/caixa";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import { hojeLocal } from "@/lib/datas";
import { listarFechamentosCaixa } from "@/lib/fechamentoCaixa";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { CustoDoBanco } from "@/schemas/metricasCaixa";
import { DiarioSection } from "./DiarioSection";
import { EntradaSaidaSection } from "./EntradaSaidaSection";
import { Aviso } from "./Aviso";
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
  // Só a carga mais nova mexe na tela (#927).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);

  async function carregar() {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [movimentosCarregados, categoriasCarregadas] = await Promise.all([
        listarMovimentosCaixa(carga.lojaId),
        listarCategoriasCaixa(),
      ]);
      if (!carga.aindaEhAtual()) return;
      // Sem o custo o lucro sairia inflado: se falhar, a tela mostra o erro.
      const custos = await buscarCustoDasOrdens(
        movimentosCarregados.flatMap((m) => (m.ordem_servico_id ? [m.ordem_servico_id] : [])),
      );
      if (!carga.aindaEhAtual()) return;
      setMovimentos(movimentosCarregados);
      setCustoDasOrdens(custos);
      setCategorias(categoriasCarregadas);
      carga.gravou();
      // O fechamento vem à parte e não derruba a tela: num banco que ainda
      // não recebeu a migration 0058, a tabela não existe — o Caixa continua
      // funcionando e a faixa de "banco desatualizado" já explica o resto.
      try {
        const listaFechamentos = await listarFechamentosCaixa(carga.lojaId);
        if (!carga.aindaEhAtual()) return;
        setFechamentos(listaFechamentos);
      } catch (err) {
        if (!carga.aindaEhAtual()) return;
        console.error("Erro ao carregar fechamentos de caixa:", err);
        setFechamentos([]);
      }
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar caixa:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  // As setas, Home e End andam entre as abas e já trocam de aba.
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);
  function andarPelasAbas(e: KeyboardEvent<HTMLDivElement>) {
    const atual = ABAS.findIndex((a) => a.chave === aba);
    const proxima =
      e.key === "ArrowRight"
        ? (atual + 1) % ABAS.length
        : e.key === "ArrowLeft"
          ? (atual - 1 + ABAS.length) % ABAS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? ABAS.length - 1
              : null;
    if (proxima === null) return;
    e.preventDefault();
    setAba(ABAS[proxima].chave);
    abasRef.current[proxima]?.focus();
  }

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
        <div className="min-w-0">
          <h1 className="font-titulo text-titulo font-bold text-texto">Caixa Diário</h1>
          <p className="text-corpo text-texto-2">
            Vendas e movimentação do dia, nascendo das ordens de serviço faturadas
          </p>
        </div>
      </header>

      {erro && (
        <Aviso tipo="perigo" alerta className="text-corpo">
          {erro}
        </Aviso>
      )}

      <div
        role="tablist"
        aria-label="Partes do caixa"
        onKeyDown={andarPelasAbas}
        className="flex gap-1 border-b border-linha"
      >
        {ABAS.map(({ chave, rotulo }, i) => (
          <AbaBotao
            key={chave}
            ref={(el) => {
              abasRef.current[i] = el;
            }}
            id={`caixa-aba-${chave}`}
            label={rotulo}
            ativa={aba === chave}
            onClick={() => setAba(chave)}
          />
        ))}
      </div>

      <div role="tabpanel" id="caixa-painel" aria-labelledby={`caixa-aba-${aba}`}>
      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : !dadosSaoDaLoja ? null : aba === "diario" ? (
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
          custoDasOrdens={custoDasOrdens}
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
    </div>
  );
}

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "diario", rotulo: "Diário" },
  { chave: "entradas", rotulo: "Entradas" },
  { chave: "saidas", rotulo: "Saídas" },
  { chave: "fechamento", rotulo: "Fechamento" },
];

/**
 * A aba do visual novo: o traço laranja embaixo da escolhida (regra 2, "a aba
 * ativa" é um dos lugares do laranja) e a palavra em negrito na cor do texto,
 * porque cor sozinha não avisa. A aparência segue o `aria-selected`, o mesmo
 * estado que o leitor de tela anuncia.
 *
 * É o mesmo desenho das abas da tarefa 7 (Ordens de Serviço), que criou a peça
 * `sakura-aba` no globals.css; esta tarefa partiu de antes dela. Quando as duas
 * estiverem na `main`, esta aba pode virar a peça (sugestão no PR).
 */
function AbaBotao({
  ref,
  id,
  label,
  ativa,
  onClick,
}: {
  ref: (el: HTMLButtonElement | null) => void;
  id: string;
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="tab"
      aria-selected={ativa}
      aria-controls="caixa-painel"
      // Só a aba escolhida entra no Tab; entre as abas, as setas (o jeito de
      // abas que o leitor de tela anuncia).
      tabIndex={ativa ? 0 : -1}
      onClick={onClick}
      className={[
        "relative rounded-t-[10px] px-4 pb-3 pt-2.5 text-corpo font-medium text-texto-2",
        "transition-colors hover:bg-passar hover:text-texto",
        "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-sm after:content-['']",
        "aria-selected:font-semibold aria-selected:text-texto",
        // O traço laranja é só uma linha de 2 px embaixo, não o fundo da
        // palavra: fica numa string à parte pra varredura de contraste (que
        // olha string por string) não somar o laranja com a letra.
        "aria-selected:after:bg-acao",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
