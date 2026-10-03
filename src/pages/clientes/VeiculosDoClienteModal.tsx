import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/Modal";
import type { Cliente } from "@/types/cliente";

/**
 * Os carros de um cliente, abertos pelo "Ver veículos" da lista de Clientes.
 *
 * Substitui a coluna que mostrava uma placa por carro: com dois ou três
 * carros a linha ficava poluída, e carro cadastrado sem placa virava uma
 * caixinha vazia. Aqui cada carro é uma linha inteira que leva pra ficha
 * dele, e o sem placa aparece pela marca e pelo modelo.
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
            <li key={veiculo.id}>
              <button
                type="button"
                onClick={() => navigate(`/veiculos/${veiculo.id}`)}
                title={`Ver a ficha do veículo ${placa || carro || "sem placa"}`}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-sakura-borda-campo px-4 py-3 text-left transition hover:bg-white/10"
              >
                <span className="min-w-0">
                  <span
                    className={`block font-semibold tracking-wide ${
                      placa ? "text-sakura-purple-dark" : "italic text-sakura-muted"
                    }`}
                  >
                    {placa || "sem placa"}
                  </span>
                  {detalhe && (
                    <span className="block truncate text-rotulo text-sakura-muted">{detalhe}</span>
                  )}
                </span>
                <span className="shrink-0 text-rotulo font-medium text-sakura-pink">
                  Ver ficha →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
