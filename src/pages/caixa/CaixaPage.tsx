import { useEffect, useState } from "react";
import { Abas } from "@/components/Abas";
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
import { Aviso } from "@/components/Aviso";
import { FechamentoSection } from "./FechamentoSection";
import { CartaoAReceberSection } from "./CartaoAReceberSection";

type Aba = "diario" | "entradas" | "saidas" | "fechamento" | "cartao";

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
        <Aviso tipo="perigo" role="alert" className="text-corpo">
          {erro}
        </Aviso>
      )}

      <Abas
        rotulo="Partes do caixa"
        ativa={aba}
        aoEscolher={setAba}
        prefixoId="caixa-aba"
        painel="caixa-painel"
        abas={ABAS}
      />

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
      ) : aba === "cartao" && lojaAtual ? (
        <CartaoAReceberSection key={lojaAtual.id} lojaId={lojaAtual.id} />
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

// As abas do caixa, com a peça `Abas` (o teclado das setas vem dela).
const ABAS: { valor: Aba; nome: string }[] = [
  { valor: "diario", nome: "Diário" },
  { valor: "entradas", nome: "Entradas" },
  { valor: "saidas", nome: "Saídas" },
  { valor: "fechamento", nome: "Fechamento" },
  { valor: "cartao", nome: "Cartão a receber" },
];
