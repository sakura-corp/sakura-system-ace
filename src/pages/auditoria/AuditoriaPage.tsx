import { Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { Selo, type TipoDeSelo } from "@/components/Selo";
import { listarAuditoria } from "@/lib/auditoria";
import { mensagemDeErro } from "@/lib/errors";
import { listarOperadores } from "@/lib/operadores";
import {
  ACAO_AUDITORIA_LABEL,
  TABELA_AUDITORIA_LABEL,
  type AcaoAuditoria,
  type RegistroAuditoria,
} from "@/types/auditoria";
import type { Operador } from "@/types/operador";
import { AvisoDeErro } from "@/components/Aviso";

// Cada ação tem a cor, o ícone e a palavra (regra 4 do visual novo). "Editou" é
// azul, e não amarelo como era: amarelo é "atenção", e editar um cadastro é o
// dia a dia, não um alerta.
const SELO_DA_ACAO: Record<AcaoAuditoria, { tipo: TipoDeSelo; icone: LucideIcon }> = {
  criar: { tipo: "ok", icone: Plus },
  atualizar: { tipo: "info", icone: Pencil },
  excluir: { tipo: "perigo", icone: Trash2 },
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
    listarOperadores()
      .then(setOperadores)
      .catch((err) => {
        console.error("Erro ao carregar operadores:", err);
        setErro(mensagemDeErro(err));
      });
  }, []);

  useEffect(() => {
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
          <h1 className="font-titulo text-titulo font-bold text-texto">Auditoria</h1>
          <p className="text-corpo text-texto-2">
            Quem criou, editou ou excluiu o quê, e quando — só admin vê essa tela
          </p>
        </div>
      </header>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-corpo">
          <span className="text-rotulo font-medium text-texto-2">Tabela</span>
          <Combobox
            tamanho="filtro"
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
          <span className="text-rotulo font-medium text-texto-2">Ação</span>
          <Combobox
            tamanho="filtro"
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
          <span className="text-rotulo font-medium text-texto-2">Operador</span>
          <Combobox
            tamanho="filtro"
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
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : registros.length === 0 ? (
        <p className="text-corpo text-texto-2">
          Nenhum registro de auditoria ainda (só aparece depois que algo for criado, editado ou
          excluído nas telas cobertas).
        </p>
      ) : (
        <div className="sakura-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Tabela</th>
                  <th>Ação</th>
                  <th>
                    <span className="sr-only">Detalhes</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="text-texto">{formatarDataHora(registro.criado_em)}</td>
                    <td className="text-texto">{registro.operador_nome ?? "—"}</td>
                    <td className="text-texto">
                      {TABELA_AUDITORIA_LABEL[registro.tabela] ?? registro.tabela}
                    </td>
                    <td>
                      <Selo
                        tipo={SELO_DA_ACAO[registro.acao].tipo}
                        icone={SELO_DA_ACAO[registro.acao].icone}
                        palavra={ACAO_AUDITORIA_LABEL[registro.acao]}
                      />
                    </td>
                    <td className="text-right">
                      <Botao tamanho="pequeno" onClick={() => setDetalhe(registro)}>
                        Ver detalhes
                      </Botao>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detalhe && (
        <Modal
          titulo={`${ACAO_AUDITORIA_LABEL[detalhe.acao]} em ${
            TABELA_AUDITORIA_LABEL[detalhe.tabela] ?? detalhe.tabela
          }`}
          descricao={`${detalhe.operador_nome ?? "Alguém"} em ${formatarDataHora(detalhe.criado_em)}`}
          largura={detalhe.acao === "atualizar" ? "4xl" : "lg"}
          onFechar={() => setDetalhe(null)}
          rodape={<Botao onClick={() => setDetalhe(null)}>Fechar</Botao>}
        >
          <div className="space-y-4 text-corpo">
            {detalhe.acao === "excluir" ? (
              <BlocoDeDados titulo="Dados do registro excluído" dados={detalhe.dados_antes} />
            ) : detalhe.acao === "criar" ? (
              <BlocoDeDados titulo="Dados do registro criado" dados={detalhe.dados_depois} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <BlocoDeDados titulo="Antes" dados={detalhe.dados_antes} />
                <BlocoDeDados titulo="Depois" dados={detalhe.dados_depois} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** O registro como estava (ou ficou), campo a campo, numa caixa que rola. */
function BlocoDeDados({ titulo, dados }: { titulo: string; dados: unknown }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-rotulo font-semibold text-texto">{titulo}</h4>
      <pre className="max-h-80 overflow-auto rounded-xl bg-poco p-3 text-rotulo text-texto">
        {JSON.stringify(dados, null, 2)}
      </pre>
    </div>
  );
}
