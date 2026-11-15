import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Valor, Variacao } from "./Valor";

/**
 * A promessa deste componente cabe numa frase: **prejuízo tem que parecer
 * prejuízo**. Então a frase virou teste.
 *
 * O motivo é concreto e recente: a primeira versão recebia a cor do número
 * junto com o tamanho, no mesmo `className`. Com `text-red-400` e
 * `text-sakura-purple-dark` no mesmo elemento, quem vence é a classe que o
 * Tailwind escreveu por último **no CSS gerado** — e o prejuízo saiu na tela
 * com a cor de sempre. Leitura de código não pegou; renderizar pegou.
 *
 * Não dá pra testar precedência de CSS aqui (não há navegador), mas dá pra
 * testar o que a causa: duas cores de texto no mesmo elemento.
 */

function classesDe(html: string): string[] {
  return [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
}

describe("Valor", () => {
  it("marca o negativo com cor, seta e sinal — não só com a cor", () => {
    const html = renderToStaticMarkup(<Valor valor={-8368} />);
    expect(html).toContain("text-perigo");
    expect(html).toContain("▼");
    expect(html).toContain("−");
    expect(html).toContain("8.368,00");
  });

  it("não deixa duas cores de texto brigando no mesmo elemento", () => {
    for (const valor of [-8368, 8368, 0]) {
      const cores = classesDe(renderToStaticMarkup(<Valor valor={valor} />)).filter((c) =>
        /^text-(?!metrica|titulo|destaque|subtitulo|corpo|tabela|rotulo|meta|left|right|center)/.test(
          c,
        ),
      );
      expect(cores, `valor ${valor} saiu com ${cores.join(" + ")}`).toHaveLength(1);
    }
  });

  it("o positivo sai com a cor normal, sem seta", () => {
    const html = renderToStaticMarkup(<Valor valor={1200} />);
    expect(html).toContain("text-texto");
    expect(html).not.toContain("text-perigo");
    expect(html).not.toContain("▼");
  });
});

describe("Variacao", () => {
  it("some quando não há com o que comparar", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={null} subirEBom comparadoCom="o mês passado" />,
    );
    expect(html).toBe("");
  });

  it("subir é verde quando subir é bom", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={12} subirEBom comparadoCom="o mês passado" />,
    );
    expect(html).toContain("text-ok");
    expect(html).toContain("+12%");
  });

  it("subir é vermelho quando subir é ruim — custo não sobe em verde", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={30} subirEBom={false} comparadoCom="o mês passado" />,
    );
    expect(html).toContain("text-perigo");
  });

  it("não escreve porcentagem absurda — acima do teto vira 'mais de'", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={99900} subirEBom comparadoCom="o mês passado" />,
    );
    // O número exato continua acessível, no balãozinho do mouse...
    expect(html).toContain("+99900% comparado com o mês passado");
    // ...mas não é ele que aparece escrito na tela.
    const visivel = html.replace(/\s+title="[^"]*"/g, "");
    expect(visivel).toContain("mais de ");
    expect(visivel).toContain("+999%");
    expect(visivel).not.toContain("99900");
  });

  it("cair é verde quando o que caiu foi custo", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={-30} subirEBom={false} comparadoCom="o mês passado" />,
    );
    expect(html).toContain("text-ok");
    expect(html).toContain("−30%");
  });

  // Visual novo (#990, regra 4): a cor nunca avisa sozinha. A seta diz pra
  // que lado foi, e o texto diz com o que se compara.
  it("tem uma seta desenhada (ícone), que o leitor de tela pula: o sinal já está no número", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={12} subirEBom comparadoCom="o mês passado" />,
    );
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain("lucide-arrow-up");
  });

  it("com `contra`, escreve com o que compara ao lado do número", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={12} subirEBom comparadoCom="o mesmo período do mês passado" contra="outubro" />,
    );
    const visivel = html.replace(/\s+title="[^"]*"/g, "").replace(/<[^>]+>/g, "");
    expect(visivel).toContain("contra outubro");
  });

  it("sem `contra`, não inventa texto nenhum", () => {
    const html = renderToStaticMarkup(
      <Variacao percentual={12} subirEBom comparadoCom="o mês passado" />,
    );
    expect(html.replace(/\s+title="[^"]*"/g, "")).not.toContain("contra");
  });
});
