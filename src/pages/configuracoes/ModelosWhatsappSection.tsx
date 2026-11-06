import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { salvarLinkAvaliacao } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { salvarModeloWhatsapp, textoDoModelo } from "@/lib/modelosWhatsapp";
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
      {salvo && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
          Modelo salvo.
        </p>
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

      <div className="mt-2 flex justify-end gap-3">
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
      {salvo && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">
          Link salvo.
        </p>
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

      <div className="mt-2 flex justify-end">
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
