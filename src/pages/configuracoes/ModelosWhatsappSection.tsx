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
import { Botao } from "@/components/Botao";
import { AvisoDeSalvo } from "./pecas";
import { AvisoDeErro } from "@/components/Aviso";

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
    <div className="space-y-8 [&>section]:border-t [&>section]:border-linha [&>section]:pt-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
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
      <h4 className="text-corpo font-semibold text-texto">{titulo}</h4>
      <p className="mt-1 text-rotulo text-texto-2">{descricao}</p>
      <p className="mt-1 text-rotulo text-texto-2">
        Marcadores que este modelo troca pelo valor de verdade:{" "}
        <span className="font-medium text-texto">{marcadores.join(", ")}</span>
      </p>

      {erro && <AvisoDeErro className="mt-3">{erro}</AvisoDeErro>}
      <textarea
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setSalvo(false);
        }}
        rows={5}
        aria-label={titulo}
        className="sakura-campo mt-3"
      />

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        {salvo && <AvisoDeSalvo>Modelo salvo.</AvisoDeSalvo>}
        <Botao
          variante="fantasma"
          onClick={() => {
            setValor(padrao);
            setSalvo(false);
          }}
        >
          Voltar ao texto padrão
        </Botao>
        <Botao type="button" variante="secundario" onClick={handleSalvar} ocupado={salvando}>
          {salvando ? "Salvando..." : "Salvar modelo"}
        </Botao>
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
        className="block text-corpo font-semibold text-texto"
      >
        Link de avaliação no Google
      </label>
      <p className="mt-1 text-rotulo text-texto-2">
        Sem o link, o botão Avaliação não aparece na ordem de serviço nem na venda de balcão.
        Deixe vazio e salve para apagar.
      </p>

      {erro && <AvisoDeErro className="mt-3">{erro}</AvisoDeErro>}
      <input
        id="link-avaliacao"
        type="text"
        inputMode="url"
        placeholder="https://g.page/r/..."
        {...register("link", { onChange: () => setSalvo(false) })}
        aria-invalid={errors.link ? true : undefined}
        className="sakura-campo mt-3"
      />
      {errors.link && (
        <span className="mt-1 block text-rotulo text-perigo">{errors.link.message}</span>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        {salvo && (
          <AvisoDeSalvo>Link salvo.</AvisoDeSalvo>
        )}
        <Botao type="submit" variante="secundario" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar link"}
        </Botao>
      </div>
    </form>
  );
}
