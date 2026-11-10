/**
 * Importação de planilha (tarefa #457): sugerir as colunas e conferir cada
 * linha antes de gravar.
 *
 * Função pura: não fala com o banco (quem já está cadastrado chega pronto em
 * `CadastroExistente`) nem com a tela. Decisão da Sofia: só CSV, e "já existe"
 * só pula — nunca muda o cadastro de quem já está lá.
 *
 * Decisões desta parte (a gravação e a tela leem daqui):
 *  - Só o nome é obrigatório. Sem nome, a linha é "problema" e não entra.
 *  - Documento com dígito errado ou tamanho estranho: "problema", a linha toda
 *    fica de fora (documento errado liga o cliente à pessoa errada).
 *  - Placa em formato estranho: o cliente entra, o veículo não, com aviso. A
 *    linha só vira "problema" se não sobrar nada novo pra gravar.
 *  - Placa repetida na própria planilha: a segunda linha é "problema" e fica
 *    inteira de fora.
 *  - Placa que já está no banco: a linha é "ja_existe" e fica inteira de fora.
 *  - `cpf_cnpj` é gravado só com os dígitos (o formulário grava o que a pessoa
 *    digitou; só dígitos evita o mesmo CPF entrar duas vezes com e sem ponto).
 *    Telefone é gravado como veio (igual o formulário); `telefoneParaWhatsapp`
 *    só serve pra avisar de número estranho. Textos vazios viram "" (como o
 *    formulário); data, ano e km vazios viram null.
 *  - Linha em branco no meio da planilha some em `lerCsv`, então o número da
 *    linha é a posição entre as linhas com conteúdo (+2).
 */

import type { NovoCliente, NovoVeiculo, TipoPessoa } from "@/types/cliente";
import { chaveDePlaca, parecePlaca, semAcento } from "./buscaGlobal";
import { cnpjValido, cpfValido } from "./pix";
import { telefoneParaWhatsapp } from "./whatsapp";

export type CampoImportacao =
  | "ignorar"
  | "nome"
  | "cpf_cnpj"
  | "telefone"
  | "email"
  | "cep"
  | "rua"
  | "numero"
  | "bairro"
  | "cidade"
  | "uf"
  | "data_nascimento"
  | "placa"
  | "marca"
  | "modelo"
  | "ano"
  | "cor"
  | "km_atual";

export const CAMPOS_IMPORTACAO: {
  campo: CampoImportacao;
  rotulo: string;
  grupo: "cliente" | "veiculo" | "nenhum";
}[] = [
  { campo: "ignorar", rotulo: "Não importar esta coluna", grupo: "nenhum" },
  { campo: "nome", rotulo: "Nome", grupo: "cliente" },
  { campo: "cpf_cnpj", rotulo: "CPF ou CNPJ", grupo: "cliente" },
  { campo: "telefone", rotulo: "Telefone", grupo: "cliente" },
  { campo: "email", rotulo: "E-mail", grupo: "cliente" },
  { campo: "cep", rotulo: "CEP", grupo: "cliente" },
  { campo: "rua", rotulo: "Rua", grupo: "cliente" },
  { campo: "numero", rotulo: "Número", grupo: "cliente" },
  { campo: "bairro", rotulo: "Bairro", grupo: "cliente" },
  { campo: "cidade", rotulo: "Cidade", grupo: "cliente" },
  { campo: "uf", rotulo: "UF", grupo: "cliente" },
  { campo: "data_nascimento", rotulo: "Data de nascimento", grupo: "cliente" },
  { campo: "placa", rotulo: "Placa", grupo: "veiculo" },
  { campo: "marca", rotulo: "Marca", grupo: "veiculo" },
  { campo: "modelo", rotulo: "Modelo", grupo: "veiculo" },
  { campo: "ano", rotulo: "Ano", grupo: "veiculo" },
  { campo: "cor", rotulo: "Cor", grupo: "veiculo" },
  { campo: "km_atual", rotulo: "Km atual", grupo: "veiculo" },
];

/** Nomes que cada campo costuma ter, já sem acento, minúsculo e sem símbolo. */
const SINONIMOS: Record<Exclude<CampoImportacao, "ignorar">, string[]> = {
  nome: ["nome", "nome completo", "razao social", "cliente", "nome do cliente", "nome cliente"],
  cpf_cnpj: ["cpf", "cnpj", "cpf cnpj", "cpfcnpj", "documento", "doc", "cpf ou cnpj", "cnpj cpf"],
  telefone: ["fone", "telefone", "celular", "whatsapp", "whats", "tel", "contato", "fone celular"],
  email: ["email", "e mail", "correio eletronico"],
  cep: ["cep"],
  rua: ["rua", "endereco", "logradouro", "avenida"],
  numero: ["numero", "num", "nro", "n"],
  bairro: ["bairro"],
  cidade: ["cidade", "municipio"],
  uf: ["uf", "estado"],
  data_nascimento: ["data de nascimento", "data nascimento", "nascimento", "nasc", "data nasc", "aniversario"],
  placa: ["placa", "placa do veiculo", "placa veiculo"],
  marca: ["marca", "fabricante"],
  modelo: ["modelo", "veiculo", "carro"],
  ano: ["ano", "ano do veiculo", "ano modelo", "ano fabricacao"],
  cor: ["cor"],
  km_atual: ["km", "km atual", "quilometragem", "quilometragem atual", "odometro"],
};

function nomeDeColuna(texto: string): string {
  return semAcento(texto)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sugerirMapeamento(cabecalho: string[]): CampoImportacao[] {
  const usados = new Set<CampoImportacao>();
  return cabecalho.map((coluna) => {
    const nome = nomeDeColuna(coluna);
    for (const [campo, nomes] of Object.entries(SINONIMOS) as [CampoImportacao, string[]][]) {
      if (nomes.includes(nome) && !usados.has(campo)) {
        usados.add(campo);
        return campo;
      }
    }
    return "ignorar";
  });
}

export interface CadastroExistente {
  clientes: { id: string; nome: string; cpf_cnpj: string | null }[];
  /** Como estão no banco; a conferência normaliza. */
  placas: string[];
}

export type SituacaoLinha = "entra" | "ja_existe" | "problema";

export interface LinhaConferida {
  /** Número da linha NA PLANILHA: cabeçalho = 1, primeira de dados = 2. */
  linha: number;
  situacao: SituacaoLinha;
  problemas: string[];
  avisos: string[];
  nome: string;
  documento: string | null;
  placa: string | null;
}

export interface ClienteParaImportar {
  /** Documento só com dígitos, ou "nome:" + nome normalizado. */
  chave: string;
  /** Diferente de null: o cliente já existe — grava só os veículos novos. */
  clienteExistenteId: string | null;
  cliente: NovoCliente;
  veiculos: NovoVeiculo[];
  linhas: number[];
}

export interface ResultadoConferencia {
  linhas: LinhaConferida[];
  /** Só o que vai ser gravado: clientes novos e existentes com veículo novo. */
  clientes: ClienteParaImportar[];
  resumo: {
    totalLinhas: number;
    entram: number;
    jaExistem: number;
    comProblema: number;
    clientesNovos: number;
    veiculosNovos: number;
  };
}

function nomeNormalizado(nome: string): string {
  return semAcento(nome).replace(/\s+/g, " ").trim();
}

function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** `dd/mm/aaaa` (ou `aaaa-mm-dd`) → `aaaa-mm-dd`, sem `Date`: sem fuso. */
function converterData(texto: string): string | null {
  let dia: number;
  let mes: number;
  let ano: number;
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(texto);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (br) [dia, mes, ano] = [Number(br[1]), Number(br[2]), Number(br[3])];
  else if (iso) [ano, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  if (ano < 1900 || ano > 2100 || mes < 1 || mes > 12 || dia < 1) return null;
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const diasDoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  if (dia > diasDoMes) return null;
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

function converterKm(texto: string): number | null {
  const limpo = texto.toLowerCase().replace(/km/g, "").replace(/[\s.]/g, "");
  if (!/^\d+(,\d+)?$/.test(limpo)) return null;
  return Math.floor(Number(limpo.replace(",", ".")));
}

function textoDaLinha(
  linha: string[],
  mapeamento: CampoImportacao[],
): Partial<Record<CampoImportacao, string>> {
  const valores: Partial<Record<CampoImportacao, string>> = {};
  mapeamento.forEach((campo, i) => {
    if (campo === "ignorar" || valores[campo] !== undefined) return;
    valores[campo] = (linha[i] ?? "").trim();
  });
  return valores;
}

export function conferirLinhas(
  linhas: string[][],
  mapeamento: CampoImportacao[],
  existente: CadastroExistente,
): ResultadoConferencia {
  const clientesPorDoc = new Map<string, string>();
  const clientesPorNome = new Map<string, string>();
  for (const c of existente.clientes) {
    const doc = soDigitos(c.cpf_cnpj ?? "");
    if (doc !== "" && !clientesPorDoc.has(doc)) clientesPorDoc.set(doc, c.id);
    const nome = nomeNormalizado(c.nome);
    if (nome !== "" && !clientesPorNome.has(nome)) clientesPorNome.set(nome, c.id);
  }
  const placasNoBanco = new Set(existente.placas.map(chaveDePlaca));
  const placasDaPlanilha = new Set<string>();

  const grupos = new Map<string, ClienteParaImportar>();
  const resultadoLinhas: LinhaConferida[] = [];

  linhas.forEach((bruta, indice) => {
    const v = textoDaLinha(bruta, mapeamento);
    const problemas: string[] = [];
    const avisos: string[] = [];
    const nome = (v.nome ?? "").replace(/\s+/g, " ");
    const docDigitos = soDigitos(v.cpf_cnpj ?? "");
    const placaTexto = v.placa ?? "";

    const conferida = (situacao: SituacaoLinha): LinhaConferida => ({
      linha: indice + 2,
      situacao,
      problemas,
      avisos,
      nome,
      documento: docDigitos || null,
      placa: placaTexto === "" ? null : chaveDePlaca(placaTexto),
    });
    const terminar = (situacao: SituacaoLinha) => {
      resultadoLinhas.push(conferida(situacao));
    };

    if (nome === "") {
      problemas.push("sem nome");
      return terminar("problema");
    }

    let tipoPessoa: TipoPessoa = "fisica";
    if (docDigitos !== "") {
      if (docDigitos.length === 11) {
        if (!cpfValido(docDigitos)) problemas.push("CPF com dígito errado");
      } else if (docDigitos.length === 14) {
        tipoPessoa = "juridica";
        if (!cnpjValido(docDigitos)) problemas.push("CNPJ com dígito errado");
      } else {
        problemas.push("documento com tamanho estranho (CPF tem 11 números, CNPJ tem 14)");
      }
    }
    if (problemas.length > 0) return terminar("problema");

    // Placa.
    let placa: string | null = null;
    let placaEstranha = false;
    if (placaTexto !== "") {
      if (parecePlaca(placaTexto)) placa = chaveDePlaca(placaTexto);
      else placaEstranha = true;
    }
    if (placa !== null) {
      if (placasNoBanco.has(placa)) {
        avisos.push("placa já cadastrada: a linha foi pulada");
        return terminar("ja_existe");
      }
      if (placasDaPlanilha.has(placa)) {
        problemas.push("placa repetida na planilha");
        return terminar("problema");
      }
    }

    // O cliente: já existe no banco, ou já apareceu antes na planilha, ou é novo.
    const chave = docDigitos !== "" ? docDigitos : `nome:${nomeNormalizado(nome)}`;
    const existenteId =
      docDigitos !== "" ? (clientesPorDoc.get(docDigitos) ?? null) : (clientesPorNome.get(nomeNormalizado(nome)) ?? null);
    let grupo = grupos.get(chave);
    const clienteJaNaPlanilha = grupo !== undefined;
    const clienteNovoNestaLinha = !clienteJaNaPlanilha && existenteId === null;

    // Veículo.
    let veiculo: NovoVeiculo | null = null;
    if (placa !== null) {
      let ano: number | null = null;
      if ((v.ano ?? "") !== "") {
        if (/^\d{4}$/.test(v.ano!) && Number(v.ano) >= 1900 && Number(v.ano) <= 2100) ano = Number(v.ano);
        else avisos.push("ano em formato estranho: ficou em branco");
      }
      let km: number | null = null;
      if ((v.km_atual ?? "") !== "") {
        km = converterKm(v.km_atual!);
        if (km === null) avisos.push("km em formato estranho: ficou em branco");
      }
      veiculo = {
        placa,
        marca: v.marca ?? "",
        modelo: v.modelo ?? "",
        ano,
        cor: v.cor ?? "",
        tipo: null,
        km_atual: km,
      };
    } else if (placaEstranha) {
      avisos.push("placa em formato estranho: o veículo não entra");
    }

    const algoNovo = clienteNovoNestaLinha || veiculo !== null;
    if (!algoNovo) {
      if (placaEstranha) {
        problemas.push("placa em formato estranho");
        return terminar("problema");
      }
      avisos.push(
        existenteId !== null ? "cliente já existe: nada novo pra importar" : "cliente repetido na planilha",
      );
      return terminar("ja_existe");
    }

    // Campos do cliente (só montados se ele for novo).
    if (clienteNovoNestaLinha) {
      let telefone = v.telefone ?? "";
      if (telefone !== "" && telefoneParaWhatsapp(telefone) === null) {
        avisos.push("telefone em formato estranho");
      }
      const email = v.email ?? "";
      if (email !== "" && !/^[^\s@]+@[^\s@]+$/.test(email)) avisos.push("e-mail em formato estranho");
      let uf = (v.uf ?? "").toUpperCase();
      if (uf !== "" && !/^[A-Z]{2}$/.test(uf)) {
        avisos.push("UF em formato estranho: ficou em branco");
        uf = "";
      }
      let nascimento: string | null = null;
      if ((v.data_nascimento ?? "") !== "") {
        nascimento = converterData(v.data_nascimento!);
        if (nascimento === null) avisos.push("data em formato estranho: ficou em branco");
      }
      telefone = telefone.trim();
      grupo = {
        chave,
        clienteExistenteId: null,
        cliente: {
          nome,
          tipo_pessoa: tipoPessoa,
          cpf_cnpj: docDigitos,
          telefone,
          email,
          cep: v.cep ?? "",
          rua: v.rua ?? "",
          numero: v.numero ?? "",
          bairro: v.bairro ?? "",
          cidade: v.cidade ?? "",
          uf,
          codigo_municipio: null,
          data_nascimento: nascimento,
        },
        veiculos: [],
        linhas: [],
      };
      grupos.set(chave, grupo);
    } else if (grupo === undefined && existenteId !== null && veiculo !== null) {
      // Cliente que já existe: só entra no resultado porque traz veículo novo.
      avisos.push("cliente já existe: só o veículo entra");
      grupo = {
        chave,
        clienteExistenteId: existenteId,
        cliente: {
          nome,
          tipo_pessoa: tipoPessoa,
          cpf_cnpj: docDigitos,
          telefone: "",
          email: "",
          cep: "",
          rua: "",
          numero: "",
          bairro: "",
          cidade: "",
          uf: "",
          codigo_municipio: null,
          data_nascimento: null,
        },
        veiculos: [],
        linhas: [],
      };
      grupos.set(chave, grupo);
    } else if (grupo !== undefined && grupo.clienteExistenteId !== null) {
      avisos.push("cliente já existe: só o veículo entra");
    }

    if (grupo !== undefined) {
      grupo.linhas.push(indice + 2);
      if (veiculo !== null && placa !== null) {
        grupo.veiculos.push(veiculo);
        placasDaPlanilha.add(placa);
      }
    }
    terminar("entra");
  });

  const clientes = [...grupos.values()];
  const contar = (s: SituacaoLinha) => resultadoLinhas.filter((l) => l.situacao === s).length;
  return {
    linhas: resultadoLinhas,
    clientes,
    resumo: {
      totalLinhas: linhas.length,
      entram: contar("entra"),
      jaExistem: contar("ja_existe"),
      comProblema: contar("problema"),
      clientesNovos: clientes.filter((c) => c.clienteExistenteId === null).length,
      veiculosNovos: clientes.reduce((soma, c) => soma + c.veiculos.length, 0),
    },
  };
}
