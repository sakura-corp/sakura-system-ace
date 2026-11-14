import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import {
  definirApelidoComputador,
  esquecerComputador,
  listarComputadores,
} from "@/lib/computadores";
import { mensagemDeErro } from "@/lib/errors";
import {
  apelidoComputadorSchema,
  contarMaisAntigos,
  DIAS_PARA_CONSIDERAR_EM_USO,
  nomeDoComputador,
  separarComputadores,
  situacaoDoComputador,
  type ApelidoComputadorValores,
} from "@/schemas/computadores";
import { rotuloDeIdade } from "@/schemas/painelInicio";
import type { Computador } from "@/types/computador";

// "Em que versão está cada computador da empresa?" (migration 0063). Cada
// computador se registra sozinho a cada login — nada aqui é cadastro. O que
// o admin faz é dar um apelido ("Balcão") e esquecer o que não existe mais.
//
// Carrega os próprios dados, como a seção "Atualizações deste computador":
// só busca quando alguém abre a seção (SecaoRecolhivel não monta o conteúdo
// fechado), então não pesa na abertura de Configurações.
export function ComputadoresSection() {
  const [computadores, setComputadores] = useState<Computador[] | null>(null);
  const [esteId, setEsteId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const hoje = new Date();
  const versaoDeste =
    typeof window !== "undefined" ? (window.sakuraApp?.version ?? null) : null;

  async function carregar() {
    try {
      setComputadores(await listarComputadores());
    } catch (err) {
      console.error("Erro ao listar computadores:", err);
      setErro(mensagemDeErro(err));
      setComputadores([]);
    }
  }

  useEffect(() => {
    void carregar();
    window.sakuraApp
      ?.identidadeComputador?.()
      .then((eu) => setEsteId(eu.id))
      .catch(() => {
        // Sem a ponte, só não dá pra marcar "este computador" na lista.
      });
  }, []);

  async function handleEsquecer(computador: Computador) {
    if (
      !confirm(
        `Esquecer "${nomeDoComputador(computador)}"? Ele sai da lista. Se alguém entrar nele de novo, ele volta sozinho.`,
      )
    ) {
      return;
    }
    setErro(null);
    try {
      await esquecerComputador(computador.id);
      await carregar();
    } catch (err) {
      console.error("Erro ao esquecer computador:", err);
      setErro(mensagemDeErro(err));
    }
  }

  if (!computadores) {
    return erro ? (
      <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
    ) : (
      <p className="text-corpo text-sakura-muted">Carregando...</p>
    );
  }

  const { emUso, sumidos } = separarComputadores(computadores, hoje);
  const maisAntigos = contarMaisAntigos(computadores, hoje, versaoDeste);

  function linha(computador: Computador) {
    const situacao = situacaoDoComputador(computador, hoje, versaoDeste);
    // Computador sumido não é "atrasado": ele nem conta como em uso, e pintar
    // de amarelo competiria com os que precisam de atenção de verdade.
    const destacarVersao = situacao.emUso && situacao.maisAntigaQueEste;
    if (editandoId === computador.id) {
      return (
        <tr key={computador.id} className="border-t border-sakura-gray/20">
          <td colSpan={5} className="px-4 py-3">
            <FormularioApelido
              computador={computador}
              onSalvo={async () => {
                setEditandoId(null);
                await carregar();
              }}
              onErro={setErro}
              onCancelar={() => setEditandoId(null)}
            />
          </td>
        </tr>
      );
    }
    return (
      <tr
        key={computador.id}
        className={`border-t border-sakura-gray/20 ${situacao.emUso ? "" : "text-sakura-muted"}`}
      >
        <td className="px-4 py-3">
          <span className="font-medium text-sakura-purple-dark">
            {nomeDoComputador(computador)}
          </span>
          {computador.id === esteId && (
            <span className="ml-2 rounded-full border border-sakura-purple/60 px-2 py-0.5 text-meta text-sakura-purple-dark">
              este computador
            </span>
          )}
          {computador.apelido && computador.nome_maquina && (
            <span className="block text-meta text-sakura-muted">{computador.nome_maquina}</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span
            className={destacarVersao ? "font-medium text-amber-400" : ""}
            title={
              situacao.maisAntigaQueEste
                ? `Mais antiga que a deste computador (${versaoDeste}).`
                : undefined
            }
          >
            {computador.versao_app}
            {destacarVersao && " · mais antiga"}
          </span>
          {computador.canal === "teste" && (
            <span className="ml-2 rounded-full border border-sakura-borda-campo px-2 py-0.5 text-meta text-sakura-muted">
              canal de teste
            </span>
          )}
        </td>
        <td className="px-4 py-3">{computador.loja?.nome ?? "—"}</td>
        <td className="whitespace-nowrap px-4 py-3">
          <span title={new Date(computador.visto_em).toLocaleString("pt-BR")}>
            {rotuloDeIdade(situacao.diasSemAparecer)}
          </span>
          {computador.operador?.nome && (
            <span className="block text-meta text-sakura-muted">
              por {computador.operador.nome}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <AcoesDaLinha
            descricao={`o computador ${nomeDoComputador(computador)}`}
            acoes={[
              {
                tipo: "editar",
                aoClicar: () => {
                  setErro(null);
                  setEditandoId(computador.id);
                },
              },
              {
                tipo: "menu",
                rotulo: "Esquecer este computador",
                perigosa: true,
                aoClicar: () => void handleEsquecer(computador),
              },
            ]}
          />
        </td>
      </tr>
    );
  }

  return (
    <>
      {erro && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}

      <p className="text-corpo text-sakura-muted">
        Cada computador aparece aqui sozinho, na primeira vez que alguém entra nele numa versão que
        já registra isso. Um computador que ainda não abriu uma versão assim não aparece.
      </p>

      {computadores.length === 0 ? (
        <p className="mt-4 text-corpo text-sakura-muted">Nenhum computador registrado ainda.</p>
      ) : (
        <>
          <p className="mt-4 text-corpo text-sakura-purple-dark">
            {emUso.length === 1
              ? "1 computador em uso"
              : `${emUso.length} computadores em uso`}{" "}
            nos últimos {DIAS_PARA_CONSIDERAR_EM_USO} dias
            {maisAntigos > 0 && versaoDeste && (
              <span className="text-amber-400">
                {" "}
                · {maisAntigos === 1 ? "1 numa versão" : `${maisAntigos} numa versão`} mais antiga
                que a deste computador ({versaoDeste})
              </span>
            )}
            .
          </p>
          {maisAntigos > 0 && (
            <p className="mt-1 text-rotulo text-sakura-muted">
              Um computador se atualiza sozinho quando o programa é fechado e aberto de novo — e só
              recebe versões liberadas para todas as lojas, a menos que esteja no canal de teste.
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-corpo">
              <thead className="text-rotulo text-sakura-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Computador</th>
                  <th className="px-4 py-2 font-medium">Versão</th>
                  <th className="px-4 py-2 font-medium">Loja</th>
                  <th className="px-4 py-2 font-medium">Última vez</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {emUso.map(linha)}
                {sumidos.length > 0 && (
                  <tr className="border-t border-sakura-gray/20">
                    <td colSpan={5} className="px-4 pb-1 pt-4 text-rotulo text-sakura-muted">
                      Sem aparecer há {DIAS_PARA_CONSIDERAR_EM_USO} dias ou mais — não contam como
                      em uso. Se não existirem mais, dá pra esquecer.
                    </td>
                  </tr>
                )}
                {sumidos.map(linha)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// Componente à parte pra cada linha em edição nascer com o `useForm` já
// preenchido pelo computador clicado — mesmo padrão de LinhaEdicaoDeposito.
function FormularioApelido({
  computador,
  onSalvo,
  onErro,
  onCancelar,
}: {
  computador: Computador;
  onSalvo: () => Promise<void>;
  onErro: (mensagem: string) => void;
  onCancelar: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<ApelidoComputadorValores>({
    resolver: zodResolver(apelidoComputadorSchema),
    defaultValues: { apelido: computador.apelido ?? "" },
  });

  async function aoSalvar(valores: ApelidoComputadorValores) {
    try {
      await definirApelidoComputador(computador.id, valores.apelido);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao dar apelido ao computador:", err);
      onErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSalvar)} className="flex flex-wrap items-center gap-2">
      <label className="text-rotulo text-sakura-muted" htmlFor={`apelido-${computador.id}`}>
        Apelido de {computador.nome_maquina || "este computador"}:
      </label>
      <input
        id={`apelido-${computador.id}`}
        type="text"
        autoFocus
        placeholder="ex: Balcão, Notebook da Carol"
        {...register("apelido")}
        className="w-64 rounded-lg border border-sakura-borda-campo px-3 py-1.5 text-corpo focus:border-sakura-purple"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-sakura-purple px-4 py-1.5 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Salvando..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={onCancelar}
        className="text-rotulo font-medium text-sakura-muted hover:underline"
      >
        Cancelar
      </button>
      {errors.apelido && (
        <p className="w-full text-rotulo text-red-400">{errors.apelido.message}</p>
      )}
      <p className="w-full text-meta text-sakura-muted">Em branco, volta a aparecer o nome da máquina.</p>
    </form>
  );
}
