import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { listarCategoriasServico } from "@/lib/categoriasServico";
import { mensagemDeErro } from "@/lib/errors";
import {
  atualizarServico,
  atualizarStatusServico,
  criarServico,
  excluirServico,
  listarServicos,
} from "@/lib/servicos";
import { isSupabaseConfigured } from "@/lib/supabase";
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

  async function carregar() {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }
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
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="text-titulo font-semibold text-sakura-purple-dark">
              Serviços
            </h1>
            <p className="text-corpo text-sakura-muted">
              Catálogo de serviços oferecidos, com preço padrão
            </p>
          </div>
        </div>
        {!mostrarFormulario && !servicoEditando && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Novo serviço
          </button>
        )}
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a cadastrar serviços de verdade.
        </p>
      )}

      {mostrarFormulario && (
        <ServicoForm
          categorias={categorias}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {servicoEditando && (
        <ServicoForm
          categorias={categorias}
          servicoExistente={servicoEditando}
          onSalvar={handleSalvar}
          onSalvarEdicao={handleSalvarEdicao}
          onCancelar={() => setServicoEditando(null)}
        />
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : servicos.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhum serviço cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Preço padrão</th>
                <th className="px-4 py-3 font-medium">Custo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {servicos.map((servico) => (
                <tr key={servico.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">{servico.descricao}</td>
                  <td className="px-4 py-3">
                    {categorias.find((c) => c.id === servico.categoria_id)?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3">{servico.codigo_interno || "—"}</td>
                  <td className="px-4 py-3">{formatarPreco(servico.preco_padrao)}</td>
                  <td className="px-4 py-3">{formatarPreco(servico.custo)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                        servico.ativo
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sakura-gray/20 text-sakura-muted"
                      }`}
                    >
                      {servico.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
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
