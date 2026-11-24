import type { ReactNode } from "react";

export interface ColunaDaTabela {
  chave: string;
  titulo: string;
  /** Número ou dinheiro: à direita, com os algarismos em coluna. */
  numero?: boolean;
}

export interface LinhaDaTabela {
  chave: string;
  /** Uma célula por coluna, pela `chave` da coluna. O R$ vem completo, pronto. */
  celulas: Readonly<Record<string, ReactNode>>;
}

/**
 * O "Ver como tabela" dos gráficos de Relações (#1086): os mesmos números do
 * desenho, com o R$ completo (no gráfico ele é abreviado, "R$ 2,6 mil"). Usa a
 * tabela do visual novo (`sakura-tabela`).
 */
export function TabelaDoGrafico({
  colunas,
  linhas,
  legenda,
}: {
  colunas: readonly ColunaDaTabela[];
  linhas: readonly LinhaDaTabela[];
  /** O que a tabela mostra, pro leitor de tela (vira o `<caption>`, escondido). */
  legenda?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-linha">
      <table className="sakura-tabela">
        {legenda && <caption className="sr-only">{legenda}</caption>}
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} scope="col" className={c.numero ? "text-right" : undefined}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave}>
              {colunas.map((c) => (
                <td key={c.chave} className={c.numero ? "text-right tabular-nums" : undefined}>
                  {linha.celulas[c.chave] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
