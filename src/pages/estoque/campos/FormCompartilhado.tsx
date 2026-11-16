import { cloneElement, isValidElement, useId } from "react";
import { Explicacao } from "@/components/Explicacao";

/** O campo do visual novo (#990): altura 44, borda de campo, foco laranja. */
export const inputClasse = "sakura-campo";

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-titulo text-corpo font-semibold text-texto">{titulo}</h3>
      {children}
    </section>
  );
}

export function Campo({
  label,
  obrigatorio,
  erro,
  explicacao,
  className,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  erro?: string;
  /**
   * Uma frase dizendo o que é o campo e de onde tirar o valor. Usada nos
   * campos fiscais (item TL-12 do guia): eles são a maior fonte de erro
   * deste sistema — foi um CST no lugar de um CSOSN que derrubou a emissão
   * de nota em 09/09/2026, e o campo parecia preenchido e certo
   * (PROJETO_STATUS.md, seção 6, item 47).
   */
  explicacao?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();

  // Antes o <label> envolvia o campo inteiro, e a ligação entre rótulo e
  // campo era implícita (clicar no rótulo foca o campo). Isso não sobrevive
  // à chegada do "?": `<Explicacao>` é um <button>, e botão dentro de
  // <label> é conteúdo interativo onde o HTML não permite — além de o texto
  // do botão entrar no nome que o leitor de tela anuncia ("NCM ?").
  //
  // Então a ligação passou a ser explícita, por `htmlFor`: o id nasce aqui e
  // é colocado no campo. Vale pros controles deste formulário (input, select,
  // textarea e o Combobox, que já aceita `id`).
  // O campo que a validação recusou ganha `aria-invalid` (a borda vermelha do
  // `sakura-campo` e o leitor de tela); o texto do erro embaixo é quem explica.
  const campo = isValidElement<{ id?: string; "aria-invalid"?: boolean }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        ...(erro ? { "aria-invalid": true } : {}),
      })
    : children;

  return (
    <div className={`flex flex-col gap-1.5 text-corpo ${className ?? ""}`}>
      {/* min-h-6: a altura do "?" da explicação. Sem ela, o rótulo que tem "?" ficava
          mais alto que o que não tem, e os campos da mesma linha desalinhavam. */}
      <div className="flex min-h-6 items-center gap-1.5">
        <label htmlFor={id} className="text-rotulo font-medium text-texto-2">
          {label}
          {obrigatorio && <span className="text-perigo"> *</span>}
        </label>
        {explicacao && <Explicacao titulo={label} texto={explicacao} />}
      </div>
      {campo}
      {erro && <span className="text-rotulo text-perigo">{erro}</span>}
    </div>
  );
}
