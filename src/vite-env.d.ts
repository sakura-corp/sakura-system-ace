/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  sakuraApp?: {
    version: string;
    conexao?: { url: string; chave: string };
    salvarConexao: (conexao: { url: string; chave: string }) => Promise<void>;
    registrarErro?: (mensagem: string) => void;
    // Abre uma conversa no WhatsApp no navegador padrão. Opcional porque
    // o app também roda no navegador (preview/catálogo de telas), onde
    // essa ponte não existe — ver lib/whatsapp.ts.
    abrirWhatsapp?: (url: string) => Promise<boolean>;
    // Tela de Diagnóstico (item TR-08.1). Opcionais pelo mesmo motivo do
    // abrirWhatsapp: fora do Electron essas pontes não existem, e a tela
    // precisa continuar abrindo (mostrando o que conseguir descobrir).
    diagnostico?: () => Promise<{
      versaoApp: string;
      electron: string;
      chromium: string;
      node: string;
      plataforma: string;
      sistema: string;
      arquitetura: string;
      pastaDados: string;
      canalAtualizacao?: "teste" | "normal";
    }>;
    lerLogs?: (linhas: number) => Promise<{ erros: string; atualizacoes: string }>;
    // Canal de atualização deste computador (item TR-09.1). Opcionais pelo
    // mesmo motivo: fora do Electron não há atualização automática nenhuma.
    canalAtualizacao?: () => Promise<"teste" | "normal">;
    definirCanalAtualizacao?: (canal: "teste" | "normal") => Promise<void>;
    // Quem é este computador (migration 0063). Opcional pelo mesmo motivo:
    // fora do Electron não existe "este computador" pra registrar.
    identidadeComputador?: () => Promise<{
      id: string;
      nomeMaquina: string;
      versao: string;
      canal: "teste" | "normal";
      sistema: string;
    }>;
  };
}
