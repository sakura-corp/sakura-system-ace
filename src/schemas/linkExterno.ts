// Quais links de dentro do app podem abrir no navegador do computador.
//
// O Electron nega toda janela nova (electron/main.ts, setWindowOpenHandler):
// uma janela sem barra de endereço é o jeito mais fácil de passar um site
// qualquer por "tela do sistema". Mas o recibo da NFS-e de prefeituras do
// Giap (Araraquara) tem um link legítimo pro documento oficial, hospedado no
// portal da prefeitura (#773), e ele ficava mudo ao clicar.
//
// Lista de permissão, não de proibição (mesmo motivo do `whatsapp:abrir`):
// `shell.openExternal` obedece esquemas bem além de http, e o link vem do XML
// da nota. Só https e só o portal do Giap; o resto continua negado.
const DOMINIO_GIAP = ".giap.com.br";

export function podeAbrirNoNavegador(url: string): boolean {
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return false;
  }
  if (endereco.protocol !== "https:") return false;
  if (endereco.username || endereco.password) return false;
  return endereco.hostname.endsWith(DOMINIO_GIAP);
}
