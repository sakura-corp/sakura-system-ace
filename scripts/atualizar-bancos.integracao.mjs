// ===================================================================
// npm run test:atualizar-bancos — o botão de atualizar os bancos contra um
// Postgres DE VERDADE (o teste com psql de mentira é o atualizar-bancos.test.ts)
// ===================================================================
//
// O QUE ISTO PROVA: que o script, rodando exatamente como o workflow roda
// (o mesmo arquivo, o mesmo psql, as migrations REAIS do repositório), faz o
// que promete com banco de verdade:
//
//   1. o ensaio roda as migrations que faltam e DESFAZ — nenhum banco muda;
//   2. um banco cujo DADO faz uma migration falhar é pego no ensaio, e aí o
//      modo aplicar não encosta em banco NENHUM;
//   3. consertado o dado, aplicar leva todos os bancos, cada um da versão em
//      que estava, até a última;
//   4. uma migration que falha no meio é desfeita INTEIRA (a transação vale);
//   5. banco anterior à 0055 é recusado com explicação;
//   6. tabela travada por outra conexão faz a migration desistir em segundos,
//      em vez de ficar esperando e congelar a tela da loja;
//   8. migration que declara "versao-minima-do-programa" espera os
//      computadores em uso atrasados (tabela `computadores`, migration 0063)
//      — e a caixinha "aplicar mesmo assim" passa por cima.
//
// COMO RODAR: igual à matriz de RLS — no CI já roda sozinho; num Linux com
// Postgres local, `service postgresql start` e `npm run test:atualizar-bancos`.
// No Windows não roda, e não precisa.
//
// Cria bancos DESCARTÁVEIS e apaga no fim. Nunca encosta em banco existente.
// ===================================================================

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listarMigrations, scriptDeAplicacao } from "./atualizar-bancos.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const PASTA_REAL = join(RAIZ, "supabase", "migrations");
const STUB = join(RAIZ, "supabase", "scripts", "stub-supabase-local.sql");
const URL_ADMIN = process.env.SAKURA_RLS_URL || "postgres://postgres:postgres@127.0.0.1:5432/postgres";
const PREFIXO = `sakura_atualizar_${process.pid}`;

// Uma "loja" no meio de um lançamento: trava a tabela de clientes e só solta
// depois de 45 segundos. Solta SOZINHA de propósito — se o script esquecer a
// trava de tempo, a conferência reprova ("demorou demais") em vez de o teste
// ficar pendurado pra sempre esperando uma trava que nunca solta.
const SEGURA_A_TRAVA = "begin; lock table clientes in access exclusive mode; select pg_sleep(45); commit;\n";

let falhas = 0;
function conferir(condicao, descricao) {
  if (condicao) console.log(`  ✓ ${descricao}`);
  else {
    falhas++;
    console.log(`  ✗ ${descricao}`);
  }
}

function url(nome) {
  const u = new URL(URL_ADMIN);
  u.pathname = `/${nome}`;
  return u.toString();
}

function psql(banco, args, entrada) {
  return execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", banco, ...args], {
    encoding: "utf8",
    input: entrada,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function valor(banco, sql) {
  return psql(banco, ["-Atc", sql]).trim();
}

/** Encerra a "loja" que segura a trava — do lado do servidor, que é onde a trava mora. */
function soltarTrava(nomeDoBanco, processo) {
  psql(URL_ADMIN, [
    "-Atc",
    `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${nomeDoBanco}' and query like '%pg_sleep(45)%' and pid <> pg_backend_pid()`,
  ]);
  processo.kill();
}

const versao = (banco) => Number(valor(banco, "select coalesce(max(versao), 0) from schema_versao"));

/** Um banco novo, com as migrations reais de 1 até `ate`. */
function criarBanco(sufixo, ate) {
  const nome = `${PREFIXO}_${sufixo}`;
  psql(URL_ADMIN, ["-c", `drop database if exists ${nome}`]);
  psql(URL_ADMIN, ["-c", `create database ${nome}`]);
  const banco = url(nome);
  psql(banco, ["-f", STUB]);
  for (const m of listarMigrations(PASTA_REAL)) {
    if (m.numero > ate) break;
    psql(banco, ["-f", m.caminho]);
  }
  return { nome, banco };
}

/** Roda o script do jeito que o workflow roda. */
function rodarBotao(modo, empresas, pasta, comAtrasados = "false") {
  const r = spawnSync(process.execPath, [join(AQUI, "atualizar-bancos.mjs"), modo, comAtrasados], {
    encoding: "utf8",
    env: {
      ...process.env,
      BACKUP_EMPRESAS: JSON.stringify(empresas.map((e) => ({ nome: e.rotulo, banco: e.banco }))),
      PASTA_MIGRATIONS: pasta,
      GITHUB_STEP_SUMMARY: "",
      GITHUB_ACTIONS: "",
    },
    timeout: 180_000,
  });
  return { codigo: r.status, texto: `${r.stdout}\n${r.stderr}` };
}

// --- Montagem -----------------------------------------------------------------
try {
  psql(URL_ADMIN, ["-Atc", "select 1"]);
} catch (erro) {
  console.error(
    `\nNão consegui falar com o Postgres em ${URL_ADMIN.replace(/:[^:@/]*@/, ":***@")}.\n` +
      "Este teste precisa de um Postgres e do `psql` — roda no CI e num Linux com\n" +
      "Postgres local. No Windows ele não roda, e isso é esperado.\n",
  );
  console.error(String(erro.stderr || erro.message).trim());
  process.exit(1);
}

const reais = listarMigrations(PASTA_REAL);
const ULTIMA_REAL = reais[reais.length - 1].numero;
const NOVA = ULTIMA_REAL + 1;
const pastaTeste = mkdtempSync(join(tmpdir(), "migrations-teste-"));
const criados = [];

try {
  // As migrations reais + uma de mentira, que falha se existir um cliente
  // chamado 'QUEBRA' — o "dado daquela loja" que não deixa a migration passar.
  cpSync(PASTA_REAL, pastaTeste, { recursive: true });
  writeFileSync(
    join(pastaTeste, `${NOVA}_teste_do_botao.sql`),
    [
      "create table if not exists teste_do_botao (id int);",
      "alter table clientes drop constraint if exists ck_teste_do_botao;",
      "alter table clientes add constraint ck_teste_do_botao check (nome <> 'QUEBRA');",
      `insert into schema_versao (versao) values (${NOVA}) on conflict do nothing;`,
      "",
    ].join("\n"),
  );

  // Três empresas, cada uma numa versão; a do meio com o dado problemático.
  console.log("Montando os bancos (as migrations reais, uma por uma)…");
  const penultima = ULTIMA_REAL - 1;
  const a = { ...criarBanco("a", 55), rotulo: "empresa-a" };
  const b = { ...criarBanco("b", penultima), rotulo: "empresa-b" };
  const c = { ...criarBanco("c", ULTIMA_REAL), rotulo: "empresa-c" };
  criados.push(a, b, c);
  psql(b.banco, ["-c", "insert into clientes (nome) values ('QUEBRA')"]);
  const todas = [a, b, c];

  console.log("\n1. Ensaiar com o dado problemático");
  let r = rodarBotao("ensaiar", todas, pastaTeste);
  conferir(r.codigo === 1, "sai com erro (há problema em um banco)");
  const z = (n) => String(n).padStart(4, "0");
  conferir(new RegExp(`empresa-b \\| ${z(penultima)} .*parou na ${z(NOVA)}`).test(r.texto), `aponta a empresa-b parando na ${z(NOVA)}`);
  conferir(/empresa-a \| 0055 .*✅ passaria/.test(r.texto), "a empresa-a passaria");
  conferir(versao(a.banco) === 55 && versao(b.banco) === penultima && versao(c.banco) === ULTIMA_REAL, "nenhum banco mudou de versão");
  conferir(valor(a.banco, "select to_regclass('public.teste_do_botao') is null") === "t", "a tabela da migration não ficou na empresa-a (o ensaio foi desfeito)");

  console.log("\n2. Aplicar com o dado problemático");
  r = rodarBotao("aplicar", todas, pastaTeste);
  conferir(r.codigo === 1, "sai com erro");
  conferir(/Nada foi aplicado em banco nenhum/.test(r.texto), "diz que nada foi aplicado");
  conferir(versao(a.banco) === 55 && versao(c.banco) === ULTIMA_REAL, "nem a empresa-a nem a empresa-c foram tocadas");

  console.log("\n3. Consertar o dado e aplicar");
  psql(b.banco, ["-c", "delete from clientes where nome = 'QUEBRA'"]);
  r = rodarBotao("aplicar", todas, pastaTeste);
  conferir(r.codigo === 0, "sai sem erro");
  conferir(todas.every((e) => versao(e.banco) === NOVA), `os três bancos estão na ${NOVA}`);
  conferir(
    todas.every((e) => valor(e.banco, "select count(*) from pg_constraint where conname = 'ck_teste_do_botao'") === "1"),
    "a trava da migration existe nos três",
  );
  conferir(
    valor(a.banco, `select count(*) from schema_versao where versao between 56 and ${NOVA}`) === String(NOVA - 55),
    "a empresa-a recebeu cada migration que faltava, uma por uma",
  );
  r = rodarBotao("ensaiar", todas, pastaTeste);
  conferir(r.codigo === 0 && /empresa-a \| \d+ \| nada \| ✅ em dia/.test(r.texto), "um novo ensaio vê todos em dia");

  console.log("\n4. Migration que falha no meio é desfeita inteira");
  const quebrada = join(pastaTeste, "quebrada.sql");
  writeFileSync(quebrada, "create table meio_do_caminho (id int);\ninsert into schema_versao (versao) values (99999);\nselect 1/0;\n");
  const aplicacao = spawnSync("psql", ["-X", "-q", "-d", a.banco], {
    input: scriptDeAplicacao({ numero: 99999, arquivo: "quebrada.sql", caminho: quebrada }),
    encoding: "utf8",
  });
  conferir(aplicacao.status !== 0, "o psql sai com erro");
  conferir(valor(a.banco, "select to_regclass('public.meio_do_caminho') is null") === "t", "a tabela criada antes do erro NÃO ficou");
  conferir(valor(a.banco, "select count(*) from schema_versao where versao = 99999") === "0", "a versão NÃO foi registrada");

  console.log("\n5. Banco anterior à 0055");
  const velho = { ...criarBanco("velho", 54), rotulo: "empresa-velha" };
  criados.push(velho);
  r = rodarBotao("ensaiar", [velho], pastaTeste);
  conferir(r.codigo === 1 && /schema_versao.*0055/.test(r.texto), "recusa e explica");

  console.log("\n6. Tabela travada por outra conexão (a loja no meio de um lançamento)");
  writeFileSync(
    join(pastaTeste, `${NOVA + 1}_mexe_em_clientes.sql`),
    `alter table clientes add column if not exists teste_trava int;\ninsert into schema_versao (versao) values (${NOVA + 1}) on conflict do nothing;\n`,
  );
  const segurando = spawn("psql", ["-X", "-q", "-d", c.banco], { stdio: ["pipe", "ignore", "ignore"] });
  segurando.stdin.end(SEGURA_A_TRAVA);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const inicio = Date.now();
  r = rodarBotao("aplicar", [c], pastaTeste);
  const segundos = (Date.now() - inicio) / 1000;
  soltarTrava(c.nome, segurando);
  conferir(r.codigo === 1 && /lock timeout/i.test(r.texto), "desiste com 'lock timeout'");
  conferir(segundos < 40, `desiste em ${segundos.toFixed(0)}s, sem ficar esperando a trava soltar`);
  conferir(versao(c.banco) === NOVA, "o banco ficou como estava");

  // O passo 6 prova a trava de tempo do ENSAIO (é ele que esbarra primeiro).
  // A da APLICAÇÃO só entra em jogo se a tabela for travada entre o ensaio e
  // a aplicação — raro, mas é justamente quando a loja congelaria. Por isso
  // ela é conferida à parte, rodando o script de aplicação direto.
  console.log("\n7. A aplicação também desiste de tabela travada");
  const segurando2 = spawn("psql", ["-X", "-q", "-d", c.banco], { stdio: ["pipe", "ignore", "ignore"] });
  segurando2.stdin.end(SEGURA_A_TRAVA);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const inicio2 = Date.now();
  const direta = spawnSync("psql", ["-X", "-q", "-d", c.banco], {
    input: scriptDeAplicacao(listarMigrations(pastaTeste).find((m) => m.numero === NOVA + 1)),
    encoding: "utf8",
    timeout: 120_000,
  });
  const segundos2 = (Date.now() - inicio2) / 1000;
  soltarTrava(c.nome, segurando2);
  conferir(direta.status !== 0 && /lock timeout/i.test(direta.stderr), "desiste com 'lock timeout'");
  conferir(segundos2 < 40, `desiste em ${segundos2.toFixed(0)}s`);

  console.log("\n8. Migration que exige versão mínima espera os computadores atrasados");
  // Pasta própria: só as reais + uma que declara a versão mínima. Assim o
  // passo não depende do que os passos anteriores deixaram na outra pasta.
  const pastaVersao = mkdtempSync(join(tmpdir(), "migrations-versao-"));
  try {
    cpSync(PASTA_REAL, pastaVersao, { recursive: true });
    // Uma que não exige nada e, atrás dela, uma que exige (#760): a primeira
    // tem que entrar mesmo com a segunda esperando os computadores.
    writeFileSync(
      join(pastaVersao, `${NOVA}_sem_exigencia.sql`),
      [
        "create table if not exists teste_antes_da_exigencia (id int);",
        `insert into schema_versao (versao) values (${NOVA}) on conflict do nothing;`,
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(pastaVersao, `${NOVA + 1}_exige_versao.sql`),
      [
        "-- Migration de teste: aperta uma regra que a versão anterior usava.",
        "-- versao-minima-do-programa: 0.9.50",
        "create table if not exists teste_versao_minima (id int);",
        `insert into schema_versao (versao) values (${NOVA + 1}) on conflict do nothing;`,
        "",
      ].join("\n"),
    );
    const d = { ...criarBanco("d", ULTIMA_REAL), rotulo: "empresa-d" };
    criados.push(d);
    // Como o registrar_computador() gravaria — direto, como dono do banco.
    psql(d.banco, [
      "-c",
      "insert into computadores (id, nome_maquina, apelido, versao_app, visto_em) values " +
        "(gen_random_uuid(), 'DESKTOP-BALCAO', 'Balcão', '0.9.50', now()), " +
        "(gen_random_uuid(), 'DESKTOP-FUNDOS', null, '0.9.49', now() - interval '2 days'), " +
        "(gen_random_uuid(), 'NOTEBOOK-VELHO', null, '0.9.10', now() - interval '40 days')",
    ]);

    r = rodarBotao("ensaiar", [d], pastaVersao);
    conferir(
      r.codigo === 0 && new RegExp(`✅ ${String(NOVA).padStart(4, "0")} passaria; ⏸ ${String(NOVA + 1).padStart(4, "0")} espera 1 computador abaixo da 0\\.9\\.50`).test(r.texto),
      "o ensaio diz o que passaria e o que espera 1 computador",
    );
    conferir(/DESKTOP-FUNDOS \(0\.9\.49, visto há 2 dias\)/.test(r.texto), "e diz qual é, com a versão e quando foi visto");
    conferir(!/NOTEBOOK-VELHO/.test(r.texto), "o computador sumido há 40 dias não entra na conta");

    r = rodarBotao("aplicar", [d], pastaVersao);
    conferir(r.codigo === 0 && /parte ficou esperando os computadores/.test(r.texto), "aplicar aplica a parte que pode e diz que o resto espera");
    conferir(versao(d.banco) === NOVA, `o banco parou na ${NOVA}, antes da que espera`);

    r = rodarBotao("aplicar", [d], pastaVersao, "true");
    conferir(r.codigo === 0 && /seguindo mesmo assim, como pedido/.test(r.texto), "com a caixinha marcada, aplica e diz que seguiu mesmo assim");
    conferir(versao(d.banco) === NOVA + 1, `o banco chegou na ${NOVA + 1}`);

    const e = { ...criarBanco("e", ULTIMA_REAL), rotulo: "empresa-e" };
    criados.push(e);
    psql(e.banco, ["-c", "insert into computadores (id, versao_app) values (gen_random_uuid(), '0.9.51')"]);
    r = rodarBotao("aplicar", [e], pastaVersao);
    conferir(r.codigo === 0 && versao(e.banco) === NOVA + 1, "com todos os computadores em dia, aplica tudo sem precisar de nada");
  } finally {
    rmSync(pastaVersao, { recursive: true, force: true });
  }
} catch (erro) {
  falhas++;
  console.error("\nO teste quebrou antes de terminar:");
  console.error(String(erro.stderr || erro.stack || erro).trim());
} finally {
  for (const { nome } of criados) {
    try {
      psql(URL_ADMIN, ["-c", `drop database if exists ${nome} with (force)`]);
    } catch {
      // melhor esforço
    }
  }
  rmSync(pastaTeste, { recursive: true, force: true });
}

if (falhas > 0) {
  console.error(`\n${falhas} conferência(s) falharam.`);
  process.exit(1);
}
console.log("\nTudo certo: o botão faz o que promete num Postgres de verdade.");
