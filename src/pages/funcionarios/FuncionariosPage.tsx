import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarComissoesPagas } from "@/lib/comissoesFechamentos";
import { listarContasReceber } from "@/lib/contasReceber";
import { mensagemDeErro } from "@/lib/errors";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { listarFuncionarios } from "@/lib/funcionarios";
import { listarOrdensParaComissoes } from "@/lib/ordensServico";
import { listarPecas } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";
import type { ContaReceber } from "@/types/contaReceber";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemParaComissao } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { ComissoesSection } from "./ComissoesSection";
import { FuncionariosSection } from "./FuncionariosSection";

type Aba = "cadastro" | "comissoes";

export function FuncionariosPage() {
  const { lojaAtual, operador } = useAuth();
  const [aba, setAba] = useState<Aba>("cadastro");
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Dados que só a aba Comissões usa. Ficam separados de propósito: são 4
  // consultas (OS, peças, serviços, contas a receber) que não fazem falta
  // nenhuma pra quem só veio cadastrar funcionário, então só são buscadas
  // quando essa aba é aberta pela primeira vez.
  const [dadosComissoes, setDadosComissoes] = useState<{
    lojaId: string;
    ordens: OrdemParaComissao[];
    pecas: Peca[];
    servicos: Servico[];
    contasReceber: ContaReceber[];
  } | null>(null);
  const [carregandoComissoes, setCarregandoComissoes] = useState(false);
  const [pagamentos, setPagamentos] = useState<ComissaoFechamento[]>([]);

  // Só a carga mais nova de cada busca mexe na tela (#927): os funcionários,
  // os dados de comissão e os pagamentos são três cargas, cada uma com a sua.
  const cargaFuncionarios = useCargaMaisNova(lojaAtual?.id);
  const cargaComissoes = useCargaMaisNova(lojaAtual?.id);
  const cargaPagamentos = useCargaMaisNova(lojaAtual?.id);
  const funcionariosNaTela = cargaFuncionarios.dadosSaoDaLoja ? funcionarios : [];
  const pagamentosNaTela = cargaPagamentos.dadosSaoDaLoja ? pagamentos : [];
  // Os dados de comissão da loja anterior não valem pra loja nova.
  const comissoesNaTela = dadosComissoes?.lojaId === lojaAtual?.id ? dadosComissoes : null;

  // À parte, e sem derrubar a aba: num banco que ainda não recebeu a
  // migration 0059, a tabela não existe — a comissão continua calculando e a
  // faixa de "banco desatualizado" explica o resto.
  async function carregarPagamentos() {
    const carga = cargaPagamentos.comecar(lojaAtual?.id);
    if (!carga) return;
    try {
      const lista = await listarComissoesPagas(carga.lojaId);
      if (!carga.aindaEhAtual()) return;
      setPagamentos(lista);
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar pagamentos de comissão:", err);
      setPagamentos([]);
    }
    carga.gravou();
  }

  async function carregar() {
    const carga = cargaFuncionarios.comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarFuncionarios(carga.lojaId);
      if (!carga.aindaEhAtual()) return;
      setFuncionarios(lista);
      carga.gravou();
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar funcionários:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  useEffect(() => {
    async function carregarComissoes() {
      if (aba !== "comissoes" || !lojaAtual || comissoesNaTela) return;
      const carga = cargaComissoes.comecar(lojaAtual.id);
      if (!carga) return;
      setCarregandoComissoes(true);
      setErro(null);
      try {
        const [ordens, pecas, servicos, contasReceber] = await Promise.all([
          listarOrdensParaComissoes(carga.lojaId),
          listarPecas(),
          listarServicos(),
          listarContasReceber(carga.lojaId),
        ]);
        if (!carga.aindaEhAtual()) return;
        setDadosComissoes({ lojaId: carga.lojaId, ordens, pecas, servicos, contasReceber });
        carga.gravou();
        await carregarPagamentos();
      } catch (err) {
        if (!carga.aindaEhAtual()) return;
        console.error("Erro ao carregar comissões:", err);
        setErro(mensagemDeErro(err));
      } finally {
        if (carga.aindaEhAtual()) setCarregandoComissoes(false);
      }
    }
    carregarComissoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, lojaAtual?.id]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Funcionários</h1>
          <p className="text-corpo text-sakura-muted">
            Técnicos, vendedores e demais funcionários — e quanto cada um tem de comissão a receber
          </p>
        </div>
      </header>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="Cadastro" ativa={aba === "cadastro"} onClick={() => setAba("cadastro")} />
        <AbaBotao
          label="Comissões"
          ativa={aba === "comissoes"}
          onClick={() => setAba("comissoes")}
        />
      </div>

      {aba === "cadastro" ? (
        carregando ? (
          <p className="text-corpo text-sakura-muted">Carregando...</p>
        ) : !lojaAtual ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
            Seu usuário não tem loja atribuída. Fale com o administrador.
          </p>
        ) : (
          <FuncionariosSection
            funcionarios={funcionariosNaTela}
            lojaId={lojaAtual.id}
            onRecarregar={carregar}
          />
        )
      ) : carregandoComissoes || !comissoesNaTela ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : (
        <ComissoesSection
          ordens={comissoesNaTela.ordens}
          pecas={comissoesNaTela.pecas}
          servicos={comissoesNaTela.servicos}
          funcionarios={funcionariosNaTela}
          contasReceber={comissoesNaTela.contasReceber}
          lojaId={lojaAtual?.id ?? ""}
          nomeLoja={lojaAtual?.nome ?? ""}
          pagamentos={pagamentosNaTela}
          podeDesfazer={operador?.admin === true}
          onPagamentosMudaram={carregarPagamentos}
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
