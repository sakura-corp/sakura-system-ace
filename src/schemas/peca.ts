import { z } from "zod";
import { arredondarCentavo as arredondar } from "./dinheiro";
import type { NovaPeca, Peca } from "@/types/peca";

// Mesma ideia dos outros schemas: formulário trabalha só com strings (mesmo
// pros campos number | null no banco) — a conversão pra NovaPeca acontece só
// na borda, em paraNovaPeca(). "margem" e "quantidade_inicial" só existem no
// formulário, não fazem parte de NovaPeca (margem é derivada, quantidade
// inicial vira um movimento de estoque à parte — ver paraQuantidadeInicial).
export const pecaFormSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição é obrigatória"),
  codigo_barras: z.string(),
  codigo_interno: z.string(),
  marca: z.string(),
  modelo: z.string(),
  unidade: z.string().trim().min(1, "Unidade é obrigatória"),
  categoria_id: z.string(),
  prazo_garantia_dias: z.string(),
  aplicacao: z.string(),
  estoque_minimo: z.string(),
  medida: z.string(),
  indice_carga_velocidade: z.string(),
  dot: z.string(),
  ncm: z.string().trim().min(1, "NCM é obrigatório"),
  cest: z.string().trim().min(1, "C.E.S.T é obrigatório"),
  cfop_padrao: z.string().trim().min(1, "CFOP padrão é obrigatório"),
  origem: z.string().min(1, "Origem é obrigatória"),
  cst_ou_csosn: z.string().trim().min(1, "CST/CSOSN é obrigatório"),
  aliquota_icms: z.string(),
  preco_custo: z.string(),
  margem: z.string(),
  preco_venda: z.string(),
  quantidade_inicial: z.string(),
});

export type PecaFormValues = z.infer<typeof pecaFormSchema>;

export const pecaFormVazio: PecaFormValues = {
  descricao: "",
  codigo_barras: "",
  codigo_interno: "",
  marca: "",
  modelo: "",
  unidade: "UN",
  categoria_id: "",
  prazo_garantia_dias: "",
  aplicacao: "",
  estoque_minimo: "",
  medida: "",
  indice_carga_velocidade: "",
  dot: "",
  ncm: "",
  cest: "",
  cfop_padrao: "",
  origem: "",
  cst_ou_csosn: "",
  aliquota_icms: "",
  preco_custo: "",
  margem: "",
  preco_venda: "",
  quantidade_inicial: "",
};

export function paraValoresFormulario(peca?: Peca): PecaFormValues {
  if (!peca) return pecaFormVazio;
  return {
    descricao: peca.descricao,
    codigo_barras: peca.codigo_barras ?? "",
    codigo_interno: peca.codigo_interno ?? "",
    marca: peca.marca ?? "",
    modelo: peca.modelo ?? "",
    unidade: peca.unidade ?? "UN",
    categoria_id: peca.categoria_id ?? "",
    prazo_garantia_dias: peca.prazo_garantia_dias?.toString() ?? "",
    aplicacao: peca.aplicacao ?? "",
    estoque_minimo: peca.estoque_minimo?.toString() ?? "",
    medida: peca.medida ?? "",
    indice_carga_velocidade: peca.indice_carga_velocidade ?? "",
    dot: peca.dot ?? "",
    ncm: peca.ncm ?? "",
    cest: peca.cest ?? "",
    cfop_padrao: peca.cfop_padrao ?? "",
    origem: peca.origem ?? "",
    cst_ou_csosn: peca.cst_ou_csosn ?? "",
    aliquota_icms: peca.aliquota_icms?.toString() ?? "",
    preco_custo: peca.preco_custo?.toString() ?? "",
    margem: margemAPartirDoPreco(
      peca.preco_custo?.toString() ?? "",
      peca.preco_venda?.toString() ?? "",
    ),
    preco_venda: peca.preco_venda?.toString() ?? "",
    quantidade_inicial: "",
  };
}

const paraTextoOuNulo = (valor: string) => (valor.trim() === "" ? null : valor.trim());
const paraNumeroOuNulo = (valor: string) => (valor.trim() === "" ? null : Number(valor));

export function paraNovaPeca(valores: PecaFormValues): NovaPeca {
  return {
    codigo_interno: paraTextoOuNulo(valores.codigo_interno),
    codigo_barras: paraTextoOuNulo(valores.codigo_barras),
    descricao: valores.descricao.trim(),
    marca: paraTextoOuNulo(valores.marca),
    modelo: paraTextoOuNulo(valores.modelo),
    aplicacao: paraTextoOuNulo(valores.aplicacao),
    estoque_minimo: paraNumeroOuNulo(valores.estoque_minimo),
    medida: paraTextoOuNulo(valores.medida),
    indice_carga_velocidade: paraTextoOuNulo(valores.indice_carga_velocidade),
    dot: paraTextoOuNulo(valores.dot),
    unidade: valores.unidade.trim(),
    preco_custo: paraNumeroOuNulo(valores.preco_custo),
    preco_venda: paraNumeroOuNulo(valores.preco_venda),
    ncm: paraTextoOuNulo(valores.ncm),
    cest: paraTextoOuNulo(valores.cest),
    cfop_padrao: paraTextoOuNulo(valores.cfop_padrao),
    origem: paraTextoOuNulo(valores.origem),
    cst_ou_csosn: paraTextoOuNulo(valores.cst_ou_csosn),
    aliquota_icms: paraNumeroOuNulo(valores.aliquota_icms),
    categoria_id: valores.categoria_id || null,
    prazo_garantia_dias:
      valores.prazo_garantia_dias.trim() === ""
        ? null
        : Math.round(Number(valores.prazo_garantia_dias)),
    ativo: true,
  };
}

export function paraQuantidadeInicial(valores: PecaFormValues): number | null {
  return paraNumeroOuNulo(valores.quantidade_inicial);
}

// --- Cálculo reativo de preço (custo <-> margem % <-> preço final) ---
// Os três campos se atualizam entre si conforme qual deles a pessoa mexeu por
// último (ver PrecosFields.tsx). Retornar `null` significa "não mexe no outro
// campo" (dado insuficiente pra calcular ainda); retornar "" limpa o campo.

export function precoAPartirDaMargem(custo: string, margem: string): string | null {
  const custoNum = Number(custo);
  const margemNum = parseFloat(margem);
  if (custo.trim() === "" || Number.isNaN(custoNum) || Number.isNaN(margemNum)) return null;
  return arredondar(custoNum * (1 + margemNum / 100)).toString();
}

export function margemAPartirDoPreco(custo: string, precoVenda: string): string {
  const custoNum = Number(custo);
  const precoNum = Number(precoVenda);
  if (
    custo.trim() === "" ||
    Number.isNaN(custoNum) ||
    custoNum <= 0 ||
    precoVenda.trim() === "" ||
    Number.isNaN(precoNum)
  ) {
    return "";
  }
  const margem = ((precoNum - custoNum) / custoNum) * 100;
  return (Math.round(margem * 10) / 10).toString();
}

// --- Unidade: lista fechada (item TL-12 do guia) -------------------------
// Era texto livre, e texto livre em unidade custa de dois jeitos: "UN", "Un"
// e "un" viram três coisas diferentes em qualquer agrupamento, e unidade
// divergente do que a nota fiscal espera é rejeição da SEFAZ. A lista abaixo
// são as unidades de medida usadas de verdade num autocenter.
//
// "OUTRA" não é uma unidade — é a saída pra quem precisar de algo que não
// está aqui (o formulário troca o select por um campo digitável). Sem essa
// saída, a lista fechada viraria tranca, que é justamente o que este projeto
// já aprendeu a não fazer (PROJETO_STATUS.md, seção 6, item 33).
export const UNIDADES_PADRAO = [
  { valor: "UN", rotulo: "UN — unidade" },
  { valor: "PC", rotulo: "PC — peça" },
  { valor: "PAR", rotulo: "PAR — par" },
  { valor: "JG", rotulo: "JG — jogo" },
  { valor: "CX", rotulo: "CX — caixa" },
  { valor: "KG", rotulo: "KG — quilo" },
  { valor: "L", rotulo: "L — litro" },
  { valor: "M", rotulo: "M — metro" },
  { valor: "M2", rotulo: "M2 — metro quadrado" },
  { valor: "SV", rotulo: "SV — serviço" },
] as const;

export const UNIDADE_OUTRA = "OUTRA";

export function unidadeEstaNaLista(unidade: string): boolean {
  return UNIDADES_PADRAO.some((u) => u.valor === unidade.trim().toUpperCase());
}

/**
 * Preço de venda menor que o custo. Erro de digitação em preço é silencioso:
 * não dá erro em lugar nenhum, a peça só passa a ser vendida com prejuízo, a
 * cada venda, até alguém reparar no relatório de lucratividade semanas
 * depois. É AVISO, não trava — venda abaixo do custo existe de verdade
 * (queima de estoque parado, peça encalhada), e barrar seria decidir pelo
 * dono da loja.
 *
 * Preço igual ao custo não avisa: margem zero é escolha possível, e avisar
 * nela só ensinaria a ignorar o aviso.
 */
export function precoAbaixoDoCusto(custo: string, precoVenda: string): boolean {
  const custoNum = Number(custo);
  const vendaNum = Number(precoVenda);
  if (custo.trim() === "" || precoVenda.trim() === "") return false;
  if (Number.isNaN(custoNum) || Number.isNaN(vendaNum)) return false;
  if (custoNum <= 0) return false;
  return vendaNum < custoNum;
}

/**
 * A categoria escolhida é a de pneu? Decide se o bloco de pneu (medida,
 * índice de carga/velocidade, DOT) aparece no formulário.
 *
 * Casa pelo NOME da categoria, e não por um id fixo, de propósito: a
 * categoria "Pneus" é semeada pela migration 0030, mas ela é uma linha comum
 * de `categorias` — cada empresa pode renomear, apagar ou criar a sua. Um id
 * cravado no código funcionaria só na loja onde foi escrito.
 */
export function ehCategoriaDePneu(nomeDaCategoria: string | null | undefined): boolean {
  return /pneu/i.test(nomeDaCategoria ?? "");
}

// A "Margem" da lista do Estoque (#835, decisão da #791) é SOBRE A VENDA:
// (venda − custo) / venda. É o que "margem" quer dizer pro dono de loja e pro
// contador (custo 245, venda 389,90 → 37,2%). O campo do cadastro continua
// sendo o acréscimo sobre o custo (`margemAPartirDoPreco`), pra nenhum preço
// mudar de quem já está acostumado a digitar "20%" e ganhar custo + 20%.
export function margemSobreAVenda(custo: string, precoVenda: string): string {
  const custoNum = Number(custo);
  const precoNum = Number(precoVenda);
  if (
    custo.trim() === "" ||
    Number.isNaN(custoNum) ||
    custoNum <= 0 ||
    precoVenda.trim() === "" ||
    Number.isNaN(precoNum) ||
    precoNum <= 0
  ) {
    return "";
  }
  const margem = ((precoNum - custoNum) / precoNum) * 100;
  return (Math.round(margem * 10) / 10).toString();
}
