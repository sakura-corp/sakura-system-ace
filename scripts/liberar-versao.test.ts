// A promessa deste teste em uma frase: NUNCA liberar pras lojas uma versão
// que elas não conseguiriam instalar.
//
// Liberar é o passo que leva uma versão até loja de outra empresa. O jeito de
// ele dar errado não dá erro na hora: libera uma publicação pela metade (o
// estrago da v0.9.38) ou um anúncio que promete um instalador diferente do
// que está lá, e cada loja descobre sozinha, na próxima vez que abrir o
// programa. Por isso o teste cobre muito mais o "recusou e não mexeu em nada"
// do que o caminho feliz.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANUNCIO,
  ENDERECO_ANTIGO,
  ENDERECO_DAS_VERSOES,
  INSTALADOR,
  compararVersoes,
  lerAnuncio,
  liberarNosEnderecos,
  liberarVersao,
  normalizarTag,
  // @ts-expect-error — script utilitário em .mjs puro, sem tipos
} from "./liberar-versao.mjs";

interface ReleaseFalsa {
  tag: string;
  isDraft?: boolean;
  isPrerelease: boolean;
  isLatest?: boolean;
  /** Conteúdo de cada arquivo publicado. */
  arquivos: Record<string, Buffer>;
}

function instalador(versao: string): Buffer {
  return Buffer.from(`instalador de mentira da ${versao}`);
}

function anuncio(versao: string, conteudoDoInstalador: Buffer, caminho = INSTALADOR): Buffer {
  const sha = createHash("sha512").update(conteudoDoInstalador).digest("base64");
  return Buffer.from(
    [
      `version: ${versao}`,
      "files:",
      `  - url: ${caminho}`,
      `    sha512: ${sha}`,
      `    size: ${conteudoDoInstalador.length}`,
      `path: ${caminho}`,
      `sha512: ${sha}`,
      "releaseDate: '2026-09-25T12:00:00.000Z'",
      "",
    ].join("\n"),
  );
}

/** Uma release publicada direitinho pelo workflow Release. */
function publicada(versao: string, preLancamento: boolean): ReleaseFalsa {
  const exe = instalador(versao);
  return {
    tag: `v${versao}`,
    isPrerelease: preLancamento,
    arquivos: { [INSTALADOR]: exe, [ANUNCIO]: anuncio(versao, exe) },
  };
}

/**
 * O GitHub de mentira: um `gh` que entende os quatro comandos que o script
 * usa, e o site público que responde o que o GitHub de verdade responderia.
 * Guarda cada `release edit` feito, pra provar que as recusas não mexeram em
 * nada.
 */
function githubFalso(releases: ReleaseFalsa[], opcoes: { siteParado?: boolean } = {}) {
  const edicoes: string[][] = [];
  const achar = (tag: string) => releases.find((r) => r.tag === tag);

  function maisRecente(): ReleaseFalsa | undefined {
    return (
      releases.find((r) => r.isLatest && !r.isPrerelease && !r.isDraft) ??
      [...releases]
        .filter((r) => !r.isPrerelease && !r.isDraft)
        .sort((a, b) => compararVersoes(b.tag, a.tag))[0]
    );
  }
  // O "site parado" simula o GitHub respondendo a versão antiga pra sempre.
  const congelada = maisRecente();

  async function gh(args: string[]): Promise<string> {
    const [grupo, comando, tag] = args;
    if (grupo !== "release") throw new Error(`gh de mentira não sabe: ${args.join(" ")}`);
    if (comando === "view") {
      const r = achar(tag);
      if (!r) throw new Error("release not found");
      return JSON.stringify({
        tagName: r.tag,
        isDraft: Boolean(r.isDraft),
        isPrerelease: r.isPrerelease,
        assets: Object.entries(r.arquivos).map(([name, conteudo]) => ({
          name,
          size: conteudo.length,
        })),
      });
    }
    if (comando === "download") {
      const r = achar(tag);
      if (!r) throw new Error("release not found");
      const pasta = args[args.indexOf("-D") + 1];
      const nomes = args.flatMap((a, i) => (args[i - 1] === "-p" ? [a] : []));
      for (const nome of nomes) {
        if (!r.arquivos[nome]) throw new Error(`no asset matches ${nome}`);
        await writeFile(path.join(pasta, nome), r.arquivos[nome]);
      }
      return "";
    }
    if (comando === "list") {
      return JSON.stringify(
        releases.map((r) => ({
          tagName: r.tag,
          isDraft: Boolean(r.isDraft),
          isPrerelease: r.isPrerelease,
        })),
      );
    }
    if (comando === "edit") {
      edicoes.push(args.slice(2));
      const r = achar(tag);
      if (!r) throw new Error("release not found");
      if (args.includes("--prerelease=false")) r.isPrerelease = false;
      else if (args.includes("--prerelease")) r.isPrerelease = true;
      if (args.includes("--latest")) {
        for (const outra of releases) outra.isLatest = false;
        r.isLatest = true;
      }
      return "";
    }
    throw new Error(`gh de mentira não sabe: ${args.join(" ")}`);
  }

  async function publico(url: string): Promise<{ status: number; texto: string }> {
    const atual = opcoes.siteParado ? congelada : maisRecente();
    if (!atual) return { status: 404, texto: "" };
    if (url.endsWith("/releases/latest")) {
      return { status: 200, texto: JSON.stringify({ tag_name: atual.tag }) };
    }
    if (url.endsWith(`/releases/latest/download/${ANUNCIO}`)) {
      const arquivo = atual.arquivos[ANUNCIO];
      return arquivo ? { status: 200, texto: arquivo.toString("utf8") } : { status: 404, texto: "" };
    }
    return { status: 404, texto: "" };
  }

  const dependencias = {
    gh,
    publico,
    repositorio: "dono/repo",
    esperar: async () => {},
    log: () => {},
  };
  return { dependencias, edicoes, achar };
}

describe("normalizarTag", () => {
  it("aceita o número do jeito que ela digitar", () => {
    expect(normalizarTag("v0.9.40")).toBe("v0.9.40");
    expect(normalizarTag("0.9.40")).toBe("v0.9.40");
    expect(normalizarTag("  v0.9.40 ")).toBe("v0.9.40");
  });

  it("recusa o que não é número de versão", () => {
    for (const ruim of ["", "0.9", "latest", "v0.9.40-beta", "v0.9.40 e v0.9.41", undefined]) {
      expect(() => normalizarTag(ruim)).toThrow(/não é um número de versão/);
    }
  });
});

describe("compararVersoes", () => {
  it("compara como número, não como texto", () => {
    expect(compararVersoes("v0.9.10", "v0.9.9")).toBeGreaterThan(0);
    expect(compararVersoes("v0.10.0", "v0.9.40")).toBeGreaterThan(0);
    expect(compararVersoes("v0.9.40", "v0.9.40")).toBe(0);
    expect(compararVersoes("v0.9.39", "v0.9.40")).toBeLessThan(0);
  });

  it("tag que não é versão nunca é a mais nova", () => {
    expect(compararVersoes("site-antigo", "v0.0.1")).toBeLessThan(0);
  });
});

describe("lerAnuncio", () => {
  it("lê as chaves de cima do latest.yml, e não as de dentro de files", () => {
    const lido = lerAnuncio(anuncio("0.9.40", instalador("0.9.40")).toString("utf8"));
    expect(lido.version).toBe("0.9.40");
    expect(lido.path).toBe(INSTALADOR);
    expect(lido.sha512).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("tira aspas e aguenta quebra de linha do Windows", () => {
    expect(lerAnuncio("version: '0.9.40'\r\npath: \"x.exe\"\r\n")).toEqual({
      version: "0.9.40",
      path: "x.exe",
      sha512: undefined,
    });
  });
});

describe("liberarVersao — o caminho feliz", () => {
  it("tira a marca de teste, declara a mais recente e confere de fora", async () => {
    const github = githubFalso([publicada("0.9.41", true), publicada("0.9.40", false)]);
    const resultado = await liberarVersao("0.9.41", github.dependencias);
    expect(resultado).toEqual({ tag: "v0.9.41", devolvidasAoTeste: [] });
    expect(github.achar("v0.9.41")).toMatchObject({ isPrerelease: false, isLatest: true });
    expect(github.edicoes).toEqual([["v0.9.41", "--prerelease=false", "--latest"]]);
  });

  it("liberar de novo a mesma versão não estraga nada", async () => {
    const github = githubFalso([publicada("0.9.41", false), publicada("0.9.40", false)]);
    await liberarVersao("v0.9.41", github.dependencias);
    await liberarVersao("v0.9.41", github.dependencias);
    expect(github.achar("v0.9.41")).toMatchObject({ isPrerelease: false, isLatest: true });
  });

  it("pode pular versões que ficaram só no teste", async () => {
    const github = githubFalso([
      publicada("0.9.43", true),
      publicada("0.9.42", true),
      publicada("0.9.41", true),
      publicada("0.9.40", false),
    ]);
    await liberarVersao("v0.9.43", github.dependencias);
    // As do meio continuam no teste: ninguém do canal normal precisa delas.
    expect(github.achar("v0.9.42")?.isPrerelease).toBe(true);
    expect(github.achar("v0.9.41")?.isPrerelease).toBe(true);
  });
});

describe("liberarVersao — voltar atrás", () => {
  it("liberar a anterior devolve a mais nova ao canal de teste", async () => {
    const ruim = { ...publicada("0.9.42", false), isLatest: true };
    const github = githubFalso([ruim, publicada("0.9.41", false), publicada("0.9.40", false)]);
    const resultado = await liberarVersao("v0.9.41", github.dependencias);
    expect(resultado.devolvidasAoTeste).toEqual(["v0.9.42"]);
    expect(github.achar("v0.9.41")).toMatchObject({ isPrerelease: false, isLatest: true });
    expect(github.achar("v0.9.42")?.isPrerelease).toBe(true);
    // Primeiro a boa vira a mais recente, SÓ DEPOIS a ruim sai — em nenhum
    // instante o GitHub fica sem versão liberada pra responder.
    expect(github.edicoes.map((e) => e[0])).toEqual(["v0.9.41", "v0.9.42"]);
  });
});

describe("liberarVersao — recusa, e recusar é não mexer em nada", () => {
  async function recusa(releases: ReleaseFalsa[], pedido: string, motivo: RegExp) {
    const github = githubFalso(releases);
    await expect(liberarVersao(pedido, github.dependencias)).rejects.toThrow(motivo);
    expect(github.edicoes).toEqual([]);
  }

  it("versão que não existe", async () => {
    await recusa([publicada("0.9.40", false)], "v0.9.99", /Não achei a versão v0\.9\.99/);
  });

  it("rascunho", async () => {
    await recusa(
      [{ ...publicada("0.9.41", true), isDraft: true }],
      "v0.9.41",
      /rascunho/,
    );
  });

  it("publicação pela metade: sem o latest.yml (o caso da v0.9.38)", async () => {
    const metade = publicada("0.9.41", true);
    delete metade.arquivos[ANUNCIO];
    await recusa([metade, publicada("0.9.40", false)], "v0.9.41", /sem o latest\.yml/);
  });

  it("publicação pela metade: sem o instalador", async () => {
    const metade = publicada("0.9.41", true);
    delete metade.arquivos[INSTALADOR];
    await recusa([metade], "v0.9.41", /sem o SakuraSystem-Setup\.exe/);
  });

  it("instalador vazio", async () => {
    const vazio = publicada("0.9.41", true);
    vazio.arquivos[INSTALADOR] = Buffer.alloc(0);
    await recusa([vazio], "v0.9.41", /pela metade/);
  });

  it("anúncio de outra versão", async () => {
    const trocado = publicada("0.9.41", true);
    trocado.arquivos[ANUNCIO] = anuncio("0.9.40", trocado.arquivos[INSTALADOR]);
    await recusa([trocado], "v0.9.41", /anuncia a versão "0\.9\.40"/);
  });

  it("anúncio apontando pra outro arquivo", async () => {
    const trocado = publicada("0.9.41", true);
    trocado.arquivos[ANUNCIO] = anuncio("0.9.41", trocado.arquivos[INSTALADOR], "Outro.exe");
    await recusa([trocado], "v0.9.41", /aponta para "Outro\.exe"/);
  });

  it("instalador que subiu cortado (impressão digital não bate)", async () => {
    const cortado = publicada("0.9.41", true);
    cortado.arquivos[INSTALADOR] = cortado.arquivos[INSTALADOR].subarray(0, 10);
    await recusa([cortado], "v0.9.41", /impressão digital/);
  });

  it("número digitado errado", async () => {
    await recusa([publicada("0.9.41", true)], "0.9", /não é um número de versão/);
  });
});

describe("liberarVersao — a conferência de fora", () => {
  it("se o GitHub não passa a responder a versão nova, o job fica vermelho", async () => {
    const github = githubFalso([publicada("0.9.41", true), publicada("0.9.40", false)], {
      siteParado: true,
    });
    await expect(liberarVersao("v0.9.41", github.dependencias)).rejects.toThrow(
      /ainda não responde ela \(mais recente = v0\.9\.40/,
    );
  });
});

// Desde a 0.9.51 a mesma versão mora em dois endereços: o novo (onde o
// programa procura) e o antigo (onde os computadores até a 0.9.50 procuram).
describe("liberarNosEnderecos — os dois endereços", () => {
  function destinos(novo: ReleaseFalsa[], antigo: ReleaseFalsa[]) {
    const githubNovo = githubFalso(novo);
    const githubAntigo = githubFalso(antigo);
    return {
      githubNovo,
      githubAntigo,
      lista: [
        { ...githubNovo.dependencias, repositorio: "dono/novo", obrigatorio: true },
        { ...githubAntigo.dependencias, repositorio: "dono/antigo", obrigatorio: false },
      ],
    };
  }

  it("libera nos dois quando a versão está nos dois", async () => {
    const { githubNovo, githubAntigo, lista } = destinos(
      [publicada("0.9.51", true)],
      [publicada("0.9.51", true), publicada("0.9.50", false)],
    );
    const resultados = await liberarNosEnderecos("v0.9.51", lista);
    expect(resultados.map((r: { repositorio: string }) => r.repositorio)).toEqual([
      "dono/novo",
      "dono/antigo",
    ]);
    expect(githubNovo.achar("v0.9.51")).toMatchObject({ isPrerelease: false, isLatest: true });
    expect(githubAntigo.achar("v0.9.51")).toMatchObject({ isPrerelease: false, isLatest: true });
  });

  it("pula o antigo quando a versão não foi pra lá", async () => {
    const { githubAntigo, lista } = destinos(
      [publicada("0.9.52", true), publicada("0.9.51", false)],
      [publicada("0.9.51", false)],
    );
    const resultados = await liberarNosEnderecos("v0.9.52", lista);
    expect(resultados).toHaveLength(1);
    expect(githubAntigo.edicoes).toEqual([]);
  });

  it("se o novo recusa, o antigo nem é tocado", async () => {
    // Voltar pra uma versão de antes da mudança: ela só existe no antigo.
    const { githubAntigo, lista } = destinos(
      [publicada("0.9.51", false)],
      [publicada("0.9.51", false), publicada("0.9.50", false)],
    );
    await expect(liberarNosEnderecos("v0.9.50", lista)).rejects.toThrow(
      /Não achei a versão v0\.9\.50 em dono\/novo/,
    );
    expect(githubAntigo.edicoes).toEqual([]);
  });

  it("falha de rede no antigo é erro, e não pulo calado", async () => {
    const { lista } = destinos([publicada("0.9.51", true)], [publicada("0.9.51", true)]);
    lista[1].gh = async () => {
      throw new Error("connection reset by peer");
    };
    await expect(liberarNosEnderecos("v0.9.51", lista)).rejects.toThrow(/connection reset/);
  });
});

// As travas do lado dos workflows. São verificação de texto, e não de
// comportamento — o comportamento do GitHub não dá pra rodar aqui —, mas
// pegam o esquecimento mais provável: alguém "simplificar" o Release e tirar a
// marca de pré-lançamento, fazendo toda versão nova chegar em todas as lojas
// de novo sem ninguém ter decidido isso.
describe("workflows", () => {
  const ler = (nome: string) =>
    readFileSync(new URL(`../.github/workflows/${nome}`, import.meta.url), "utf8");

  it("o Release publica no canal de teste (pré-lançamento)", () => {
    expect(ler("release.yml")).toMatch(/gh release create [^\n]*--prerelease/);
  });

  // Com gatilho de tag, quem tem escrita publicaria só enviando uma `v*`,
  // sem passar pela aprovação dela (a tag roda fora da `main`, e o cofre
  // recusaria — mas o certo é nem disparar).
  it("o Release só roda na mão, nunca por push de tag", () => {
    const release = ler("release.yml");
    expect(release).toMatch(/workflow_dispatch:/);
    expect(release).not.toMatch(/^\s*(push|schedule|pull_request):/m);
  });

  it("o Liberar só roda na mão, com a versão digitada, e usa este script", () => {
    const liberar = ler("liberar-versao.yml");
    expect(liberar).toMatch(/workflow_dispatch:/);
    expect(liberar).not.toMatch(/^\s*(push|schedule|pull_request):/m);
    expect(liberar).toMatch(/node scripts\/liberar-versao\.mjs/);
  });

  // O cofre é o que segura os secrets e a aprovação dela. Um workflow sem a
  // linha `environment:` não quebra nada à vista: só passa a rodar sem trava.
  it("Release, Liberar e Atualizar bancos rodam no cofre lojas, e o backup no cofre backup", () => {
    expect(ler("release.yml")).toMatch(/^\s+environment: lojas$/m);
    expect(ler("liberar-versao.yml")).toMatch(/^\s+environment: lojas$/m);
    expect(ler("atualizar-bancos.yml")).toMatch(/^\s+environment: lojas$/m);
    expect(ler("backup-banco.yml")).toMatch(/^\s+environment: backup$/m);
  });

  // O endereço onde o programa procura atualização, o do Release e o do
  // Liberar têm que ser o mesmo. Se um mudar sozinho, a versão vai pra um
  // lugar e os computadores procuram em outro, sem erro nenhum à vista.
  it("o programa procura atualização onde o Release e o Liberar publicam", () => {
    const pacote = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    const { owner, repo } = pacote.build.publish;
    expect(`${owner}/${repo}`).toBe(ENDERECO_DAS_VERSOES);
    const release = ler("release.yml");
    expect(release).toMatch(new RegExp(`^\\s+ENDERECO_DAS_VERSOES: ${ENDERECO_DAS_VERSOES}$`, "m"));
    expect(release).toMatch(new RegExp(`^\\s+ENDERECO_ANTIGO: ${ENDERECO_ANTIGO}$`, "m"));
  });

  // O novo primeiro: se ele falhar, o antigo nem recebe, e computador antigo
  // não instala uma versão que procura atualização num endereço vazio.
  it("o Release publica primeiro no endereço novo, com a chave do cofre", () => {
    const release = ler("release.yml");
    const novo = release.indexOf('publicar_em "$ENDERECO_DAS_VERSOES" "$TOKEN_VERSOES"');
    const antigo = release.indexOf('publicar_em "$ENDERECO_ANTIGO" "$TOKEN_DO_CODIGO"');
    expect(novo).toBeGreaterThan(-1);
    expect(antigo).toBeGreaterThan(novo);
    expect(release).toMatch(/TOKEN_VERSOES: \$\{\{ secrets\.TOKEN_VERSOES \}\}/);
    expect(ler("liberar-versao.yml")).toMatch(/TOKEN_VERSOES: \$\{\{ secrets\.TOKEN_VERSOES \}\}/);
  });

  // A trava inteira depende disto: a chave do repositório de versões só pode
  // aparecer em workflow que roda no cofre `lojas` (só a `main`, com a
  // aprovação dela). Em qualquer outro, quem tem escrita no código rodaria
  // uma cópia modificada na própria branch e publicaria sem passar por ela.
  it("a chave TOKEN_VERSOES só aparece em workflow do cofre lojas", () => {
    const pasta = new URL("../.github/workflows/", import.meta.url);
    const comChave = readdirSync(pasta).filter((nome) =>
      /secrets\.TOKEN_VERSOES/.test(ler(nome)),
    );
    expect(comChave.sort()).toEqual(["liberar-versao.yml", "release.yml"]);
    for (const nome of comChave) {
      expect(ler(nome)).toMatch(/^\s+environment: lojas$/m);
    }
  });
});
