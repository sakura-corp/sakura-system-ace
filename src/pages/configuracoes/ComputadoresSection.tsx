import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { Dica } from "@/components/Dica";
import { Selo } from "@/components/Selo";
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
import { AvisoDeErro } from "@/components/Aviso";

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
      <AvisoDeErro>{erro}</AvisoDeErro>
    ) : (
      <p className="text-corpo text-texto-2">Carregando...</p>
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
        <tr key={computador.id}>
          <td colSpan={5}>
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
      <tr key={computador.id} className={situacao.emUso ? "" : "text-texto-2"}>
        <td>
          <span className={`font-medium ${situacao.emUso ? "text-texto" : "text-texto-2"}`}>
            {nomeDoComputador(computador)}
          </span>
          {computador.id === esteId && (
            <Selo tipo="info" icone={Monitor} palavra="este computador" className="ml-2" />
          )}
          {computador.apelido && computador.nome_maquina && (
            <span className="block text-meta text-texto-2">{computador.nome_maquina}</span>
          )}
        </td>
        <td className="whitespace-nowrap">
          {situacao.maisAntigaQueEste ? (
            <Dica texto={`Mais antiga que a deste computador (${versaoDeste}).`}>
              <span className={destacarVersao ? "font-medium text-texto" : ""}>
                {computador.versao_app}
              </span>
            </Dica>
          ) : (
            <span>{computador.versao_app}</span>
          )}
          {destacarVersao && <Selo tipo="atencao" palavra="mais antiga" className="ml-2" />}
          {computador.canal === "teste" && (
            <Selo tipo="neutro" palavra="canal de teste" className="ml-2" />
          )}
        </td>
        <td>{computador.loja?.nome ?? "—"}</td>
        <td className="whitespace-nowrap">
          <Dica texto={new Date(computador.visto_em).toLocaleString("pt-BR")}>
            <span>{rotuloDeIdade(situacao.diasSemAparecer)}</span>
          </Dica>
          {computador.operador?.nome && (
            <span className="block text-meta text-texto-2">por {computador.operador.nome}</span>
          )}
        </td>
        <td className="text-right">
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
      {erro && <AvisoDeErro className="mb-4">{erro}</AvisoDeErro>}

      <p className="text-corpo text-texto-2">
        Cada computador aparece aqui sozinho, na primeira vez que alguém entra nele numa versão que
        já registra isso. Um computador que ainda não abriu uma versão assim não aparece.
      </p>

      {computadores.length === 0 ? (
        <p className="mt-4 text-corpo text-texto-2">Nenhum computador registrado ainda.</p>
      ) : (
        <>
          <p className="mt-4 text-corpo text-texto">
            {emUso.length === 1
              ? "1 computador em uso"
              : `${emUso.length} computadores em uso`}{" "}
            nos últimos {DIAS_PARA_CONSIDERAR_EM_USO} dias
            {maisAntigos > 0 && versaoDeste && (
              <span className="font-medium text-atencao">
                {" "}
                · {maisAntigos === 1 ? "1 numa versão" : `${maisAntigos} numa versão`} mais antiga
                que a deste computador ({versaoDeste})
              </span>
            )}
            .
          </p>
          {maisAntigos > 0 && (
            <p className="mt-1 text-rotulo text-texto-2">
              Um computador se atualiza sozinho quando o programa é fechado e aberto de novo — e só
              recebe versões liberadas para todas as lojas, a menos que esteja no canal de teste.
            </p>
          )}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-linha">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Computador</th>
                  <th>Versão</th>
                  <th>Loja</th>
                  <th>Última vez</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {emUso.map(linha)}
                {sumidos.length > 0 && (
                  <tr>
                    <td colSpan={5} className="text-rotulo text-texto-2">
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
    <form onSubmit={handleSubmit(aoSalvar)} className="flex flex-wrap items-center gap-2 py-1">
      <label className="text-rotulo text-texto-2" htmlFor={`apelido-${computador.id}`}>
        Apelido de {computador.nome_maquina || "este computador"}:
      </label>
      <input
        id={`apelido-${computador.id}`}
        type="text"
        autoFocus
        placeholder="ex: Balcão, Notebook da Carol"
        {...register("apelido")}
        aria-invalid={errors.apelido ? true : undefined}
        className="sakura-campo sakura-campo-filtro w-64"
      />
      <Botao type="submit" variante="principal" tamanho="pequeno" ocupado={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar"}
      </Botao>
      <Botao variante="fantasma" tamanho="pequeno" onClick={onCancelar}>
        Cancelar
      </Botao>
      {errors.apelido && (
        <p className="w-full text-rotulo text-perigo">{errors.apelido.message}</p>
      )}
      <p className="w-full text-meta text-texto-2">Em branco, volta a aparecer o nome da máquina.</p>
    </form>
  );
}
