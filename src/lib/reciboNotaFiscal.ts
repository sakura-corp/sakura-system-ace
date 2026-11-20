// Sakura System — AutoCenter Edition
// O que o recibo da nota fiscal (#1031) precisa e o XML não tem: a OS ligada
// à nota (veículo, placa, km, atendente, mecânico, telefone do cliente, os
// itens e a garantia das peças) e os dados da loja nas Configurações (pra
// completar o emitente da NFS-e da Giap, que só traz o CNPJ).
//
// Tudo aqui é "melhor esforço": quem abre a nota pode não ter o módulo OS nem
// o de Configurações. Sem acesso (ou sem o dado), devolve `null` e o recibo
// sai sem aquela seção, nunca com erro.
import { supabase } from "./supabase";
import { buscarClienteEVeiculoDaOrdem } from "./clientes";
import type { LojaDoRecibo, OsDoRecibo } from "./notaFiscalXml";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { lerValoresGuardados, type ValoresGuardadosDaNota } from "@/schemas/reciboNotaFiscal";

interface LinhaItemDaOs {
  tipo: "peca" | "servico";
  descricao: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  desconto: number | null;
  tecnico_id: string | null;
  peca: { prazo_garantia_dias: number | null } | null;
}

export interface LinhaOsDoRecibo {
  numero: number;
  tipo: "os" | "venda_balcao" | null;
  km_entrada: number | null;
  vendedor_id: string | null;
  veiculo: { placa: string | null; marca: string | null; modelo: string | null; cor: string | null } | null;
  criado_por: { nome: string | null } | null;
  itens: LinhaItemDaOs[] | null;
}

export interface ExtrasDaOsDoRecibo {
  /** id do funcionário → nome (view `funcionarios_publico`). */
  nomes: Map<string, string>;
  /** Do cadastro (função `cliente_e_veiculo_da_ordem`), quando dá pra ler. */
  telefoneCliente: string | null;
  cliente: { nome: string | null; documento: string | null } | null;
  anoVeiculo: number | null;
}

function juntar(partes: (string | number | null | undefined)[], separador: string): string | null {
  const validas = partes.filter((p) => p !== null && p !== undefined && String(p).trim() !== "");
  return validas.length > 0 ? validas.join(separador) : null;
}

/** Monta os dados do recibo a partir da linha da OS (sem banco: é a parte testável). */
export function montarOsDoRecibo(linha: LinhaOsDoRecibo, extras: ExtrasDaOsDoRecibo): OsDoRecibo {
  const itens = linha.itens ?? [];
  const tecnicos = Array.from(
    new Set(
      itens
        .filter((i) => i.tipo === "servico" && i.tecnico_id)
        .map((i) => extras.nomes.get(i.tecnico_id as string))
        .filter((n): n is string => Boolean(n)),
    ),
  );
  const v = linha.veiculo;
  const modelo = juntar([v?.marca, v?.modelo, extras.anoVeiculo], " ");
  return {
    numero: linha.numero,
    tipo: linha.tipo === "venda_balcao" ? "venda_balcao" : "os",
    veiculo: juntar([modelo, v?.cor], " · "),
    placa: v?.placa || null,
    km: linha.km_entrada ?? null,
    atendente:
      (linha.vendedor_id ? extras.nomes.get(linha.vendedor_id) : null) ?? linha.criado_por?.nome ?? null,
    mecanico: tecnicos.length > 0 ? tecnicos.join(", ") : null,
    telefoneCliente: extras.telefoneCliente,
    cliente: extras.cliente,
    itens: itens.map((i) => ({
      tipo: i.tipo,
      descricao: i.descricao ?? "Item",
      quantidade: i.quantidade ?? 0,
      precoUnitario: i.preco_unitario ?? 0,
      desconto: i.desconto ?? 0,
      garantiaDias: i.tipo === "peca" ? (i.peca?.prazo_garantia_dias ?? null) : null,
    })),
  };
}

// `pecas_janela` (migration 0073), e não `pecas`: a tabela só abre pra quem tem
// Estoque, e o atendente sem esse módulo perderia a garantia calado.
const SELECT_OS_DO_RECIBO =
  "numero, tipo, km_entrada, vendedor_id, " +
  "veiculo:veiculos_janela(placa, marca, modelo, cor), " +
  "criado_por:operadores!ordens_servico_criado_por_id_fkey(nome), " +
  "itens:ordens_servico_itens(tipo, descricao, quantidade, preco_unitario, desconto, tecnico_id, peca:pecas_janela(prazo_garantia_dias))";

/** A OS da nota, pronta pro recibo; `null` se não existe ou não dá pra ler. */
export async function buscarOsDoRecibo(ordemId: string): Promise<OsDoRecibo | null> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select(SELECT_OS_DO_RECIBO)
    .eq("id", ordemId)
    .maybeSingle();
  if (error) {
    console.warn("Recibo da nota: não deu pra ler a OS", error);
    return null;
  }
  if (!data) return null;
  const linha = data as unknown as LinhaOsDoRecibo;

  const ids = Array.from(
    new Set(
      [linha.vendedor_id, ...(linha.itens ?? []).map((i) => i.tecnico_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );

  const [nomes, cadastro] = await Promise.all([
    ids.length === 0
      ? Promise.resolve(new Map<string, string>())
      : supabase
          .from("funcionarios_publico")
          .select("id, nome")
          .in("id", ids)
          .then(({ data: f }) => new Map(((f ?? []) as { id: string; nome: string }[]).map((x) => [x.id, x.nome]))),
    buscarClienteEVeiculoDaOrdem(ordemId).catch(() => ({ cliente: null, veiculo: null })),
  ]);

  return montarOsDoRecibo(linha, {
    nomes,
    telefoneCliente: cadastro.cliente?.telefone ?? null,
    cliente: cadastro.cliente
      ? { nome: cadastro.cliente.nome ?? null, documento: cadastro.cliente.cpf_cnpj ?? null }
      : null,
    anoVeiculo: cadastro.veiculo?.ano ?? null,
  });
}

interface LinhaLojaDoRecibo {
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  telefone: string | null;
  email: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

export function montarLojaDoRecibo(l: LinhaLojaDoRecibo): LojaDoRecibo {
  const cep = l.cep?.replace(/\D/g, "") ?? "";
  return {
    nomeFantasia: l.nome_fantasia || null,
    razaoSocial: l.razao_social || null,
    cnpj: l.cnpj || null,
    inscricaoEstadual: l.inscricao_estadual || null,
    inscricaoMunicipal: l.inscricao_municipal || null,
    telefone: l.telefone || null,
    email: l.email || null,
    endereco: juntar(
      [
        juntar([l.rua, l.numero], ", "),
        l.bairro,
        juntar([l.cidade, l.uf], "/"),
        cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : l.cep ? `CEP ${l.cep}` : null,
      ],
      " · ",
    ),
  };
}

/** Os dados da loja (Configurações → Dados fiscais); `null` sem acesso ou sem cadastro. */
export async function buscarLojaDoRecibo(lojaId: string): Promise<LojaDoRecibo | null> {
  // Colunas uma a uma, nunca `*` (a tabela ainda pode ter a coluna antiga do token).
  const { data, error } = await supabase
    .from("configuracoes_fiscais_loja")
    .select(
      "cnpj, razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal, telefone, email, rua, numero, bairro, cidade, uf, cep",
    )
    .eq("loja_id", lojaId)
    .maybeSingle();
  if (error) {
    console.warn("Recibo da nota: não deu pra ler os dados da loja", error);
    return null;
  }
  return data ? montarLojaDoRecibo(data as LinhaLojaDoRecibo) : null;
}

// O valor da NFS-e (#1142), sem migration: na emissão, o programa guarda um
// arquivinho JSON ao lado do XML, no mesmo lugar (bucket "notas-fiscais"),
// com o valor e os serviços que foram na nota. A Giap não devolve nada disso.
// Nota emitida antes desta versão, ou feita fora do programa, não tem o
// arquivo: o recibo continua como era ("Itens na OS nº X").

/** Onde fica o arquivinho do valor: o caminho do XML, com outro final. */
export function caminhoDosValores(storagePath: string): string {
  return `${storagePath.replace(/\.xml$/i, "")}.valores.json`;
}

/** Guarda o retrato da nota. Nunca falha: a nota já saiu, isto é só um extra. */
export async function guardarValoresDaNota(
  storagePath: string,
  valores: ValoresGuardadosDaNota,
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from("notas-fiscais")
      .upload(caminhoDosValores(storagePath), JSON.stringify(valores), {
        contentType: "application/json",
      });
    if (error) console.warn("Nota fiscal: não deu pra guardar o valor da nota", error);
  } catch (err) {
    console.warn("Nota fiscal: não deu pra guardar o valor da nota", err);
  }
}

/** O retrato guardado na emissão; `null` se não há (nota antiga, de fora, NFC-e). */
export async function buscarValoresGuardadosDaNota(
  arquivo: Pick<NotaFiscalArquivo, "tipo" | "origem" | "storage_path">,
): Promise<ValoresGuardadosDaNota | null> {
  if (arquivo.tipo !== "nfse" || arquivo.origem !== "automatica") return null;
  try {
    const { data, error } = await supabase.storage
      .from("notas-fiscais")
      .download(caminhoDosValores(arquivo.storage_path));
    if (error || !data) return null;
    return lerValoresGuardados(JSON.parse(await data.text()));
  } catch {
    return null;
  }
}

/**
 * Junta o retrato ao que o recibo recebe: os serviços da OS dão lugar aos que
 * foram na nota (com os valores), e o valor da nota passa a ser conhecido.
 * Sem a OS, o recibo da Giap não tem onde mostrar (fica como era).
 */
export function comValoresGuardados(
  os: OsDoRecibo | null,
  valores: ValoresGuardadosDaNota | null,
): { os: OsDoRecibo | null; valorDaNota: number | null } {
  if (!os || !valores) return { os, valorDaNota: null };
  return {
    os: {
      ...os,
      itens: [
        ...os.itens.filter((i) => i.tipo !== "servico"),
        ...valores.itens.map((i) => ({ tipo: "servico" as const, ...i, garantiaDias: null })),
      ],
    },
    valorDaNota: valores.valorServicos,
  };
}
