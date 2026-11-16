import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { trocarSenhaPropria } from "@/lib/auth";
import { mensagemDeErro } from "@/lib/errors";
import { confirmarTrocaSenha } from "@/lib/operadores";
import { TelaDeEntrada } from "./TelaDeEntrada";

const TAMANHO_MINIMO_SENHA = 6;

// Tela cheia, bloqueante — aparece no lugar do app normal quando
// `operador.deve_trocar_senha` está true (depois de um admin redefinir a
// senha de alguém em Configurações → Operadores, ver PROJETO_STATUS.md).
// Sem isso, a senha temporária gerada pelo admin viraria a senha definitiva.
export function TrocarSenhaPage() {
  const { recarregarOperador, logout } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
      setErro(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("As duas senhas digitadas são diferentes.");
      return;
    }

    setSalvando(true);
    try {
      await trocarSenhaPropria(novaSenha);
      await confirmarTrocaSenha();
      await recarregarOperador();
    } catch (err) {
      console.error("Erro ao trocar senha:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <TelaDeEntrada>
      <div className="sakura-vidro w-full max-w-[26rem] p-8">
        <Logo className="mb-6" />

        <h1 className="text-center font-titulo text-botao-grande font-semibold text-texto">
          Crie uma senha nova
        </h1>
        <p className="mb-6 text-center text-corpo text-texto-2">
          Sua senha foi redefinida por um administrador. Escolha uma senha nova pra continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <p role="alert" className="rounded-xl bg-perigo/15 px-4 py-2 text-corpo text-perigo">
              {erro}
            </p>
          )}

          <label className="sakura-rotulo">
            Nova senha
            <input
              type="password"
              autoFocus
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="sakura-campo"
            />
          </label>

          <label className="sakura-rotulo">
            Confirmar nova senha
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className="sakura-campo"
            />
          </label>

          <Botao type="submit" variante="principal" tamanho="grande" ocupado={salvando} className="w-full">
            {salvando ? "Salvando..." : "Salvar nova senha e entrar"}
          </Botao>

          <Botao variante="fantasma" tamanho="grande" onClick={() => logout()} className="w-full">
            Sair
          </Botao>
        </form>
      </div>
    </TelaDeEntrada>
  );
}
