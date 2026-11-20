// @vitest-environment jsdom
//
// Precisa de DOM (DOMParser), como notaFiscalXml.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

// #1142: o valor e os serviços da NFS-e, guardados na emissão num arquivinho
// ao lado do XML (sem migration), e o recibo da Giap montado com eles.
const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  download: vi.fn(),
  from: vi.fn(),
}));
vi.mock("./supabase", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => {
        storage.from(bucket);
        return { upload: storage.upload, download: storage.download };
      },
    },
  },
}));
vi.mock("./clientes", () => ({ buscarClienteEVeiculoDaOrdem: vi.fn() }));

import {
  buscarValoresGuardadosDaNota,
  caminhoDosValores,
  comValoresGuardados,
  guardarValoresDaNota,
} from "./reciboNotaFiscal";
import { interpretarXmlNotaFiscal, montarHtmlVisualNotaFiscal, type OsDoRecibo } from "./notaFiscalXml";
import { lerValoresGuardados, valoresParaGuardar } from "@/schemas/reciboNotaFiscal";
import { arredondarCentavo } from "@/schemas/dinheiro";
import { totalPorTipo, type ItemOS } from "@/types/os";

const XML_CONFIRMACAO_GIAP = `<?xml version="1.0"?>
<nfeResposta><notaFiscal><numeroNota>10</numeroNota><numeroRps>2</numeroRps><loteRps>108320147</loteRps><codigoVerificacao>3499756VTP</codigoVerificacao><link>https://araraquara.giap.com.br/ords/pma/f?p=616:116</link><cnpjPrestador>66217744000170</cnpjPrestador><dataEmissaoRPS>27/08/2026</dataEmissaoRPS><dataEmissaoNF>27/08/2026</dataEmissaoNF><statusEmissao>200</statusEmissao><messages>Nota emitida com sucesso!</messages></notaFiscal></nfeResposta>`;

function servico(descricao: string, quantidade: number, preco: number, desconto = 0): ItemOS {
  return {
    id: descricao,
    tipo: "servico",
    descricao,
    quantidade,
    preco_unitario: preco,
    desconto,
  } as unknown as ItemOS;
}

const SERVICOS = [servico("Alinhamento 3D", 1, 120.1), servico("Balanceamento", 4, 20.333, 1.5)];

function osDoRecibo(itens: OsDoRecibo["itens"]): OsDoRecibo {
  return {
    numero: 1843,
    tipo: "os",
    veiculo: null,
    placa: "ABC1D23",
    km: null,
    atendente: null,
    mecanico: null,
    telefoneCliente: null,
    cliente: { nome: "Cliente Exemplo", documento: null },
    itens,
  };
}

function textoVisivel(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ");
}

beforeEach(() => {
  storage.upload.mockReset();
  storage.download.mockReset();
  storage.from.mockReset();
});

describe("valoresParaGuardar", () => {
  it("guarda o MESMO valor que vai na NFS-e (o total dos serviços, fechado no centavo)", () => {
    const valores = valoresParaGuardar(SERVICOS);
    // O que a emissão manda: totalPorTipo(..., "servico"), arredondado no envio.
    expect(valores.valorServicos).toBe(arredondarCentavo(totalPorTipo(SERVICOS, "servico")));
    expect(valores.itens.map((i) => i.descricao)).toEqual(["Alinhamento 3D", "Balanceamento"]);
  });
});

describe("lerValoresGuardados", () => {
  const bom = () => JSON.parse(JSON.stringify(valoresParaGuardar(SERVICOS)));

  it("lê o que foi guardado", () => {
    expect(lerValoresGuardados(bom())).toEqual(valoresParaGuardar(SERVICOS));
  });

  it("itens que não somam o valor viram null (nunca um número que não bate com a nota)", () => {
    expect(lerValoresGuardados({ ...bom(), valorServicos: bom().valorServicos + 0.01 })).toBeNull();
  });

  it("formato estranho vira null", () => {
    expect(lerValoresGuardados(null)).toBeNull();
    expect(lerValoresGuardados("x")).toBeNull();
    expect(lerValoresGuardados({ ...bom(), versao: 2 })).toBeNull();
    expect(lerValoresGuardados({ ...bom(), itens: [] })).toBeNull();
    expect(lerValoresGuardados({ ...bom(), itens: [{ descricao: "A", quantidade: "1" }] })).toBeNull();
  });
});

describe("o arquivinho no bucket", () => {
  it("fica ao lado do XML, com outro final", () => {
    expect(caminhoDosValores("nfse/2026-11/abc-nfse-10.xml")).toBe("nfse/2026-11/abc-nfse-10.valores.json");
  });

  it("guardar: falha no upload não derruba nada (a nota já saiu)", async () => {
    storage.upload.mockResolvedValue({ error: new Error("sem rede") });
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(guardarValoresDaNota("nfse/x.xml", valoresParaGuardar(SERVICOS))).resolves.toBeUndefined();
    expect(storage.from).toHaveBeenCalledWith("notas-fiscais");
    expect(storage.upload.mock.calls[0][0]).toBe("nfse/x.valores.json");
    aviso.mockRestore();
  });

  it("buscar: só procura em NFS-e emitida pelo programa", async () => {
    expect(await buscarValoresGuardadosDaNota({ tipo: "nfe", origem: "automatica", storage_path: "a.xml" })).toBeNull();
    expect(await buscarValoresGuardadosDaNota({ tipo: "nfse", origem: "manual", storage_path: "a.xml" })).toBeNull();
    expect(storage.download).not.toHaveBeenCalled();
  });

  it("buscar: lê o arquivinho; sem ele (nota antiga), devolve null", async () => {
    const json = JSON.stringify(valoresParaGuardar(SERVICOS));
    storage.download.mockResolvedValueOnce({ data: new Blob([json]), error: null });
    const lido = await buscarValoresGuardadosDaNota({ tipo: "nfse", origem: "automatica", storage_path: "n/a.xml" });
    expect(storage.download).toHaveBeenCalledWith("n/a.valores.json");
    expect(lido?.valorServicos).toBe(valoresParaGuardar(SERVICOS).valorServicos);

    storage.download.mockResolvedValueOnce({ data: null, error: new Error("Object not found") });
    expect(
      await buscarValoresGuardadosDaNota({ tipo: "nfse", origem: "automatica", storage_path: "n/b.xml" }),
    ).toBeNull();
  });
});

describe("recibo da NFS-e da Giap com o valor guardado", () => {
  const dados = () => interpretarXmlNotaFiscal(XML_CONFIRMACAO_GIAP, "nfse");

  it("mostra os serviços que foram na nota e o total, mesmo que a OS tenha ganhado serviço depois", () => {
    const valores = valoresParaGuardar(SERVICOS);
    // Depois da nota, a OS ganhou um serviço e uma peça.
    const osAgora = osDoRecibo([
      { tipo: "servico", descricao: "Alinhamento 3D", quantidade: 1, precoUnitario: 120.1, desconto: 0, garantiaDias: null },
      { tipo: "servico", descricao: "Serviço lançado depois", quantidade: 1, precoUnitario: 50, desconto: 0, garantiaDias: null },
      { tipo: "peca", descricao: "Valvula", quantidade: 4, precoUnitario: 12, desconto: 0, garantiaDias: 90 },
    ]);
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(dados(), { ...comValoresGuardados(osAgora, valores), loja: null }),
    );
    expect(texto).toContain("Documento sem valor fiscal - itens conforme OS nº 1843");
    expect(texto).toContain("Alinhamento 3D");
    expect(texto).toContain("Balanceamento");
    // 120,10 + (4 × 20,333 − 1,50) = 199,93
    expect(valores.valorServicos).toBe(199.93);
    expect(texto).toContain("R$ 199,93");
    expect(texto).not.toContain("Serviço lançado depois");
    expect(texto).not.toContain("Itens na OS");
  });

  it("sem o valor guardado (nota de antes desta versão), fica como era: \"Itens na OS nº X\"", () => {
    const osAgora = osDoRecibo([
      { tipo: "servico", descricao: "Alinhamento 3D", quantidade: 1, precoUnitario: 120.1, desconto: 0, garantiaDias: null },
    ]);
    const texto = textoVisivel(
      montarHtmlVisualNotaFiscal(dados(), { ...comValoresGuardados(osAgora, null), loja: null }),
    );
    expect(texto).toContain("Itens na OS nº 1843");
    expect(texto).not.toContain("Alinhamento 3D");
    expect(texto).not.toContain("R$");
  });
});
