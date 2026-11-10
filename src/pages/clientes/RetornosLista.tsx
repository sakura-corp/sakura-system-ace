import { useEffect, useMemo, useState } from "react";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { LinkPlaca } from "@/components/LinkPlaca";
import { useAuth } from "@/contexts/AuthContext";
import { diaBrasileiro, diaLocal, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
  ultimasMensagensPorReferencia,
} from "@/lib/modelosWhatsapp";
import { listarOrdensParaRetornos, listarServicosComIntervalo } from "@/lib/retornos";
import {
  listaDeRetornos,
  retornosPrevistos,
  type OrdemParaRetorno,
  type RetornoDoCliente,
  type ServicoComIntervalo,
} from "@/schemas/retornos";
import { preencherModelo, telefoneParaWhatsapp } from "@/schemas/whatsapp";
import type { Cliente } from "@/types/cliente";

/**
 * A lista "Retornos" (FN-06, #381): quem já deveria ter voltado e quem deve
 * voltar nesta semana. Mesmo jeito da lista de clientes que sumiram: as OS e
 * os serviços só são buscados quando a pessoa abre a lista, a abertura do
 * WhatsApp é registrada (a conversa foi ABERTA; se a mensagem saiu, só quem
 * mandou sabe) e a data da última abertura aparece na linha.
 *
 * Nenhuma conta aqui: tudo sai de `schemas/retornos.ts`.
 */

/** O que identifica um retorno na tabela `whatsapp_mensagens` (um carro + um serviço). */
const referenciaDoRetorno = (r: { veiculoId: string; servicoId: string }) => `${r.veiculoId}:${r.servicoId}`;

function quandoVence(diasDeAtraso: number): string {
  if (diasDeAtraso > 0) return diasDeAtraso === 1 ? "1 dia de atraso" : `${diasDeAtraso} dias de atraso`;
  if (diasDeAtraso === 0) return "vence hoje";
  const faltam = -diasDeAtraso;
  return faltam === 1 ? "vence em 1 dia" : `vence em ${faltam} dias`;
}

export function RetornosLista({ clientes }: { clientes: Cliente[] }) {
  const { operador, lojaAtual } = useAuth();
  const [ordens, setOrdens] = useState<OrdemParaRetorno[] | null>(null);
  const [servicos, setServicos] = useState<ServicoComIntervalo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Record<string, string>>({});
  const [ultimosAvisos, setUltimosAvisos] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let valendo = true;
    Promise.all([listarOrdensParaRetornos(), listarServicosComIntervalo()])
      .then(([listaOrdens, listaServicos]) => {
        if (!valendo) return;
        setOrdens(listaOrdens);
        setServicos(listaServicos);
      })
      .catch((err) => {
        console.error("Erro ao carregar os retornos:", err);
        if (valendo) setErro(mensagemDeErro(err));
      });
    return () => {
      valendo = false;
    };
  }, []);

  // O texto do modelo e os "avisado em" são de cada LOJA; trocar de loja com
  // a tela aberta traz os da loja nova.
  const lojaId = lojaAtual?.id;
  useEffect(() => {
    if (!lojaId) return;
    let valendo = true;
    setModelos({});
    setUltimosAvisos(new Map());
    Promise.all([listarModelosWhatsapp(lojaId), ultimasMensagensPorReferencia(lojaId, "retorno")])
      .then(([modelosDaLoja, avisos]) => {
        if (!valendo) return;
        setModelos(modelosDaLoja);
        setUltimosAvisos(avisos);
      })
      .catch((err) => {
        console.error("Erro ao carregar os modelos de WhatsApp:", err);
        if (valendo) setErro(mensagemDeErro(err));
      });
    return () => {
      valendo = false;
    };
  }, [lojaId]);

  const lista = useMemo(() => {
    if (!ordens) return null;
    const hoje = hojeLocal();
    return listaDeRetornos(retornosPrevistos(ordens, servicos, hoje), clientes, hoje);
  }, [ordens, servicos, clientes]);

  if (erro) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>;
  }
  if (!lista) return <p className="text-corpo text-sakura-muted">Carregando...</p>;

  function texto({ retorno, cliente }: RetornoDoCliente<Cliente>): string {
    return preencherModelo(textoDoModelo(modelos, "retorno"), {
      cliente: cliente.nome,
      loja: lojaAtual?.nome,
      servico: retorno.servico,
      veiculo: retorno.veiculo,
      placa: retorno.placa,
    });
  }

  function aoAbrir({ retorno, cliente }: RetornoDoCliente<Cliente>) {
    if (!lojaAtual) return;
    registrarMensagemAberta(
      lojaAtual.id,
      "retorno",
      referenciaDoRetorno(retorno),
      cliente.telefone ?? null,
      operador?.id ?? null,
    ).then(() =>
      ultimasMensagensPorReferencia(lojaAtual.id, "retorno")
        .then(setUltimosAvisos)
        .catch((err) => console.error("Erro ao recarregar os avisos:", err)),
    );
  }

  function tabela(titulo: string, linhas: RetornoDoCliente<Cliente>[], vazio: string) {
    return (
      <section className="space-y-2">
        <h2 className="text-corpo font-semibold text-sakura-purple-dark">
          {titulo} ({linhas.length})
        </h2>
        {linhas.length === 0 ? (
          <p className="text-corpo text-sakura-muted">{vazio}</p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="w-full table-fixed text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="w-[22%] px-4 py-3 font-medium">Cliente</th>
                  <th className="w-[28%] px-4 py-3 font-medium">Carro</th>
                  <th className="w-[20%] px-4 py-3 font-medium">Serviço</th>
                  <th className="w-[15%] px-4 py-3 font-medium">Previsto pra</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const { retorno, cliente } = linha;
                  const avisado = ultimosAvisos.get(referenciaDoRetorno(retorno));
                  // Aviso de um retorno anterior (antes da última OS) não vale pra este.
                  const avisoDeste = avisado && diaLocal(avisado) >= retorno.ultimoDia ? avisado : null;
                  const semTelefone = telefoneParaWhatsapp(cliente.telefone) === null;
                  return (
                    <tr key={referenciaDoRetorno(retorno)} className="border-t border-sakura-gray/20">
                      <td className="px-4 py-3">
                        {cliente.nome}
                        <span className="block text-rotulo text-sakura-muted">{cliente.telefone || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="mr-2">{retorno.veiculo}</span>
                        <LinkPlaca veiculoId={retorno.veiculoId} placa={retorno.placa} />
                      </td>
                      <td className="px-4 py-3">{retorno.servico}</td>
                      <td className="px-4 py-3">
                        <span className="whitespace-nowrap">{diaBrasileiro(retorno.prevista)}</span>
                        {retorno.estimadoPeloKm && (
                          <span className="block text-rotulo text-sakura-muted">estimado pelo KM</span>
                        )}
                        <span className="block text-rotulo text-sakura-muted">
                          {quandoVence(retorno.diasDeAtraso)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {avisoDeste && (
                            <span
                              className="text-rotulo text-sakura-muted"
                              title="O sistema só sabe que a conversa foi aberta — se a mensagem foi mesmo enviada, só você sabe."
                            >
                              avisado em {new Date(avisoDeste).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {semTelefone ? (
                            <button
                              type="button"
                              disabled
                              title="Este cliente está sem telefone válido no cadastro."
                              className="inline-flex h-8 items-center rounded-lg border border-sakura-borda-campo px-3 text-rotulo text-sakura-muted opacity-60"
                            >
                              Sem telefone
                            </button>
                          ) : (
                            <BotaoWhatsapp
                              telefone={cliente.telefone}
                              texto={texto(linha)}
                              rotulo="Avisar"
                              titulo="Abrir a conversa no WhatsApp com a mensagem pronta lembrando do retorno"
                              aoAbrir={() => aoAbrir(linha)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const nada = lista.atrasados.length === 0 && lista.estaSemana.length === 0;

  return (
    <div className="space-y-6">
      <p className="text-rotulo text-sakura-muted">
        É uma previsão: conta o intervalo de cada serviço a partir da última OS faturada do carro. Quem
        está marcado como &quot;não mandar lembrete&quot; no cadastro não aparece.
      </p>
      {nada ? (
        <p className="text-corpo text-sakura-muted">
          Nenhum retorno pra avisar agora. Só aparece serviço que tem um intervalo (em dias ou em km)
          preenchido no cadastro de Serviços.
        </p>
      ) : (
        <>
          {tabela("Atrasados", lista.atrasados, "Ninguém atrasado.")}
          {tabela("Nesta semana", lista.estaSemana, "Ninguém pra voltar nesta semana.")}
        </>
      )}
    </div>
  );
}
