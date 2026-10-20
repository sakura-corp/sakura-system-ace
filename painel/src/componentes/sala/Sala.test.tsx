import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../../App";
import type { EstadoDaLeva } from "../../logica/dados";
import type { EstadoDaSala } from "../../logica/salaDados";
import type { SituacaoDoTempoReal } from "../../logica/tempoReal";
import type { EntradaDaSala } from "../../tipos";
import { Sala } from "./Sala";

const AGORA = new Date("2026-10-17T12:00:00Z");
const ha = (min: number) => new Date(AGORA.getTime() - min * 60_000).toISOString();
const REPO = "https://github.com/sakura-corp/sakura-system-ace";

const entradas: EntradaDaSala[] = [
  { id: "pessoa:ana", tipo: "pessoa", nome: "ana", fazendo: "#5 Tarefa", url: `${REPO}/issues/5`, avatar: "https://avatars.githubusercontent.com/u/5", sinais: { tarefaEmAndamento: true } },
  { id: "claude:claude/x", tipo: "claude", nome: "x", fazendo: "#12 Meu PR", url: `${REPO}/pull/12`, ultimaAtividade: ha(30), sinais: { revisaoPedidaA: ["fulana"] } },
  { id: "casa:ci.yml", tipo: "casa", nome: "Conferência", fazendo: "a última rodada falhou", url: `${REPO}/actions/runs/1`, ultimaAtividade: ha(5), sinais: { ultimaRodada: "falhou" } },
  { id: "casa:liberar-versao.yml", tipo: "casa", nome: "Liberar", fazendo: "rodada esperando a sua aprovação", url: `${REPO}/actions/runs/2`, ultimaAtividade: ha(5), sinais: { rodando: true, aprovacaoEsperadaDe: ["fulana"] } },
];
const pronto = (extra: Partial<Extract<EstadoDaSala, { tipo: "pronto" }>> = {}): EstadoDaSala => ({ tipo: "pronto", entradas, falhas: [], leva: 0, ...extra });
const ao = (estado: SituacaoDoTempoReal["estado"], ultimaAtualizacao: number | null): SituacaoDoTempoReal => ({ estado, ultimaAtualizacao });

const html = (dados: EstadoDaSala, conexao: SituacaoDoTempoReal | undefined = ao("aovivo", AGORA.getTime() - 12_000), props: { tv?: boolean } = {}) =>
  renderToString(<Sala dados={dados} quemEstaOlhando="fulana" conexao={conexao} agora={AGORA} {...props} />).replace(/<!-- -->/g, "");

describe("Sala de verdade (#468)", () => {
  it("mostra só os dados recebidos: sem nenhum dos nomes de exemplo", () => {
    const h = html(pronto());
    expect(h).toContain("Conferência");
    expect(h).toContain("Leva 0");
    expect(h).not.toContain("exemplo");
  });

  it("a linha do topo mostra o estado da conexão: ao vivo, reconectando…, desatualizado há N min", () => {
    expect(html(pronto(), ao("aovivo", AGORA.getTime() - 12_000))).toContain("ao vivo · atualizado há 12 s");
    expect(html(pronto(), ao("reconectando", AGORA.getTime() - 30_000))).toContain("reconectando…");
    const velho = html(pronto(), ao("desatualizado", AGORA.getTime() - 5 * 60_000));
    expect(velho).toContain("desatualizado há 5 min");
    expect(velho).not.toContain("ao vivo");
  });

  it("o modo TV tem a mesma linha de conexão", () => {
    expect(html(pronto(), ao("desatualizado", AGORA.getTime() - 3 * 60_000), { tv: true })).toContain("desatualizado há 3 min");
  });

  it("conferência vermelha deixa o robô com erro; rodada esperando a sua aprovação pede você, com o link da rodada", () => {
    const h = html(pronto());
    expect(h).toMatch(/aria-label="Conferência, com erro,/);
    expect(h).toMatch(/aria-label="Liberar, precisa de você,/);
    expect(h).toMatch(/href="https:\/\/github\.com\/sakura-corp\/sakura-system-ace\/actions\/runs\/2"[^>]*>Aprovar no GitHub/);
    expect(h).toMatch(/href="https:\/\/github\.com\/sakura-corp\/sakura-system-ace\/pull\/12"[^>]*>Revisar no GitHub/);
    expect(h).toContain("2 coisas precisam de você");
  });

  it("para outra pessoa olhando, o 'precisa de você' dos outros não aparece", () => {
    const h = renderToString(<Sala dados={pronto()} quemEstaOlhando="outra" conexao={ao("aovivo", null)} agora={AGORA} />);
    expect(h).not.toContain("precisam de você");
    expect(h).not.toContain("precisa de você,");
  });

  it("link fora do GitHub da Sakura vira texto, sem link; os de dentro abrem em aba nova com noopener", () => {
    const h = html(pronto({ entradas: [...entradas, { id: "casa:x.yml", tipo: "casa", nome: "X", url: "https://exemplo.com/aprovar", sinais: {} }] }));
    expect(h).not.toContain('href="https://exemplo.com');
    expect(h).toContain("https://exemplo.com/aprovar (fora do GitHub da Sakura: sem link)");
    const links = [...h.matchAll(/<a class="sala-link"[^>]*>/g)].map((m) => m[0]);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l).toContain('target="_blank" rel="noopener noreferrer"');
  });

  it("a foto do GitHub entra no lugar das iniciais, e só de avatars.githubusercontent.com", () => {
    expect(html(pronto())).toMatch(/<image[^>]*href="https:\/\/avatars\.githubusercontent\.com\/u\/5"/);
    const outra = html(pronto({ entradas: [{ ...entradas[0], avatar: "https://exemplo.com/foto.png" }] }));
    expect(outra).not.toContain("<image");
    expect(outra).toContain(">A<");
  });

  it("grupo que falhou mostra o aviso e o 'Tentar de novo', e não aparece como livre", () => {
    const h = html(pronto({ entradas: entradas.filter((e) => e.tipo !== "casa"), falhas: ["casa"] }));
    expect(h).toContain("Robôs da casa:</strong> não consegui ler isto do GitHub.");
    expect(h).toContain("Tentar de novo");
    expect(h).not.toContain("Nenhum robô da casa");
    expect(h).not.toMatch(/Livres?\s*\(/);
    // os outros grupos continuam mostrando o que se sabe
    expect(h).toContain("Pessoas");
    expect(h).toContain('aria-label="ana,');
  });

  it("grupo que deu certo e está vazio diz que está vazio (diferente de falha)", () => {
    const h = html(pronto({ entradas: entradas.filter((e) => e.tipo !== "claude") }));
    expect(h).toContain("Nenhum robô do Claude agora.");
    expect(h).not.toContain("não consegui ler");
  });

  it("carregando: esqueleto discreto; erro: mensagem clara com 'Tentar de novo'", () => {
    const c = html({ tipo: "carregando" });
    expect(c).toContain("sala-esqueleto");
    expect(c).not.toContain("sala-desenho");
    const e = html({ tipo: "erro", mensagem: "Sem conexão com o painel. Confira a internet." });
    expect(e).toContain("Sem conexão com o painel. Confira a internet.");
    expect(e).toContain("Tentar de novo");
  });

  it("o 'dormindo' sai do relógio recebido, sem buscar nada", () => {
    const velho: EntradaDaSala = { id: "claude:claude/v", tipo: "claude", nome: "v", ultimaAtividade: ha(4 * 24 * 60), sinais: {} };
    const h = html(pronto({ entradas: [velho] }));
    expect(h).toMatch(/aria-label="v, dormindo/);
    const depois = renderToString(<Sala dados={pronto({ entradas: [{ ...velho, ultimaAtividade: ha(10) }] })} quemEstaOlhando="fulana" conexao={ao("aovivo", null)} agora={AGORA} />);
    expect(depois).toMatch(/aria-label="v, trabalhando/);
  });
});

describe("App com a Sala de verdade", () => {
  const leva: EstadoDaLeva = { tipo: "pronto", levas: [{ numero: 0, nome: "Leva 0", abertas: 1 }], atual: 0, leva: { numero: 0, tarefas: [], cortada: false } };
  const usuario = { login: "fulana", avatar: "" };
  const app = (sala: EstadoDaSala, busca = "") =>
    renderToString(<App caminho="/sala" busca={busca} usuario={usuario} leva={leva} sala={sala} />).replace(/<!-- -->/g, "");

  it("logada, a Sala usa o login de quem olha e não traz nada de exemplo", () => {
    const h = app(pronto());
    expect(h).toMatch(/aria-label="Liberar, precisa de você,/);
    expect(h).not.toContain("ana-exemplo");
    expect(h).not.toContain("dados de exemplo");
  });

  it("no modo TV, a linha de conexão também aparece, e sem a barra lateral", () => {
    const h = app(pronto(), "?tv");
    expect(h).toContain("sala-tv");
    expect(h).toContain("reconectando…");
    expect(h).not.toContain('aria-label="Menu do painel"');
  });

  it("sessão acabada na Sala volta pra tela de entrada", () => {
    expect(app({ tipo: "fora" })).toContain("Sua sessão acabou");
  });
});

describe("o relatório da leva chama a Sofia na Sala (#645)", () => {
  const SOFIA = { login: "caranovavidanova", avatar: "" };
  const levaEm = (fase: "relatorio" | "testando"): EstadoDaLeva => ({
    tipo: "pronto", levas: [{ numero: 1, nome: "Leva 1", abertas: 0, fase }], atual: 1, leva: { numero: 1, tarefas: [], cortada: false },
  });
  const app = (fase: "relatorio" | "testando", usuario = SOFIA) =>
    renderToString(<App caminho="/sala" busca="" usuario={usuario} leva={levaEm(fase)} sala={pronto({ entradas: [] })} />).replace(/<!-- -->/g, "");

  it("a página da Sala leva a fase da leva atual até a Sala: a Sofia fica em \"precisa de você\" com o relatório", () => {
    const h = app("relatorio");
    expect(h).toMatch(/aria-label="caranovavidanova, precisa de você, relatório da leva 1"/);
    expect(h).toContain("1 coisa precisa de você");
  });
  it("em outra fase, ou com outra pessoa olhando, ninguém é chamado", () => {
    expect(app("testando")).not.toContain("relatório da leva");
    const outra = app("relatorio", { login: "fulana", avatar: "" });
    expect(outra).toContain("relatório da leva 1");
    expect(outra).not.toMatch(/caranovavidanova, precisa de você/);
  });
});
