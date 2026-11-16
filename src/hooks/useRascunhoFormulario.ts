import { useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReset, UseFormWatch } from "react-hook-form";

const INTERVALO_AUTOSAVE_MS = 30_000;

// Cópia de segurança local (localStorage) do que já foi digitado num
// formulário — não é um "salvar" de verdade (não manda nada pro banco, não
// mexe no botão de Salvar), só uma rede de segurança pra oferecer de volta
// caso o app feche/recarregue no meio do preenchimento. Salva a cada 30s
// enquanto o formulário estiver aberto.
export function useRascunhoFormulario<T extends FieldValues>(
  chave: string,
  watch: UseFormWatch<T>,
): { salvarAgora: () => void } {
  const valoresRef = useRef<T | null>(null);
  const iniciaisRef = useRef<string | null>(null);

  useEffect(() => {
    // Retrato do formulário recém-aberto: serve pra não gravar rascunho de uma
    // tela que foi só aberta e olhada, sem ninguém digitar nada — senão a
    // faixa "restaurar rascunho?" apareceria à toa na próxima abertura.
    iniciaisRef.current = JSON.stringify(watch());
    const inscricao = watch((valores) => {
      valoresRef.current = valores as T;
    });
    return () => inscricao.unsubscribe();
  }, [watch]);

  // Grava o retrato do formulário no localStorage, a não ser que nada tenha
  // mudado desde a abertura.
  function gravar(valores: T) {
    const conteudo = JSON.stringify(valores);
    if (conteudo === iniciaisRef.current) return;
    try {
      localStorage.setItem(chave, conteudo);
    } catch {
      // localStorage indisponível/cheio — autosave é só conveniência, não trava o app
    }
  }

  // O intervalo chama sempre a versão mais nova de `gravar` (que enxerga a
  // chave atual) sem precisar recriar o relógio a cada renderização.
  const gravarRef = useRef(gravar);
  gravarRef.current = gravar;

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (!valoresRef.current) return;
      gravarRef.current(valoresRef.current);
    }, INTERVALO_AUTOSAVE_MS);
    return () => clearInterval(intervalo);
  }, [chave]);

  // Salva na hora, sem esperar os 30 s: usado quando a rede cai no meio do
  // "Salvar" e a pessoa pode fechar o programa antes do próximo autosave. Lê
  // `watch()` agora, porque o ref do watch pode estar um passo atrás.
  function salvarAgora() {
    gravarRef.current(watch());
  }

  return { salvarAgora };
}

export function lerRascunhoFormulario<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

export function limparRascunhoFormulario(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    // idem — não crítico
  }
}

// Junta as três peças que todo formulário com rascunho precisa: ligar o
// autosave, lembrar se havia um rascunho quando a tela abriu, e oferecer
// restaurar/descartar. Devolve `limpar` pro formulário chamar depois de um
// salvamento bem sucedido (aí o rascunho não serve mais pra nada).
export function useRascunho<T extends FieldValues>(
  chave: string,
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>,
): {
  rascunho: T | null;
  restaurar: () => void;
  descartar: () => void;
  limpar: () => void;
  salvarAgora: () => void;
} {
  const [rascunho, setRascunho] = useState(() => lerRascunhoFormulario<T>(chave));
  const { salvarAgora } = useRascunhoFormulario(chave, watch);

  function restaurar() {
    if (!rascunho) return;
    reset(rascunho);
    setRascunho(null);
  }

  function descartar() {
    limparRascunhoFormulario(chave);
    setRascunho(null);
  }

  function limpar() {
    limparRascunhoFormulario(chave);
    setRascunho(null);
  }

  // `rascunho` só é lido ao montar: salvar agora não faz a faixa "restaurar"
  // aparecer no formulário aberto, só ao reabrir.
  return { rascunho, restaurar, descartar, limpar, salvarAgora };
}
