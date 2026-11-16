import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
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
import { AbasDaTela, AvisoDeAtencao, AvisoDeErro } from "@/pages/estoque/avisosEAbas";
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
  // #927: só a carga mais nova mexe na tela (trocar de loja com a anterior ainda buscando).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);

  async function carregar(semPiscar = false) {
    // Um carregar guardado de antes da troca de loja nem começa.
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    if (!semPiscar) setCarregando(true);
    setErro(null);
    try {
      const [fornecedoresCarregados, pecasCarregadas, pedidosCarregados, depositosCarregados] =
        await Promise.all([
          listarFornecedores(),
          listarPecasJanela(),
          listarPedidos(carga.lojaId),
          listarDepositos(carga.lojaId),
        ]);
      if (!carga.aindaEhAtual()) return;
      setFornecedores(fornecedoresCarregados);
      setPecas(pecasCarregadas);
      setPedidos(pedidosCarregados);
      setDepositos(depositosCarregados);
      carga.gravou();
    } catch (err) {
      console.error("Erro ao carregar fornecedores:", err);
      if (!carga.aindaEhAtual()) return;
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  // Carga da loja nova com erro: pedidos e depósitos da anterior não aparecem
  // (fornecedores e peças são globais, não dependem da loja).
  const pedidosNaTela = dadosSaoDaLoja ? pedidos : [];
  const depositosNaTela = dadosSaoDaLoja ? depositos : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="font-titulo text-titulo font-bold text-texto">Fornecedores</h1>
          <p className="text-corpo text-texto-2">
            Cadastro de fornecedores e pedidos de compra
          </p>
        </div>
      </header>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <AbasDaTela
        rotulo="Partes dos fornecedores"
        ativa={aba}
        aoEscolher={setAba}
        abas={[
          ["cadastro", "Cadastro"],
          ["pedidos", "Pedidos de compra"],
          ...(podeSugestao ? ([["sugestao", "Sugestão de compra"]] as const) : []),
        ]}
      />

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : aba === "cadastro" ? (
        <FornecedoresSection fornecedores={fornecedores} onRecarregar={() => carregar()} />
      ) : !lojaAtual ? (
        <AvisoDeAtencao>
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </AvisoDeAtencao>
      ) : aba === "sugestao" && podeSugestao ? (
        <SugestaoCompraSection
          lojaId={lojaAtual.id}
          operadorId={operador?.id ?? null}
          onPedidosCriados={() => carregar(true)}
        />
      ) : (
        <PedidosCompraSection
          pedidos={pedidosNaTela}
          fornecedores={fornecedores}
          pecas={pecas}
          depositos={depositosNaTela}
          lojaId={lojaAtual.id}
          operadorId={operador?.id ?? null}
          onRecarregar={() => carregar()}
        />
      )}
    </div>
  );
}
