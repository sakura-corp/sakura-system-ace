import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { buscarOperadorAtual, entrar, sair } from "@/lib/auth";
import { listarLojasDoOperador } from "@/lib/lojas";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Loja } from "@/types/loja";
import type { Operador } from "@/types/operador";

const CHAVE_LOJA_ATIVA = "sakura_loja_ativa_id";

interface AuthContextValue {
  carregando: boolean;
  session: Session | null;
  operador: Operador | null;
  /**
   * Buscar o perfil do operador deu erro (rede, banco fora): o login existe,
   * mas o perfil não veio. Diferente de "sem cadastro", que não é erro (#752).
   */
  perfilFalhou: boolean;
  /** Busca o perfil de novo, sem fechar o programa (o "Tentar de novo"). */
  tentarCarregarPerfil: () => void;
  lojaAtual: Loja | null;
  lojasDisponiveis: Loja[];
  definirLojaAtual: (lojaId: string) => void;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  recarregarOperador: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [operador, setOperador] = useState<Operador | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [perfilFalhou, setPerfilFalhou] = useState(false);
  // Mudar este número roda o efeito de novo: é o "Tentar de novo" (#752).
  const [tentativa, setTentativa] = useState(0);
  const [lojasDisponiveis, setLojasDisponiveis] = useState<Loja[]>([]);
  const [lojaAtual, setLojaAtual] = useState<Loja | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }

    let ativo = true;

    // Cobre tanto a sessão inicial (ao abrir o app) quanto qualquer mudança
    // depois (login, logout, token renovado) com o mesmo fluxo, sempre
    // mantendo "carregando" até o perfil do operador (e as lojas dele)
    // estarem prontos — evita um instante em que a sessão já existe mas o
    // perfil ainda não, o que faria as telas piscarem "sem permissão" por um
    // instante.
    async function processarSessao(novaSessao: Session | null) {
      setSession(novaSessao);
      setPerfilFalhou(false);
      if (!novaSessao) {
        setOperador(null);
        setLojasDisponiveis([]);
        setLojaAtual(null);
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const perfil = await buscarOperadorAtual(novaSessao.user.id);
        if (!ativo) return;
        setOperador(perfil);

        const lojas = perfil ? await listarLojasDoOperador(perfil.id) : [];
        if (!ativo) return;
        setLojasDisponiveis(lojas);

        const idSalvo = window.localStorage.getItem(CHAVE_LOJA_ATIVA);
        const lojaSalva = lojas.find((loja) => loja.id === idSalvo);
        setLojaAtual(lojaSalva ?? lojas[0] ?? null);
      } catch (err) {
        console.error("Erro ao carregar perfil do operador:", err);
        if (ativo) {
          setPerfilFalhou(true);
          setOperador(null);
          setLojasDisponiveis([]);
          setLojaAtual(null);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (ativo) processarSessao(data.session);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange(
      (_evento, novaSessao) => {
        processarSessao(novaSessao);
      },
    );

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, [tentativa]);

  function definirLojaAtual(lojaId: string) {
    const loja = lojasDisponiveis.find((l) => l.id === lojaId);
    if (!loja) return;
    setLojaAtual(loja);
    window.localStorage.setItem(CHAVE_LOJA_ATIVA, loja.id);
  }

  async function login(usuario: string, senha: string) {
    await entrar(usuario, senha);
  }

  async function logout() {
    await sair();
  }

  // Recarrega só o perfil do operador logado — usado depois de confirmar a
  // troca de senha obrigatória, pra `deve_trocar_senha` sair de `true` sem
  // precisar deslogar e logar de novo.
  async function recarregarOperador() {
    if (!session) return;
    const perfil = await buscarOperadorAtual(session.user.id);
    setOperador(perfil);
  }

  return (
    <AuthContext.Provider
      value={{
        carregando,
        session,
        operador,
        perfilFalhou,
        tentarCarregarPerfil: () => setTentativa((n) => n + 1),
        lojaAtual,
        lojasDisponiveis,
        definirLojaAtual,
        login,
        logout,
        recarregarOperador,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider");
  }
  return contexto;
}
