import { contextBridge, ipcRenderer } from "electron";

// `process.env.npm_package_version` só existe quando o processo é lançado
// via `npm run ...` (ex: `npm run dev`) — no app instalado (aberto direto
// pelo `.exe`, sem `npm` por trás), essa variável nunca existe, e a versão
// nunca aparecia na tela. `SAKURA_APP_VERSION` é setada por `electron/main.ts`
// a partir de `app.getVersion()`, que funciona nos dois casos.
contextBridge.exposeInMainWorld("sakuraApp", {
  version: process.env.SAKURA_APP_VERSION,
  // Conexão com o Supabase escolhida neste computador (ver o bloco sobre
  // "conexao.json" em main.ts). Vem como valor pronto, não como função, porque
  // o cliente do Supabase precisa dela de imediato — IPC seria assíncrono
  // demais pra esse momento. `undefined` significa "ainda não configurado".
  conexao:
    process.env.SAKURA_SUPABASE_URL && process.env.SAKURA_SUPABASE_ANON_KEY
      ? {
          url: process.env.SAKURA_SUPABASE_URL,
          chave: process.env.SAKURA_SUPABASE_ANON_KEY,
        }
      : undefined,
  salvarConexao: (conexao: { url: string; chave: string }) =>
    ipcRenderer.invoke("conexao:salvar", conexao),
  // Abre uma conversa no WhatsApp no navegador padrão (item FN-03). O
  // processo principal confere que a URL é mesmo do wa.me antes de entregar
  // pro sistema operacional — ver o handler "whatsapp:abrir" em main.ts.
  // Devolve `false` quando a URL não passa na checagem.
  abrirWhatsapp: (url: string): Promise<boolean> => ipcRenderer.invoke("whatsapp:abrir", url),
  // Manda um erro da tela pro processo principal gravar em "erros.log" (na
  // pasta de dados do app). É de mão única (`send`, não `invoke`): quem
  // reporta erro não precisa de resposta, e se o log falhar não faz sentido
  // atrapalhar quem está usando o sistema.
  registrarErro: (mensagem: string) => ipcRenderer.send("log:erroDaTela", mensagem),
  // O que só o processo principal enxerga: versões do Electron/Chromium, o
  // sistema operacional e onde ficam os arquivos do app. Usado pela tela de
  // Diagnóstico (item TR-08.1) — ver os handlers em main.ts.
  diagnostico: () => ipcRenderer.invoke("diagnostico:info"),
  // As últimas linhas de "erros.log" e "atualizacoes.log". Sem isto, socorrer
  // uma loja é pedir pra pessoa do balcão achar arquivo dentro de %APPDATA%.
  lerLogs: (linhas: number) => ipcRenderer.invoke("diagnostico:logs", linhas),
  // Por qual canal este computador recebe versão nova — "teste" (assim que
  // sai) ou "normal" (só depois de liberada). Item TR-09.1; a regra está em
  // src/schemas/canalAtualizacao.ts e os handlers em main.ts.
  canalAtualizacao: () => ipcRenderer.invoke("atualizacao:canal"),
  definirCanalAtualizacao: (canal: string) =>
    ipcRenderer.invoke("atualizacao:definirCanal", canal),
  // Quem é este computador, e em que versão ele está (migration 0063). A
  // tela manda isso ao banco a cada login — ver src/lib/computadores.ts.
  identidadeComputador: () => ipcRenderer.invoke("computador:identidade"),
});
