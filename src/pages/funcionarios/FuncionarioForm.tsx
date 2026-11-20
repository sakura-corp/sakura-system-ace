import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { Botao } from "@/components/Botao";
import { Abas } from "@/components/Abas";
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
import { Aviso } from "@/components/Aviso";
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
      className="sakura-card space-y-4 p-6"
    >
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-bold text-texto">
          {editando ? "Editar funcionário" : "Novo funcionário"}
        </h2>
      </div>

      {erro && <Aviso tipo="perigo" role="alert">{erro}</Aviso>}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="deste funcionário"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      {funcionarioExistente?.operador_id && (
        <p className="rounded-xl bg-poco px-4 py-2.5 text-rotulo text-texto-2">
          Também é operador do sistema (login @{funcionarioExistente.operador?.usuario}) — nome e
          status ativo/inativo desse cadastro seguem o que estiver em Configurações →
          Operadores.
        </p>
      )}

      <Abas
        rotulo="Partes do cadastro do funcionário"
        prefixoId="aba-funcionario"
        ativa={aba}
        aoEscolher={setAba}
        abas={[
          { valor: "gerais", nome: "Dados gerais" },
          { valor: "familia", nome: "Família" },
        ]}
      />

      {/* Os dois painéis ficam montados (só um aparece): o formulário guarda o
          que foi digitado na outra aba. */}
      <div
        role="tabpanel"
        aria-labelledby="aba-funcionario-gerais"
        className={aba === "gerais" ? "space-y-5" : "hidden"}
      >
        <IdentificacaoFields register={register} errors={errors} />
        <DocumentosFields register={register} />
        <EnderecoFields register={register} setValue={setValue} />
        <ContatoFields register={register} />
        <CargoAdmissaoFields register={register} />
      </div>

      <div
        role="tabpanel"
        aria-labelledby="aba-funcionario-familia"
        className={aba === "familia" ? "space-y-5" : "hidden"}
      >
        <FiliacaoFields register={register} />
        <ConjugeFields register={register} />
        <FilhosFields control={control} register={register} />
      </div>

      <div className="flex justify-end gap-3">
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar funcionário"}
        </Botao>
      </div>
    </form>
  );
}
