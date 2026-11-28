import { describe, expect, it, vi } from "vitest";
import { dreDeExemplo, linha } from "@/testes/dreDeExemplo";

// montarHtmlDre só usa `rotuloDoMes` e `FRASE_DO_MES_DO_DRE` do contrato: se a
// `rotuloDoMes` real ainda não existe, usa-se uma de teste (o resto fica real).
vi.mock("@/schemas/dre", async (original) => {
  const real = await original<typeof import("@/schemas/dre")>();
  const ok = (() => {
    try {
      real.rotuloDoMes("2026-11");
      return true;
    } catch {
      return false;
    }
  })();
  return ok ? real : { ...real, rotuloDoMes: (m: string) => `m${m}` };
});

const { montarHtmlDre } = await import("./dreDocumento");

const base = { nomeDaLoja: "Loja Centro", geradoEm: "27/11/2026" };

describe("montarHtmlDre", () => {
  it("traz as linhas, o nome da loja, a paisagem e o pé", () => {
    const html = montarHtmlDre({ dre: dreDeExemplo(), ...base });
    expect(html).toContain("Receita bruta");
    expect(html).toContain("Resultado do mês");
    expect(html).toContain("Loja Centro");
    expect(html).toContain("A4 landscape");
    expect(html).toContain("(−) Taxa da maquininha");
    expect(html).toContain("(=) Resultado bruto");
    expect(html).toContain("Fora do resultado");
    expect(html).toContain("27/11/2026");
  });

  it("todas as linhas abertas, e o % do resultado bruto só dentro dos grupos de despesa", () => {
    const html = montarHtmlDre({ dre: dreDeExemplo(), ...base });
    expect(html).toContain("Pessoal");
    expect(html).toContain("Gerais");
    // Receita bruta e as filhas das despesas: 3 meses-colunas cada. Filhas e netas de despesas_operacionais: 3 linhas x 3 colunas.
    expect(html.match(/do resultado bruto/g)).toHaveLength(3 * 3);
  });

  it("escapa o que vem do cadastro (loja e categoria)", () => {
    const html = montarHtmlDre({ dre: dreDeExemplo(), nomeDaLoja: "Auto <b>Pneus</b> & Cia", geradoEm: "hoje" });
    expect(html).toContain("Salário &lt;fixo&gt;");
    expect(html).not.toContain("Salário <fixo>");
    expect(html).toContain("Auto &lt;b&gt;Pneus&lt;/b&gt; &amp; Cia");
    expect(html).not.toContain("<b>Pneus</b>");
  });

  it("taxa não informada aparece como texto, nunca como R$ 0,00 inventado", () => {
    const html = montarHtmlDre({ dre: dreDeExemplo(), ...base });
    expect(html).toContain("não informadas");
    const comValor = dreDeExemplo({
      linhas: [linha("taxa_maquininha", "Taxa da maquininha", "-", 50, [], { parcial: true })],
    });
    const html2 = montarHtmlDre({ dre: comValor, ...base });
    expect(html2).not.toContain("não informadas");
    expect(html2).toContain("parte não informada");
  });

  it("avisa lançamento sem grupo e mostra o total do que ficou fora do resultado", () => {
    const html = montarHtmlDre({
      dre: dreDeExemplo({ semGrupo: { quantidade: 2, total: 150 }, foraDoResultado: { quantidade: 1, total: 40 } }),
      ...base,
    });
    expect(html).toContain("2 lançamentos ainda sem grupo");
    expect(html).toMatch(/1 lançamento em “Fora do resultado”, somando R\$\s40,00/);
  });
});
