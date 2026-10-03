import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AreaRolavel } from "./components/AreaRolavel";
import { AvisoVersaoBanco } from "./components/AvisoVersaoBanco";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminRoute, PermissaoRoute } from "./components/PermissaoRoute";
import { Sidebar } from "./components/Sidebar";
import { VersaoApp } from "./components/VersaoApp";
import { useAuth } from "./contexts/AuthContext";
import { useEnterParaProximoCampo } from "./hooks/useEnterParaProximoCampo";
import { useLimparDataAoApagar } from "./hooks/useLimparDataAoApagar";
import { useNaoMexerNoNumeroSemDigitar } from "./hooks/useNaoMexerNoNumeroSemDigitar";
import { useSituacaoDoEsquema } from "./hooks/useSituacaoDoEsquema";
import { registrarEsteComputador } from "./lib/computadores";
import { conexaoConfigurada } from "./lib/conexao";
import { definirContextoDeErro } from "./lib/registrarErros";
import { AuditoriaPage } from "./pages/auditoria/AuditoriaPage";
import { CaixaPage } from "./pages/caixa/CaixaPage";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import { ConexaoPage } from "./pages/conexao/ConexaoPage";
import { ConfiguracoesPage } from "./pages/configuracoes/ConfiguracoesPage";
import { DiagnosticoPage } from "./pages/diagnostico/DiagnosticoPage";
import { ContasPagarPage } from "./pages/contas-pagar/ContasPagarPage";
import { ContasReceberPage } from "./pages/contas-receber/ContasReceberPage";
import { EstoquePage } from "./pages/estoque/EstoquePage";
import { FornecedoresPage } from "./pages/fornecedores/FornecedoresPage";
import { FuncionariosPage } from "./pages/funcionarios/FuncionariosPage";
import { GarantiasPage } from "./pages/garantias/GarantiasPage";
import { LoginPage } from "./pages/login/LoginPage";
import { TrocarSenhaPage } from "./pages/login/TrocarSenhaPage";
import { NotasFiscaisPage } from "./pages/notas-fiscais/NotasFiscaisPage";
import { OrdensServicoPage } from "./pages/ordens-servico/OrdensServicoPage";
import { PainelPage } from "./pages/painel/PainelPage";
import { RelatoriosPage } from "./pages/relatorios/RelatoriosPage";
import { ServicosPage } from "./pages/servicos/ServicosPage";
import { FichaVeiculoPage } from "./pages/veiculos/FichaVeiculoPage";
import { MODULOS, temPermissao } from "./types/operador";

// Se o operador não tiver permissão pro Início (o "/" padrão),
// manda ele direto pro primeiro módulo que ele acessa, em vez de cair numa
// tela de "sem permissão" logo depois de fazer login.
function PaginaInicial() {
  const { operador } = useAuth();

  if (temPermissao(operador, "painel")) {
    return <PainelPage />;
  }

  const primeiroModulo = MODULOS.find(
    (modulo) =>
      modulo.chave !== "painel" && temPermissao(operador, modulo.chave),
  );
  if (primeiroModulo) {
    return <Navigate to={primeiroModulo.rota} replace />;
  }

  return (
    <div className="sakura-card p-8 text-center">
      <p className="text-corpo text-sakura-purple-dark/90">
        Nenhum módulo liberado para o seu usuário. Fale com o administrador.
      </p>
    </div>
  );
}

export default function App() {
  const { carregando, session, operador, lojaAtual } = useAuth();
  useEnterParaProximoCampo();
  useLimparDataAoApagar();
  useNaoMexerNoNumeroSemDigitar();
  // Na primeira abertura deste computador ainda não se sabe de qual empresa é
  // este app — sem isso não há nem como fazer login.
  const [configurandoConexao, setConfigurandoConexao] =
    useState(!conexaoConfigurada());
  // "O banco desta empresa já recebeu as migrations que esta versão precisa?"
  // Só depois do login: a consulta exige sessão (item TR-05.7).
  const situacaoDoEsquema = useSituacaoDoEsquema(Boolean(session));

  // Sem isto, a pilha gravada em "erros.log" não diz em que tela nem com que
  // usuário o erro aconteceu — e é justamente isso que falta pra ela
  // significar alguma coisa dias depois (item TR-08.3).
  useEffect(() => {
    definirContextoDeErro({
      usuario: operador?.usuario,
      loja: lojaAtual?.nome,
    });
  }, [operador?.usuario, lojaAtual?.nome]);

  // Conta ao banco que este computador está aberto, em que versão e em que
  // loja (migration 0063) — é o que deixa o admin ver quem ficou pra trás e
  // o botão de atualizar os bancos saber quem esperar. Roda quando o login
  // termina de carregar, ao trocar de loja e a cada renovação da sessão (o
  // Supabase renova de tempos em tempos), o que mantém o "visto em" de um
  // computador que fica aberto o dia inteiro. Nunca trava nada: ver
  // lib/computadores.ts.
  useEffect(() => {
    if (carregando || !operador?.id) return;
    void registrarEsteComputador(lojaAtual?.id ?? null);
  }, [carregando, operador?.id, lojaAtual?.id]);

  if (configurandoConexao) {
    return (
      <>
        <ConexaoPage
          onCancelar={
            conexaoConfigurada()
              ? () => setConfigurandoConexao(false)
              : undefined
          }
        />
        <VersaoApp />
      </>
    );
  }

  if (carregando) {
    return (
      <div className="sakura-shell-bg flex h-screen items-center justify-center">
        <p className="text-corpo text-sakura-purple-dark/90">Carregando...</p>
        <VersaoApp />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LoginPage onConfigurarConexao={() => setConfigurandoConexao(true)} />
        <VersaoApp />
      </>
    );
  }

  if (operador?.deve_trocar_senha) {
    return (
      <>
        <TrocarSenhaPage />
        <VersaoApp />
      </>
    );
  }

  return (
    <div className="sakura-shell-bg flex h-screen gap-4 overflow-hidden p-4">
      <VersaoApp />
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1">
        <AreaRolavel className="p-4">
          <AvisoVersaoBanco situacao={situacaoDoEsquema} />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<PaginaInicial />} />
              {/* Sem AdminRoute de propósito: quem pede socorro é o balcão. */}
              <Route path="/diagnostico" element={<DiagnosticoPage />} />
              <Route
                path="/clientes"
                element={
                  <PermissaoRoute modulo="clientes">
                    <ClientesPage />
                  </PermissaoRoute>
                }
              />
              {/* A ficha do veículo (FN-04) é tanto de Clientes quanto de
                  Ordens de Serviço: basta ter um dos dois. */}
              <Route
                path="/veiculos/:id"
                element={
                  <PermissaoRoute modulo={["clientes", "ordens_servico"]}>
                    <FichaVeiculoPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/estoque"
                element={
                  <PermissaoRoute modulo="estoque">
                    <EstoquePage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/fornecedores"
                element={
                  <PermissaoRoute modulo="fornecedores">
                    <FornecedoresPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/servicos"
                element={
                  <PermissaoRoute modulo="servicos">
                    <ServicosPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/ordens-servico"
                element={
                  <PermissaoRoute modulo="ordens_servico">
                    <OrdensServicoPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/caixa"
                element={
                  <PermissaoRoute modulo="caixa">
                    <CaixaPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/contas-pagar"
                element={
                  <PermissaoRoute modulo="contas_pagar">
                    <ContasPagarPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/contas-receber"
                element={
                  <PermissaoRoute modulo="contas_receber">
                    <ContasReceberPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <PermissaoRoute modulo="relatorios">
                    <RelatoriosPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/garantias"
                element={
                  <PermissaoRoute modulo="garantias">
                    <GarantiasPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/notas-fiscais"
                element={
                  <PermissaoRoute modulo="notas_fiscais">
                    <NotasFiscaisPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/funcionarios"
                element={
                  <PermissaoRoute modulo="funcionarios">
                    <FuncionariosPage />
                  </PermissaoRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <AdminRoute>
                    <ConfiguracoesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/auditoria"
                element={
                  <AdminRoute>
                    <AuditoriaPage />
                  </AdminRoute>
                }
              />
            </Routes>
          </ErrorBoundary>
        </AreaRolavel>
      </main>
    </div>
  );
}
