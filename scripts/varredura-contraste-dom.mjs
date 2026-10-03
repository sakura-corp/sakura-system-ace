// Varredura de contraste NO DOM RENDERIZADO (item TR-01.3 do guia).
//
// Roda com: npm run contraste:telas
//
// A diferença pro `npm run contraste` (varredura-contraste.mjs) é o que cada
// um consegue enxergar. Aquele lê as strings de `className` do código, então
// é instantâneo e roda a cada push — mas, por construção, só vê fundo e letra
// declarados na MESMA classe. Quando o fundo vem de um card três níveis
// acima, ou é um vidro translúcido, ele não tem como saber, e foi exatamente
// assim que o balão dos gráficos ficou em 1,39:1 por uma migração de tema
// inteira sem ninguém notar (PROJETO_STATUS.md, seção 6, item 17).
//
// Este aqui abre o app de verdade, visita as 54 telas e mede a cor que a
// pessoa realmente enxerga: compõe cada fundo translúcido com o que está
// atrás dele até chegar num opaco. É lento (uns 3 minutos) porque precisa de
// navegador — por isso os dois existem, e não um só.
//
// Não precisa de .env: quem sobe o app com o Supabase de mentira é o
// site/ferramentas/servidor-telas.mjs (o mesmo da varredura de largura).

import { percorrerTelas } from "../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../site/ferramentas/servidor-telas.mjs";
import { MEDIR_CONTRASTE } from "./medir-contraste.mjs";
import {
  DIVIDA_DE_CONTRASTE,
  dividaResolvida,
  ehDividaConhecida,
} from "./divida-de-contraste.mjs";

process.exit(await comServidorDeTelas(varrer));

async function varrer() {
  let saida = 0;
  const achadosPorTela = [];
  const { feitas, falhas } = await percorrerTelas(async (cena, pagina) => {
    const achados = await pagina.evaluate(MEDIR_CONTRASTE);
    for (const achado of achados) achadosPorTela.push({ tela: cena.titulo, ...achado });
  });

  // Muita linha de tabela repete exatamente a mesma combinação de cores. Uma
  // lista com as 400 ocorrências não se lê; o que importa é quantos LUGARES
  // diferentes do código estão errados.
  const grupos = new Map();
  for (const achado of achadosPorTela) {
    const chave = `${achado.tipo}|${achado.caminho}|${achado.frente}|${achado.fundo}`;
    const grupo = grupos.get(chave) ?? { ...achado, telas: new Set(), vezes: 0 };
    grupo.telas.add(achado.tela);
    grupo.vezes += 1;
    grupos.set(chave, grupo);
  }

  const ordenados = [...grupos.values()].sort((a, b) => a.medido - b.medido);
  const novos = ordenados.filter((g) => !ehDividaConhecida(g));
  const conhecidos = ordenados.filter((g) => ehDividaConhecida(g));

  console.log(`\n${feitas.length} telas percorridas.`);
  if (falhas.length) console.log("telas que falharam:", falhas.map(([a]) => a).join(", "));

  function imprimir(lista, titulo) {
    if (lista.length === 0) return;
    console.log(`\n${titulo} (${lista.length}):\n`);
    for (const g of lista) {
      console.log(`  ${g.medido}:1 (mínimo ${g.minimo}:1) — ${g.tipo}`);
      console.log(`    ${g.caminho}`);
      console.log(`    letra ${g.frente} sobre ${g.fundo} · ${g.tamanho} · peso ${g.peso}`);
      if (g.amostra) console.log(`    texto: ${JSON.stringify(g.amostra)}`);
      console.log(`    ${g.vezes}x em: ${[...g.telas].slice(0, 4).join(", ")}${g.telas.size > 4 ? ` (+${g.telas.size - 4})` : ""}`);
      console.log("");
    }
  }

  // A dívida conhecida sai RESUMIDA, uma linha por causa: são 85 combinações
  // reprovadas mas só quatro decisões, e despejar as 85 a cada rodada faria
  // ninguém ler o que importa, que é o bloco de baixo.
  if (conhecidos.length > 0) {
    console.log("\nDívida de contraste conhecida, esperando decisão (não reprova):\n");
    for (const d of DIVIDA_DE_CONTRASTE) {
      const casaram = conhecidos.filter((g) => d.quando(g));
      if (casaram.length === 0) continue;
      const pior = Math.min(...casaram.map((g) => g.medido));
      console.log(`  ${d.id}: ${casaram.length} combinação(ões), pior caso ${pior}:1`);
    }
  }
  imprimir(novos, "REPROVADO — abaixo do mínimo da WCAG 2.2");

  if (novos.length === 0) {
    console.log(
      conhecidos.length === 0
        ? "\nNenhuma reprovação de contraste."
        : "\nNenhuma reprovação NOVA de contraste.",
    );
  } else {
    saida = 1;
  }

  // Mesma disciplina do teste de arquitetura (seção 6, item 49): a lista de
  // dívida encolhe, nunca envelhece. Se uma entrada dela deixou de casar com
  // qualquer coisa, é porque foi corrigida — e aí tem que sair da lista.
  const resolvidos = dividaResolvida(ordenados);
  if (resolvidos.length > 0) {
    console.log("\nEstas entradas da dívida não casam mais com nada — apague-as");
    console.log("de scripts/divida-de-contraste.mjs:\n");
    for (const d of resolvidos) console.log(`  ${d.id}`);
    saida = 1;
  }
  return saida;
}
