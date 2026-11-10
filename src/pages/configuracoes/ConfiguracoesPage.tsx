import { useEffect, useRef, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Modal } from "@/components/Modal";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { listarModelosWhatsapp } from "@/lib/modelosWhatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { listarCategorias } from "@/lib/categorias";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import { listarCategoriasServico } from "@/lib/categoriasServico";
import {
  buscarConfiguracaoFiscal,
  buscarConfiguracaoPix,
  buscarConfiguracaoPainelInicio,
  buscarLinkAvaliacao,
  buscarTextoGarantia,
  listarJurosParcelas,
} from "@/lib/configuracoes";
import { listarDepositos } from "@/lib/depositos";
import { mensagemDeErro } from "@/lib/errors";
import { definirLojasDoOperador, listarLojas, listarLojasDoOperador } from "@/lib/lojas";
import {
  atualizarOperador,
  criarOperador,
  listarOperadores,
  redefinirSenhaOperador,
} from "@/lib/operadores";
import type { Categoria } from "@/types/categoria";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { CategoriaServico } from "@/types/categoriaServico";
import type {
  CartaoMetrica,
  ConfiguracaoFiscalLoja,
  ConfiguracaoPix,
  JurosParcela,
} from "@/types/configuracao";
import type { Deposito } from "@/types/deposito";
import type { Loja } from "@/types/loja";
import { MODULOS } from "@/types/operador";
import type { NovoOperador, Operador } from "@/types/operador";
import { CartoesInicioSection } from "./CartoesInicioSection";
import { CategoriasCaixaSection } from "./CategoriasCaixaSection";
import { CategoriasSection } from "./CategoriasSection";
import { CategoriasServicoSection } from "./CategoriasServicoSection";
import { DadosFiscaisSection } from "./DadosFiscaisSection";
import { DepositosSection } from "./DepositosSection";
import { JurosParcelasSection } from "./JurosParcelasSection";
import { LojasSection } from "./LojasSection";
import { OperadorForm } from "./OperadorForm";
import { PixSection } from "./PixSection";
import { TextoGarantiaSection } from "./TextoGarantiaSection";
import { ModelosWhatsappSection } from "./ModelosWhatsappSection";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { AtualizacoesComputadorSection } from "./AtualizacoesComputadorSection";
import { ComputadoresSection } from "./ComputadoresSection";

export function ConfiguracoesPage() {
  const { operador: operadorLogado, lojaAtual } = useAuth();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [jurosParcelas, setJurosParcelas] = useState<JurosParcela[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasCaixa, setCategoriasCaixa] = useState<CategoriaCaixa[]>([]);
  const [categoriasServico, setCategoriasServico] = useState<CategoriaServico[]>([]);
  const [textoGarantia, setTextoGarantia] = useState("");
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  const [linkAvaliacao, setLinkAvaliacao] = useState("");
  const [configuracaoFiscal, setConfiguracaoFiscal] = useState<ConfiguracaoFiscalLoja | null>(
    null,
  );
  const [configuracaoPix, setConfiguracaoPix] = useState<ConfiguracaoPix | null>(null);
  const [cartoesInicio, setCartoesInicio] = useState<CartaoMetrica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Operador | null>(null);
  const [lojaIdsFormulario, setLojaIdsFormulario] = useState<string[]>([]);
  const [redefinindoId, setRedefinindoId] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<{ operador: Operador; senha: string } | null>(
    null,
  );

  // Só a carga mais nova grava (#967, o mesmo jeito das OS, #903): trocar de
  // loja com a carga anterior ainda buscando dispara outra, e a velha pode
  // terminar depois e encher as seções da loja nova com os dados da antiga
  // (quem salvasse em seguida gravaria o dado de uma loja na outra). A que
  // perdeu a vez não mexe em nada: nem nos dados, nem no erro, nem no
  // "Carregando...". Um `recarregar` guardado de antes da troca de loja (um
  // salvar lento) nem começa, senão viraria a carga mais nova.
  const cargaAtual = useRef(0);
  const lojaNaTela = useRef(lojaAtual?.id);
  useEffect(() => {
    lojaNaTela.current = lojaAtual?.id;
  }, [lojaAtual?.id]);

  // `silencioso`: recarregar depois de salvar sem ligar o "Carregando..." de
  // página inteira. Com ele, as seções saíam da tela e voltavam do zero: a
  // rolagem pulava pro topo, a seção voltava fechada e o "salvo" se perdia
  // (#947). O "Carregando..." fica só pra primeira carga e a troca de loja.
  async function carregar({ silencioso = false }: { silencioso?: boolean } = {}) {
    if (!lojaAtual) {
      cargaAtual.current++; // a carga que ainda busca é de uma loja que saiu
      setCarregando(false);
      return;
    }
    const lojaId = lojaAtual.id;
    if (lojaId !== lojaNaTela.current) return;
    const minhaCarga = ++cargaAtual.current;
    const aindaEhAtual = () => minhaCarga === cargaAtual.current;
    if (!silencioso) setCarregando(true);
    setErro(null);
    try {
      const [
        operadoresCarregados,
        lojasCarregadas,
        depositosCarregados,
        jurosCarregados,
        categoriasCarregadas,
        categoriasCaixaCarregadas,
        categoriasServicoCarregadas,
        textoGarantiaCarregado,
        configuracaoFiscalCarregada,
        cartoesInicioCarregados,
        modelosWhatsappCarregados,
        configuracaoPixCarregada,
      ] = await Promise.all([
        listarOperadores(),
        listarLojas(),
        listarDepositos(lojaId),
        listarJurosParcelas(lojaId),
        listarCategorias(),
        listarCategoriasCaixa(),
        listarCategoriasServico(),
        buscarTextoGarantia(lojaId),
        buscarConfiguracaoFiscal(lojaId),
        buscarConfiguracaoPainelInicio(lojaId),
        listarModelosWhatsapp(lojaId),
        buscarConfiguracaoPix(lojaId),
      ]);
      // Fora do Promise.all: banco sem a migration 0082 não pode derrubar a
      // página; vira "sem link" (validação incerta é aviso, nunca tranca).
      let linkCarregado = "";
      try {
        linkCarregado = (await buscarLinkAvaliacao(lojaId)) || "";
      } catch (err) {
        console.error("Erro ao carregar o link de avaliação:", err);
      }
      if (!aindaEhAtual()) return;
      setLinkAvaliacao(linkCarregado);
      setOperadores(operadoresCarregados);
      setLojas(lojasCarregadas);
      setDepositos(depositosCarregados);
      setJurosParcelas(jurosCarregados);
      setCategorias(categoriasCarregadas);
      setCategoriasCaixa(categoriasCaixaCarregadas);
      setCategoriasServico(categoriasServicoCarregadas);
      setTextoGarantia(textoGarantiaCarregado);
      setConfiguracaoFiscal(configuracaoFiscalCarregada);
      setCartoesInicio(cartoesInicioCarregados);
      setModelosWhatsapp(modelosWhatsappCarregados);
      setConfiguracaoPix(configuracaoPixCarregada);
    } catch (err) {
      if (!aindaEhAtual()) return;
      console.error("Erro ao carregar operadores:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (aindaEhAtual()) setCarregando(false);
    }
  }

  const recarregar = () => carregar({ silencioso: true });

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  async function abrirFormulario(alvo: "novo" | Operador) {
    if (alvo === "novo") {
      setLojaIdsFormulario(lojaAtual ? [lojaAtual.id] : []);
    } else {
      try {
        const lojasDoOperador = await listarLojasDoOperador(alvo.id);
        setLojaIdsFormulario(lojasDoOperador.map((loja) => loja.id));
      } catch (err) {
        console.error("Erro ao carregar lojas do operador:", err);
        setErro(mensagemDeErro(err));
        setLojaIdsFormulario([]);
      }
    }
    setFormulario(alvo);
  }

  async function handleSalvar(operador: NovoOperador, senha: string, lojaIds: string[]) {
    if (formulario && formulario !== "novo") {
      await atualizarOperador(formulario.id, {
        nome: operador.nome,
        admin: operador.admin,
        permissoes: operador.permissoes,
        ativo: operador.ativo,
      });
      await definirLojasDoOperador(formulario.id, lojaIds);
    } else {
      await criarOperador(operador, senha, lojaIds);
    }
    setFormulario(null);
    await recarregar();
  }

  async function handleAlternarStatus(op: Operador) {
    try {
      await atualizarOperador(op.id, { ativo: !op.ativo });
      await recarregar();
    } catch (err) {
      console.error("Erro ao atualizar status do operador:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleRedefinirSenha(op: Operador) {
    if (!confirm(`Redefinir a senha de ${op.nome}? Uma senha temporária será gerada.`)) return;
    setRedefinindoId(op.id);
    setErro(null);
    try {
      const senha = await redefinirSenhaOperador(op.id);
      setSenhaGerada({ operador: op, senha });
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setRedefinindoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">
            Configurações
          </h1>
          <p className="text-corpo text-sakura-muted">
            Operadores do sistema e permissões de acesso
          </p>
        </div>
      </header>

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      <div className="sakura-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-corpo font-semibold text-sakura-purple-dark">Operadores</h2>
            <p className="mt-1 text-rotulo text-sakura-muted">
              Quem tem login no sistema e quais módulos cada um acessa.
            </p>
          </div>
          {!formulario && (
            <button
              onClick={() => abrirFormulario("novo")}
              className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
            >
              + Novo operador
            </button>
          )}
        </div>

        {formulario && (
          <div className="mt-4">
            <OperadorForm
              operadorExistente={formulario === "novo" ? undefined : formulario}
              lojasDisponiveis={lojas}
              lojaIdsExistente={lojaIdsFormulario}
              onSalvar={handleSalvar}
              onCancelar={() => setFormulario(null)}
            />
          </div>
        )}

        {carregando ? (
          <p className="mt-4 text-corpo text-sakura-muted">Carregando...</p>
        ) : operadores.length === 0 ? (
          <p className="mt-4 text-corpo text-sakura-muted">
            Nenhum operador cadastrado ainda.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {operadores.map((op) => (
              <div key={op.id} className="sakura-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sakura-purple-dark">{op.nome}</p>
                    <p className="text-corpo text-sakura-muted">@{op.usuario}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                      op.ativo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-sakura-gray/20 text-sakura-muted"
                    }`}
                  >
                    {op.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {op.admin ? (
                    <span className="rounded-full bg-sakura-pink-soft px-2.5 py-1 text-rotulo font-medium text-sakura-purple-dark">
                      Administrador (acesso total)
                    </span>
                  ) : op.permissoes.length === 0 ? (
                    <span className="text-rotulo text-sakura-muted">
                      Nenhum módulo liberado
                    </span>
                  ) : (
                    op.permissoes.map((chave) => (
                      <span
                        key={chave}
                        className="rounded-full bg-sakura-pink-soft px-2.5 py-1 text-rotulo font-medium text-sakura-purple-dark"
                      >
                        {MODULOS.find((m) => m.chave === chave)?.label ?? chave}
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-4">
                  <AcoesDaLinha
                    descricao={`o operador ${op.nome}`}
                    acoes={[
                      { tipo: "editar", aoClicar: () => abrirFormulario(op) },
                      ...(op.id !== operadorLogado?.id
                        ? [
                            {
                              tipo: (op.ativo ? "inativar" : "reativar") as "inativar" | "reativar",
                              aoClicar: () => handleAlternarStatus(op),
                            },
                          ]
                        : []),
                      {
                        tipo: "menu",
                        rotulo: redefinindoId === op.id ? "Redefinindo..." : "Redefinir senha",
                        desabilitada: redefinindoId === op.id,
                        aoClicar: () => handleRedefinirSenha(op),
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!carregando && lojaAtual && operadorLogado && (
        <div className="sakura-card p-6">
          <h2 className="text-corpo font-semibold text-sakura-purple-dark">Lojas</h2>
          <p className="mt-1 text-rotulo text-sakura-muted">
            Cada loja tem seu próprio estoque, caixa, ordens de serviço e configurações — clientes,
            peças, serviços e categorias continuam compartilhados entre todas.
          </p>
          <LojasSection
            lojas={lojas}
            operadorCriadorId={operadorLogado.id}
            onSalvo={recarregar}
          />
        </div>
      )}

      {!carregando && lojaAtual && (
        <>
          <SecaoRecolhivel
            titulo="Juros de parcelamento"
            descricao='% de juros cobrado sobre o total quando o cliente parcela no cartão de crédito, na hora de faturar uma Ordem de Serviço. 1x é sempre à vista, sem juros.'
          >
            <JurosParcelasSection
              jurosParcelas={jurosParcelas}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Depósitos"
            descricao="Locais físicos de estoque dentro da loja (ex: Depósito Principal, Fundos). Toda loja já nasce com um depósito padrão — crie mais só se tiver mais de um lugar físico guardando peça."
          >
            <DepositosSection depositos={depositos} lojaId={lojaAtual.id} onSalvo={recarregar} />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Categorias de produto"
            descricao="Usadas no cadastro de produtos (aba Estoque → Produtos) para agrupar peças."
          >
            <CategoriasSection categorias={categorias} onSalvo={recarregar} />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Categorias de serviço"
            descricao="Usadas no cadastro de serviços (módulo Serviços) para agrupar por área do veículo (ex: Pneus, Suspensão, Freios)."
          >
            <CategoriasServicoSection categorias={categoriasServico} onSalvo={recarregar} />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Categorias de caixa (Entradas e Saídas)"
            descricao='Usadas nas abas "Entradas" e "Saídas" do Caixa Diário para classificar lançamentos manuais que não vêm de uma OS — ex: aluguel, mercado, limpeza (saída) ou venda de sucata (entrada).'
          >
            <CategoriasCaixaSection categorias={categoriasCaixa} onSalvo={recarregar} />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Texto de garantia"
            descricao={
              <>
                Usado pelos botões "Imprimir garantia"/"Baixar garantia" na aba Fechamento de uma
                Ordem de Serviço. Use estes campos que são substituídos automaticamente:{" "}
                <code>{"{cliente}"}</code>, <code>{"{veiculo}"}</code>, <code>{"{itens}"}</code> e{" "}
                <code>{"{data}"}</code> (data de fechamento da OS).
              </>
            }
          >
            <TextoGarantiaSection
              texto={textoGarantia}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Mensagens de WhatsApp"
            descricao="Os textos que o sistema abre no WhatsApp — na cobrança de uma conta a receber, no aviso de que o carro está pronto, no pedido de avaliação e no pedido para o fornecedor. O sistema abre a conversa com a mensagem pronta; quem envia é você."
          >
            <ModelosWhatsappSection
              modelos={modelosWhatsapp}
              lojaId={lojaAtual.id}
              linkAvaliacao={linkAvaliacao}
              onSalvo={recarregar}
            />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Pix (cobrança e faturamento)"
            descricao="A chave Pix da loja. Com ela, a mensagem de cobrança ganha o Pix copia e cola e o faturamento mostra o QR code, já com o valor."
          >
            <PixSection
              configuracao={configuracaoPix}
              lojaId={lojaAtual.id}
              podeEditar={Boolean(operadorLogado?.admin)}
              sugestao={{
                nome: configuracaoFiscal?.nome_fantasia || lojaAtual.nome,
                cidade: configuracaoFiscal?.cidade || lojaAtual.cidade,
              }}
              onMudou={setConfiguracaoPix}
            />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Dados fiscais da loja"
            descricao="Usados na emissão de nota fiscal (NFC-e/NFS-e). Sem o token do Focus NFe, a emissão automática fica indisponível."
          >
            <DadosFiscaisSection
              configuracao={configuracaoFiscal}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoRecolhivel>

          <SecaoRecolhivel
            titulo="Cartões do Início"
            descricao="Escolha até 3 indicadores pra aparecer nos cartões de tendência da tela Início. Vale pra todo mundo que usa o sistema."
          >
            <CartoesInicioSection
              cartoes={cartoesInicio}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoRecolhivel>
        </>
      )}

      <SecaoRecolhivel
        titulo="Atualizações deste computador"
        descricao="Se este computador recebe cada versão nova assim que ela sai (canal de teste) ou só depois que ela for liberada para todas as lojas (normal). Vale só para este computador."
      >
        <AtualizacoesComputadorSection />
      </SecaoRecolhivel>

      <SecaoRecolhivel
        titulo="Computadores desta empresa"
        descricao="Em que versão está cada computador que abre o sistema, e quando foi usado pela última vez. Serve pra ver quem ficou pra trás numa atualização."
      >
        <ComputadoresSection />
      </SecaoRecolhivel>

      {senhaGerada && (
        <Modal titulo="Senha temporária gerada" onFechar={() => setSenhaGerada(null)}>
          <p className="text-corpo text-sakura-purple-dark/90">
            Repasse essa senha pra <strong>{senhaGerada.operador.nome}</strong> (WhatsApp,
            pessoalmente etc.). Ela só aparece aqui uma vez — ao fazer login com ela, o sistema
            já vai pedir pra criar uma senha nova.
          </p>
          <p className="mt-4 select-all rounded-xl border border-sakura-gray/30 bg-black/30 px-4 py-3 text-center font-mono text-subtitulo tracking-wider text-sakura-pink">
            {senhaGerada.senha}
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(senhaGerada.senha)}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setSenhaGerada(null)}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90"
            >
              Já anotei
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
