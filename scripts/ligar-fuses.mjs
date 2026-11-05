// Os "fuses" do Electron (item TR-04.6 do guia de melhorias).
//
// Rodado pelo electron-builder logo depois de empacotar o app, via
// `build.afterPack` no package.json.
//
// O que um fuse é, em uma frase: uma chavinha gravada dentro do próprio
// executável do Electron, que liga ou desliga um recurso de forma
// definitiva naquele binário — não dá pra mudar por configuração, por
// variável de ambiente nem por argumento de linha de comando.
//
// O que se ganha aqui: sem estas chavinhas, quem tiver o
// `SakuraSystem-Setup.exe` instalado na máquina consegue rodar o executável
// do sistema como se fosse um Node.js comum (`ELECTRON_RUN_AS_NODE=1`), ou
// com o depurador acoplado, e a partir daí ler tudo que o processo
// principal enxerga — inclusive a conexão do banco daquela empresa. O app
// continua abrindo normalmente pra quem usa; o que deixa de existir é esse
// atalho.
//
// **A quinta chavinha, `EnableEmbeddedAsarIntegrityValidation`** (a que
// confere se o `app.asar` foi adulterado), ficou de fora até a #869. Ela só
// funciona quando o empacotador grava o hash do asar dentro do executável
// (o recurso `INTEGRITY/ELECTRONASAR` do .exe, no passo "updating asar
// integrity executable resource", que roda ANTES deste afterPack); se o hash
// não bater, o programa **não abre**, e o estrago só apareceria na loja,
// depois da atualização automática. O electron-builder 25 já gravava esse
// hash, mas com um defeito (#9607 deles, corrigido na 26.8.2): com o cache
// do executável, um build repetido podia gravar o hash de um asar antigo.
// Mexer nas chavinhas aqui não muda o asar, então o hash continua valendo.
// Conferido na #869, no .exe final de `release/win-unpacked`: o hash gravado
// é igual ao do cabeçalho do `app.asar`. **O que só o Windows de verdade
// prova é o programa abrir com ela ligada**: se o instalador do canal de
// teste não abrir, é esta linha que se desliga (e o resto continua igual).

import { flipFuses, FuseVersion, FuseV1Options } from "@electron/fuses";
import path from "node:path";
import fs from "node:fs";

/** @type {(contexto: import("electron-builder").AfterPackContext) => Promise<void>} */
export default async function ligarFuses(contexto) {
  const plataforma = contexto.electronPlatformName;

  // O nome do executável não é o mesmo em toda plataforma, e errar aqui é o
  // jeito fácil de o build quebrar só no dia do lançamento: no Windows (que
  // é o alvo de verdade) e no macOS ele usa o nome de exibição do produto
  // ("Sakura System - AutoCenter Edition"); no Linux, o nome curto do
  // pacote ("sakura-system-autocenter"), que o empacotador entrega em
  // `executableName`.
  const nomeDeExibicao = contexto.packager.appInfo.productFilename;
  const caminho =
    plataforma === "darwin"
      ? path.join(contexto.appOutDir, `${nomeDeExibicao}.app`)
      : plataforma === "win32"
        ? path.join(contexto.appOutDir, `${nomeDeExibicao}.exe`)
        : path.join(contexto.appOutDir, contexto.packager.executableName ?? nomeDeExibicao);

  if (!fs.existsSync(caminho)) {
    // Falhar alto, e não seguir em silêncio: um build que "deu certo" sem
    // as chavinhas entregaria um instalador menos protegido sem ninguém
    // perceber — que é exatamente o tipo de defeito silencioso que este
    // projeto já pagou caro pra aprender a evitar.
    throw new Error(`Não achei o executável para ligar os fuses: ${caminho}`);
  }

  await flipFuses(caminho, {
    version: FuseVersion.V1,
    // Impede rodar o executável do app como um Node.js comum.
    [FuseV1Options.RunAsNode]: false,
    // Impede injetar argumentos de Node por variável de ambiente.
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    // Impede acoplar o depurador (`--inspect`) ao processo principal.
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    // Só carrega o código de dentro do app.asar — sem isso, deixar uma
    // pasta `app/` ao lado do executável substitui o programa inteiro.
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    // Recusa abrir se o `app.asar` não bater com o hash que o
    // electron-builder grava no .exe antes deste afterPack (ver o comentário
    // do topo). Vale no Windows e no macOS; no Linux o Electron não confere.
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    // `resetAdHocDarwinSignature` só vale pra macOS, que este projeto não
    // empacota; fica de fora pra não mexer no que não é usado.
  });

  console.log(`  • fuses do Electron gravados em ${path.basename(caminho)}`);
}
