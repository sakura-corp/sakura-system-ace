// O aviso que some sozinho (visual novo, #990): "OS 148 faturada", embaixo,
// no meio da tela. Regras: docs/referencia/visual-novo/README.md, seção 6.
//
// Qualquer tela chama `avisar("…")` depois que a ação deu CERTO. Quem desenha
// é o <AvisosQueSomem />, montado uma vez só, no App.
//
// **Só pra confirmação.** Erro não some sozinho: quem estava olhando pro
// cliente perde a mensagem. Erro continua do lado do botão que falhou, com
// `mensagemDeErro()`, até a pessoa resolver.

export interface AvisoQueSome {
  id: number;
  texto: string;
}

/** Tempo na tela: dá pra ler uma frase curta sem ficar no caminho. */
const DURACAO_MS = 4500;
/** Nada cresce sem limite: clicar em dez coisas não empilha dez avisos. */
const MAXIMO_A_VISTA = 3;

let avisos: AvisoQueSome[] = [];
let proximoId = 1;
const relogios = new Map<number, ReturnType<typeof setTimeout>>();
const ouvintes = new Set<() => void>();

function publicar(novos: AvisoQueSome[]) {
  avisos = novos;
  for (const ouvinte of ouvintes) ouvinte();
}

function tirar(id: number) {
  const relogio = relogios.get(id);
  if (relogio) clearTimeout(relogio);
  relogios.delete(id);
  publicar(avisos.filter((a) => a.id !== id));
}

/** Mostra a confirmação de que uma ação deu certo. Some sozinha. */
export function avisar(texto: string): void {
  if (texto.trim() === "") return;
  const id = proximoId++;
  const novos = [...avisos, { id, texto }];
  // Passou do limite: os mais antigos saem já, sem esperar o tempo deles.
  for (const antigo of novos.slice(0, Math.max(0, novos.length - MAXIMO_A_VISTA))) {
    const relogio = relogios.get(antigo.id);
    if (relogio) clearTimeout(relogio);
    relogios.delete(antigo.id);
  }
  publicar(novos.slice(-MAXIMO_A_VISTA));
  relogios.set(
    id,
    setTimeout(() => tirar(id), DURACAO_MS),
  );
}

/** Tira todos de uma vez (ao sair do programa, e entre um teste e outro). */
export function limparAvisos(): void {
  for (const relogio of relogios.values()) clearTimeout(relogio);
  relogios.clear();
  publicar([]);
}

// As duas funções que o `useSyncExternalStore` do React pede.
export function assinarAvisos(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function avisosAtuais(): AvisoQueSome[] {
  return avisos;
}
