import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Conta de dinheiro mora em `src/schemas/`, como função pura testada — nunca
 * dentro de um componente de tela.
 *
 * Este teste existe porque essa regra já estava escrita no PROJETO_STATUS.md e
 * **falhou cinco vezes de qualquer forma** (seção 6, itens 35, 38, 40 e 44):
 * o mesmo lucro calculado de três maneiras diferentes em três telas, o
 * desconto do item somindo da nota fiscal em três contas separadas, o ticket
 * médio dividindo por lançamento em vez de por ordem. Toda vez, a causa foi a
 * mesma: cada tela nova refez a conta por conta própria.
 *
 * As melhores regras deste projeto viraram mecanismo em vez de lembrete — o
 * teste que reprova quando o `instalacao-completa.sql` está desatualizado, o
 * `npm run contraste`, a regra de lint contra cortar o dia em UTC. Esta é a
 * mesma ideia.
 *
 * É tosco de propósito: erra para o lado de avisar demais. Isso é melhor que a
 * sexta divergência. Quando ele reclamar de algo legítimo, a saída certa é
 * mover a conta pra `src/schemas/` — e só se isso for de verdade impossível,
 * acrescentar uma exceção aqui embaixo, com o motivo escrito.
 */

const PASTA_TELAS = "src/pages";

/**
 * Casos que já estavam assim antes deste teste existir.
 *
 * Nenhum deles é "legítimo": é a mesma dívida de sempre, conta de dinheiro
 * dentro da tela. Está anotada aqui, com nome e sobrenome, em vez de o teste
 * ser afrouxado — assim a dívida fica contável e a próxima sessão sabe
 * exatamente o que falta mover. Eram duas telas; a `LucratividadeSection`
 * saiu da lista na tarefa #379 (a conta foi pra `schemas/lucratividade.ts`).
 *
 * Mexer na tela que sobrou é trabalho de outro item do guia (é refatoração
 * de tela, que pede preview renderizado pra conferir). O que este teste
 * garante desde já é que a lista **não cresce**.
 */
const DIVIDA_CONHECIDA: Record<string, string> = {
  "estoque/RelatoriosEstoqueSection.tsx":
    "Calcula o valor financeiro do estoque (saldo × preço de custo) dentro do " +
    "componente. Mesmo destino: função pura em src/schemas/.",
};

function arquivosDeTela(pasta: string, prefixo = ""): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name);
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) return arquivosDeTela(caminho, relativo);
    if (!/\.tsx?$/.test(entrada.name)) return [];
    if (/\.test\.tsx?$/.test(entrada.name)) return [];
    return [relativo];
  });
}

/**
 * Tira comentário, texto entre aspas e fecha-tag de JSX antes de procurar.
 *
 * Sem isso o teste reclamaria de um comentário explicando o cuidado com o
 * lucro (o `PainelPage.tsx` tem um) ou de um rótulo de tela escrito
 * "Lucro do dia" — ruído que ensinaria a ignorar o teste.
 *
 * O fecha-tag entrou nessa lista depois de dois falsos positivos reais:
 * `{formatarPreco(peca.preco_custo)}</td>` foi acusado de fazer conta, porque
 * a barra de `</td>` parece uma divisão vindo logo depois do custo. Só o
 * fecha-tag (`</algo>` e `/>`) é apagado, de propósito — apagar tudo entre
 * `<` e `>` comeria comparação de verdade, tipo `if (dia < inicio || dia > fim)`.
 */
function semComentarioNemTexto(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/<\/[A-Za-z][^>]*>/g, " ")
    .replace(/\/>/g, " ");
}

const PALAVRAS_DE_DINHEIRO = "lucro|ticket|margem|comissao|comissão";

const SUSPEITAS: { nome: string; padrao: RegExp }[] = [
  {
    nome: "lucro/ticket/margem/comissão entrando numa conta",
    // Um desses nomes de um lado de um operador de conta, ou de uma
    // atribuição que acumula (+=, -=).
    padrao: new RegExp(
      `(\\b[A-Za-z_$.]*(?:${PALAVRAS_DE_DINHEIRO})[A-Za-z_$]*\\s*(?:[-+*/]=|[-+*/](?!=))` +
        `|(?:[-+*/])\\s*[A-Za-z_$.]*(?:${PALAVRAS_DE_DINHEIRO})[A-Za-z_$]*\\b)`,
      "i",
    ),
  },
  {
    nome: "variável de lucro/ticket/margem/comissão recebendo uma conta",
    // A forma mais comum do bug, e a que passou batido na primeira versão
    // deste teste: `const lucro = vendas - custos`. Aqui o nome não está
    // colado num operador — ele está do lado esquerdo de um `=`, e a conta
    // acontece do lado direito. Era literalmente assim o item 40 da seção 6
    // ("lucrosMes = vendasMes - custosMes", que mostrava faturamento como
    // se fosse lucro).
    padrao: new RegExp(
      `\\b[A-Za-z_$.]*(?:${PALAVRAS_DE_DINHEIRO})[A-Za-z_$]*\\s*=\\s*[^;\\n=][^;\\n]*[-+*/](?!=)`,
      "i",
    ),
  },
  {
    nome: "preço de custo entrando numa conta",
    // `preco_custo` ou `.custo` multiplicado/somado — é como o custo real de
    // uma venda é levantado, e foi a origem dos itens 35, 38 e 40.
    padrao:
      /(preco_custo|\.custo)\b[^\n;]{0,40}?[-+*/](?!=)|[-+*/]\s*[A-Za-z_$.()?\s]{0,20}(preco_custo|\.custo)\b/,
  },
  {
    nome: "juros ou alíquota virando porcentagem",
    padrao: /\b[A-Za-z_$.]*(juros|aliquota|alíquota)[A-Za-z_$]*\s*\/\s*100|\*\s*1\.\d/i,
  },
];

const ONDE_A_CONTA_MORA =
  "conta de dinheiro vive em `src/schemas/` como função pura testada — " +
  "ver PROJETO_STATUS.md, seção 6, item 40";

describe("conta de dinheiro não mora na tela", () => {
  const arquivos = arquivosDeTela(PASTA_TELAS);

  it("encontra as telas pra varrer", () => {
    // Se a pasta mudar de lugar e este teste passar a varrer o vazio, ele
    // ficaria verde sem checar nada — que é pior que estar vermelho.
    expect(arquivos.length).toBeGreaterThan(40);
  });

  it.each(arquivos)("%s", (relativo) => {
    const codigo = semComentarioNemTexto(
      readFileSync(join(PASTA_TELAS, relativo), "utf8"),
    );

    const achados = SUSPEITAS.filter(({ padrao }) => padrao.test(codigo)).map(
      ({ nome }) => nome,
    );

    if (relativo in DIVIDA_CONHECIDA) {
      // Dívida anotada: o teste cobra que ela continue existindo. Se alguém
      // mover a conta pra src/schemas/, este teste reprova pedindo pra tirar a
      // linha da lista — é assim que a lista encolhe em vez de envelhecer.
      expect(
        achados,
        `${relativo} está na lista de dívida conhecida, mas não tem mais conta ` +
          `de dinheiro. Ótimo — apague a entrada dele em DIVIDA_CONHECIDA.`,
      ).not.toHaveLength(0);
      return;
    }

    expect(
      achados,
      `${relativo} parece fazer conta de dinheiro na tela (${achados.join("; ")}). ` +
        `${ONDE_A_CONTA_MORA}.`,
    ).toHaveLength(0);
  });
});
