import { useNavigate } from "react-router-dom";
import { Botao } from "@/components/Botao";
import { LinkPlaca } from "@/components/LinkPlaca";
import { Modal } from "@/components/Modal";
import type { Cliente } from "@/types/cliente";

/**
 * Os carros de um cliente, abertos pelo "Ver veículos" da lista de Clientes.
 *
 * Substitui a coluna que mostrava uma placa por carro: com dois ou três
 * carros a linha ficava poluída, e carro cadastrado sem placa virava uma
 * caixinha vazia. Aqui cada carro é uma linha inteira que leva pra ficha
 * dele, e o sem placa aparece pela marca e pelo modelo.
 *
 * No visual novo (#990, tarefa 8) a placa é a `LinkPlaca` de sempre (que já é
 * o atalho pra ficha) e o "Ver ficha" é um botão de verdade ao lado dela:
 * antes a linha inteira era um botão, e a placa de dentro era só texto.
 */
export function VeiculosDoClienteModal({
  cliente,
  onFechar,
}: {
  cliente: Cliente;
  onFechar: () => void;
}) {
  const navigate = useNavigate();
  const veiculos = cliente.veiculos ?? [];

  return (
    <Modal titulo={`Veículos de ${cliente.nome}`} onFechar={onFechar}>
      <ul className="space-y-2">
        {veiculos.map((veiculo) => {
          const placa = veiculo.placa.trim();
          const carro = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ");
          const detalhe = [carro, veiculo.ano, veiculo.cor].filter(Boolean).join(" · ");
          return (
            <li
              key={veiculo.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-linha bg-poco px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {placa ? (
                  <LinkPlaca veiculoId={veiculo.id} placa={placa} />
                ) : (
                  <span className="shrink-0 italic text-texto-2">sem placa</span>
                )}
                {detalhe && <span className="min-w-0 truncate text-corpo text-texto-2">{detalhe}</span>}
              </div>
              <Botao
                tamanho="pequeno"
                aria-label={`Ver ficha do veículo ${placa || carro || "sem placa"}`}
                onClick={() => navigate(`/veiculos/${veiculo.id}`)}
              >
                Ver ficha
              </Botao>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
