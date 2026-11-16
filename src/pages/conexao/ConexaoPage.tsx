import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Logo } from "@/components/Logo";
import { conexaoAtual, salvarConexao, testarConexao } from "@/lib/conexao";
import { mensagemDeErro } from "@/lib/errors";
import { TelaDeEntrada } from "@/pages/login/TelaDeEntrada";

interface ConexaoPageProps {
  // Só existe quando já há uma conexão configurada — na primeira abertura não
  // há pra onde voltar, então o botão não aparece.
  onCancelar?: () => void;
}

export function ConexaoPage({ onCancelar }: ConexaoPageProps) {
  // Só vem preenchido quando a usuária está trocando uma conexão já
  // existente; na primeira abertura os campos nascem vazios de propósito.
  const inicial = conexaoAtual();
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [chave, setChave] = useState(inicial?.chave ?? "");
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [testeOk, setTesteOk] = useState(false);
  const [podeSalvarAssimMesmo, setPodeSalvarAssimMesmo] = useState(false);

  const dadosPreenchidos = url.trim() !== "" && chave.trim() !== "";

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
    <TelaDeEntrada>
      <div className="sakura-vidro w-full max-w-lg p-8">
        <Logo className="mb-6" />

        <h1 className="text-center font-titulo text-botao-grande font-semibold text-texto">
          Conectar ao banco de dados da loja
        </h1>
        <p className="mb-6 text-center text-corpo text-texto-2">
          Só precisa fazer isso uma vez neste computador. Os dois valores abaixo ficam no painel
          do Supabase da sua empresa, em <strong>Project Settings → API Keys</strong>, aba{" "}
          <strong>Legacy anon</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div role="alert" className="space-y-2 rounded-xl bg-perigo/15 px-4 py-3 text-corpo text-perigo">
              <p>{erro}</p>
              {podeSalvarAssimMesmo && (
                <>
                  <p className="text-rotulo">
                    Se você tem certeza de que os dados estão certos, dá pra salvar assim mesmo —
                    esta checagem já errou antes. Se a conexão estiver mesmo errada, é só voltar
                    aqui pelo link na tela de login.
                  </p>
                  <Botao tamanho="pequeno" onClick={gravar} disabled={salvando}>
                    Salvar assim mesmo
                  </Botao>
                </>
              )}
            </div>
          )}

          {testeOk && !erro && (
            <p role="status" className="rounded-xl bg-ok/15 px-4 py-2 text-corpo text-ok">
              Conexão funcionando. Pode salvar.
            </p>
          )}

          <label className="sakura-rotulo">
            Endereço do projeto (URL)
            <input
              type="text"
              value={url}
              onChange={(e) => aoEditar(e.target.value, "url")}
              placeholder="https://xxxxxxxx.supabase.co"
              className="sakura-campo"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="sakura-rotulo">
            Chave pública (anon / publishable)
            <textarea
              value={chave}
              onChange={(e) => aoEditar(e.target.value, "chave")}
              placeholder="Cole aqui a chave anon do seu projeto"
              rows={3}
              className="sakura-campo resize-none font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-texto-2">
              É a chave <strong>anon</strong> (também chamada de publishable) — não a
              <em> service role</em>, que é secreta e não deve ser usada aqui.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {onCancelar && (
              <Botao variante="fantasma" onClick={onCancelar} className="mr-auto">
                Cancelar
              </Botao>
            )}
            <Botao onClick={handleTestar} disabled={!dadosPreenchidos || testando || salvando}>
              {testando ? "Testando..." : "Testar conexão"}
            </Botao>
            <Botao
              type="submit"
              variante="principal"
              disabled={!dadosPreenchidos || testando || salvando}
            >
              {salvando ? "Salvando..." : "Salvar e entrar"}
            </Botao>
          </div>
        </form>
      </div>
    </TelaDeEntrada>
  );
}
