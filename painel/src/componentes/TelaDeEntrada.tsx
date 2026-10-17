import { LogIn } from "lucide-react";

type Props = {
  /** Mensagem de erro (conta de fora, login que falhou), ou nada. */
  erro?: string | null;
  /** Enquanto confere se já tem alguém logado. */
  carregando?: boolean;
  /** A página pra voltar depois de entrar (ex.: "/sala?tv"). */
  volta?: string;
};

/** A tela de quem ainda não entrou (#353): limpa, só com o botão do GitHub. */
export function TelaDeEntrada({ erro, carregando = false, volta = "/" }: Props) {
  const destino = volta === "/" ? "/api/login" : `/api/login?volta=${encodeURIComponent(volta)}`;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-borda bg-cartao p-8 text-center">
        <p className="text-sm font-medium text-texto-2">Sakura Corp</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Painel da Sakura Corp</h1>

        {carregando ? (
          <p className="mt-8 text-sm text-texto-2" role="status">
            Conferindo o login…
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-texto-2">Entre com a sua conta do GitHub. Só quem é da Sakura Corp entra.</p>
            {erro && (
              <p role="alert" className="mt-6 rounded-lg border border-borda bg-revisao-fundo px-3 py-2 text-sm text-revisao">
                {erro}
              </p>
            )}
            <a
              href={destino}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-destaque px-4 py-2.5 text-sm font-medium text-sobre-destaque hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
            >
              <LogIn aria-hidden="true" className="size-4" />
              Entrar com o GitHub
            </a>
          </>
        )}
      </div>
    </main>
  );
}
