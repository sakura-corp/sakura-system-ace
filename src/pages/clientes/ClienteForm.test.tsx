// @vitest-environment jsdom
/**
 * Teste de TELA do cadastro de cliente (item TR-07.2 do guia).
 *
 * Este formulário entra na lista dos cinco não por causa de dinheiro, mas
 * porque é o que mais quebrou em silêncio: os itens 26 e 28 da seção 6 do
 * PROJETO_STATUS são os dois bugs em que o operador preenchia um veículo,
 * clicava em salvar, e o carro simplesmente não chegava no banco — um deles
 * sem erro nenhum na tela, o outro com um erro de UUID que não dizia nada.
 *
 * As duas correções vivem em lugares diferentes (uma no filtro de
 * `schemas/cliente.ts`, outra na divisão entre upsert e insert de
 * `lib/clientes.ts`), e nenhuma das duas era visível pela tela. O que estes
 * testes guardam é justamente a COSTURA: o que a pessoa preencheu chega
 * inteiro — e com a forma certa — no `onSalvar`.
 *
 * O formulário recebe tudo por props e não fala com o Supabase, então dá pra
 * montá-lo de verdade. O `useRascunho` grava em localStorage, que o jsdom
 * fornece; a limpeza abaixo evita que o rascunho de um teste apareça como a
 * faixa "restaurar rascunho?" no teste seguinte.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { ClienteForm } from "./ClienteForm";
import type { Cliente } from "@/types/cliente";

beforeEach(() => localStorage.clear());

/** Cliente já cadastrado, com UM veículo que tem `id` de banco de verdade. */
function clienteComUmVeiculo(): Cliente {
  return {
    id: "cliente-1",
    nome: "Maria da Silva",
    tipo_pessoa: "fisica",
    cpf_cnpj: "123.456.789-00",
    telefone: "16 99999-0000",
    email: null,
    cep: null,
    rua: null,
    numero: null,
    bairro: null,
    cidade: null,
    uf: null,
    codigo_municipio: null,
    data_nascimento: null,
    nao_avisar: false,
    criado_em: "2026-01-10T12:00:00.000Z",
    veiculos: [
      {
        id: "veiculo-1",
        cliente_id: "cliente-1",
        placa: "ABC1D23",
        marca: "Ford",
        modelo: "Ka",
        ano: 2015,
        cor: "Prata",
        tipo: "hatch",
        km_atual: 82000,
        criado_em: "2026-01-10T12:00:00.000Z",
      },
    ],
  };
}

function montar(clienteExistente?: Cliente) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <ClienteForm
      clienteExistente={clienteExistente}
      onSalvar={onSalvar}
      onCancelar={vi.fn()}
    />,
  );
  return { ...resultado, onSalvar };
}

const botaoSalvar = () => screen.getByRole("button", { name: /^Salvar/ });

/** O campo Marca é um Combobox (não um <select>): abre ao focar e escolhe no mousedown. */
async function escolherMarca(
  user: ReturnType<typeof montar>["user"],
  indice: number,
  marca: string,
) {
  const campos = screen.getAllByRole("combobox");
  await user.click(campos[indice]);
  await user.type(campos[indice], marca);
  await user.click(screen.getByRole("button", { name: marca }));
}

describe("ClienteForm — o veículo preenchido precisa chegar inteiro", () => {
  it("salva um veículo que tem Marca e Modelo mas ainda NÃO tem placa", async () => {
    // É o bug do item 26: o filtro perguntava só "tem placa?", então um carro
    // com marca e modelo já digitados era descartado no clique de salvar, sem
    // erro nenhum — parecia ter salvo. Acontece de verdade no balcão: o
    // operador começa o cadastro antes de ir até o pátio ler a placa.
    const { user, onSalvar } = montar();

    await user.type(screen.getByLabelText(/Nome completo/), "João Pereira");
    await escolherMarca(user, 0, "Fiat");
    await user.type(screen.getByLabelText("Modelo"), "Uno");

    await user.click(botaoSalvar());

    expect(onSalvar).toHaveBeenCalledTimes(1);
    const [, veiculos] = onSalvar.mock.calls[0];
    expect(veiculos).toHaveLength(1);
    expect(veiculos[0]).toMatchObject({ placa: "", marca: "Fiat", modelo: "Uno" });
  });

  it("mas NÃO salva a linha de veículo 100% em branco que o formulário nasce com", async () => {
    // O outro lado da mesma regra — sem isto, "aceitar veículo sem placa"
    // viraria um carro fantasma em todo cliente cadastrado.
    const { user, onSalvar } = montar();

    await user.type(screen.getByLabelText(/Nome completo/), "João Pereira");
    await user.click(botaoSalvar());

    expect(onSalvar).toHaveBeenCalledTimes(1);
    const [, veiculos] = onSalvar.mock.calls[0];
    expect(veiculos).toEqual([]);
  });

  it("ao adicionar um veículo novo num cliente já existente, o antigo mantém o id e o novo vai sem id", async () => {
    // É a forma exata que o item 28 exige. `lib/clientes.ts` separa os
    // veículos por `Boolean(veiculo.id)`: quem tem id vai pro upsert (e
    // preserva o vínculo com as OS antigas), quem não tem vai pro insert, sem
    // a chave `id` no payload. Se o veículo novo chegasse aqui com um id
    // qualquer — inclusive a string vazia que o input escondido produz —, ele
    // cairia no upsert e o Postgres recusaria a gravação inteira com
    // "invalid input syntax for type uuid".
    const { user, onSalvar } = montar(clienteComUmVeiculo());

    await user.click(screen.getByRole("button", { name: /Adicionar veículo/ }));
    await user.type(screen.getAllByLabelText("Placa")[1], "xyz9z88");

    await user.click(botaoSalvar());

    expect(onSalvar).toHaveBeenCalledTimes(1);
    const [, veiculos] = onSalvar.mock.calls[0];
    expect(veiculos).toHaveLength(2);
    expect(veiculos[0].id).toBe("veiculo-1");
    expect(veiculos[1].id).toBeFalsy();
    // E a placa sobe em maiúsculas, como o cadastro antigo já fazia.
    expect(veiculos[1].placa).toBe("XYZ9Z88");
  });

  it("remover um veículo tira só ele, e os outros não trocam de id", async () => {
    // `useFieldArray` reordena o array ao remover, e o id do banco tem que
    // andar junto com a linha certa — trocar os ids aqui desconectaria uma OS
    // antiga do carro dela.
    //
    // Uma observação medida, não suposta: apagar o `<input type="hidden">` de
    // `id` do `VeiculosFields` NÃO faz estes dois testes falharem — nesta
    // versão do react-hook-form o `useFieldArray` guarda o valor do item no
    // estado do formulário, com ou sem campo registrado. Ou seja, o que estes
    // testes protegem é a PROMESSA (o id segue a linha), não aquele mecanismo
    // em particular. O hidden input continua onde está: tirá-lo é outra
    // conversa, e a convenção da seção 4 do PROJETO_STATUS pode estar
    // guardando algum outro caminho (restaurar rascunho, por exemplo) que
    // estes testes não exercitam.
    const cliente = clienteComUmVeiculo();
    cliente.veiculos = [
      cliente.veiculos![0],
      { ...cliente.veiculos![0], id: "veiculo-2", placa: "DEF4G56", modelo: "Gol" },
    ];
    const { user, onSalvar } = montar(cliente);

    // Com 2 veículos aparece um "Remover" por linha; o primeiro é o do
    // veículo 1.
    await user.click(screen.getAllByRole("button", { name: "Remover" })[0]);
    await user.click(botaoSalvar());

    const [, veiculos] = onSalvar.mock.calls[0];
    expect(veiculos).toHaveLength(1);
    expect(veiculos[0]).toMatchObject({ id: "veiculo-2", placa: "DEF4G56" });
  });
});

describe("ClienteForm — validação e tipo de pessoa", () => {
  it("não salva sem nome, e diz o porquê na tela", async () => {
    const { user, onSalvar } = montar();

    await user.click(botaoSalvar());

    expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("trocar pra pessoa jurídica muda os rótulos de Nome e CPF", async () => {
    // Mesmo campo no banco, rótulo diferente na tela — é o que evita o
    // operador procurar um campo "CNPJ" que não existe.
    const { user } = montar();
    expect(screen.getByLabelText(/Nome completo/)).toBeInTheDocument();
    expect(screen.getByLabelText("CPF")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Pessoa jurídica/ }));

    expect(screen.getByLabelText(/Razão social/)).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).toBeInTheDocument();
  });

  it("converte ano e km pra número, e deixa nulo o que ficou em branco", async () => {
    // O formulário inteiro trabalha com string; quem grava espera number|null.
    // Um "" chegando como 0 num campo de KM seria um dado errado silencioso.
    const { user, onSalvar } = montar();

    await user.type(screen.getByLabelText(/Nome completo/), "João Pereira");
    await user.type(screen.getByLabelText("Placa"), "ABC1D23");
    await user.type(screen.getByLabelText("KM atual"), "82000");

    await user.click(botaoSalvar());

    const [, veiculos] = onSalvar.mock.calls[0];
    expect(veiculos[0]).toMatchObject({ km_atual: 82000, ano: null, tipo: null });
  });
});

describe("ClienteForm — não mandar lembrete (#381)", () => {
  it("a caixinha vai marcada pro salvamento, e vem marcada de um cliente que já pediu", async () => {
    const { user, onSalvar } = montar();
    await user.type(screen.getByLabelText(/Nome completo/), "João Pereira");
    await user.click(screen.getByRole("checkbox", { name: /não mandar lembrete/i }));
    await user.click(botaoSalvar());
    expect(onSalvar.mock.calls[0][0]).toMatchObject({ nao_avisar: true });
  });

  it("sem marcar, manda falso", async () => {
    const { user, onSalvar } = montar();
    await user.type(screen.getByLabelText(/Nome completo/), "João Pereira");
    await user.click(botaoSalvar());
    expect(onSalvar.mock.calls[0][0]).toMatchObject({ nao_avisar: false });
  });

  it("cliente que já pediu abre com a caixinha marcada", () => {
    montar({ ...clienteComUmVeiculo(), nao_avisar: true });
    expect(screen.getByRole("checkbox", { name: /não mandar lembrete/i })).toBeChecked();
  });
});
