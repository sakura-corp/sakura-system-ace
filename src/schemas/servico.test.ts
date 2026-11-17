import { describe, expect, it } from "vitest";
import { paraNovoServico, paraValoresFormulario, servicoFormSchema } from "./servico";
import type { Servico } from "@/types/servico";

const base = paraValoresFormulario();

function validar(campos: Partial<typeof base>) {
  return servicoFormSchema.safeParse({ ...base, descricao: "Troca de óleo", ...campos });
}

describe("intervalo de retorno no formulário de serviço (#381)", () => {
  it("vazio vale (o serviço não gera lembrete) e vira null", () => {
    const r = validar({});
    expect(r.success).toBe(true);
    const novo = paraNovoServico({ ...base, descricao: "x" }, true);
    expect(novo.intervalo_dias).toBeNull();
    expect(novo.intervalo_km).toBeNull();
  });

  it("aceita inteiro positivo e manda número", () => {
    expect(validar({ intervalo_dias: "180", intervalo_km: " 10000 " }).success).toBe(true);
    const novo = paraNovoServico({ ...base, descricao: "x", intervalo_dias: "180", intervalo_km: "10000" }, true);
    expect(novo.intervalo_dias).toBe(180);
    expect(novo.intervalo_km).toBe(10000);
  });

  it.each(["0", "-5", "1.5", "abc", "1e3"])("recusa %j", (valor) => {
    expect(validar({ intervalo_dias: valor }).success).toBe(false);
    expect(validar({ intervalo_km: valor }).success).toBe(false);
  });

  it("tem teto, o mesmo da trava do banco: 3.650 dias e 1.000.000 km", () => {
    expect(validar({ intervalo_dias: "3650", intervalo_km: "1000000" }).success).toBe(true);
    expect(validar({ intervalo_dias: "3651" }).success).toBe(false);
    expect(validar({ intervalo_km: "1000001" }).success).toBe(false);
    expect(validar({ intervalo_dias: "99999999999" }).success).toBe(false);
  });

  it("o formulário nasce com o intervalo do serviço existente", () => {
    const servico = { id: "s", descricao: "Óleo", intervalo_dias: 180, intervalo_km: null } as Servico;
    const valores = paraValoresFormulario(servico);
    expect(valores.intervalo_dias).toBe("180");
    expect(valores.intervalo_km).toBe("");
  });
});
