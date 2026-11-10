import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  conexaoAtual,
  ehPalavraDemo,
  entrarNaDemonstracao,
  modoDemonstracao,
  salvarConexao,
  testarConexao,
} from "@/lib/conexao";
import { mensagemDeErro } from "@/lib/errors";

interface ConexaoPageProps {
  // Só existe quando já há uma conexão configurada — na primeira abertura não
  // há pra onde voltar, então o botão não aparece.
  onCancelar?: () => void;
}

const inputClasse =
  "rounded-xl border border-sakura-borda-campo bg-black/40 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-sakura-pink focus:ring-1 focus:ring-sakura-pink transition-all";

export function ConexaoPage({ onCancelar }: ConexaoPageProps) {
  // Só vem preenchido quando a usuária está trocando uma conexão já
  // existente; na primeira abertura os campos nascem vazios de propósito.
  // Dentro da demonstração a "conexão atual" é a de mentira: não vai pros campos.
  const inicial = modoDemonstracao() ? null : conexaoAtual();
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [chave, setChave] = useState(inicial?.chave ?? "");
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [testeOk, setTesteOk] = useState(false);
  const [podeSalvarAssimMesmo, setPodeSalvarAssimMesmo] = useState(false);

  // Digitar "demo" no endereço abre a demonstração: não pede chave, não testa
  // nada e não grava nada no computador.
  const demonstracao = ehPalavraDemo(url);
  const dadosPreenchidos = demonstracao || (url.trim() !== "" && chave.trim() !== "");

  function aoEditar(novoValor: string, campo: "url" | "chave") {
    setErro(null);
    setTesteOk(false);
    setPodeSalvarAssimMesmo(false);
    if (campo === "url") setUrl(novoValor);
    else setChave(novoValor);
  }

  async function handleTestar() {
    setErro(null);
    setTesteOk(false);
    setTestando(true);
    try {
      await testarConexao({ url: url.trim(), chave: chave.trim() });
      setTesteOk(true);
    } catch (err) {
      console.error("Erro ao testar conexão:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setTestando(false);
    }
  }

  async function gravar() {
    setSalvando(true);
    try {
      // Não precisa desligar "salvando": o app recarrega inteiro em seguida.
      await salvarConexao({ url: url.trim(), chave: chave.trim() });
    } catch (err) {
      console.error("Erro ao salvar conexão:", err);
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (demonstracao) {
      entrarNaDemonstracao();
      return;
    }
    setSalvando(true);
    try {
      // O teste serve pra pegar erro de digitação antes de cair numa tela de
      // login que nunca funciona — mas é só um aviso, nunca uma tranca: se
      // reprovar, aparece o botão "Salvar assim mesmo". Este teste já errou
      // duas vezes com a chave certa, e ficar preso aqui é bem pior que uma
      // conexão errada, que dá pra corrigir voltando por esta mesma tela.
      await testarConexao({ url: url.trim(), chave: chave.trim() });
    } catch (err) {
      console.error("Erro ao testar conexão:", err);
      setErro(mensagemDeErro(err));
      setPodeSalvarAssimMesmo(true);
      setSalvando(false);
      return;
    }
    await gravar();
  }

  return (
    <div
      className="flex h-screen items-center justify-center overflow-auto bg-cover bg-center"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}sakura-login-bg-premium.png)` }}
    >
      <div className="sakura-card my-8 w-full max-w-lg p-8">
        <div className="mb-6 flex justify-center">
          <Logo className="drop-shadow-sm" />
        </div>

        <h1 className="text-center text-destaque font-semibold text-sakura-purple-dark">
          Conectar ao banco de dados da loja
        </h1>
        <p className="mb-6 text-center text-corpo text-sakura-purple-dark/90">
          Só precisa fazer isso uma vez neste computador. Os dois valores abaixo ficam no painel
          do Supabase da sua empresa, em <strong>Project Settings → API Keys</strong>, aba{" "}
          <strong>Legacy anon</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="space-y-2 rounded-lg bg-red-50/90 px-4 py-3 text-corpo text-red-700">
              <p>{erro}</p>
              {podeSalvarAssimMesmo && (
                <>
                  <p className="text-rotulo">
                    Se você tem certeza de que os dados estão certos, dá pra salvar assim mesmo —
                    esta checagem já errou antes. Se a conexão estiver mesmo errada, é só voltar
                    aqui pelo link na tela de login.
                  </p>
                  <button
                    type="button"
                    onClick={gravar}
                    disabled={salvando}
                    className="rounded-lg border border-red-700/40 px-3 py-1 text-rotulo font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Salvar assim mesmo
                  </button>
                </>
              )}
            </div>
          )}

          {testeOk && !erro && (
            <p className="rounded-lg bg-emerald-50/90 px-4 py-2 text-corpo text-emerald-800">
              Conexão funcionando. Pode salvar.
            </p>
          )}

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/90">Endereço do projeto (URL)</span>
            <input
              type="text"
              value={url}
              onChange={(e) => aoEditar(e.target.value, "url")}
              placeholder="https://xxxxxxxx.supabase.co"
              className={inputClasse}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-rotulo text-sakura-muted">
              Só quer conhecer o sistema? Digite <strong>demo</strong> aqui: abre com dados
              inventados, sem conectar a nenhuma empresa.
            </span>
          </label>

          {!demonstracao && (
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/90">Chave pública (anon / publishable)</span>
              <textarea
                value={chave}
                onChange={(e) => aoEditar(e.target.value, "chave")}
                placeholder="Cole aqui a chave anon do seu projeto"
                rows={3}
                className={`${inputClasse} resize-none font-mono text-rotulo`}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="text-rotulo text-sakura-muted">
                É a chave <strong>anon</strong> (também chamada de publishable) — não a
                <em> service role</em>, que é secreta e não deve ser usada aqui.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {onCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="mr-auto rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
              >
                Cancelar
              </button>
            )}
            {!demonstracao && (
              <button
                type="button"
                onClick={handleTestar}
                disabled={!dadosPreenchidos || testando || salvando}
                className="rounded-xl border border-sakura-purple/60 px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-purple/10 disabled:opacity-50"
              >
                {testando ? "Testando..." : "Testar conexão"}
              </button>
            )}
            <button
              type="submit"
              disabled={!dadosPreenchidos || testando || salvando}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {demonstracao
                ? "Entrar na demonstração"
                : salvando
                  ? "Salvando..."
                  : "Salvar e entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
