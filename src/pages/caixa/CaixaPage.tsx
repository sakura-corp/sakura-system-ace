import { useEffect, useState } from "react";
import { Botao } from "@/components/Botao";
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
import { Aviso } from "@/components/Aviso";

export function CaixaPage() {
  const { lojaAtual, operador } = useAuth();
  const [dia, setDia] = useState(() => hojeLocal());
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

  // `silencioso`: recarrega por baixo, sem trocar a página pelo esqueleto
  // (depois de lançar, o filtro e o dia escolhidos continuam onde estavam).
  async function carregar(silencioso = false) {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    if (!silencioso) setCarregando(true);
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

  async function handleSalvar(movimento: NovoMovimentoCaixa) {
    if (!lojaAtual) return;
    // A pergunta "lançar depois do fechamento?" é feita antes de abrir a
    // janela do lançamento (DiarioSection), com a janela do programa.
    await criarMovimentoCaixa(movimento, lojaAtual.id);
    await carregar(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="font-titulo text-titulo font-bold text-texto">Caixa Diário</h1>
            <p className="text-corpo text-texto-2">O dia do caixa: o saldo, o que entrou e o que saiu</p>
          </div>
        </div>
        <label className="sakura-rotulo w-44">
          Dia
          <input
            type="date"
            value={dia}
            onChange={(e) => e.target.value && setDia(e.target.value)}
            className="sakura-campo sakura-campo-filtro"
          />
        </label>
      </header>

      {erro && (
        <Aviso tipo="perigo" role="alert" className="text-corpo">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="min-w-0">{erro}</span>
            <Botao tamanho="pequeno" onClick={() => carregar()}>
              Tentar de novo
            </Botao>
          </div>
        </Aviso>
      )}

      {carregando ? (
        <EsqueletoDoCaixa />
      ) : !dadosSaoDaLoja || !lojaAtual ? null : (
        <DiarioSection
          dia={dia}
          lojaId={lojaAtual.id}
          movimentos={movimentos}
          custoDasOrdens={custoDasOrdens}
          categorias={categorias}
          fechamentos={fechamentos}
          podeDesfazer={operador?.admin === true}
          onSalvar={handleSalvar}
          onAtualizado={() => carregar(true)}
          aoVoltarPraHoje={() => setDia(hojeLocal())}
        />
      )}
    </div>
  );
}

function Barra({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-linha-forte motion-reduce:animate-none ${className}`} />;
}

/**
 * O lugar da página enquanto os dados chegam: o saldo, os três números, a
 * lista e a lateral, na altura dos de verdade (a tela não pula quando eles
 * aparecem).
 */
function EsqueletoDoCaixa() {
  return (
    <div role="status" aria-busy="true" className="@container">
      <p className="sr-only">Carregando o caixa...</p>
      <div aria-hidden="true" className="flex flex-col gap-6 @4xl:flex-row @4xl:items-start">
        <div className="@container min-w-0 flex-1 space-y-6">
          <div className="sakura-card h-40 p-6">
            <Barra className="h-3 w-24" />
            <Barra className="mt-4 h-9 w-56" />
            <Barra className="mt-4 h-3 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <div key={n} className="sakura-card h-20 px-4 py-3">
                <Barra className="h-3 w-24" />
                <Barra className="mt-3 h-5 w-28" />
              </div>
            ))}
          </div>
          <div className="sakura-card h-[26rem] p-6">
            <Barra className="h-5 w-48" />
            <Barra className="mt-6 h-4 w-full" />
            <Barra className="mt-4 h-4 w-full" />
            <Barra className="mt-4 h-4 w-full" />
          </div>
        </div>
        <div className="w-full space-y-6 @4xl:w-80 @4xl:shrink-0">
          <div className="sakura-card h-40 p-6">
            <Barra className="h-4 w-40" />
          </div>
          <div className="sakura-card h-40 p-6">
            <Barra className="h-4 w-32" />
          </div>
          <div className="sakura-card h-32 p-6">
            <Barra className="h-4 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
