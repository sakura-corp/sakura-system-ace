/**
 * Importação de planilha (tarefa #457): ler o arquivo CSV.
 *
 * Só funções puras — sem banco, sem tela. O Excel do Windows salva CSV em
 * Latin-1 (windows-1252) com `;`; Google Planilhas e Mac salvam em UTF-8 com
 * `,`. As duas coisas precisam funcionar sem a pessoa saber o que é isso.
 */

export function decodificarArquivo(bytes: Uint8Array): {
  texto: string;
  codificacao: "utf-8" | "latin-1";
} {
  try {
    // `ignoreBOM: false` (padrão) já tira o BOM do começo.
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { texto, codificacao: "utf-8" };
  } catch {
    return { texto: new TextDecoder("windows-1252").decode(bytes), codificacao: "latin-1" };
  }
}

export interface PlanilhaLida {
  separador: ";" | ",";
  cabecalho: string[];
  linhas: string[][];
  /**
   * A linha DO ARQUIVO onde cada registro de `linhas` começa (cabeçalho = 1).
   * Conta linha em branco e quebra de linha dentro de aspas.
   */
  numerosDeLinha: number[];
}

/** Acha o separador olhando só a primeira linha lógica, fora de aspas. */
function acharSeparador(texto: string): ";" | "," {
  let dentroDeAspas = false;
  let pontoEVirgula = 0;
  let virgula = 0;
  for (const c of texto) {
    if (c === '"') dentroDeAspas = !dentroDeAspas;
    else if (!dentroDeAspas) {
      if (c === "\n" || c === "\r") break;
      if (c === ";") pontoEVirgula++;
      else if (c === ",") virgula++;
    }
  }
  return virgula > pontoEVirgula ? "," : ";";
}

export function lerCsv(texto: string): PlanilhaLida {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  const separador = acharSeparador(texto);

  const todas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroDeAspas = false;
  let linhaTemAlgo = false;
  // Só abre campo entre aspas se a aspa é o primeiro caractere do campo.
  let inicioDeCampo = true;
  // Linha física do arquivo (1 = cabeçalho) e onde o registro atual começou.
  let linhaFisica = 1;
  let inicioDoRegistro = 1;
  const inicios: number[] = [];

  const fecharCampo = () => {
    linha.push(campo);
    campo = "";
    inicioDeCampo = true;
  };
  const fecharLinha = () => {
    fecharCampo();
    if (linhaTemAlgo || linha.some((c) => c.trim() !== "")) {
      todas.push(linha);
      inicios.push(inicioDoRegistro);
    }
    linha = [];
    linhaTemAlgo = false;
    linhaFisica++;
    inicioDoRegistro = linhaFisica;
  };

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentroDeAspas = false;
      } else {
        campo += c;
        if (c === "\n" || (c === "\r" && texto[i + 1] !== "\n")) linhaFisica++;
      }
      continue;
    }
    if (c === '"' && inicioDeCampo) {
      dentroDeAspas = true;
      linhaTemAlgo = true;
      inicioDeCampo = false;
    } else if (c === separador) {
      fecharCampo();
      linhaTemAlgo = true;
    } else if (c === "\r") {
      if (texto[i + 1] === "\n") i++;
      fecharLinha();
    } else if (c === "\n") {
      fecharLinha();
    } else {
      campo += c;
      inicioDeCampo = false;
    }
  }
  if (campo !== "" || linha.length > 0 || linhaTemAlgo) fecharLinha();

  // Linha só de separadores (`;;;`) é linha em branco: o Excel gera isso.
  const manter = todas.map((l) => l.some((c) => c.trim() !== ""));
  const naoVazias = todas.filter((_, i) => manter[i]);
  const numeros = inicios.filter((_, i) => manter[i]);
  if (naoVazias.length === 0) return { separador, cabecalho: [], linhas: [], numerosDeLinha: [] };

  const cabecalho = naoVazias[0].map((c) => c.trim());
  const largura = cabecalho.length;
  const linhas = naoVazias.slice(1).map((l) => {
    const copia = l.slice();
    while (copia.length < largura) copia.push("");
    return copia;
  });
  return { separador, cabecalho, linhas, numerosDeLinha: numeros.slice(1) };
}
