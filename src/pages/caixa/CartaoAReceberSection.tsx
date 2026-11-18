import { useEffect, useState } from "react";
import { Aviso } from "@/components/Aviso";
import { hojeLocal, diaBrasileiro } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { listarCartaoAReceber, type RecebivelCartao } from "@/lib/taxasMaquininha";
import { formatarMoeda } from "@/schemas/dinheiro";
import { agruparCartaoAReceberPorDia } from "@/schemas/taxaMaquininha";

function nomeDaForma(item: RecebivelCartao): string {
  if (item.forma === "cartao_debito") return "Débito";
  if (item.forma === "cartao_credito") {
    return item.parcelas && item.parcelas > 1 ? `Crédito ${item.parcelas}x` : "Crédito à vista";
  }
  return "Cartão";
}

function textoDaParcela(item: RecebivelCartao): string | null {
  if (!item.total_parcelas || item.total_parcelas < 2) return null;
  return `parcela ${item.numero} de ${item.total_parcelas}`;
}

/**
 * "Cartão a receber" (#387): o que as maquininhas ainda vão depositar, dia a
 * dia, já descontada a taxa. Só leitura. Carrega sozinho ao abrir a aba e de
 * novo quando a loja muda (a página dá `key` com a loja).
 */
export function CartaoAReceberSection({ lojaId }: { lojaId: string }) {
  const [itens, setItens] = useState<RecebivelCartao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setItens(null);
    setErro(null);
    listarCartaoAReceber(lojaId, hojeLocal())
      .then((lista) => {
        if (vivo) setItens(lista);
      })
      .catch((err) => {
        if (!vivo) return;
        console.error("Erro ao carregar o cartão a receber:", err);
        setErro(mensagemDeErro(err));
      });
    return () => {
      vivo = false;
    };
  }, [lojaId]);

  if (erro) {
    return (
      <Aviso tipo="perigo" role="alert">
        {erro}
      </Aviso>
    );
  }
  if (itens === null) return <p className="text-corpo text-texto-2">Carregando...</p>;

  const dias = agruparCartaoAReceberPorDia(itens);
  if (dias.length === 0) {
    return (
      <Aviso tipo="info">
        Nada a receber no cartão por enquanto. Os depósitos da maquininha aparecem aqui quando a
        loja informar as taxas em Configurações e faturar uma venda no cartão.
      </Aviso>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-rotulo text-texto-2">
        O que a maquininha ainda vai depositar, já sem a taxa, a partir de hoje. É só uma previsão:
        não vira conta a receber nem lançamento no Caixa.
      </p>
      {dias.map((dia) => (
        <section key={dia.data} className="sakura-card overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-linha px-5 py-3">
            <h2 className="text-corpo font-semibold text-texto">{diaBrasileiro(dia.data)}</h2>
            <p className="text-corpo font-semibold text-texto tabular-nums">
              <span className="mr-2 text-meta font-normal text-texto-2">Total do dia</span>
              {formatarMoeda(dia.total)}
            </p>
          </header>
          <ul className="divide-y divide-linha">
            {dia.itens.map((item) => {
              const parcela = textoDaParcela(item);
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-corpo text-texto">
                      {item.descricao || "Venda no cartão"}
                    </p>
                    <p className="text-rotulo text-texto-2">
                      {nomeDaForma(item)}
                      {parcela ? ` · ${parcela}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-corpo text-texto tabular-nums">
                    {formatarMoeda(item.valor)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
