import { useEffect, useRef, useState } from "react";
import {
  CreditCard,
  Download,
  LayoutDashboard,
  MessageCircle,
  Monitor,
  Palette,
  Percent,
  QrCode,
  Receipt,
  ShieldCheck,
  Store,
  Tags,
  UsersRound,
  Warehouse,
  Wallet,
  Wrench,
} from "lucide-react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Modal } from "@/components/Modal";
import { Selo } from "@/components/Selo";
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
import { listarTaxasMaquininha } from "@/lib/taxasMaquininha";
import type { TaxaMaquininha } from "@/schemas/taxaMaquininha";
import { avisar } from "@/lib/avisoQueSome";
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
import { TaxasMaquininhaSection } from "./TaxasMaquininhaSection";
import { LojasSection } from "./LojasSection";
import { OperadorForm } from "./OperadorForm";
import { AtendimentoSection } from "./AtendimentoSection";
import { PixSection } from "./PixSection";
import { TextoGarantiaSection } from "./TextoGarantiaSection";
import { ModelosWhatsappSection } from "./ModelosWhatsappSection";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { AparenciaSection } from "./AparenciaSection";
import { AtualizacoesComputadorSection } from "./AtualizacoesComputadorSection";
import { ComputadoresSection } from "./ComputadoresSection";
import { IconeDeSecao, SecaoDeConfiguracao, TituloDeGrupo } from "./pecas";
import { AvisoDeErro } from "@/components/Aviso";

export function ConfiguracoesPage() {
  const { operador: operadorLogado, lojaAtual } = useAuth();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [jurosParcelas, setJurosParcelas] = useState<JurosParcela[]>([]);
  // null = não deu pra ler (banco sem a migration 0089): a seção avisa, a página segue.
  const [taxasMaquininha, setTaxasMaquininha] = useState<TaxaMaquininha[] | null>([]);
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
  // De qual loja são os dados guardados acima (#927). Quando a carga da loja
  // nova dá erro, eles continuam sendo os da loja anterior: as seções que
  // dependem da loja só aparecem quando os dados são da loja do seletor, senão
  // quem salvasse gravaria o dado de uma loja (garantia, juros, Pix, fiscal...)
  // na outra. Um recarregar da mesma loja que dá erro mantém as seções.
  const [lojaDosDados, setLojaDosDados] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<"novo" | Operador | null>(null);
  const [lojaIdsFormulario, setLojaIdsFormulario] = useState<string[]>([]);
  const [redefinindoId, setRedefinindoId] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<{ operador: Operador; senha: string } | null>(
    null,
  );
  const [naoCopiou, setNaoCopiou] = useState(false);

  // Só a carga mais nova grava (#967, o mesmo jeito das OS, #903): trocar de
  // loja com a carga anterior ainda buscando dispara outra, e a velha pode
  // terminar depois e encher as seções da loja nova com os dados da antiga
  // (quem salvasse em seguida gravaria o dado de uma loja na outra). A que
  // perdeu a vez não mexe em nada: nem nos dados, nem no erro, nem no
  // "Carregando...". Um `recarregar` guardado de antes da troca de loja (um
  // salvar lento) nem começa, senão viraria a carga mais nova.
  const cargaAtual = useRef(0);
  const lojaNaTela = useRef(lojaAtual?.id);
  // Este efeito precisa ficar ANTES do que chama `carregar()`: o React roda os
  // dois nessa ordem, e a carga da loja nova só começa se o ref já mudou.
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
      // Idem as taxas da maquininha (#387): banco sem a migration 0089.
      let taxasCarregadas: TaxaMaquininha[] | null = null;
      try {
        taxasCarregadas = await listarTaxasMaquininha(lojaId);
      } catch (err) {
        console.error("Erro ao carregar as taxas da maquininha:", err);
      }
      if (!aindaEhAtual()) return;
      setTaxasMaquininha(taxasCarregadas);
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
      setLojaDosDados(lojaId);
    } catch (err) {
      if (!aindaEhAtual()) return;
      console.error("Erro ao carregar operadores:", err);
      setErro(mensagemDeErro(err));
    } finally {
      if (aindaEhAtual()) setCarregando(false);
    }
  }

  const recarregar = () => carregar({ silencioso: true });
  const dadosSaoDaLoja = !!lojaAtual && lojaDosDados === lojaAtual.id;

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

  const secoesDaLoja = !carregando && lojaAtual && dadosSaoDaLoja;

  async function copiarSenha(senha: string) {
    setNaoCopiou(false);
    try {
      await navigator.clipboard.writeText(senha);
      avisar("Senha copiada");
    } catch (err) {
      // A senha só aparece uma vez: sem a área de transferência, a janela diz
      // isso e a senha continua na tela, pra copiar à mão.
      console.error("Erro ao copiar a senha:", err);
      setNaoCopiou(true);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="font-titulo text-titulo font-bold text-texto">Configurações</h1>
          <p className="text-corpo text-texto-2">Operadores do sistema e permissões de acesso</p>
        </div>
      </header>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <TituloDeGrupo>Pessoas e lojas</TituloDeGrupo>

      <div className="sakura-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <IconeDeSecao icone={UsersRound} />
            <div>
              <h3 className="text-corpo font-semibold text-texto">Operadores</h3>
              <p className="mt-1 text-rotulo text-texto-2">
                Quem tem login no sistema e quais módulos cada um acessa.
              </p>
            </div>
          </div>
          {!formulario && (
            <Botao variante="principal" onClick={() => abrirFormulario("novo")}>
              + Novo operador
            </Botao>
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
          <p className="mt-4 text-corpo text-texto-2">Carregando...</p>
        ) : operadores.length === 0 ? (
          <p className="mt-4 text-corpo text-texto-2">Nenhum operador cadastrado ainda.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {operadores.map((op) => (
              <div key={op.id} className="rounded-2xl border border-linha bg-fundo/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-texto">{op.nome}</p>
                    <p className="text-corpo text-texto-2">@{op.usuario}</p>
                  </div>
                  {op.ativo ? (
                    <Selo tipo="ok" palavra="Ativo" />
                  ) : (
                    <Selo tipo="neutro" palavra="Inativo" />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {op.admin ? (
                    <Selo tipo="info" icone={ShieldCheck} palavra="Administrador (acesso total)" />
                  ) : op.permissoes.length === 0 ? (
                    <span className="text-rotulo text-texto-2">Nenhum módulo liberado</span>
                  ) : (
                    op.permissoes.map((chave) => (
                      <span
                        key={chave}
                        className="rounded-full bg-texto/[0.08] px-2.5 py-1 text-rotulo font-medium text-texto"
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

      {secoesDaLoja && operadorLogado && (
        <div className="sakura-card p-6">
          <div className="flex items-start gap-4">
            <IconeDeSecao icone={Store} />
            <div>
              <h3 className="text-corpo font-semibold text-texto">Lojas</h3>
              <p className="mt-1 text-rotulo text-texto-2">
                Cada loja tem seu próprio estoque, caixa, ordens de serviço e configurações —
                clientes, peças, serviços e categorias continuam compartilhados entre todas.
              </p>
            </div>
          </div>
          <LojasSection lojas={lojas} operadorCriadorId={operadorLogado.id} onSalvo={recarregar} />
        </div>
      )}

      {secoesDaLoja && (
        <>
          <TituloDeGrupo>Dinheiro e nota fiscal</TituloDeGrupo>

          <SecaoDeConfiguracao
            icone={Percent}
            titulo="Juros de parcelamento"
            descricao="% de juros cobrado sobre o total quando o cliente parcela no cartão de crédito, na hora de faturar uma Ordem de Serviço. 1x é sempre à vista, sem juros."
          >
            <JurosParcelasSection
              jurosParcelas={jurosParcelas}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={CreditCard}
            titulo="Taxas da maquininha"
            descricao="Quanto a maquininha cobra da loja e em quantos dias o cartão cai na conta."
          >
            <TaxasMaquininhaSection
              tabela={taxasMaquininha}
              lojaId={lojaAtual.id}
              podeEditar={Boolean(operadorLogado?.admin)}
              onSalvo={recarregar}
            />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={QrCode}
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
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={MessageCircle}
            titulo="Atendimento e garantia dos serviços"
            descricao="O WhatsApp e o horário da loja e a garantia dos serviços, pra sair no recibo da nota de serviço."
          >
            {/* key: trocar de loja remonta a seção e busca os dados da outra. */}
            <AtendimentoSection
              key={lojaAtual.id}
              lojaId={lojaAtual.id}
              podeEditar={Boolean(operadorLogado?.admin)}
            />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={Receipt}
            titulo="Dados fiscais da loja"
            descricao="Usados na emissão de nota fiscal (NFC-e/NFS-e). Sem o token do Focus NFe, a emissão automática fica indisponível."
          >
            <DadosFiscaisSection
              configuracao={configuracaoFiscal}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoDeConfiguracao>

          <TituloDeGrupo>Cadastros de apoio</TituloDeGrupo>

          <SecaoDeConfiguracao
            icone={Warehouse}
            titulo="Depósitos"
            descricao="Locais físicos de estoque dentro da loja (ex: Depósito Principal, Fundos). Toda loja já nasce com um depósito padrão — crie mais só se tiver mais de um lugar físico guardando peça."
          >
            <DepositosSection depositos={depositos} lojaId={lojaAtual.id} onSalvo={recarregar} />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={Tags}
            titulo="Categorias de produto"
            descricao="Usadas no cadastro de produtos (aba Estoque → Produtos) para agrupar peças."
          >
            <CategoriasSection categorias={categorias} onSalvo={recarregar} />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={Wrench}
            titulo="Categorias de serviço"
            descricao="Usadas no cadastro de serviços (módulo Serviços) para agrupar por área do veículo (ex: Pneus, Suspensão, Freios)."
          >
            <CategoriasServicoSection categorias={categoriasServico} onSalvo={recarregar} />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={Wallet}
            titulo="Categorias de caixa (Entradas e Saídas)"
            descricao='Usadas nas abas "Entradas" e "Saídas" do Caixa Diário para classificar lançamentos manuais que não vêm de uma OS — ex: aluguel, mercado, limpeza (saída) ou venda de sucata (entrada).'
          >
            <CategoriasCaixaSection categorias={categoriasCaixa} onSalvo={recarregar} />
          </SecaoDeConfiguracao>

          <TituloDeGrupo>Textos e telas</TituloDeGrupo>

          <SecaoDeConfiguracao
            icone={ShieldCheck}
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
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={MessageCircle}
            titulo="Mensagens de WhatsApp"
            descricao="Os textos que o sistema abre no WhatsApp — na cobrança de uma conta a receber, no aviso de que o carro está pronto, no pedido de avaliação e no pedido para o fornecedor. O sistema abre a conversa com a mensagem pronta; quem envia é você."
          >
            <ModelosWhatsappSection
              modelos={modelosWhatsapp}
              lojaId={lojaAtual.id}
              linkAvaliacao={linkAvaliacao}
              onSalvo={recarregar}
            />
          </SecaoDeConfiguracao>

          <SecaoDeConfiguracao
            icone={LayoutDashboard}
            titulo="Cartões do Início"
            descricao="Escolha até 3 indicadores pra aparecer nos cartões de tendência da tela Início. Vale pra todo mundo que usa o sistema."
          >
            <CartoesInicioSection
              cartoes={cartoesInicio}
              lojaId={lojaAtual.id}
              onSalvo={recarregar}
            />
          </SecaoDeConfiguracao>
        </>
      )}

      <TituloDeGrupo>Este computador e os outros</TituloDeGrupo>

      <SecaoDeConfiguracao
        icone={Palette}
        titulo="Aparência deste computador"
        descricao="O programa com o fundo escuro ou com o fundo claro. Vale só para este computador, e troca na hora."
      >
        <AparenciaSection />
      </SecaoDeConfiguracao>

      <SecaoDeConfiguracao
        icone={Download}
        titulo="Atualizações deste computador"
        descricao="Se este computador recebe cada versão nova assim que ela sai (canal de teste) ou só depois que ela for liberada para todas as lojas (normal). Vale só para este computador."
      >
        <AtualizacoesComputadorSection />
      </SecaoDeConfiguracao>

      <SecaoDeConfiguracao
        icone={Monitor}
        titulo="Computadores desta empresa"
        descricao="Em que versão está cada computador que abre o sistema, e quando foi usado pela última vez. Serve pra ver quem ficou pra trás numa atualização."
      >
        <ComputadoresSection />
      </SecaoDeConfiguracao>

      {senhaGerada && (
        <Modal
          titulo="Senha temporária gerada"
          onFechar={() => {
            setSenhaGerada(null);
            setNaoCopiou(false);
          }}
          rodape={
            <>
              <Botao
                variante="fantasma"
                onClick={() => copiarSenha(senhaGerada.senha)}
              >
                Copiar
              </Botao>
              <Botao
                variante="principal"
                onClick={() => {
                  setSenhaGerada(null);
                  setNaoCopiou(false);
                }}
              >
                Já anotei
              </Botao>
            </>
          }
        >
          <p className="text-corpo text-texto">
            Repasse essa senha pra <strong>{senhaGerada.operador.nome}</strong> (WhatsApp,
            pessoalmente etc.). Ela só aparece aqui uma vez — ao fazer login com ela, o sistema
            já vai pedir pra criar uma senha nova.
          </p>
          <p className="mt-4 select-all rounded-xl border border-linha-forte bg-poco px-4 py-3 text-center font-mono text-subtitulo tracking-wider text-acao-clara">
            {senhaGerada.senha}
          </p>
          {naoCopiou && (
            <AvisoDeErro className="mt-4">
              Não consegui copiar. Selecione a senha acima e copie à mão: ela só aparece uma vez.
            </AvisoDeErro>
          )}
        </Modal>
      )}
    </div>
  );
}
