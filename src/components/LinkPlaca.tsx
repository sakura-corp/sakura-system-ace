import { useNavigate } from "react-router-dom";
import { Dica } from "./Dica";

/**
 * A placa de um carro como atalho pra ficha dele (item FN-04).
 *
 * É um botão, e não um texto com cara de link, pra ter o alvo de clique que
 * o resto das listas tem (item TR-02.1: 32px de altura) — e pra funcionar de
 * teclado. O `stopPropagation` existe porque ele mora dentro de linhas de
 * tabela que já têm clique próprio (na lista de OS, clicar na linha abre a
 * OS): sem ele, o mesmo clique abriria as duas coisas.
 *
 * A aparência é a do visual novo (#990, seção 6 das regras): uma etiqueta
 * escura com uma faixa azul fina em cima, que lembra a placa Mercosul, e a
 * letra grossa e espaçada. Só a aparência mudou; o que ela faz é o de sempre.
 */
export function LinkPlaca({ veiculoId, placa }: { veiculoId: string; placa: string }) {
  const navigate = useNavigate();
  return (
    <Dica texto="Abrir a ficha do veículo">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/veiculos/${veiculoId}`);
        }}
        className="inline-flex h-8 shrink-0 flex-col overflow-hidden rounded-[7px] border border-linha-forte bg-placa align-middle transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-texto motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span data-faixa aria-hidden="true" className="block h-1 w-full shrink-0 bg-placa-faixa" />
        <span className="flex flex-1 items-center px-2.5 text-rotulo font-bold tracking-[0.08em] text-texto">
          {placa}
        </span>
      </button>
    </Dica>
  );
}
