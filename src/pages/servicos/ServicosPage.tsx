import { useEffect, useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Selo } from "@/components/Selo";
import { AvisoDeErro } from "@/components/Aviso";
import { listarCategoriasServico } from "@/lib/categoriasServico";
import { mensagemDeErro } from "@/lib/errors";
import { useRolarAteOFormulario } from "@/hooks/useRolarAteOFormulario";
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
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

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
  // Uma caixa pra cada formulário: os dois podem estar abertos juntos, e o
  // cursor vai pro que acabou de abrir.
  const caixaDoNovo = useRolarAteOFormulario(mostrarFormulario ? "novo" : null);
  const caixaDaEdicao = useRolarAteOFormulario(servicoEditando?.id ?? null);

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

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    try {
      await excluirServico(id);
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
        {!mostrarFormulario && !servicoEditando && (
          <Botao variante="principal" onClick={() => setMostrarFormulario(true)}>
            + Novo serviço
          </Botao>
        )}
      </header>

      {mostrarFormulario && (
        <div ref={caixaDoNovo} className="scroll-mt-4">
          <ServicoForm
            categorias={categorias}
            onSalvar={handleSalvar}
            onCancelar={() => setMostrarFormulario(false)}
          />
        </div>
      )}

      {servicoEditando && (
        <div ref={caixaDaEdicao} className="scroll-mt-4">
          {/* key: a lista fica na tela com o formulário aberto, e sem ela trocar
              de canetinha mantinha os valores do anterior (defaultValues só
              valem na montagem); salvar gravava esses dados no outro (#969). */}
          <ServicoForm
            key={servicoEditando.id}
            categorias={categorias}
            servicoExistente={servicoEditando}
            onSalvar={handleSalvar}
            onSalvarEdicao={handleSalvarEdicao}
            onCancelar={() => setServicoEditando(null)}
          />
        </div>
      )}

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : servicos.length === 0 ? (
        <p className="text-corpo text-texto-2">
          Nenhum serviço cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Código</th>
                <th className="text-right">Preço padrão</th>
                <th className="text-right">Custo</th>
                <th>Status</th>
                <th className="relative">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((servico) => (
                <tr key={servico.id}>
                  <td className="font-medium">{servico.descricao}</td>
                  <td className="text-texto-2">
                    {categorias.find((c) => c.id === servico.categoria_id)?.nome ?? "—"}
                  </td>
                  <td className="whitespace-nowrap text-texto-2">{servico.codigo_interno || "—"}</td>
                  <td className="whitespace-nowrap text-right">{formatarPreco(servico.preco_padrao)}</td>
                  <td className="whitespace-nowrap text-right text-texto-2">{formatarPreco(servico.custo)}</td>
                  <td>
                    <Selo
                      tipo={servico.ativo ? "ok" : "neutro"}
                      palavra={servico.ativo ? "Ativo" : "Inativo"}
                    />
                  </td>
                  <td className="text-right">
                    <AcoesDaLinha
                      descricao={`o serviço ${servico.descricao}`}
                      acoes={[
                        { tipo: "editar", aoClicar: () => setServicoEditando(servico) },
                        {
                          tipo: servico.ativo ? "inativar" : "reativar",
                          aoClicar: () => handleAlternarStatus(servico),
                        },
                        {
                          tipo: "menu",
                          rotulo: "Excluir serviço",
                          perigosa: true,
                          aoClicar: () => handleExcluir(servico.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
