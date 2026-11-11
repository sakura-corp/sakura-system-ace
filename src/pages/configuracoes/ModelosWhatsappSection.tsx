import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buscarContatoContabilidade, salvarContatoContabilidade } from "@/lib/contabilidade";
import { salvarLinkAvaliacao } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { salvarModeloWhatsapp, textoDoModelo } from "@/lib/modelosWhatsapp";
import {
  contatoContabilidadeSchema,
  type ContatoContabilidadeFormValores,
} from "@/schemas/contatoContabilidade";
import {
  linkAvaliacaoSchema,
  MODELOS_WHATSAPP,
  type ChaveModeloWhatsapp,
  type LinkAvaliacaoFormValores,
} from "@/schemas/whatsapp";

interface ModelosWhatsappSectionProps {
  modelos: Record<string, string>;
  lojaId: string;
  /** O link de avaliação no Google já salvo; "" quando a loja não tem. */
  linkAvaliacao: string;
  onSalvo: () => Promise<void>;
}

/**
 * Os textos que o sistema abre no WhatsApp, editáveis por loja (item FN-03).
 *
 * Ficam editáveis porque cada loja fala do seu jeito, e o que o dono manda
 * pro cliente dele é decisão dele. É o mesmo caminho que o texto de garantia
 * já percorreu: nasceu fixo no código e precisou virar configuração.
 */
export function ModelosWhatsappSection({
  modelos,
  lojaId,
  linkAvaliacao,
  onSalvo,
}: ModelosWhatsappSectionProps) {
  return (
    <div className="mt-4 space-y-8">
      <LinkAvaliacaoCampo lojaId={lojaId} linkSalvo={linkAvaliacao} onSalvo={onSalvo} />
      {/* key: trocar de loja remonta o bloco e busca o contato da outra. */}
      <ContatoContabilidadeCampo key={lojaId} lojaId={lojaId} />
      {MODELOS_WHATSAPP.map((modelo) => (
        <ModeloEditavel
          key={modelo.chave}
          chave={modelo.chave}
          titulo={modelo.titulo}
          descricao={modelo.descricao}
          marcadores={modelo.marcadores}
          texto={textoDoModelo(modelos, modelo.chave)}
          padrao={modelo.padrao}
          lojaId={lojaId}
          onSalvo={onSalvo}
        />
      ))}
    </div>
  );
}

function ModeloEditavel({
  chave,
  titulo,
  descricao,
  marcadores,
  texto,
  padrao,
  lojaId,
  onSalvo,
}: {
  chave: ChaveModeloWhatsapp;
  titulo: string;
  descricao: string;
  marcadores: string[];
  texto: string;
  padrao: string;
  lojaId: string;
  onSalvo: () => Promise<void>;
}) {
  const [valor, setValor] = useState(texto);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function handleSalvar() {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      await salvarModeloWhatsapp(lojaId, chave, valor);
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar modelo de WhatsApp:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section>
      <h4 className="text-corpo font-semibold text-sakura-purple-dark">{titulo}</h4>
      <p className="mt-1 text-rotulo text-sakura-muted">{descricao}</p>
      <p className="mt-1 text-rotulo text-sakura-muted">
        Marcadores que este modelo troca pelo valor de verdade:{" "}
        <span className="text-sakura-purple-dark">{marcadores.join(", ")}</span>
      </p>

      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}
      <textarea
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setSalvo(false);
        }}
        rows={5}
        className="mt-3 w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
      />

      <div className="mt-2 flex items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            Modelo salvo.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setValor(padrao);
            setSalvo(false);
          }}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
        >
          Voltar ao texto padrão
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar modelo"}
        </button>
      </div>
    </section>
  );
}

function LinkAvaliacaoCampo({
  lojaId,
  linkSalvo,
  onSalvo,
}: {
  lojaId: string;
  linkSalvo: string;
  onSalvo: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LinkAvaliacaoFormValores>({
    resolver: zodResolver(linkAvaliacaoSchema),
    defaultValues: { link: linkSalvo },
  });

  async function aoSubmeter(valores: LinkAvaliacaoFormValores) {
    setErro(null);
    setSalvo(false);
    try {
      await salvarLinkAvaliacao(lojaId, valores.link || null);
      await onSalvo();
      setSalvo(true);
    } catch (err) {
      console.error("Erro ao salvar o link de avaliação:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} noValidate>
      <label
        htmlFor="link-avaliacao"
        className="block text-corpo font-semibold text-sakura-purple-dark"
      >
        Link de avaliação no Google
      </label>
      <p className="mt-1 text-rotulo text-sakura-muted">
        Sem o link, o botão Avaliação não aparece na ordem de serviço nem na venda de balcão.
        Deixe vazio e salve para apagar.
      </p>

      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}
      <input
        id="link-avaliacao"
        type="text"
        inputMode="url"
        placeholder="https://g.page/r/..."
        {...register("link", { onChange: () => setSalvo(false) })}
        className="mt-3 w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
      />
      {errors.link && (
        <span className="mt-1 block text-rotulo text-red-600">{errors.link.message}</span>
      )}

      <div className="mt-2 flex items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            Link salvo.
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar link"}
        </button>
      </div>
    </form>
  );
}

const VAZIO: ContatoContabilidadeFormValores = { nome: "", whatsapp: "", email: "" };

/**
 * O contato da contabilidade da loja (#383): pra quem o pacote do mês é
 * mandado. Por loja, e fora do `onSalvo` da página: ele não é da tabela de
 * configurações, é de `configuracoes_contabilidade`.
 */
function ContatoContabilidadeCampo({ lojaId }: { lojaId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Carga que falhou: os campos ficam travados, senão um "Salvar" em branco
  // apagaria o contato que está guardado e a tela não chegou a mostrar.
  const [cargaFalhou, setCargaFalhou] = useState(false);
  const travado = carregando || cargaFalhou;
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContatoContabilidadeFormValores>({
    resolver: zodResolver(contatoContabilidadeSchema),
    defaultValues: VAZIO,
  });

  useEffect(() => {
    let cancelado = false;
    buscarContatoContabilidade(lojaId)
      .then((contato) => {
        if (cancelado) return;
        reset(
          contato
            ? { nome: contato.nome, whatsapp: contato.whatsapp ?? "", email: contato.email ?? "" }
            : VAZIO,
        );
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("Erro ao carregar o contato da contabilidade:", err);
        setCargaFalhou(true);
        setErro(mensagemDeErro(err));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [lojaId, reset]);

  async function gravar(contato: ContatoContabilidadeFormValores | null) {
    if (contato === null && !confirm("Apagar o contato da contabilidade desta loja?")) return;
    setErro(null);
    setSalvo(null);
    try {
      await salvarContatoContabilidade(lojaId, contato);
      if (contato) {
        setSalvo("Contato salvo.");
      } else {
        reset(VAZIO);
        setSalvo("Contato apagado.");
      }
    } catch (err) {
      console.error("Erro ao salvar o contato da contabilidade:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const estaVazio = () => {
    const v = getValues();
    return !v.nome.trim() && !v.whatsapp.trim() && !v.email.trim();
  };

  // Tudo vazio quer dizer "apagar": não passa pela validação (que pede nome).
  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    if (estaVazio()) {
      e.preventDefault();
      return gravar(null);
    }
    return handleSubmit(gravar)(e);
  };

  const classeCampo =
    "mt-1 w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple";

  return (
    <form onSubmit={aoEnviar} noValidate>
      <h4 className="text-corpo font-semibold text-sakura-purple-dark">Contato da contabilidade</h4>
      <p className="mt-1 text-rotulo text-sakura-muted">
        Pra quem vai o pacote das notas do mês. Com o WhatsApp, a Central do dia ganha o botão
        Abrir conversa. Esvazie os campos e salve (ou use Apagar contato) para remover.
      </p>

      {erro && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">
          {erro}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="contab-nome" className="block text-rotulo text-sakura-purple-dark">
            Nome da contabilidade
          </label>
          <input
            id="contab-nome"
            type="text"
            disabled={travado}
            {...register("nome", { onChange: () => setSalvo(null) })}
            className={classeCampo}
          />
          {errors.nome && (
            <span className="mt-1 block text-rotulo text-red-600">{errors.nome.message}</span>
          )}
        </div>
        <div>
          <label htmlFor="contab-whatsapp" className="block text-rotulo text-sakura-purple-dark">
            WhatsApp da contabilidade
          </label>
          <input
            id="contab-whatsapp"
            type="text"
            inputMode="tel"
            placeholder="(11) 90000-0000"
            disabled={travado}
            {...register("whatsapp", { onChange: () => setSalvo(null) })}
            className={classeCampo}
          />
          {errors.whatsapp && (
            <span className="mt-1 block text-rotulo text-red-600">{errors.whatsapp.message}</span>
          )}
        </div>
        <div>
          <label htmlFor="contab-email" className="block text-rotulo text-sakura-purple-dark">
            E-mail da contabilidade
          </label>
          <input
            id="contab-email"
            type="text"
            inputMode="email"
            disabled={travado}
            {...register("email", { onChange: () => setSalvo(null) })}
            className={classeCampo}
          />
          {errors.email && (
            <span className="mt-1 block text-rotulo text-red-600">{errors.email.message}</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-3">
        {salvo && (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
            {salvo}
          </p>
        )}
        <button
          type="button"
          disabled={isSubmitting || travado}
          onClick={() => gravar(null)}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10 disabled:opacity-50"
        >
          Apagar contato
        </button>
        <button
          type="submit"
          disabled={isSubmitting || travado}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar contato"}
        </button>
      </div>
    </form>
  );
}
