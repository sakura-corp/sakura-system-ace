// @vitest-environment jsdom
/**
 * Teste de TELA do "De onde veio" (#1021). As promessas:
 *   • a OS nova já vem com a origem do cliente escolhido — inclusive quando o
 *     cliente chega depois (a lista carregando, o cadastro rápido);
 *   • trocar de cliente troca a sugestão, mas o que a pessoa escolheu à mão
 *     fica;
 *   • na edição (sem `sugestao`), a origem é a gravada, e nada a muda sozinho;
 *   • em branco ("Não informado") é uma escolha que salva.
 */
import { describe, expect, it } from "vitest";
import { useForm } from "react-hook-form";
import { renderizar, screen } from "@/testes/tela";
import { CampoOrigem } from "./CampoOrigem";

interface Valores {
  origem: string;
  origem_detalhe: string;
}

function Formulario({ sugestao, inicial = "" }: { sugestao?: string; inicial?: string }) {
  const { register, watch, setValue } = useForm<Valores>({
    defaultValues: { origem: inicial, origem_detalhe: "" },
  });
  return (
    <CampoOrigem
      registroOrigem={register("origem")}
      registroDetalhe={register("origem_detalhe")}
      sugestao={sugestao}
      origemAtual={watch("origem")}
      onSugerir={(origem) => setValue("origem", origem)}
    />
  );
}

const campo = () => screen.getByLabelText(/De onde veio/) as HTMLSelectElement;

describe("CampoOrigem", () => {
  it("mostra a lista fixa, começando em Não informado", () => {
    renderizar(<Formulario />);
    expect(campo()).toHaveValue("");
    expect([...campo().options].map((o) => o.text)).toEqual([
      "Não informado",
      "Anúncio no Instagram/Facebook",
      "Google",
      "Indicação",
      "Passou na frente",
      "Parceiro",
      "Já era cliente",
      "Outro",
    ]);
    expect(screen.getByLabelText(/Qual anúncio ou quem indicou/)).toHaveAttribute("maxLength", "80");
  });

  it("a OS nova já abre com a origem do cliente, e avisa de onde ela veio", () => {
    renderizar(<Formulario sugestao="indicacao" />);
    expect(campo()).toHaveValue("indicacao");
    expect(screen.getByText(/Veio do cadastro do cliente/)).toBeInTheDocument();
  });

  it("o cliente escolhido depois (ou pelo cadastro rápido) também traz a origem", () => {
    const { rerender } = renderizar(<Formulario sugestao="" />);
    expect(campo()).toHaveValue("");
    rerender(<Formulario sugestao="google" />);
    expect(campo()).toHaveValue("google");
  });

  it("trocar de cliente troca a sugestão; a escolha feita à mão fica", async () => {
    const { user, rerender } = renderizar(<Formulario sugestao="indicacao" />);
    rerender(<Formulario sugestao="google" />);
    expect(campo()).toHaveValue("google");

    await user.selectOptions(campo(), "parceiro");
    expect(screen.queryByText(/Veio do cadastro do cliente/)).not.toBeInTheDocument();
    rerender(<Formulario sugestao="indicacao" />);
    expect(campo()).toHaveValue("parceiro");
  });

  it("dá pra deixar em branco mesmo com o cliente tendo origem", async () => {
    const { user } = renderizar(<Formulario sugestao="indicacao" />);
    await user.selectOptions(campo(), "");
    expect(campo()).toHaveValue("");
  });

  it("na edição de uma OS (sem sugestão), mostra a gravada e não muda sozinho", () => {
    const { rerender } = renderizar(<Formulario inicial="outro" />);
    expect(campo()).toHaveValue("outro");
    rerender(<Formulario inicial="outro" />);
    expect(campo()).toHaveValue("outro");
  });
});
