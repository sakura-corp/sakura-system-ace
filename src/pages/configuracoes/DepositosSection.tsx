import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Power, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { Selo } from "@/components/Selo";
import { atualizarDeposito, atualizarStatusDeposito, criarDeposito } from "@/lib/depositos";
import { mensagemDeErro } from "@/lib/errors";
import {
  depositoFormSchema,
  depositoFormVazio,
  paraNovoDeposito,
  paraPatchDeposito,
  paraValoresFormulario,
  type DepositoFormValues,
} from "@/schemas/deposito";
import type { Deposito } from "@/types/deposito";
import { BotaoDeLista, MensagemDeErro } from "./pecas";

interface DepositosSectionProps {
  depositos: Deposito[];
  lojaId: string;
  onSalvo: () => Promise<void>;
}

export function DepositosSection({ depositos, lojaId, onSalvo }: DepositosSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DepositoFormValues>({
    resolver: zodResolver(depositoFormSchema),
    defaultValues: depositoFormVazio,
  });

  async function aoAdicionar(valores: DepositoFormValues) {
    setErro(null);
    try {
      await criarDeposito(paraNovoDeposito(valores, lojaId));
      reset(depositoFormVazio);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao criar depósito:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleAlternarStatus(deposito: Deposito) {
    setErro(null);

    // Baixa automática de estoque (OS, recebimento de pedido, importação por
    // foto/XML) sempre cai no depósito padrão da loja — sem nenhum ativo,
    // esses fluxos quebram. Nunca deixar inativar o último.
    const ativosRestantes = depositos.filter((d) => d.ativo && d.id !== deposito.id).length;
    if (deposito.ativo && ativosRestantes === 0) {
      setErro(
        "Esse é o último depósito ativo da loja. Cadastre outro depósito antes de inativar este.",
      );
      return;
    }

    try {
      await atualizarStatusDeposito(deposito.id, !deposito.ativo);
      await onSalvo();
    } catch (err) {
      console.error("Erro ao atualizar status do depósito:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <>
      {erro && <MensagemDeErro className="mt-4">{erro}</MensagemDeErro>}

      <form onSubmit={handleSubmit(aoAdicionar)} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="sakura-rotulo min-w-64 flex-1">
          Nome do depósito
          <input
            type="text"
            placeholder="Ex: Depósito Principal, Fundos"
            {...register("nome")}
            className="sakura-campo"
          />
        </label>
        <Botao type="submit" ocupado={isSubmitting} className="h-11">
          {isSubmitting ? "Salvando..." : "+ Novo depósito"}
        </Botao>
      </form>

      {depositos.length === 0 ? (
        <p className="mt-4 text-corpo text-texto-2">Nenhum depósito cadastrado ainda.</p>
      ) : (
        <ul className="mt-5 divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
          {depositos.map((deposito) => (
            <li
              key={deposito.id}
              className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
            >
              {editandoId === deposito.id ? (
                <LinhaEdicaoDeposito
                  deposito={deposito}
                  onSalvo={async () => {
                    setEditandoId(null);
                    await onSalvo();
                  }}
                  onErro={setErro}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <>
                  <span className="min-w-0 font-medium text-texto">{deposito.nome}</span>
                  {deposito.ativo ? (
                    <Selo tipo="ok" palavra="Ativo" />
                  ) : (
                    <Selo tipo="neutro" palavra="Inativo" />
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <BotaoDeLista
                      rotulo={`Editar o depósito ${deposito.nome}`}
                      icone={Pencil}
                      aoClicar={() => {
                        setErro(null);
                        setEditandoId(deposito.id);
                      }}
                    />
                    <BotaoDeLista
                      rotulo={`${deposito.ativo ? "Inativar" : "Reativar"} o depósito ${deposito.nome}`}
                      icone={deposito.ativo ? Power : RotateCcw}
                      aoClicar={() => handleAlternarStatus(deposito)}
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

// Componente à parte pra cada linha em edição nascer com o `useForm` já
// preenchido pelo depósito clicado, sem precisar de `reset()` manual.
function LinhaEdicaoDeposito({
  deposito,
  onSalvo,
  onErro,
  onCancelar,
}: {
  deposito: Deposito;
  onSalvo: () => Promise<void>;
  onErro: (mensagem: string) => void;
  onCancelar: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<DepositoFormValues>({
    resolver: zodResolver(depositoFormSchema),
    defaultValues: paraValoresFormulario(deposito),
  });

  async function aoSalvar(valores: DepositoFormValues) {
    try {
      await atualizarDeposito(deposito.id, paraPatchDeposito(valores));
      await onSalvo();
    } catch (err) {
      console.error("Erro ao editar depósito:", err);
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
        aria-label="Nome do depósito"
        autoFocus
        {...register("nome")}
        className="sakura-campo sakura-campo-filtro min-w-48 flex-1"
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
