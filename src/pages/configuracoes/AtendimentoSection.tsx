import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Aviso, AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { buscarConfiguracaoAtendimento, salvarConfiguracaoAtendimento } from "@/lib/configuracoes";
import { MENSAGEM_BANCO_DESATUALIZADO, mensagemDeErro } from "@/lib/errors";
import {
  atendimentoLojaSchema,
  paraConfiguracaoAtendimento,
  paraValoresFormularioAtendimento,
  type AtendimentoLojaFormValores,
} from "@/schemas/atendimentoLoja";
import { AvisoDeSalvo } from "./pecas";

interface AtendimentoSectionProps {
  lojaId: string;
  /** Só o admin edita: a regra é da tela (a RLS deixa quem tem acesso à loja, como nas outras configurações). */
  podeEditar: boolean;
}

/**
 * WhatsApp, horário e garantia dos serviços da loja (#1033). Carrega a própria
 * linha (tabela `configuracoes_atendimento`, migration 0088): quem usa põe
 * `key={lojaId}` pra trocar de loja recarregar do zero.
 */
export function AtendimentoSection({ lojaId, podeEditar }: AtendimentoSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Carga que falhou (ou banco sem a tabela): campos travados, senão um
  // "Salvar" em branco apagaria o que está guardado e a tela não mostrou.
  const [cargaFalhou, setCargaFalhou] = useState(false);
  const [bancoSemTabela, setBancoSemTabela] = useState(false);
  const travado = carregando || cargaFalhou || !podeEditar;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AtendimentoLojaFormValores>({
    resolver: zodResolver(atendimentoLojaSchema),
    defaultValues: paraValoresFormularioAtendimento(null),
  });

  useEffect(() => {
    let cancelado = false;
    buscarConfiguracaoAtendimento(lojaId)
      .then((c) => {
        if (!cancelado) reset(paraValoresFormularioAtendimento(c));
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("Erro ao carregar o atendimento da loja:", err);
        setCargaFalhou(true);
        const msg = mensagemDeErro(err);
        if (msg === MENSAGEM_BANCO_DESATUALIZADO) setBancoSemTabela(true);
        else setErro(msg);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [lojaId, reset]);

  async function aoSalvar(valores: AtendimentoLojaFormValores) {
    setErro(null);
    setSalvo(null);
    try {
      await salvarConfiguracaoAtendimento(lojaId, paraConfiguracaoAtendimento(valores));
      reset(valores);
      setSalvo("Atendimento salvo.");
    } catch (err) {
      console.error("Erro ao salvar o atendimento da loja:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <>
      {bancoSemTabela && (
        <Aviso tipo="atencao" className="mb-4">
          {MENSAGEM_BANCO_DESATUALIZADO}
        </Aviso>
      )}
      {erro && <AvisoDeErro className="mb-4">{erro}</AvisoDeErro>}
      {!podeEditar && (
        <p className="mb-4 text-rotulo text-texto-2">
          Só quem é administrador da loja pode mudar estes dados.
        </p>
      )}

      <form onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sakura-rotulo">
            WhatsApp da loja
            <input
              type="text"
              inputMode="tel"
              autoComplete="off"
              placeholder="(16) 99999-9999"
              disabled={travado}
              aria-invalid={errors.whatsapp ? true : undefined}
              {...register("whatsapp", { onChange: () => setSalvo(null) })}
              className="sakura-campo"
            />
            {errors.whatsapp && <span className="text-rotulo text-perigo">{errors.whatsapp.message}</span>}
          </label>
          <label className="sakura-rotulo">
            Horário de funcionamento
            <input
              type="text"
              maxLength={80}
              placeholder="Seg a sex, 8h às 18h · Sáb, 8h às 12h"
              disabled={travado}
              aria-invalid={errors.horario_funcionamento ? true : undefined}
              {...register("horario_funcionamento", { onChange: () => setSalvo(null) })}
              className="sakura-campo"
            />
            {errors.horario_funcionamento && (
              <span className="text-rotulo text-perigo">{errors.horario_funcionamento.message}</span>
            )}
          </label>
        </div>
        <div className="sm:max-w-xs">
          <label htmlFor="atendimento-garantia" className="sakura-rotulo">
            Garantia dos serviços (dias)
          </label>
          <input
            id="atendimento-garantia"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={travado}
            aria-invalid={errors.garantia_servico_dias ? true : undefined}
            aria-describedby="atendimento-garantia-dica"
            {...register("garantia_servico_dias", { onChange: () => setSalvo(null) })}
            className="sakura-campo mt-1.5"
          />
          <span
            id="atendimento-garantia-dica"
            className={`mt-1 block text-rotulo ${errors.garantia_servico_dias ? "text-perigo" : "text-texto-2"}`}
          >
            {errors.garantia_servico_dias?.message ??
              'Aparece no recibo da NFS-e: "Serviços: garantia de N dias, a contar desta nota". Vazio: a linha não aparece.'}
          </span>
        </div>

        {podeEditar && !bancoSemTabela && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {salvo && <AvisoDeSalvo>{salvo}</AvisoDeSalvo>}
            <Botao type="submit" variante="principal" disabled={travado} ocupado={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar atendimento"}
            </Botao>
          </div>
        )}
      </form>
    </>
  );
}
