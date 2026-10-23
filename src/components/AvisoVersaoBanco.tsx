import type { SituacaoEsquema } from "@/schemas/versaoEsquema";

interface AvisoVersaoBancoProps {
  situacao: SituacaoEsquema;
}

// A faixa do item TR-05.7: aparece no topo de qualquer tela quando o programa
// e o banco desta empresa não estão na mesma versão.
//
// Ela é para QUALQUER operador, não só pro admin — quem vai topar com o erro
// é quem está no balcão, e "some uma tela do nada" sem explicação é o que
// gera o telefonema. O texto diz o que está acontecendo e quem resolve.
//
// Nunca bloqueia: o sistema inteiro continua funcionando, e na maioria das
// telas nem há diferença. Travar por causa disso seria transformar um
// descompasso de meia hora em loja parada (item 33 da seção 6).
//
// Só texto dentro da faixa, nada de campo de formulário: `globals.css` força
// letra branca em todo input, e aqui o fundo é claro (item 47 da seção 6).
export function AvisoVersaoBanco({ situacao }: AvisoVersaoBancoProps) {
  // "esperando_computadores" (#757): a migration que falta sobe depois da
  // versão, de propósito. Avisar seria assustar a loja por dias sem motivo.
  if (
    situacao.estado === "em_dia" ||
    situacao.estado === "desconhecido" ||
    situacao.estado === "esperando_computadores"
  ) {
    return null;
  }

  if (situacao.estado === "app_atrasado") {
    return (
      <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
        <p className="font-semibold">
          O banco desta empresa já recebeu uma atualização que este computador ainda não tem.
        </p>
        <p className="mt-1 text-rotulo">
          Não é erro, e dá pra continuar trabalhando. Feche e abra o programa: ele se atualiza
          sozinho ao abrir. Se depois de duas aberturas continuar aparecendo, avise quem cuida do
          sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
      <p className="font-semibold">
        O programa foi atualizado, mas o banco desta empresa ainda não.
      </p>
      <p className="mt-1 text-rotulo">
        Dá pra continuar trabalhando normalmente — mas, se alguma tela reclamar que “uma coluna
        não existe”, é por causa disto, e não é defeito do que você fez.
      </p>
      <p className="mt-2 text-rotulo text-amber-900">
        Quem cuida do sistema precisa abrir o painel do Supabase desta empresa → SQL Editor → New
        query, e rodar, na ordem, os arquivos que começam com{" "}
        <span className="font-semibold">{situacao.faltando.join(", ")}</span> da pasta{" "}
        <span className="font-semibold">supabase/migrations</span>.
      </p>
    </div>
  );
}
