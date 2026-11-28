import type { Servico } from "@/types/servico";

/** Minúscula e sem acento: "Troca de Óleo" casa com "oleo". */
function simplificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** A busca da lista de Serviços: acha pelo nome (descrição) e pelo código interno. */
export function servicoCasaComBusca(servico: Pick<Servico, "descricao" | "codigo_interno">, busca: string): boolean {
  const termo = simplificar(busca);
  if (termo === "") return true;
  return (
    simplificar(servico.descricao).includes(termo) ||
    simplificar(servico.codigo_interno ?? "").includes(termo)
  );
}
