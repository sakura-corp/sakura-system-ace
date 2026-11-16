import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Selo } from "@/components/Selo";
import { criarMovimento } from "@/lib/estoque";
import type { Deposito } from "@/types/deposito";
import type { MovimentoEstoque, NovoMovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";
import { MovimentoForm } from "./MovimentoForm";
import { AvisoDeAtencao, CAMPO_NOVO_NO_COMBOBOX_FILTRO } from "./avisosEAbas";

interface MovimentacoesSectionProps {
  pecas: Peca[];
  movimentos: MovimentoEstoque[];
  depositos: Deposito[];
  lojaId: string;
  onRecarregar: () => Promise<void>;
}

const motivoLabel: Record<string, string> = {
  compra: "Compra",
  venda: "Venda",
  ajuste: "Ajuste manual",
  uso_em_os: "Uso em OS",
};

export function MovimentacoesSection({
  pecas,
  movimentos,
  depositos,
  lojaId,
  onRecarregar,
}: MovimentacoesSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroPecaId, setFiltroPecaId] = useState("");

  async function handleSalvar(movimento: NovoMovimentoEstoque) {
    await criarMovimento(movimento, lojaId);
    await onRecarregar();
  }

  const movimentosFiltrados = filtroPecaId
    ? movimentos.filter((m) => m.peca_id === filtroPecaId)
    : movimentos;

  return (
    <div className="space-y-6">
      {pecas.length === 0 ? (
        <AvisoDeAtencao>
          Cadastre ao menos um produto na aba "Produtos" antes de registrar
          movimentações de estoque.
        </AvisoDeAtencao>
      ) : (
        !mostrarFormulario && (
          <div className="flex justify-end">
            <Botao variante="principal" onClick={() => setMostrarFormulario(true)}>
              + Registrar movimentação
            </Botao>
          </div>
        )
      )}

      {mostrarFormulario && (
        <MovimentoForm
          pecas={pecas}
          depositos={depositos}
          onSalvar={handleSalvar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-titulo text-subtitulo font-semibold text-texto">
            Histórico de movimentações
          </h2>
          {movimentos.length > 0 && (
            <label className="flex items-center gap-2 text-rotulo font-medium text-texto-2">
              Produto
              <Combobox
                className={`w-56 ${CAMPO_NOVO_NO_COMBOBOX_FILTRO}`}
                opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
                valor={filtroPecaId}
                onMudar={setFiltroPecaId}
                opcaoVazia="Todos"
                placeholder="Todos"
              />
            </label>
          )}
        </div>

        {movimentosFiltrados.length === 0 ? (
          <p className="text-corpo text-texto-2">
            {movimentos.length === 0
              ? "Nenhuma movimentação registrada ainda."
              : "Nenhuma movimentação para este produto."}
          </p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Depósito</th>
                  <th>Tipo</th>
                  <th className="text-right">Quantidade</th>
                  <th>Motivo</th>
                  <th>Referência</th>
                </tr>
              </thead>
              <tbody>
                {movimentosFiltrados.map((movimento) => {
                  const peca = pecas.find((p) => p.id === movimento.peca_id);
                  const deposito = depositos.find((d) => d.id === movimento.deposito_id);
                  return (
                    <tr key={movimento.id}>
                      <td className="whitespace-nowrap text-texto-2">
                        {new Date(movimento.criado_em).toLocaleString("pt-BR")}
                      </td>
                      <td>{peca?.descricao ?? "—"}</td>
                      <td className="text-texto-2">{deposito?.nome ?? "—"}</td>
                      <td>
                        {movimento.tipo === "entrada" ? (
                          <Selo tipo="ok" palavra="Entrada" icone={ArrowDownToLine} />
                        ) : (
                          <Selo tipo="neutro" palavra="Saída" icone={ArrowUpFromLine} />
                        )}
                      </td>
                      <td className="text-right font-medium">{movimento.quantidade}</td>
                      <td>{motivoLabel[movimento.motivo]}</td>
                      <td className="text-texto-2">{movimento.referencia || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
