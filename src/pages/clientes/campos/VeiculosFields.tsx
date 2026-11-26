import { type ReactNode, useEffect, useRef, useState } from "react";
import { type Control, type UseFormRegister, type UseFormWatch, useFieldArray } from "react-hook-form";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { JanelaDeConfirmar } from "@/components/JanelaDeConfirmar";
import { VeiculoIcone } from "@/components/VeiculoIcone";
import { JanelaVeiculo } from "@/pages/veiculos/JanelaVeiculo";
import { type ClienteFormValues, type VeiculoFormValues, veiculoFormVazio } from "@/schemas/cliente";
import type { TipoVeiculo } from "@/types/cliente";
import { Secao } from "./FormCompartilhado";

/**
 * Os veículos no cadastro do cliente (#1096): uma linha por carro (o desenho,
 * a placa e o resto escrito), e cada um abre a JANELA do veículo
 * (`JanelaVeiculo`) pra cadastrar ou mexer. Antes era uma grade de 7 campos
 * por carro, aqui dentro.
 *
 * Por que um hook que devolve DUAS partes: a lista mora dentro do `<form>` do
 * cliente, e a janela tem o próprio `<form>` (o molde). Um `<form>` dentro de
 * outro trava o "Salvar" (#1130), então a janela vai DEPOIS do `</form>` do
 * cliente, e a lista e a janela precisam do mesmo `useFieldArray`:
 *
 *     const veiculos = useVeiculosDoCliente({ control, register });
 *     <form>… {veiculos.lista} …</form>
 *     {veiculos.janelas}
 *
 * Nada vai pro banco aqui: a janela devolve o veículo pra lista, e quem grava
 * é o "Salvar cliente", como sempre (`paraVeiculosPreenchidos`).
 */

const TIPOS: string[] = ["hatch", "sedan", "suv", "picape", "moto"];

function temAlgumDado(veiculo: VeiculoFormValues | undefined): boolean {
  if (!veiculo) return false;
  return Object.entries(veiculo).some(([chave, valor]) => chave !== "id" && Boolean(valor?.trim()));
}

function nomeDoVeiculo(veiculo: VeiculoFormValues): string {
  const carro = [veiculo.marca, veiculo.modelo].map((t) => t.trim()).filter(Boolean).join(" ");
  return veiculo.placa.trim() || carro || "sem placa";
}

function descricao(veiculo: VeiculoFormValues): string {
  return [
    [veiculo.marca, veiculo.modelo].map((t) => t.trim()).filter(Boolean).join(" "),
    veiculo.ano.trim(),
    veiculo.cor.trim(),
    veiculo.km_atual.trim() ? `${Number(veiculo.km_atual).toLocaleString("pt-BR")} km` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

type Aberta = { indice: number | null };

export function useVeiculosDoCliente({
  control,
  register,
  watch,
}: {
  control: Control<ClienteFormValues>;
  register: UseFormRegister<ClienteFormValues>;
  watch: UseFormWatch<ClienteFormValues>;
}): { lista: ReactNode; janelas: ReactNode } {
  const { fields, append, update, remove } = useFieldArray({ control, name: "veiculos" });
  const valores = watch("veiculos");
  const [aberta, setAberta] = useState<Aberta | null>(null);
  const [paraRemover, setParaRemover] = useState<number | null>(null);
  // Depois de salvar a janela, o foco vai pra linha do carro: o botão que
  // abriu a janela é desenhado de novo (o `update` troca a chave da linha),
  // e o Modal não acharia pra onde devolver o foco.
  const listaRef = useRef<HTMLDivElement>(null);
  const [focarIndice, setFocarIndice] = useState<number | null>(null);
  useEffect(() => {
    if (focarIndice == null) return;
    listaRef.current?.querySelector<HTMLElement>(`[data-veiculo-indice="${focarIndice}"]`)?.focus();
    setFocarIndice(null);
  }, [focarIndice, fields]);

  // A linha 100% em branco com que todo cliente novo nasce (veiculoFormVazio)
  // não aparece: ela é ignorada no salvar, e mostrar um "sem placa" vazio
  // confundiria.
  const visiveis = fields
    .map((campo, indice) => ({ campo, indice, veiculo: valores?.[indice] }))
    .filter(({ veiculo }) => Boolean(veiculo?.id) || temAlgumDado(veiculo));

  function salvarDaJanela(veiculo: VeiculoFormValues) {
    if (aberta?.indice != null) {
      update(aberta.indice, veiculo);
      setFocarIndice(aberta.indice);
    } else {
      append(veiculo);
      setFocarIndice(fields.length);
    }
    setAberta(null);
  }

  const lista = (
    <Secao titulo="Veículos">
      <div ref={listaRef}>
      {visiveis.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-linha-forte px-6 py-6">
          <p className="text-corpo text-texto-2">
            Nenhum veículo ainda. O carro cadastrado aqui aparece na OS e no pátio do Início.
          </p>
          <Botao onClick={() => setAberta({ indice: null })}>+ Adicionar veículo</Botao>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {visiveis.map(({ campo, indice, veiculo }) => {
              const v = veiculo as VeiculoFormValues;
              const tipo = TIPOS.includes(v.tipo) ? (v.tipo as TipoVeiculo) : null;
              return (
                <li
                  key={campo.id}
                  className="flex min-w-0 items-center gap-4 rounded-xl border border-linha bg-poco px-4 py-3"
                >
                  {/* O id do banco anda com a linha (docs/licoes.md, item 28). */}
                  <input type="hidden" {...register(`veiculos.${indice}.id`)} />
                  <VeiculoIcone tipo={tipo} cor={v.cor} className="h-8 w-16 shrink-0" />
                  <button
                    type="button"
                    data-veiculo-indice={indice}
                    onClick={() => setAberta({ indice })}
                    className="flex min-h-10 min-w-0 flex-1 flex-col items-start rounded-lg text-left focus-visible:outline-2 focus-visible:outline-acao-clara"
                  >
                    <span className="text-corpo font-bold tracking-[0.08em] text-texto">
                      {v.placa.trim() || "Sem placa"}
                    </span>
                    <span className="max-w-full truncate text-rotulo text-texto-2">
                      {descricao(v) || "Sem marca e modelo"}
                    </span>
                  </button>
                  <AcoesDaLinha
                    descricao={`o veículo ${nomeDoVeiculo(v)}`}
                    acoes={[
                      { tipo: "editar", aoClicar: () => setAberta({ indice }) },
                      {
                        tipo: "menu",
                        rotulo: "Remover veículo",
                        perigosa: true,
                        aoClicar: () => setParaRemover(indice),
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
          <Botao tamanho="pequeno" className="mt-4" onClick={() => setAberta({ indice: null })}>
            + Adicionar veículo
          </Botao>
        </>
      )}
      </div>
    </Secao>
  );

  const veiculoAberto =
    aberta?.indice != null ? (valores?.[aberta.indice] ?? veiculoFormVazio) : veiculoFormVazio;
  const veiculoParaRemover = paraRemover != null ? valores?.[paraRemover] : undefined;

  const janelas = (
    <>
      {aberta && (
        <JanelaVeiculo
          inicial={veiculoAberto}
          aoSalvar={salvarDaJanela}
          aoCancelar={() => setAberta(null)}
        />
      )}
      {paraRemover != null && veiculoParaRemover && (
        <JanelaDeConfirmar
          pedido={{
            acao: "Remover o veículo",
            item: nomeDoVeiculo(veiculoParaRemover),
            explicacao: "Ele sai do cadastro deste cliente quando você salvar. As OS antigas continuam, mas deixam de apontar pra este carro.",
            botao: "Remover veículo",
          }}
          aoConfirmar={() => {
            remove(paraRemover);
            setParaRemover(null);
          }}
          aoCancelar={() => setParaRemover(null)}
        />
      )}
    </>
  );

  return { lista, janelas };
}
