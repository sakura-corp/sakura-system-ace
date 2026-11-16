import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { mensagemDeErro } from "@/lib/errors";
import { TelaDeEntrada } from "./TelaDeEntrada";

interface LoginPageProps {
  onConfigurarConexao: () => void;
}

export function LoginPage({ onConfigurarConexao }: LoginPageProps) {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      await login(usuario, senha);
    } catch (err) {
      console.error("Erro ao entrar:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <TelaDeEntrada>
      <div className="sakura-vidro w-full max-w-[26rem] p-8">
        <Logo className="mb-6" />

        <h1 className="text-center font-titulo text-botao-grande font-semibold text-texto">
          Bem-vindo de volta
        </h1>
        <p className="mb-6 text-center text-corpo text-texto-2">Entre com seu usuário para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <p role="alert" className="rounded-xl bg-perigo/15 px-4 py-2 text-corpo text-perigo">
              {erro}
            </p>
          )}

          <label className="sakura-rotulo">
            Usuário
            <input
              type="text"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="sakura-campo"
            />
          </label>

          <label className="sakura-rotulo">
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="sakura-campo"
            />
          </label>

          <Botao type="submit" variante="principal" tamanho="grande" ocupado={entrando} className="w-full">
            {entrando ? "Entrando..." : "Entrar"}
          </Botao>
        </form>

        {/* Fica aqui, e não em Configurações, de propósito: se a conexão
            estiver errada ninguém consegue entrar — então o conserto precisa
            estar acessível de fora do login. */}
        <button
          type="button"
          onClick={onConfigurarConexao}
          className="mx-auto mt-6 block text-rotulo text-texto-2 underline underline-offset-4 hover:text-texto"
        >
          Configurar a conexão
        </button>
      </div>
    </TelaDeEntrada>
  );
}
