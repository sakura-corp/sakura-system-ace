/**
 * A rosca de Relações (#990, tarefa 13): uma divisão que a tela JÁ calculou
 * (quantos itens em cada curva, quanto do vendido é custo e quanto é margem)
 * desenhada como fatias, com a legenda escrita ao lado.
 *
 * **Nenhuma conta de dinheiro é feita aqui**: os valores chegam prontos e a
 * rosca só os desenha em proporção (o valor dividido pelo total das fatias).
 * No máximo 5 fatias, e fatia zerada não aparece. A cor nunca avisa sozinha
 * (regra 4): cada fatia tem o nome e o valor escritos na legenda, e a rosca em
 * si fica escondida do leitor de tela (a legenda diz tudo).
 */

export interface FatiaDaRosca {
  nome: string;
  valor: number;
  /** Uma cor do tema, como `var(--color-ok)`. */
  cor: string;
  /** O valor como a legenda escreve ("3 itens", "R$ 1.000,00"). */
  texto: string;
}

const LADO = 120;
const RAIO = 46;
const ESPESSURA = 16;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** O vão entre fatias, em unidades da circunferência. */
const VAO = 2;

export function GraficoDeRosca({
  fatias,
  descricao,
}: {
  fatias: FatiaDaRosca[];
  descricao: string;
}) {
  const visiveis = fatias.filter((f) => f.valor > 0).slice(0, 5);
  // O inteiro da rosca, só pra proporção do desenho: não é valor em dinheiro.
  let inteiro = 0;
  for (const f of visiveis) inteiro += f.valor;
  if (visiveis.length === 0 || inteiro <= 0) return null;

  let acumulado = 0;
  const arcos = visiveis.map((fatia) => {
    const tamanho = (fatia.valor / inteiro) * CIRCUNFERENCIA;
    const arco = { fatia, inicio: acumulado, tamanho };
    acumulado += tamanho;
    return arco;
  });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3" role="group" aria-label={descricao}>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${LADO} ${LADO}`}
        className="size-[120px] shrink-0 -rotate-90"
      >
        <circle
          cx={LADO / 2}
          cy={LADO / 2}
          r={RAIO}
          fill="none"
          strokeWidth={ESPESSURA}
          style={{ stroke: "var(--grafico-grade)" }}
        />
        {arcos.map(({ fatia, inicio, tamanho }) => (
          <circle
            key={fatia.nome}
            cx={LADO / 2}
            cy={LADO / 2}
            r={RAIO}
            fill="none"
            strokeWidth={ESPESSURA}
            strokeDasharray={`${Math.max(tamanho - (visiveis.length > 1 ? VAO : 0), 0.5)} ${CIRCUNFERENCIA}`}
            strokeDashoffset={-inicio}
            style={{ stroke: fatia.cor }}
          />
        ))}
      </svg>
      <ul className="min-w-0 space-y-1.5">
        {arcos.map(({ fatia }) => (
          <li key={fatia.nome} className="flex items-center gap-2 text-corpo text-texto">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: fatia.cor }}
            />
            <span className="text-texto-2">{fatia.nome}</span>
            <span className="font-semibold">{fatia.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
