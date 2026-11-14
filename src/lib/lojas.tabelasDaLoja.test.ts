/**
 * Excluir loja (#951): toda tabela cujo `loja_id` aponta pra `lojas` SEM
 * `on delete cascade`/`set null` prende a loja — o delete em `lojas` falha
 * com 23503 e a tela diz "essa loja ainda tem dados vinculados".
 *
 * Isso é o certo pra dado de negócio (de propósito), mas é defeito pra tabela
 * de configuração: essas têm que estar em `TABELAS_CONFIG_POR_LOJA`, que o
 * `excluirLoja` apaga antes da loja. Já esqueceram três vezes (Pix #941,
 * link de avaliação #945, textos de WhatsApp #951). Este teste lê as
 * migrations e exige que cada tabela dessas esteja numa das duas listas — a
 * próxima `configuracoes_*` nova reprova aqui, em vez de prender a loja.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));

const { TABELAS_CONFIG_POR_LOJA } = await import("./lojas");

/**
 * Dado de negócio: trava a exclusão da loja DE PROPÓSITO (perder dado de
 * verdade sem querer é muito pior que deixar a loja inativa). Nunca mover
 * uma destas pra `TABELAS_CONFIG_POR_LOJA`.
 */
const TRAVAM_DE_PROPOSITO: Record<string, string> = {
  estoque_movimentos: "histórico de entrada e saída de estoque (0032)",
  contagens_estoque: "contagens de estoque feitas na loja (0032)",
  ordens_servico: "ordens de serviço, vendas e notas da loja (0032)",
  caixa_movimentos: "dinheiro que entrou e saiu do caixa (0032)",
  contas_pagar: "contas a pagar da loja (0032)",
  notas_fiscais_arquivos: "XML/PDF de notas fiscais, guarda obrigatória (0032)",
  funcionarios: "cadastro de funcionários e comissões (0032)",
  contas_receber: "contas a receber de clientes (0036)",
  pedidos_compra: "pedidos de compra a fornecedor (0039)",
  whatsapp_mensagens: "histórico de mensagens abertas, responde 'já cobrei?' (0052)",
  fechamentos_caixa: "fechamentos de caixa conferidos (0058)",
  comissoes_fechamentos: "fechamentos de comissão pagos (0059)",
};

/** Tira os comentários `-- ...` (eles podem citar `references lojas` ou ter `;`). */
function semComentarios(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

const REF_LOJAS = /references\s+(?:public\.)?lojas\s*\(\s*id\s*\)([^,)]*)/gi;
const NOME = /^\s*(?:create\s+table|alter\s+table)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?(\w+)/i;
const DROP = /^\s*drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/i;

/**
 * Lê as migrations em ordem e devolve, pra cada tabela que aponta pra
 * `lojas`, se ela trava a exclusão (sem cascade/set null). A última
 * migration que mexe na tabela é a que vale.
 */
function tabelasQueApontamPraLojas(): { travam: Set<string>; naoEntendi: string[] } {
  const estado = new Map<string, boolean>();
  const naoEntendi: string[] = [];
  const arquivos = readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort();

  for (const arquivo of arquivos) {
    const sql = semComentarios(readFileSync(`supabase/migrations/${arquivo}`, "utf8"));
    for (const comando of sql.split(";")) {
      const drop = DROP.exec(comando);
      if (drop) {
        estado.delete(drop[1].toLowerCase());
        continue;
      }
      const refs = [...comando.matchAll(REF_LOJAS)];
      if (refs.length === 0) continue;
      const nome = NOME.exec(comando);
      if (!nome) {
        naoEntendi.push(`${arquivo}: ${comando.trim().slice(0, 80)}`);
        continue;
      }
      const trava = refs.some((r) => !/on\s+delete\s+(cascade|set\s+null)/i.test(r[1]));
      estado.set(nome[1].toLowerCase(), trava);
    }
  }

  const travam = new Set([...estado].filter(([, trava]) => trava).map(([t]) => t));
  return { travam, naoEntendi };
}

describe("tabelas que apontam pra lojas sem cascade", () => {
  const { travam, naoEntendi } = tabelasQueApontamPraLojas();
  const config = new Set<string>(TABELAS_CONFIG_POR_LOJA);

  it("o leitor entendeu toda migration que cita `references lojas`", () => {
    expect(naoEntendi, "Comando com `references lojas` que o teste não soube ler").toEqual([]);
  });

  it("cada uma é configuração (apagada junto) ou dado de negócio (trava de propósito)", () => {
    const semDono = [...travam].filter((t) => !config.has(t) && !(t in TRAVAM_DE_PROPOSITO));
    expect(
      semDono,
      "Tabela nova com loja_id sem cascade. É configuração? Ponha em TABELAS_CONFIG_POR_LOJA " +
        "(src/lib/lojas.ts). É dado de negócio? Ponha em TRAVAM_DE_PROPOSITO neste teste, com o porquê.",
    ).toEqual([]);
  });

  it("nenhuma tabela está nas duas listas", () => {
    const nasDuas = [...config].filter((t) => t in TRAVAM_DE_PROPOSITO);
    expect(nasDuas).toEqual([]);
  });

  it("as listas não citam tabela que não existe mais (ou que já tem cascade)", () => {
    const sobrando = [...config, ...Object.keys(TRAVAM_DE_PROPOSITO)].filter((t) => !travam.has(t));
    expect(sobrando).toEqual([]);
  });
});
