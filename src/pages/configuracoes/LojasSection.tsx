import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Power, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { Selo } from "@/components/Selo";
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
import { BotaoDeLista, MensagemDeErro } from "./pecas";

interface LojasSectionProps {
  lojas: Loja[];
  operadorCriadorId: string;
  onSalvo: () => Promise<void>;
}

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
      {erro && <MensagemDeErro className="mt-4">{erro}</MensagemDeErro>}

      <form
        onSubmit={handleSubmit(aoAdicionar)}
        className="mt-5 grid gap-3 sm:grid-cols-[2fr_1.2fr_5rem_auto] sm:items-end"
      >
        <label className="sakura-rotulo">
          Nome da loja
          <input
            type="text"
            placeholder="Ex: Loja Centro"
            {...register("nome")}
            className="sakura-campo"
          />
        </label>
        <label className="sakura-rotulo">
          Cidade
          <input
            type="text"
            placeholder="Ex: Araraquara"
            {...register("cidade")}
            className="sakura-campo"
          />
        </label>
        <label className="sakura-rotulo">
          UF
          <input
            type="text"
            placeholder="SP"
            maxLength={2}
            {...ufField}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
              ufField.onChange(e);
            }}
            className="sakura-campo"
          />
        </label>
        <Botao type="submit" ocupado={isSubmitting} className="h-11">
          {isSubmitting ? "Salvando..." : "+ Nova loja"}
        </Botao>
      </form>

      {lojas.length === 0 ? (
        <p className="mt-4 text-corpo text-texto-2">Nenhuma loja cadastrada ainda.</p>
      ) : (
        <ul className="mt-5 divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
          {lojas.map((loja) => (
            <li key={loja.id} className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
              {editandoId === loja.id ? (
                <LinhaEdicaoLoja
                  loja={loja}
                  onSalvo={async () => {
                    setEditandoId(null);
                    await onSalvo();
                  }}
                  onErro={setErro}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <>
                  <span className="min-w-0 font-medium text-texto">{loja.nome}</span>
                  {(loja.cidade || loja.uf) && (
                    <span className="text-corpo text-texto-2">
                      {[loja.cidade, loja.uf].filter(Boolean).join("/")}
                    </span>
                  )}
                  {loja.ativo ? (
                    <Selo tipo="ok" palavra="Ativa" />
                  ) : (
                    <Selo tipo="neutro" palavra="Inativa" />
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <BotaoDeLista
                      rotulo={`Editar a loja ${loja.nome}`}
                      icone={Pencil}
                      aoClicar={() => {
                        setErro(null);
                        setEditandoId(loja.id);
                      }}
                    />
                    <BotaoDeLista
                      rotulo={`${loja.ativo ? "Inativar" : "Reativar"} a loja ${loja.nome}`}
                      icone={loja.ativo ? Power : RotateCcw}
                      aoClicar={() => handleAlternarStatus(loja)}
                    />
                    <BotaoDeLista
                      rotulo={`Excluir a loja ${loja.nome}`}
                      icone={Trash2}
                      perigoso
                      aoClicar={() => handleExcluir(loja)}
                    />
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
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
      className="flex w-full flex-wrap items-center gap-2"
    >
      <input
        type="text"
        placeholder="Nome da loja"
        aria-label="Nome da loja"
        autoFocus
        {...register("nome")}
        className="sakura-campo sakura-campo-filtro min-w-40 flex-1"
      />
      <input
        type="text"
        placeholder="Cidade"
        aria-label="Cidade"
        {...register("cidade")}
        className="sakura-campo sakura-campo-filtro w-40"
      />
      <input
        type="text"
        placeholder="UF"
        aria-label="UF"
        maxLength={2}
        {...ufField}
        onChange={(e) => {
          e.target.value = e.target.value.toUpperCase();
          ufField.onChange(e);
        }}
        className="sakura-campo sakura-campo-filtro w-16"
      />
      <Botao type="submit" variante="principal" tamanho="pequeno" ocupado={isSubmitting}>
        Salvar
      </Botao>
      <Botao variante="fantasma" tamanho="pequeno" onClick={onCancelar}>
        Cancelar
      </Botao>
    </form>
  );
}
