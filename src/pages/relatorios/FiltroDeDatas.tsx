/**
 * Os dois campos "De" e "Até" que as abas Lucratividade e Curva ABC repetiam
 * (#990, tarefa 13), no campo de filtro do visual novo. Só aparência: quem
 * guarda as datas e faz as contas continua sendo a aba.
 */
export function FiltroDeDatas({
  de,
  ate,
  aoMudarDe,
  aoMudarAte,
}: {
  de: string;
  ate: string;
  aoMudarDe: (valor: string) => void;
  aoMudarAte: (valor: string) => void;
}) {
  return (
    <>
      <label className="sakura-rotulo w-44">
        De
        <input
          type="date"
          value={de}
          onChange={(e) => aoMudarDe(e.target.value)}
          className="sakura-campo sakura-campo-filtro"
        />
      </label>
      <label className="sakura-rotulo w-44">
        Até
        <input
          type="date"
          value={ate}
          onChange={(e) => aoMudarAte(e.target.value)}
          className="sakura-campo sakura-campo-filtro"
        />
      </label>
    </>
  );
}
