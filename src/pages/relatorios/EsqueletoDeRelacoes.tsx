/**
 * O lugar de Relações enquanto os dados chegam: cartões da altura dos de
 * verdade (resumo, os dois gráficos do mês, e os blocos de baixo), pra tela não
 * pular quando eles aparecem. Só barras apagadas; o leitor de tela ouve uma
 * frase.
 */
function Barra({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-linha-forte motion-reduce:animate-none ${className}`} />;
}

function CartaoEmBranco({ altura, className = "" }: { altura: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`sakura-card min-w-0 p-6 ${altura} ${className}`.trim()}>
      <Barra className="h-3 w-1/5" />
      <Barra className="mt-3 h-5 w-3/5" />
    </div>
  );
}

export function EsqueletoDeRelacoes() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <p className="sr-only">Carregando as relações...</p>
      <div aria-hidden="true" className="grid grid-cols-12 gap-6">
        <CartaoEmBranco altura="h-60" className="col-span-12 xl:col-span-8" />
        <div className="col-span-12 grid grid-cols-3 gap-6 xl:col-span-4 xl:grid-cols-1">
          <CartaoEmBranco altura="h-28" />
          <CartaoEmBranco altura="h-28" />
          <CartaoEmBranco altura="h-28" />
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-12 gap-6">
        <CartaoEmBranco altura="h-[26rem]" className="col-span-12 xl:col-span-6" />
        <CartaoEmBranco altura="h-[26rem]" className="col-span-12 xl:col-span-6" />
      </div>
      <CartaoEmBranco altura="h-[22rem]" />
      <CartaoEmBranco altura="h-[26rem]" />
      <CartaoEmBranco altura="h-[30rem]" />
      <CartaoEmBranco altura="h-[26rem]" />
    </div>
  );
}
