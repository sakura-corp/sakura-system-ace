import { ArrowLeftRight, ClipboardCheck, FileBarChart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { temPermissao } from "@/types/operador";
import { listarCategorias } from "@/lib/categorias";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { listarDepositos } from "@/lib/depositos";
import { mensagemDeErro } from "@/lib/errors";
import {
  calcularSaldoPorPeca,
  calcularSaldoPorPecaEDeposito,
  listarMovimentos,
} from "@/lib/estoque";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { useRecarregarQuandoVoltar } from "@/hooks/useRecarregarQuandoVoltar";
import { listarPecas } from "@/lib/pecas";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { Deposito } from "@/types/deposito";
import type { MovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { JuntarPecasModal } from "./JuntarPecasModal";
import { ContagemSection } from "./ContagemSection";
import { MovimentacoesSection } from "./MovimentacoesSection";
import { PerfilDaPeca } from "./PerfilDaPeca";
import { ProdutosSection } from "./ProdutosSection";
import { RelatoriosEstoqueSection } from "./RelatoriosEstoqueSection";
import { ultimaSaidaPorPeca } from "./contaDaBarra";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

/**
 * O que a tela mostra (#1093): a lista de produtos é a casa; Movimentações,
 * Contagem e Relatórios deixaram de ser abas e viraram botões no topo, que
 * abrem a parte com um "Voltar" pra lista. Clicar no nome de uma peça abre o
 * perfil dela. Nenhuma parte sumiu.
 */
type Vista =
  | { tipo: "produtos"; editar?: Peca }
  | { tipo: "movimentacoes" }
  | { tipo: "contagem" }
  | { tipo: "relatorios" }
  | { tipo: "peca"; pecaId: string };

const TITULO_DA_PARTE = {
  movimentacoes: { titulo: "Movimentações", frase: "Tudo que entrou e saiu do estoque, e de onde veio" },
  contagem: { titulo: "Contagem", frase: "Conferir o estoque de verdade e acertar o saldo" },
  relatorios: { titulo: "Relatórios do estoque", frase: "Valor parado, peças sem saída e a Curva ABC" },
} as const;

export function EstoquePage() {
  const { lojaAtual, operador } = useAuth();
  const navigate = useNavigate();
  const [juntando, setJuntando] = useState(false);
  const [vista, setVista] = useState<Vista>({ tipo: "produtos" });
  // O "Comprar" leva à Sugestão de compra, que mora em Fornecedores: sem esse
  // módulo, o botão não aparece (igual à Central do dia).
  const onComprar = temPermissao(operador, "fornecedores")
    ? () => navigate("/fornecedores", { state: { aba: "sugestao" } })
    : undefined;
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  // O regime da loja decide se o código de ICMS de uma peça é CSOSN ou CST
  // — é o que alimenta o aviso do cadastro de produto (item TL-12).
  const [regime, setRegime] = useState<RegimeTributario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // O aviso do estoque inicial que não entrou (#909) fica aqui, e não na
  // seção de Produtos: o `carregar` abaixo troca a seção por "Carregando..."
  // e ela volta zerada. O `carregar` não limpa; só o próximo salvar.
  const [avisoEstoqueInicial, setAvisoEstoqueInicial] = useState<string | null>(null);
  // O catálogo do "Juntar peças repetidas" (#721), à parte das listas da tela:
  // ele não depende da loja, e a falha de OUTRA lista (depósitos,
  // configuração) não pode deixar a janela sem peças nem dizer "tudo certo".
  // `pecas` (da tela) só muda quando tudo carrega, pra a lista de Produtos não
  // mostrar peça com saldo de movimentos que não vieram.
  const [catalogo, setCatalogo] = useState<Peca[] | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);

  // #927: só a carga mais nova mexe na tela (trocar de loja com a anterior ainda buscando).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);

  async function carregar() {
    // Um `carregar` guardado de antes da troca de loja nem começa.
    const carga = comecar(lojaAtual?.id);
    if (!carga && lojaAtual) return;
    setCarregando(true);
    setErro(null);
    setErroCatalogo(null);
    const promessaCatalogo = listarPecas().then(
      (lista) => {
        setCatalogo(lista);
        return lista;
      },
      (err: unknown) => {
        setErroCatalogo(mensagemDeErro(err));
        throw err;
      },
    );
    if (!lojaAtual) {
      // Sem loja a tela não mostra nada, mas o "Juntar" ainda usa o catálogo.
      await promessaCatalogo.catch(() => undefined);
      setCarregando(false);
      return;
    }
    if (!carga) return;
    try {
      const [
        pecasCarregadas,
        movimentosCarregados,
        categoriasCarregadas,
        depositosCarregados,
        configFiscal,
      ] = await Promise.all([
        promessaCatalogo,
        listarMovimentos(carga.lojaId),
        listarCategorias(),
        listarDepositos(carga.lojaId),
        buscarConfiguracaoFiscal(carga.lojaId),
      ]);
      if (!carga.aindaEhAtual()) return;
      setPecas(pecasCarregadas);
      setMovimentos(movimentosCarregados);
      setCategorias(categoriasCarregadas);
      setDepositos(depositosCarregados);
      setRegime(configFiscal?.regime_tributario ?? null);
      carga.gravou();
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
      if (!carga.aindaEhAtual()) return;
      setErro(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    // Outra loja: o aviso do estoque inicial era de uma peça da anterior.
    setAvisoEstoqueInicial(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  // A carga que falhou (sem internet) busca de novo sozinha quando a internet
  // volta; a que está funcionando não recarrega (#1017).
  useRecarregarQuandoVoltar(!!erro || !!erroCatalogo, () => void carregar());

  // Carga da loja nova com erro: nada da loja anterior na tela, só o erro.
  const pecasNaTela = dadosSaoDaLoja ? pecas : [];
  const movimentosNaTela = useMemo(() => (dadosSaoDaLoja ? movimentos : []), [dadosSaoDaLoja, movimentos]);
  const depositosNaTela = dadosSaoDaLoja ? depositos : [];
  const regimeNaTela = dadosSaoDaLoja ? regime : null;
  const saldos = calcularSaldoPorPeca(movimentosNaTela);
  const saldosPorDeposito = calcularSaldoPorPecaEDeposito(movimentosNaTela);
  const ultimaSaida = useMemo(() => ultimaSaidaPorPeca(movimentosNaTela), [movimentosNaTela]);
  const abrirPeca = (peca: Peca) => setVista({ tipo: "peca", pecaId: peca.id });
  const voltarALista = () => setVista({ tipo: "produtos" });
  const pecaDoPerfil = vista.tipo === "peca" ? pecasNaTela.find((p) => p.id === vista.pecaId) : undefined;

  const parte = vista.tipo === "movimentacoes" || vista.tipo === "contagem" || vista.tipo === "relatorios"
    ? TITULO_DA_PARTE[vista.tipo]
    : null;
  // Na lista de Produtos ainda vazia, o erro da carga vai DENTRO dela, com o
  // "Tentar de novo" (#1017); em cima ficaria repetido.
  const erroDentroDosProdutos = !!erro && !pecaDoPerfil && !parte && pecasNaTela.length === 0;

  return (
    <div className="space-y-6">
      {/* O perfil da peça tem o cabeçalho dele (o molde de perfil). */}
      {!pecaDoPerfil && (
        <header className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="mr-auto flex min-w-0 items-center gap-3">
            {parte ? <BotaoVoltar onClick={voltarALista} /> : <BotaoVoltar />}
            <div className="min-w-0">
              <h1 className="font-titulo text-titulo font-bold text-texto">{parte ? parte.titulo : "Estoque"}</h1>
              <p className="text-corpo text-texto-2">{parte ? parte.frase : "Produtos, peças e o que falta comprar"}</p>
            </div>
          </div>
          {!parte && (
            // As partes do estoque, à vista (eram abas). Secundários: o laranja
            // da tela é o "Novo produto".
            <nav aria-label="Partes do estoque" className="flex flex-wrap items-center gap-2 [&_[aria-haspopup=menu]]:size-10">
              <Botao icone={<ArrowLeftRight />} onClick={() => setVista({ tipo: "movimentacoes" })}>
                Movimentações
              </Botao>
              <Botao icone={<ClipboardCheck />} onClick={() => setVista({ tipo: "contagem" })}>
                Contagem
              </Botao>
              <Botao icone={<FileBarChart />} onClick={() => setVista({ tipo: "relatorios" })}>
                Relatórios
              </Botao>
              {operador?.admin === true && (
                <AcoesDaLinha
                  descricao="o estoque"
                  acoes={[{ tipo: "menu", rotulo: "Juntar peças repetidas", aoClicar: () => setJuntando(true) }]}
                />
              )}
            </nav>
          )}
        </header>
      )}

      {juntando && (
        <JuntarPecasModal
          categorias={categorias}
          pecas={catalogo ?? []}
          carregando={carregando}
          erroAoCarregar={erroCatalogo}
          onFechar={() => setJuntando(false)}
          onRecarregar={carregar}
        />
      )}

      {erro && !erroDentroDosProdutos && <AvisoDeErro>{erro}</AvisoDeErro>}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : !lojaAtual ? (
        <AvisoDeAtencao>
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </AvisoDeAtencao>
      ) : pecaDoPerfil ? (
        <PerfilDaPeca
          peca={pecaDoPerfil}
          saldo={saldos.get(pecaDoPerfil.id) ?? 0}
          movimentos={movimentosNaTela.filter((m) => m.peca_id === pecaDoPerfil.id)}
          depositos={depositosNaTela}
          categorias={categorias}
          onVoltar={voltarALista}
          onEditar={() => setVista({ tipo: "produtos", editar: pecaDoPerfil })}
          onComprar={onComprar}
          onRecarregar={carregar}
        />
      ) : vista.tipo === "movimentacoes" ? (
        <MovimentacoesSection
          pecas={pecasNaTela}
          movimentos={movimentosNaTela}
          depositos={depositosNaTela}
          lojaId={lojaAtual.id}
          onRecarregar={carregar}
          onAbrirPeca={abrirPeca}
        />
      ) : vista.tipo === "contagem" ? (
        <ContagemSection
          pecas={pecasNaTela}
          depositos={depositosNaTela}
          saldosPorDeposito={saldosPorDeposito}
          lojaId={lojaAtual.id}
          onRecarregar={carregar}
        />
      ) : vista.tipo === "relatorios" ? (
        <RelatoriosEstoqueSection
          pecas={pecasNaTela}
          movimentos={movimentosNaTela}
          saldos={saldos}
        />
      ) : (
        <ProdutosSection
          pecas={pecasNaTela}
          categorias={categorias}
          saldos={saldos}
          ultimaSaida={ultimaSaida}
          regime={regimeNaTela}
          lojaId={lojaAtual.id}
          onRecarregar={carregar}
          erroAoCarregar={erro}
          avisoEstoqueInicial={avisoEstoqueInicial}
          onAvisoEstoqueInicial={setAvisoEstoqueInicial}
          onAbrirPeca={abrirPeca}
          onComprar={onComprar}
          editarAoAbrir={vista.tipo === "produtos" ? (vista.editar ?? null) : null}
          onEditarAoAbrirUsado={voltarALista}
        />
      )}
    </div>
  );
}
