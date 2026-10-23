import { describe, expect, it } from "vitest";
import {
  descreverEsquema,
  mascararSegredos,
  montarRelatorio,
  montarResumo,
  nomeDoArquivo,
  ultimasLinhas,
  type Diagnostico,
} from "./diagnostico";

// Credenciais de mentira, mas no formato de verdade — é o formato que a
// máscara reconhece, então testar com "senha123" não provaria nada.
const CHAVE_DO_BANCO = "sb_publishable_ZZnaoPodeVazar_0123456789";
const CHAVE_DA_ANTHROPIC = "sk-ant-api03-NAOPODEVAZAR-0123456789";
const TOKEN_DA_FOCUS = "a1b2c3d4e5f6NAOPODEVAZAR7890";
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.assinaturaNaoPodeVazar";

function diagnosticoDeTeste(parcial: Partial<Diagnostico> = {}): Diagnostico {
  return {
    geradoEm: new Date("2026-09-13T15:00:00Z"),
    fusoDoComputador: "America/Sao_Paulo",
    app: {
      versao: "0.9.35",
      electron: "30.0.1",
      chromium: "124.0.6367.60",
      node: "20.11.1",
      sistema: "Windows 11 Pro (10.0.26100)",
      arquitetura: "x64",
      pastaDados: "C:\\Users\\Loja\\AppData\\Roaming\\Sakura System",
      canalAtualizacao: "teste",
    },
    enderecoDoBanco: "https://exemplo.supabase.co",
    esquema: { estado: "em_dia", versaoBanco: 55, versaoApp: 55, faltando: [] },
    sessao: { usuario: "balcao", nome: "Balconista", admin: false, loja: "Pneus Amigão" },
    checagens: [
      { nome: "Internet", ok: true, detalhe: "respondeu", ms: 120 },
      { nome: "Supabase", ok: false, detalhe: "não respondeu", ms: 10_000 },
    ],
    logs: { erros: "", atualizacoes: "" },
    ...parcial,
  };
}

describe("mascararSegredos", () => {
  it("esconde a chave deste computador, que é a que mais vaza", () => {
    // O caso real: uma requisição que falha carrega a URL inteira, com a
    // chave dentro, direto pro erros.log.
    const linha = `Erro: GET https://x.supabase.co/rest/v1/lojas?apikey=${CHAVE_DO_BANCO} falhou`;
    const saida = mascararSegredos(linha, [CHAVE_DO_BANCO]);
    expect(saida).not.toContain(CHAVE_DO_BANCO);
    expect(saida).toContain("***");
  });

  it("esconde formato conhecido mesmo sem ninguém avisar qual é o segredo", () => {
    const texto = `chave=${CHAVE_DA_ANTHROPIC} e outra ${JWT} e Bearer ${TOKEN_DA_FOCUS}`;
    const saida = mascararSegredos(texto);
    expect(saida).not.toContain(CHAVE_DA_ANTHROPIC);
    expect(saida).not.toContain(JWT);
    expect(saida).not.toContain(TOKEN_DA_FOCUS);
  });

  it("ignora segredo curto demais, que transformaria o registro inteiro em ***", () => {
    // Uma string de 3 letras apareceria no meio de palavra comum. Esconder o
    // problema é pior que não esconder o segredo.
    const saida = mascararSegredos("erro ao abrir a tela de caixa", ["abr"]);
    expect(saida).toBe("erro ao abrir a tela de caixa");
  });

  it("não estraga o registro quando não há segredo nenhum", () => {
    const linha = "[2026-09-13T00:39:00.000Z] Erro na tela: não foi possível salvar";
    expect(mascararSegredos(linha, [CHAVE_DO_BANCO])).toBe(linha);
  });
});

describe("ultimasLinhas", () => {
  it("pega o fim, que é onde está o erro mais recente", () => {
    expect(ultimasLinhas("a\nb\nc\nd", 2)).toEqual(["c", "d"]);
  });

  it("ignora as linhas vazias do fim do arquivo", () => {
    // Todo appendFileSync termina em \n — sem isto, a última linha do
    // relatório seria sempre vazia, e a contagem sairia um a mais.
    expect(ultimasLinhas("a\nb\n", 5)).toEqual(["a", "b"]);
    expect(ultimasLinhas("", 5)).toEqual([]);
  });
});

describe("o pacote que sai da máquina da loja", () => {
  // Esta é a razão de o arquivo existir. O diagnóstico é feito pra ser
  // mandado por WhatsApp: se um dia alguém acrescentar um campo que carregue
  // chave ou token, é aqui que tem que ficar vermelho.
  const comSegredoEmTudo = diagnosticoDeTeste({
    logs: {
      erros: [
        `[2026-09-13T00:39:00.000Z] Erro: apikey=${CHAVE_DO_BANCO} recusada`,
        `[2026-09-13T00:40:00.000Z] Erro: Authorization: Bearer ${TOKEN_DA_FOCUS}`,
        `[2026-09-13T00:41:00.000Z] Erro: ${JWT} expirou`,
      ].join("\n"),
      atualizacoes: `[2026-09-13T00:00:00.000Z] chave ${CHAVE_DA_ANTHROPIC} no ambiente`,
    },
  });

  const segredos = [CHAVE_DO_BANCO, CHAVE_DA_ANTHROPIC, TOKEN_DA_FOCUS, JWT];

  it("o relatório completo não leva credencial nenhuma", () => {
    const mascarado: Diagnostico = {
      ...comSegredoEmTudo,
      logs: {
        erros: mascararSegredos(comSegredoEmTudo.logs.erros, [CHAVE_DO_BANCO]),
        atualizacoes: mascararSegredos(comSegredoEmTudo.logs.atualizacoes, [CHAVE_DO_BANCO]),
      },
    };
    const relatorio = montarRelatorio(mascarado);
    for (const segredo of segredos) {
      expect(relatorio).not.toContain(segredo);
    }
    // E continua servindo pra alguma coisa: o erro em si ficou legível.
    expect(relatorio).toContain("recusada");
    expect(relatorio).toContain("expirou");
  });

  it("o resumo do WhatsApp não leva NENHUMA linha de registro", () => {
    // Diferente do relatório, aqui nem mascarado entra: quem cola isso numa
    // conversa não vai ler o que está colando.
    const resumo = montarResumo(comSegredoEmTudo);
    for (const segredo of segredos) {
      expect(resumo).not.toContain(segredo);
    }
    expect(resumo).not.toContain("recusada");
    expect(resumo).toContain("Erros registrados neste computador: 3");
  });

  it("o endereço do banco aparece, porque é o que identifica a empresa", () => {
    expect(montarResumo(diagnosticoDeTeste())).toContain("https://exemplo.supabase.co");
  });

  it("diz o fuso e a hora local — é o que teria encurtado o bug de data", () => {
    // O §6 item 34 (OS faturada à noite sumindo da lista) levou uma sessão
    // inteira justamente porque ninguém sabia que horas eram na máquina dela.
    const resumo = montarResumo(diagnosticoDeTeste());
    expect(resumo).toContain("America/Sao_Paulo");
  });

  it("diz o canal de atualização junto da versão (item TR-09.1)", () => {
    // Loja no canal de teste pode estar numa versão que as outras ainda não
    // receberam — é a primeira coisa a saber antes de comparar dois relatos.
    expect(montarResumo(diagnosticoDeTeste())).toContain("(canal de atualização: teste)");
  });

  it("mostra as checagens que falharam com o tempo que levaram", () => {
    const resumo = montarResumo(diagnosticoDeTeste());
    expect(resumo).toContain("OK · Internet (120 ms)");
    expect(resumo).toContain("FALHOU · Supabase (10000 ms)");
  });
});

describe("nomeDoArquivo", () => {
  it("carrega a data, pra dois diagnósticos não se sobrescreverem", () => {
    const nome = nomeDoArquivo(diagnosticoDeTeste());
    expect(nome).toMatch(/^diagnostico-sakura-\d{4}-\d{2}-\d{2}-\d{6}\.zip$/);
  });
});

describe("descreverEsquema", () => {
  it("diz em uma linha o que fazer quando o banco está atrás", () => {
    const texto = descreverEsquema({
      estado: "banco_atrasado",
      versaoBanco: 52,
      versaoApp: 55,
      faltando: ["0053", "0054", "0055"],
    });

    expect(texto).toContain("0053, 0054, 0055");
  });

  it("diz que a migration que falta espera os computadores (#757)", () => {
    const texto = descreverEsquema({
      estado: "esperando_computadores",
      versaoBanco: 68,
      versaoApp: 69,
      faltando: ["0069"],
      versaoMinimaDosComputadores: "0.9.54",
    });

    expect(texto).toBe("68 — falta a 0069, que espera os computadores chegarem na 0.9.54");
  });

  it("não inventa número quando não deu pra perguntar", () => {
    // A tela de diagnóstico é justamente onde um número inventado faria o
    // maior estrago: quem lê está tentando descobrir o que está errado.
    const texto = descreverEsquema({
      estado: "desconhecido",
      versaoBanco: null,
      versaoApp: 55,
      faltando: [],
    });

    expect(texto).not.toMatch(/\d/);
  });

  it("entra no resumo que vai pro WhatsApp", () => {
    const resumo = montarResumo(
      diagnosticoDeTeste({
        esquema: {
          estado: "banco_atrasado",
          versaoBanco: 54,
          versaoApp: 55,
          faltando: ["0055"],
        },
      }),
    );

    expect(resumo).toContain("Versão do banco: 54");
    expect(resumo).toContain("0055");
  });
});
