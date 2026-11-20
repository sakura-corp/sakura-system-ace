export const inputClasse =
  "rounded-lg border border-borda-campo px-3 py-2 focus:border-acao";

export function Campo({
  label,
  obrigatorio,
  erro,
  className,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  erro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 text-corpo ${className ?? ""}`}>
      <span className="text-texto/80">
        {label}
        {obrigatorio && <span className="text-perigo"> *</span>}
      </span>
      {children}
      {erro && <span className="text-rotulo text-perigo">{erro}</span>}
    </label>
  );
}
