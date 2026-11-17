import { Check, Copy, Download, Info, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Selo } from "@/components/Selo";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { baixarDiagnostico, coletarDiagnostico } from "@/lib/diagnostico";
import { mensagemDeErro } from "@/lib/errors";
import { AvisoDeErro } from "@/components/Aviso";
import {
  descreverEsquema,
  montarResumo,
  ultimasLinhas,
  type ChecagemDiagnostico,
  type Diagnostico,
} from "@/schemas/diagnostico";

/**
 * Ajuda → Diagnóstico (item TR-08.1 do guia de melhorias).
 *
 * Duas decisões de desenho que valem saber:
 *
 * - **Qualquer operador vê esta tela**, não só o admin. Quem liga pedindo
 *   socorro é quem está no balcão com o cliente na frente, e não é ele quem
 *   tem a senha de administrador. É por isso que o ícone dela fica fora do
 *   bloco `operador.admin` na Sidebar, ao contrário de Auditoria e
 *   Configurações.
 * - **Ela recolhe sozinha ao abrir.** A tela existe pra um momento de
 *   aperto; obrigar a clicar "Verificar" antes de ver qualquer coisa seria
 *   um passo a mais na pior hora possível.
 */

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 border-b border-linha py-2.5 last:border-b-0">
      <span className="w-44 shrink-0 text-rotulo text-texto-2">{rotulo}</span>
      <span className="min-w-0 break-all text-corpo text-texto">{valor}</span>
    </div>
  );
}

function Checagem({ checagem }: { checagem: ChecagemDiagnostico }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-linha py-2.5 last:border-b-0">
      <span className="w-24 shrink-0">
        {checagem.ok ? <Selo tipo="ok" palavra="OK" /> : <Selo tipo="perigo" palavra="Falhou" />}
      </span>
      <span className="w-48 shrink-0 text-corpo font-medium text-texto">{checagem.nome}</span>
      <span className="min-w-0 flex-1 text-corpo text-texto-2">
        {checagem.detalhe} · {checagem.ms} ms
      </span>
    </div>
  );
}

function Registro({ titulo, texto, vazio }: { titulo: string; texto: string; vazio: string }) {
  const linhas = ultimasLinhas(texto, 200);
  return (
    <section className="sakura-card p-5">
      <h2 className="mb-3 text-subtitulo font-semibold text-texto">
        {titulo}{" "}
        <span className="text-rotulo font-normal text-texto-2">
          ({linhas.length === 0 ? "nada registrado" : `últimas ${linhas.length} linhas`})
        </span>
      </h2>
      {linhas.length === 0 ? (
        <p className="text-corpo text-texto-2">{vazio}</p>
      ) : (
        <pre className="max-h-64 overflow-auto rounded-xl bg-poco p-3 text-meta text-texto">
          {linhas.join("\n")}
        </pre>
      )}
    </section>
  );
}

export function DiagnosticoPage() {
  const { operador, lojaAtual } = useAuth();
  // #927: só a coleta mais nova mexe na tela; e se a da loja nova der erro, o
  // diagnóstico guardado (da loja anterior) não aparece.
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  // Sem loja ativa o gancho não começa carga, mas o diagnóstico TEM que rodar
  // (é a tela de socorro, e o relatório diz "nenhuma loja ativa"): aí a coleta
  // mais nova é a de maior número aqui.
  const coletaSemLoja = useRef(0);
  const [dadosGuardados, setDados] = useState<Diagnostico | null>(null);
  const dados = !lojaAtual || dadosSaoDaLoja ? dadosGuardados : null;
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const verificar = useCallback(() => {
    const carga = comecar(lojaAtual?.id);
    // Um "verificar" guardado de antes da troca de loja nem começa.
    if (!carga && lojaAtual) return;
    const minhaSemLoja = ++coletaSemLoja.current;
    const aindaEhAtual = () =>
      carga ? carga.aindaEhAtual() : minhaSemLoja === coletaSemLoja.current;
    setCarregando(true);
    setErro(null);
    setCopiado(false);
    coletarDiagnostico(operador, lojaAtual)
      .then((coletado) => {
        if (!aindaEhAtual()) return;
        setDados(coletado);
        carga?.gravou();
      })
      .catch((err) => {
        if (!aindaEhAtual()) return;
        setErro(mensagemDeErro(err));
      })
      .finally(() => {
        if (aindaEhAtual()) setCarregando(false);
      });
  }, [operador, lojaAtual, comecar]);

  useEffect(verificar, [verificar]);

  async function copiarResumo() {
    if (!dados) return;
    try {
      await navigator.clipboard.writeText(montarResumo(dados));
      setCopiado(true);
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  // O resumo só vale com checagens de verdade e com a rodada terminada: lista
  // vazia daria "tudo certo" sem nada ter rodado, e durante o "Verificar de
  // novo" o resultado antigo ainda estaria na tela.
  const resumoPronto = Boolean(dados) && !carregando && (dados?.checagens.length ?? 0) > 0;
  const falharam = dados ? dados.checagens.filter((c) => !c.ok).length : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="font-titulo text-titulo font-bold text-texto">Diagnóstico</h1>
          <p className="text-corpo text-texto-2">
            O estado deste computador, pronto pra mandar pro suporte
          </p>
        </div>
      </header>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <div className="flex flex-wrap gap-3">
        <Botao
          variante="principal"
          icone={copiado ? <Check /> : <Copy />}
          onClick={copiarResumo}
          disabled={!dados}
        >
          {copiado ? "Resumo copiado" : "Copiar resumo"}
        </Botao>
        <Botao
          icone={<Download />}
          onClick={() => dados && baixarDiagnostico(dados)}
          disabled={!dados}
        >
          Salvar arquivo para enviar
        </Botao>
        <Botao icone={<RefreshCw />} onClick={verificar} ocupado={carregando}>
          {carregando ? "Verificando..." : "Verificar de novo"}
        </Botao>
      </div>

      <p className="flex items-start gap-2.5 rounded-xl border border-linha bg-texto/[0.04] px-4 py-3 text-corpo text-texto-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          O pacote <strong className="text-texto">não leva senha, chave nem token</strong> — isso é
          garantido por teste. Ele leva as últimas linhas do registro de erros deste computador, e um
          erro pode citar algo da tela onde ele aconteceu.
        </span>
      </p>

      {!dados && carregando && <p className="text-corpo text-texto-2">Verificando...</p>}

      {dados && (
        <>
          <section className="sakura-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-subtitulo font-semibold text-texto">Checagens ao vivo</h2>
              {resumoPronto &&
                (falharam === 0 ? (
                  <Selo tipo="ok" palavra="Tudo certo" />
                ) : (
                  <Selo
                    tipo="perigo"
                    palavra={falharam === 1 ? "1 checagem falhou" : `${falharam} checagens falharam`}
                  />
                ))}
            </div>
            {dados.checagens.map((checagem) => (
              <Checagem key={checagem.nome} checagem={checagem} />
            ))}
          </section>

          <section className="sakura-card p-5">
            <h2 className="mb-3 text-subtitulo font-semibold text-texto">Este computador</h2>
            <Linha rotulo="Versão do app" valor={dados.app.versao} />
            <Linha rotulo="Canal de atualização" valor={dados.app.canalAtualizacao} />
            <Linha rotulo="Sistema" valor={dados.app.sistema} />
            <Linha
              rotulo="Electron / Chromium"
              valor={`${dados.app.electron} / ${dados.app.chromium}`}
            />
            <Linha rotulo="Node / Arquitetura" valor={`${dados.app.node} / ${dados.app.arquitetura}`} />
            <Linha
              rotulo="Data e hora daqui"
              valor={`${dados.geradoEm.toLocaleString("pt-BR")} (${dados.fusoDoComputador})`}
            />
            <Linha rotulo="Pasta de dados" valor={dados.app.pastaDados} />
          </section>

          <section className="sakura-card p-5">
            <h2 className="mb-3 text-subtitulo font-semibold text-texto">Conexão e sessão</h2>
            <Linha rotulo="Banco desta empresa" valor={dados.enderecoDoBanco} />
            <Linha rotulo="Versão do banco" valor={descreverEsquema(dados.esquema)} />
            <Linha
              rotulo="Usuário logado"
              valor={`${dados.sessao.nome} (@${dados.sessao.usuario})${
                dados.sessao.admin ? " — administrador" : ""
              }`}
            />
            <Linha rotulo="Loja ativa" valor={dados.sessao.loja} />
          </section>

          <Registro
            titulo="Últimos erros"
            texto={dados.logs.erros}
            vazio="Nenhum erro registrado neste computador — é o que se espera."
          />
          <Registro
            titulo="Últimas atualizações"
            texto={dados.logs.atualizacoes}
            vazio="Nenhuma atualização registrada ainda."
          />
        </>
      )}
    </div>
  );
}
