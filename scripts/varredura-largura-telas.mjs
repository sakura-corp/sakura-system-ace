// Varredura de LARGURA nas telas (#425).
//
// Roda com: npm run largura:telas
//
// Abre o app de verdade, visita todas as telas (as mesmas cenas do catálogo e
// da varredura de contraste) e, em cada uma, mede em cinco larguras de
// janela: 1024 (o mínimo que o Electron deixa a janela ficar), 1280, 1366
// (a tela de notebook mais comum, e a do computador do Balcão), 1536 e 1600. Reprova se
// algum conteúdo passar da janela sem dar pra rolar até ele. Cena com
// `semRolarAPartirDe: N` (em cenas.mjs) também reprova, a partir de N de
// largura, se precisar rolar de lado. O que a medição procura está explicado
// em scripts/medir-largura.mjs.
//
// Por que existe: a lista de OS passou meses com "Faturar" e "Fechamento"
// fora da tela em 1366 e ninguém viu, porque as telas sempre foram olhadas
// num monitor largo — inclusive as imagens do catálogo, que são tiradas em
// 1600. Só apareceu na loja (01/10/2026).

import { percorrerTelas } from "../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../site/ferramentas/servidor-telas.mjs";
import { MEDIR_LARGURA } from "./medir-largura.mjs";

// 1536 e 1600 entram por causa da lista de OS, que esconde duas colunas
// abaixo de 1600 (#425): é onde a folga é menor. 1536 é a largura de um
// notebook Full HD com o zoom de 125% do Windows.
const LARGURAS = [1024, 1280, 1366, 1536, 1600];
const ALTURA = 768;

process.exit(await comServidorDeTelas(varrer));

async function varrer() {
  const achados = [];

  const { feitas, falhas } = await percorrerTelas(async (cena, pagina) => {
    const tamanhoOriginal = pagina.viewportSize();
    try {
      for (const largura of LARGURAS) {
        await pagina.setViewportSize({ width: largura, height: ALTURA });
        // Dá tempo pros ResizeObserver da tela (a barra da AreaRolavel, os
        // gráficos) reagirem antes de medir.
        await pagina.waitForTimeout(250);
        const semRolar = cena.semRolarAPartirDe !== undefined && largura >= cena.semRolarAPartirDe;
        for (const achado of await pagina.evaluate(MEDIR_LARGURA, { semRolar })) {
          achados.push({ tela: cena.titulo, largura, ...achado });
        }
      }
    } finally {
      // A próxima cena clica em botões que podem só existir na largura de
      // sempre; voltar evita uma falha que não tem nada a ver com largura.
      await pagina.setViewportSize(tamanhoOriginal);
    }
  });

  // A mesma caixa costuma reprovar em várias larguras, e a mesma linha de
  // tabela em várias telas. O que importa é quantos LUGARES estão errados.
  const grupos = new Map();
  for (const achado of achados) {
    const chave = `${achado.tipo}|${achado.caminho}`;
    const grupo = grupos.get(chave) ?? {
      tipo: achado.tipo,
      caminho: achado.caminho,
      telas: new Map(),
    };
    const larguras = grupo.telas.get(achado.tela) ?? [];
    larguras.push(`${achado.largura} (+${achado.excesso}px)`);
    grupo.telas.set(achado.tela, larguras);
    grupos.set(chave, grupo);
  }

  console.log(`\n${feitas.length} telas percorridas, cada uma em ${LARGURAS.join(", ")} de largura.`);
  if (falhas.length) console.log("telas que falharam:", falhas.map(([a]) => a).join(", "));

  // Tela que falhou é tela que não foi medida — inclusive a lista de OS,
  // que é a razão de esta varredura existir. Passar verde sem medir seria
  // pior que reprovar.
  if (grupos.size === 0) {
    console.log("\nNenhum conteúdo passando da janela.");
    return falhas.length ? 1 : 0;
  }

  console.log(`\nREPROVADO — conteúdo que passa da janela sem dar pra rolar (${grupos.size}):\n`);
  for (const grupo of grupos.values()) {
    console.log(`  ${grupo.tipo}`);
    console.log(`    ${grupo.caminho}`);
    for (const [tela, larguras] of grupo.telas) {
      console.log(`    ${tela}: ${larguras.join(", ")}`);
    }
    console.log("");
  }
  return 1;
}
