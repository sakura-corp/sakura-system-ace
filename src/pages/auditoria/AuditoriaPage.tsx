import { useEffect, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { listarAuditoria } from "@/lib/auditoria";
import { mensagemDeErro } from "@/lib/errors";
import { listarOperadores } from "@/lib/operadores";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ACAO_AUDITORIA_LABEL,
  TABELA_AUDITORIA_LABEL,
  type AcaoAuditoria,
  type RegistroAuditoria,
} from "@/types/auditoria";
import type { Operador } from "@/types/operador";

const CLASSE_DO_SELO: Record<AcaoAuditoria, string> = {
  criar: "bg-emerald-50 text-emerald-800",
  atualizar: "bg-amber-50 text-amber-800",
  excluir: "bg-red-50 text-red-700",
};

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [filtroTabela, setFiltroTabela] = useState("");
  const [filtroOperadorId, setFiltroOperadorId] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<RegistroAuditoria | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    listarOperadores()
      .then(setOperadores)
      .catch((err) => {
        console.error("Erro ao carregar operadores:", err);
        setErro(mensagemDeErro(err));
      });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarAuditoria({
      tabela: filtroTabela || undefined,
      operadorId: filtroOperadorId || undefined,
      acao: (filtroAcao || undefined) as AcaoAuditoria | undefined,
    })
      .then((registrosCarregados) => {
        if (ativo) setRegistros(registrosCarregados);
      })
      .catch((err) => {
        console.error("Erro ao carregar auditoria:", err);
        if (ativo) setErro(mensagemDeErro(err));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [filtroTabela, filtroOperadorId, filtroAcao]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Auditoria</h1>
          <p className="text-corpo text-sakura-muted">
            Quem criou, editou ou excluiu o quê, e quando — só admin vê essa tela
          </p>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para ver a auditoria de verdade.
        </p>
      )}

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-corpo">
          <span className="text-sakura-purple-dark/80">Tabela</span>
          <Combobox
            className="w-56"
            opcoes={Object.entries(TABELA_AUDITORIA_LABEL).map(([valor, rotulo]) => ({
              valor,
              rotulo,
            }))}
            valor={filtroTabela}
            onMudar={setFiltroTabela}
            opcaoVazia="Todas"
            placeholder="Todas"
          />
        </label>
        <label className="flex items-center gap-2 text-corpo">
          <span className="text-sakura-purple-dark/80">Ação</span>
          <Combobox
            className="w-44"
            opcoes={Object.entries(ACAO_AUDITORIA_LABEL).map(([valor, rotulo]) => ({
              valor,
              rotulo,
            }))}
            valor={filtroAcao}
            onMudar={setFiltroAcao}
            opcaoVazia="Todas"
            placeholder="Todas"
          />
        </label>
        <label className="flex items-center gap-2 text-corpo">
          <span className="text-sakura-purple-dark/80">Operador</span>
          <Combobox
            className="w-56"
            opcoes={operadores.map((op) => ({ valor: op.id, rotulo: op.nome }))}
            valor={filtroOperadorId}
            onMudar={setFiltroOperadorId}
            opcaoVazia="Todos"
            placeholder="Todos"
          />
        </label>
      </div>

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : registros.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhum registro de auditoria ainda (só aparece depois que algo for criado, editado ou
          excluído nas telas cobertas).
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Quem</th>
                <th className="px-4 py-3 font-medium">Tabela</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => (
                <tr key={registro.id} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3 text-sakura-purple-dark">
                    {formatarDataHora(registro.criado_em)}
                  </td>
                  <td className="px-4 py-3 text-sakura-purple-dark">
                    {registro.operador_nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sakura-purple-dark">
                    {TABELA_AUDITORIA_LABEL[registro.tabela] ?? registro.tabela}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                        CLASSE_DO_SELO[registro.acao]
                      }`}
                    >
                      {ACAO_AUDITORIA_LABEL[registro.acao]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDetalhe(registro)}
                      className="text-rotulo font-medium text-sakura-purple hover:underline"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalhe && (
        <Modal
          titulo={`${ACAO_AUDITORIA_LABEL[detalhe.acao]} em ${
            TABELA_AUDITORIA_LABEL[detalhe.tabela] ?? detalhe.tabela
          }`}
          onFechar={() => setDetalhe(null)}
        >
          <div className="space-y-4 text-corpo">
            <p className="text-sakura-purple-dark/80">
              {detalhe.operador_nome ?? "Alguém"} em {formatarDataHora(detalhe.criado_em)}
            </p>

            {detalhe.acao === "excluir" ? (
              <div>
                <h4 className="mb-1 text-rotulo font-semibold text-sakura-purple-dark">
                  Dados do registro excluído
                </h4>
                <pre className="max-h-80 overflow-auto rounded-lg bg-black/30 p-3 text-rotulo text-sakura-purple-dark/90">
                  {JSON.stringify(detalhe.dados_antes, null, 2)}
                </pre>
              </div>
            ) : detalhe.acao === "criar" ? (
              <div>
                <h4 className="mb-1 text-rotulo font-semibold text-sakura-purple-dark">
                  Dados do registro criado
                </h4>
                <pre className="max-h-80 overflow-auto rounded-lg bg-black/30 p-3 text-rotulo text-sakura-purple-dark/90">
                  {JSON.stringify(detalhe.dados_depois, null, 2)}
                </pre>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="mb-1 text-rotulo font-semibold text-sakura-purple-dark">Antes</h4>
                  <pre className="max-h-60 overflow-auto rounded-lg bg-black/30 p-3 text-rotulo text-sakura-purple-dark/90">
                    {JSON.stringify(detalhe.dados_antes, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="mb-1 text-rotulo font-semibold text-sakura-purple-dark">Depois</h4>
                  <pre className="max-h-60 overflow-auto rounded-lg bg-black/30 p-3 text-rotulo text-sakura-purple-dark/90">
                    {JSON.stringify(detalhe.dados_depois, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
