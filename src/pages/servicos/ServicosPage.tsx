import { useEffect, useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Chips } from "@/components/Chips";
import { useConfirmar } from "@/components/JanelaDeConfirmar";
import { Modal } from "@/components/Modal";
import { AvisoDeErro } from "@/components/Aviso";
import { LinhaDeLista } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";
import { listarCategoriasServico } from "@/lib/categoriasServico";
import { mensagemDeErro } from "@/lib/errors";
import {
  atualizarServico,
  atualizarStatusServico,
  criarServico,
  excluirServico,
  listarServicos,
} from "@/lib/servicos";
import type { CategoriaServico } from "@/types/categoriaServico";
import type { NovoServico, Servico } from "@/types/servico";
import { ServicoForm } from "./ServicoForm";
import { servicoCasaComBusca } from "./buscaDeServico";

type FiltroDeStatus = "todos" | "ativos" | "inativos";

const OPCOES_DE_STATUS = [
  { valor: "todos", nome: "Todos" },
  { valor: "ativos", nome: "Ativos" },
  { valor: "inativos", nome: "Inativos" },
] as const;

function formatarPreco(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroDeStatus>("todos");
  const { confirmar, janela } = useConfirmar();

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [servicosCarregados, categoriasCarregadas] = await Promise.all([
        listarServicos(),
        listarCategoriasServico(),
      ]);
      setServicos(servicosCarregados);
      setCategorias(categoriasCarregadas);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSalvar(servico: NovoServico) {
    await criarServico(servico);
    setMostrarFormulario(false);
    await carregar();
  }

  async function handleSalvarEdicao(id: string, servico: NovoServico) {
    await atualizarServico(id, servico);
    setServicoEditando(null);
    await carregar();
  }

  async function handleExcluir(servico: Servico) {
    if (
      !(await confirmar({
        acao: "Excluir o serviço",
        item: servico.descricao,
        botao: "Excluir serviço",
      }))
    )
      return;
    try {
      await excluirServico(servico.id);
      await carregar();
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleAlternarStatus(servico: Servico) {
    try {
      await atualizarStatusServico(servico.id, !servico.ativo);
      await carregar();
    } catch (err) {
      console.error("Erro ao atualizar status do serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const visiveis = useMemo(
    () =>
      servicos.filter(
        (s) =>
          (filtro === "todos" || (filtro === "ativos") === s.ativo) && servicoCasaComBusca(s, busca),
      ),
    [servicos, filtro, busca],
  );
  const nomeDaCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="font-titulo text-titulo font-bold text-texto">Serviços</h1>
            <p className="text-corpo text-texto-2">
              Catálogo de serviços oferecidos, com preço padrão
            </p>
          </div>
        </div>
        <Botao variante="principal" onClick={() => setMostrarFormulario(true)}>
          + Novo serviço
        </Botao>
      </header>

      {mostrarFormulario && (
        <Modal titulo="Novo serviço" onFechar={() => setMostrarFormulario(false)}>
          <ServicoForm
            emJanela
            categorias={categorias}
            onSalvar={handleSalvar}
            onCancelar={() => setMostrarFormulario(false)}
          />
        </Modal>
      )}

      {servicoEditando && (
        <Modal titulo="Editar serviço" onFechar={() => setServicoEditando(null)}>
          {/* key: sem ela o formulário guarda os valores do serviço anterior
              (defaultValues só valem na montagem); salvar gravava esses dados
              no outro (#969). */}
          <ServicoForm
            key={servicoEditando.id}
            emJanela
            categorias={categorias}
            servicoExistente={servicoEditando}
            onSalvar={handleSalvar}
            onSalvarEdicao={handleSalvarEdicao}
            onCancelar={() => setServicoEditando(null)}
          />
        </Modal>
      )}

      {/* Erro de excluir/inativar (a carga que falhou mostra o dela na lista). */}
      {erro && !carregando && servicos.length > 0 && <AvisoDeErro>{erro}</AvisoDeErro>}

      <MoldeLista
        rotulo="Serviços"
        estado={carregando ? "carregando" : erro && servicos.length === 0 ? "erro" : "pronto"}
        itens={visiveis}
        chave={(s) => s.id}
        busca={{
          valor: busca,
          aoMudar: setBusca,
          rotulo: "Buscar serviço",
          dica: "Nome ou código do serviço",
        }}
        filtros={
          <Chips
            rotulo="Situação do serviço"
            opcoes={OPCOES_DE_STATUS}
            valor={filtro}
            aoEscolher={setFiltro}
          />
        }
        filtroAtivo={filtro !== "todos"}
        aoLimparFiltros={() => setFiltro("todos")}
        vazio={{
          frase: "Nenhum serviço cadastrado ainda.",
          acao: { rotulo: "Cadastrar o primeiro serviço", aoClicar: () => setMostrarFormulario(true) },
        }}
        erro={{ mensagem: erro ?? "", tentarDeNovo: carregar }}
        linha={(servico) => (
          <LinhaDeLista
            nome={servico.descricao}
            detalhe={[
              nomeDaCategoria(servico.categoria_id),
              servico.codigo_interno || undefined,
              servico.ativo ? undefined : "Inativo",
            ]
              .filter(Boolean)
              .join(" · ")}
            lado={<span className="w-28 text-right">{formatarPreco(servico.preco_padrao)}</span>}
            aoAbrir={() => setServicoEditando(servico)}
            mais={[
              { rotulo: "Editar", aoClicar: () => setServicoEditando(servico) },
              {
                rotulo: servico.ativo ? "Inativar" : "Reativar",
                aoClicar: () => handleAlternarStatus(servico),
              },
              {
                rotulo: "Excluir serviço",
                perigosa: true,
                aoClicar: () => handleExcluir(servico),
              },
            ]}
          />
        )}
      />
      {janela}
    </div>
  );
}
