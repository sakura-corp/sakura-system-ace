// @vitest-environment jsdom
/**
 * #1115: o cliente espera um PDF que abra no celular e no WhatsApp. A NFC-e
 * da Focus vem em HTML, então o "Baixar o PDF da nota (pro cliente)" gera o
 * PDF do recibo do sistema (montado do XML guardado) pelo Electron. Se não
 * der (fora do Electron, erro), avisa e ainda baixa o arquivo de antes
 * (docs/licoes.md, item 33: aviso, nunca tranca). A NFS-e já vem em PDF da
 * Focus e continua baixando esse PDF. Dados inventados (repositório público).
 */
import { act, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const buscarDanfeEmitida = vi.fn();
const buscarConteudoArquivo = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  baixarArquivo: vi.fn(),
  buscarConteudoArquivo: (...a: unknown[]) => buscarConteudoArquivo(...a),
  buscarDanfeEmitida: (...a: unknown[]) => buscarDanfeEmitida(...a),
}));

// O recibo do PDF usa os mesmos dados extras da "Versão para o cliente" (#1118):
// a OS ligada (veículo, placa) e os dados da loja. Sem acesso, sai sem eles.
const buscarOsDoRecibo = vi.fn();
const buscarLojaDoRecibo = vi.fn();
vi.mock("@/lib/reciboNotaFiscal", () => ({
  buscarOsDoRecibo: (...a: unknown[]) => buscarOsDoRecibo(...a),
  buscarLojaDoRecibo: (...a: unknown[]) => buscarLojaDoRecibo(...a),
  // NFC-e não tem valor guardado (#1142): só a NFS-e.
  buscarValoresGuardadosDaNota: async () => null,
  comValoresGuardados: (os: unknown) => ({ os, valorDaNota: null }),
}));

import { VerDanfeModal } from "./VerDanfeModal";

const nfce: NotaFiscalArquivo = {
  id: "nota-1",
  loja_id: "loja-1",
  tipo: "nfe",
  competencia: "2026-11-01",
  nome_arquivo: "nfe-21.xml",
  storage_path: "nfe/2026-11/x-nfe-21.xml",
  ordem_servico_id: "os-1",
  operador_id: null,
  criado_em: "2026-11-17T12:00:00Z",
  origem: "automatica",
  numero: "21",
  chave_acesso: null,
  status: "autorizado",
  focus_nfe_ref: "os1-nfce-1763380000000",
};

const nfse: NotaFiscalArquivo = {
  ...nfce,
  id: "nota-2",
  tipo: "nfse",
  numero: "7",
  nome_arquivo: "nfse-7.xml",
  focus_nfe_ref: "os1-nfse-1763380000000",
};

const XML_NFCE = `<?xml version="1.0"?>
<nfeProc><NFe><infNFe Id="NFe00000000000000000000000000000000000000000021">
<ide><nNF>21</nNF><serie>1</serie><dhEmi>2026-11-17T10:00:00-03:00</dhEmi></ide>
<emit><xNome>Loja de Exemplo</xNome><CNPJ>00000000000000</CNPJ></emit>
<det><prod><xProd>Pneu de exemplo</xProd><qCom>1</qCom><vUnCom>100.00</vUnCom><vProd>100.00</vProd></prod></det>
<total><ICMSTot><vNF>100.00</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`;

const HTML_DA_FOCUS =
  '<html><body><img src="https://exemplo.invalid/logo.png"><p>DANFE NFC-e</p></body></html>';

interface Baixado {
  nome: string;
  conteudo: Blob;
}
let baixados: Baixado[] = [];
let blobs: Map<string, Blob>;
const gerarPdfDaNota = vi.fn();

beforeEach(() => {
  baixados = [];
  blobs = new Map();
  let n = 0;
  URL.createObjectURL = vi.fn((b: Blob) => {
    const url = `blob:teste-${n++}`;
    blobs.set(url, b);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    baixados.push({ nome: this.download, conteudo: blobs.get(this.getAttribute("href") ?? "")! });
  });
  buscarConteudoArquivo.mockResolvedValue(XML_NFCE);
  buscarOsDoRecibo.mockReset().mockResolvedValue(null);
  buscarLojaDoRecibo.mockReset().mockResolvedValue(null);
  gerarPdfDaNota.mockReset();
  window.sakuraApp = { version: "0.0.0", salvarConexao: vi.fn(), gerarPdfDaNota };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.sakuraApp;
});

const BOTAO_PDF = /Baixar o PDF da nota \(pro cliente\)/;

async function abrir(arquivo: NotaFiscalArquivo, conteudo: Blob) {
  buscarDanfeEmitida.mockResolvedValue(conteudo);
  renderizar(<VerDanfeModal arquivo={arquivo} onFechar={() => {}} />);
  return screen.findByRole("button", { name: BOTAO_PDF });
}

describe("Nota do cliente: Baixar o PDF da nota (pro cliente)", () => {
  it("NFC-e (HTML da Focus): gera o PDF do recibo e salva NFC-e-<número>.pdf", async () => {
    gerarPdfDaNota.mockResolvedValue(new TextEncoder().encode("%PDF-1.4 recibo"));
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFC-e-21.pdf");
    expect(baixados[0].conteudo.type).toBe("application/pdf");
    // O PDF vem do recibo do sistema (montado do XML), não do HTML da Focus.
    expect(gerarPdfDaNota).toHaveBeenCalledTimes(1);
    const html = gerarPdfDaNota.mock.calls[0][0] as string;
    expect(typeof html).toBe("string");
    expect(html).toContain("Pneu de exemplo");
    expect(html).not.toContain("exemplo.invalid");
  });

  it("o PDF leva os dados da OS e da loja, como a Versão para o cliente (#1118)", async () => {
    buscarOsDoRecibo.mockResolvedValue({
      numero: 4321,
      tipo: "os",
      veiculo: "Carro de Exemplo 2020",
      placa: "ABC1D23",
      km: null,
      atendente: null,
      mecanico: null,
      telefoneCliente: null,
      cliente: null,
      itens: [],
    });
    buscarLojaDoRecibo.mockResolvedValue({
      nomeFantasia: "Loja de Exemplo",
      razaoSocial: null,
      cnpj: null,
      inscricaoEstadual: null,
      inscricaoMunicipal: null,
      telefone: "(00) 0000-0000",
      email: null,
      endereco: null,
    });
    gerarPdfDaNota.mockResolvedValue(new TextEncoder().encode("%PDF-1.4 recibo"));
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    await waitFor(() => expect(gerarPdfDaNota).toHaveBeenCalledTimes(1));
    expect(buscarOsDoRecibo).toHaveBeenCalledWith("os-1");
    expect(buscarLojaDoRecibo).toHaveBeenCalledWith("loja-1");
    const html = gerarPdfDaNota.mock.calls[0][0] as string;
    expect(html).toContain("ABC1D23");
    expect(html).toContain("Carro de Exemplo 2020");
  });

  it("sem acesso à OS e à loja, o PDF sai assim mesmo (sem aquelas seções)", async () => {
    buscarOsDoRecibo.mockRejectedValue(new Error("sem permissão"));
    buscarLojaDoRecibo.mockRejectedValue(new Error("sem permissão"));
    gerarPdfDaNota.mockResolvedValue(new TextEncoder().encode("%PDF-1.4 recibo"));
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFC-e-21.pdf");
  });

  it("enquanto gera, o botão diz 'Gerando…' e fica desabilitado: 2 cliques, 1 PDF", async () => {
    let terminar: (b: Uint8Array) => void = () => {};
    gerarPdfDaNota.mockReturnValue(new Promise<Uint8Array>((r) => (terminar = r)));
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    const gerando = await screen.findByRole("button", { name: /Gerando…/ });
    expect(gerando).toBeDisabled();
    fireEvent.click(gerando);

    await act(async () => terminar(new TextEncoder().encode("%PDF-1.4")));
    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(gerarPdfDaNota).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: BOTAO_PDF })).toBeEnabled();
  });

  it("se a geração falha, avisa o que fazer e ainda baixa o arquivo de antes", async () => {
    gerarPdfDaNota.mockRejectedValue(new Error("falhou"));
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFC-e-21.html");
    // O arquivo de antes é o da Focus, como veio (não o da prévia limpa).
    expect(await baixados[0].conteudo.text()).toBe(HTML_DA_FOCUS);
    expect(await screen.findByRole("status")).toHaveTextContent(/Não deu pra gerar o PDF/);
  });

  it("o motivo aparece sem o embrulho do Electron, e a frase aponta a impressora de PDF do Windows", async () => {
    gerarPdfDaNota.mockRejectedValue(
      new Error(
        "Error invoking remote method 'gerar-pdf-da-nota': Error: não deu pra montar o PDF neste computador",
      ),
    );
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("(não deu pra montar o PDF neste computador)");
    expect(aviso).not.toHaveTextContent(/invoking|remote method/);
    expect(aviso).toHaveTextContent(/Microsoft Print to PDF/);
  });

  it("XML que o programa não lê: não gera PDF pela metade, avisa e baixa o de antes", async () => {
    buscarConteudoArquivo.mockResolvedValue("<algumaCoisa/>");
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFC-e-21.html");
    expect(gerarPdfDaNota).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(/não conseguiu ler o XML/);
  });

  it("fora do programa instalado (sem a ponte do Electron), também avisa e baixa o de antes", async () => {
    window.sakuraApp = { version: "0.0.0", salvarConexao: vi.fn() };
    const botao = await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(botao);

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFC-e-21.html");
    expect(await screen.findByRole("status")).toHaveTextContent(/Não deu pra gerar o PDF/);
  });

  it("NFS-e (já vem em PDF da Focus): baixa esse PDF, sem gerar outro", async () => {
    const pdfDaFocus = new Blob(["%PDF-1.4 focus"], { type: "application/pdf" });
    const botao = await abrir(nfse, pdfDaFocus);
    fireEvent.click(botao);

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFS-e-7.pdf");
    expect(baixados[0].conteudo).toBe(pdfDaFocus);
    expect(gerarPdfDaNota).not.toHaveBeenCalled();
    expect(screen.getByText(/O PDF pro cliente é este, como a Focus NFe mandou/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /arquivo original/ })).not.toBeInTheDocument();
  });
});

describe("Nota do cliente: a prévia do DANFE", () => {
  it("a prévia da NFC-e não tem a imagem de fora (o logo quebrado)", async () => {
    await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    const quadro = screen.getByTitle(/Nota do cliente: NFC-e nº 21/);
    const previa = blobs.get(quadro.getAttribute("src") ?? "");
    const texto = await previa!.text();
    expect(texto).toContain("DANFE NFC-e");
    expect(texto).not.toContain("exemplo.invalid");
  });

  it("o arquivo original da Focus continua a um clique, embaixo da prévia", async () => {
    await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    fireEvent.click(screen.getByRole("button", { name: /Baixar o arquivo original da Focus/ }));
    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFC-e-21.html");
    expect(await baixados[0].conteudo.text()).toBe(HTML_DA_FOCUS);
  });

  it("a frase embaixo da prévia diz que o PDF é o recibo, e não o DANFE da prévia", async () => {
    await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    expect(screen.getByText(/O PDF pro cliente é o recibo da nota/)).toBeInTheDocument();
    expect(screen.getByText(/O documento oficial é o XML/)).toBeInTheDocument();
  });

  it("Imprimir e Baixar o XML (pro contador) continuam com os nomes de hoje", async () => {
    await abrir(nfce, new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar o XML \(pro contador\)/ })).toBeInTheDocument();
  });
});

// Decisão da Sofia (20/11, revisão do #1126): nota cancelada não vale mais, e
// o PDF dela sairia limpo, sem marca. A janela mostra a nota (pra conferir),
// mas não oferece o PDF nem a "Versão para o cliente".
describe("Nota do cliente: nota cancelada", () => {
  const cancelada: NotaFiscalArquivo = { ...nfce, status: "cancelado" };

  it("não oferece o PDF pro cliente", async () => {
    buscarDanfeEmitida.mockResolvedValue(new Blob([HTML_DA_FOCUS], { type: "text/html" }));
    renderizar(<VerDanfeModal arquivo={cancelada} onFechar={() => {}} />);
    expect(await screen.findByRole("button", { name: "Imprimir" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: BOTAO_PDF })).not.toBeInTheDocument();
    expect(screen.queryByText(/O PDF pro cliente é/)).not.toBeInTheDocument();
  });

  it("se a nota não carrega, não oferece a Versão para o cliente", async () => {
    buscarDanfeEmitida.mockRejectedValue(new Error("A Focus NFe não devolveu um PDF pra essa nota."));
    renderizar(<VerDanfeModal arquivo={cancelada} onFechar={() => {}} />);
    expect(await screen.findByText(/não devolveu um PDF/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Versão para o cliente/ })).not.toBeInTheDocument();
  });

  it("a autorizada continua oferecendo a Versão para o cliente quando a nota não carrega", async () => {
    buscarDanfeEmitida.mockRejectedValue(new Error("A Focus NFe não devolveu um PDF pra essa nota."));
    renderizar(<VerDanfeModal arquivo={nfce} onFechar={() => {}} />);
    expect(await screen.findByRole("button", { name: /Abrir a Versão para o cliente/ })).toBeInTheDocument();
  });
});
