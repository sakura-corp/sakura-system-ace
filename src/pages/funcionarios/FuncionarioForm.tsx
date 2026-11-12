import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { ehErroDeRede, mensagemDeErro } from "@/lib/errors";
import {
  funcionarioFormSchema,
  paraFilhosPreenchidos,
  paraNovoFuncionario,
  paraValoresFormulario,
  type FuncionarioFormValues,
} from "@/schemas/funcionario";
import type { Funcionario, NovoFuncionario, NovoFuncionarioFilho } from "@/types/funcionario";
import { CargoAdmissaoFields } from "./campos/CargoAdmissaoFields";
import { ConjugeFields } from "./campos/ConjugeFields";
import { ContatoFields } from "./campos/ContatoFields";
import { DocumentosFields } from "./campos/DocumentosFields";
import { EnderecoFields } from "./campos/EnderecoFields";
import { FiliacaoFields } from "./campos/FiliacaoFields";
import { FilhosFields } from "./campos/FilhosFields";
import { IdentificacaoFields } from "./campos/IdentificacaoFields";

interface FuncionarioFormProps {
  funcionarioExistente?: Funcionario;
  onSalvar: (funcionario: NovoFuncionario, filhos: NovoFuncionarioFilho[]) => Promise<void>;
  onCancelar: () => void;
}

type Aba = "gerais" | "familia";

export function FuncionarioForm({
  funcionarioExistente,
  onSalvar,
  onCancelar,
}: FuncionarioFormProps) {
  const editando = Boolean(funcionarioExistente);
  const [aba, setAba] = useState<Aba>("gerais");
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FuncionarioFormValues>({
    resolver: zodResolver(funcionarioFormSchema),
    defaultValues: paraValoresFormulario(funcionarioExistente),
  });

  const rascunho = useRascunho(
    `rascunho-funcionario-${funcionarioExistente?.id ?? "novo"}`,
    watch,
    reset,
  );

  // Todos os campos com validação (só "nome" por enquanto) ficam na aba "Dados
  // gerais" — se o envio falhar com o usuário na aba "Família", troca de aba
  // sozinho, senão a mensagem de erro fica escondida numa aba que não é a
  // que está sendo exibida.
  function aoFalharValidacao() {
    setAba("gerais");
  }

  async function aoSubmeter(valores: FuncionarioFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoFuncionario(valores), paraFilhosPreenchidos(valores.filhos));
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao salvar funcionário:", err);
      // Sem rede: o que foi digitado vai pro rascunho na hora, não só aos 30 s.
      if (ehErroDeRede(err)) rascunho.salvarAgora();
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter, aoFalharValidacao)}
      className="space-y-4 sakura-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
          {editando ? "Editar funcionário" : "Novo funcionário"}
        </h2>
      </div>

      {erro && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="deste funcionário"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      {funcionarioExistente?.operador_id && (
        <p className="rounded-lg bg-sakura-pink-soft/60 px-4 py-2 text-rotulo text-sakura-purple-dark/80">
          Também é operador do sistema (login @{funcionarioExistente.operador?.usuario}) — nome e
          status ativo/inativo desse cadastro seguem o que estiver em Configurações →
          Operadores.
        </p>
      )}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="Dados gerais" ativa={aba === "gerais"} onClick={() => setAba("gerais")} />
        <AbaBotao label="Família" ativa={aba === "familia"} onClick={() => setAba("familia")} />
      </div>

      <div className={aba === "gerais" ? "space-y-5" : "hidden"}>
        <IdentificacaoFields register={register} errors={errors} />
        <DocumentosFields register={register} />
        <EnderecoFields register={register} setValue={setValue} />
        <ContatoFields register={register} />
        <CargoAdmissaoFields register={register} />
      </div>

      <div className={aba === "familia" ? "space-y-5" : "hidden"}>
        <FiliacaoFields register={register} />
        <ConjugeFields register={register} />
        <FilhosFields control={control} register={register} />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar funcionário"}
        </button>
      </div>
    </form>
  );
}

function AbaBotao({
  label,
  ativa,
  onClick,
}: {
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-corpo font-medium transition-colors ${
        ativa
          ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
          : "text-sakura-purple-dark/85 hover:text-sakura-purple-dark"
      }`}
    >
      {label}
    </button>
  );
}
