import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { atualizarLoja, atualizarStatusLoja, criarLoja, excluirLoja } from "@/lib/lojas";
import { mensagemDeErro } from "@/lib/errors";
import {
  lojaFormSchema,
  lojaFormVazio,
  paraNovaLoja,
  paraPatchLoja,
  paraValoresFormulario,
  type LojaFormValues,
} from "@/schemas/loja";
import type { Loja } from "@/types/loja";

interface LojasSectionProps {
  lojas: Loja[];
  operadorCriadorId: string;
  onSalvo: () => Promise<void>;
}

const inputClasse =
  "rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple";

export function LojasSection({ lojas, operadorCriadorId, onSalvo }: LojasSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LojaFormValues>({
    resolver: zodResolver(lojaFormSchema),
    defaultValues: lojaFormVazio,
  });
  const ufField = register("uf");

  async function aoAdicionar(valores: LojaFormValues) {
    setErro(null);
    try {
      await criarLoja(paraNovaLoja(valores), operadorCriadorId);
      reset(lojaFormVazio);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao criar loja:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleAlternarStatus(loja: Loja) {
    try {
      await atualizarStatusLoja(loja.id, !loja.ativo);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao atualizar status da loja:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleExcluir(loja: Loja) {
    if (!confirm(`Excluir a loja "${loja.nome}"? Isso não pode ser desfeito.`)) return;
    setErro(null);
    try {
      await excluirLoja(loja.id);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao excluir loja:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <>
      {erro && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <form onSubmit={handleSubmit(aoAdicionar)} className="mt-4 grid grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Nome da loja"
          {...register("nome")}
          className={`col-span-2 ${inputClasse}`}
        />
        <input
          type="text"
          placeholder="Cidade"
          {...register("cidade")}
          className={inputClasse}
        />
        <input
          type="text"
          placeholder="UF"
          maxLength={2}
          {...ufField}
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
            ufField.onChange(e);
          }}
          className={inputClasse}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-4 rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50 sm:col-span-1 sm:justify-self-end"
        >
          {isSubmitting ? "Salvando..." : "+ Nova loja"}
        </button>
      </form>

      {lojas.length === 0 ? (
        <p className="mt-4 text-corpo text-sakura-muted">Nenhuma loja cadastrada ainda.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {lojas.map((loja) =>
            editandoId === loja.id ? (
              <LinhaEdicaoLoja
                key={loja.id}
                loja={loja}
                onSalvo={async () => {
                  setEditandoId(null);
                  await onSalvo();
                }}
                onErro={setErro}
                onCancelar={() => setEditandoId(null)}
              />
            ) : (
              <span
                key={loja.id}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-rotulo font-medium ${
                  loja.ativo
                    ? "bg-sakura-pink-soft text-sakura-purple-dark"
                    : "bg-sakura-gray/20 text-sakura-muted"
                }`}
              >
                {loja.nome}
                {(loja.cidade || loja.uf) && (
                  <span className="text-sakura-purple-dark/70">
                    · {[loja.cidade, loja.uf].filter(Boolean).join("/")}
                  </span>
                )}
                <button
                  onClick={() => {
                    setErro(null);
                    setEditandoId(loja.id);
                  }}
                  title="Editar loja"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sakura-purple-dark/75 hover:bg-white/10 hover:text-sakura-purple-dark"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleAlternarStatus(loja)}
                  title={loja.ativo ? "Inativar loja" : "Reativar loja"}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sakura-purple-dark/75 hover:bg-white/10 hover:text-sakura-purple-dark"
                >
                  {loja.ativo ? "×" : "↺"}
                </button>
                <button
                  onClick={() => handleExcluir(loja)}
                  title="Excluir loja"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sakura-purple-dark/75 hover:bg-red-500/15 hover:text-red-400"
                >
                  🗑
                </button>
              </span>
            ),
          )}
        </div>
      )}
    </>
  );
}

// Componente à parte de propósito: cada clique em "editar" monta uma
// instância nova (troca de `loja.id` na lista muda o elemento de tipo
// `<span>` pra `<form>`, remontando), então cada uma já nasce com o
// `useForm` preenchido pelos dados daquela loja — sem precisar de `reset()`
// manual toda vez que a usuária troca de loja sendo editada.
function LinhaEdicaoLoja({
  loja,
  onSalvo,
  onErro,
  onCancelar,
}: {
  loja: Loja;
  onSalvo: () => Promise<void>;
  onErro: (mensagem: string) => void;
  onCancelar: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LojaFormValues>({
    resolver: zodResolver(lojaFormSchema),
    defaultValues: paraValoresFormulario(loja),
  });
  const ufField = register("uf");

  async function aoSalvar(valores: LojaFormValues) {
    try {
      await atualizarLoja(loja.id, paraPatchLoja(valores));
      await onSalvo();
    } catch (err) {
      console.error("Erro ao editar loja:", err);
      onErro(mensagemDeErro(err));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(aoSalvar)}
      className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-black/20 px-3 py-1.5"
    >
      <input
        type="text"
        placeholder="Nome da loja"
        autoFocus
        {...register("nome")}
        className="w-28 rounded-lg border border-sakura-borda-campo px-2 py-1 text-rotulo focus:border-sakura-purple"
      />
      <input
        type="text"
        placeholder="Cidade"
        {...register("cidade")}
        className="w-20 rounded-lg border border-sakura-borda-campo px-2 py-1 text-rotulo focus:border-sakura-purple"
      />
      <input
        type="text"
        placeholder="UF"
        maxLength={2}
        {...ufField}
        onChange={(e) => {
          e.target.value = e.target.value.toUpperCase();
          ufField.onChange(e);
        }}
        className="w-12 rounded-lg border border-sakura-borda-campo px-2 py-1 text-rotulo focus:border-sakura-purple"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="text-rotulo font-medium text-sakura-purple hover:underline disabled:opacity-50"
      >
        Salvar
      </button>
      <button
        type="button"
        onClick={onCancelar}
        className="text-rotulo font-medium text-sakura-muted hover:underline"
      >
        Cancelar
      </button>
    </form>
  );
}
