/**
 * O menu lateral aberto (ícone e nome) ou encolhido (só o ícone), visual novo
 * (#990, regras: docs/referencia/visual-novo/README.md, seção 7).
 *
 * A escolha é **deste computador**, como o tema (src/lib/tema.ts): fica no
 * `localStorage`, não no banco. O balcão com tela pequena encolhe; o
 * escritório deixa aberto. Sem nada guardado, o menu começa ABERTO: ícone
 * sozinho é mais lento de reconhecer pra quem acabou de chegar no programa.
 */
const CHAVE = "sakura.menu";

export function lerMenuEncolhido(): boolean {
  try {
    return window.localStorage.getItem(CHAVE) === "encolhido";
  } catch {
    return false;
  }
}

export function guardarMenuEncolhido(encolhido: boolean) {
  try {
    window.localStorage.setItem(CHAVE, encolhido ? "encolhido" : "aberto");
  } catch {
    // Computador que não deixa guardar: o menu encolhe assim mesmo, só não é
    // lembrado na próxima vez que o programa abrir.
  }
}
