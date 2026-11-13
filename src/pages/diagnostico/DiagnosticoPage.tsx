import { useCallback, useEffect, useRef, useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { baixarDiagnostico, coletarDiagnostico } from "@/lib/diagnostico";
import { mensagemDeErro } from "@/lib/errors";
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
    <div className="flex flex-wrap items-baseline gap-2 border-b border-sakura-gray/20 py-2 last:border-b-0">
      <span className="w-44 shrink-0 text-rotulo text-sakura-muted">{rotulo}</span>
      <span className="min-w-0 break-all text-corpo text-sakura-purple-dark">{valor}</span>
    </div>
  );
}

function Checagem({ checagem }: { checagem: ChecagemDiagnostico }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 border-b border-sakura-gray/20 py-2 last:border-b-0">
      <span
        className={`w-24 shrink-0 text-rotulo font-semibold ${
          checagem.ok ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {checagem.ok ? "✓ OK" : "✕ Falhou"}
      </span>
      <span className="w-48 shrink-0 text-corpo text-sakura-purple-dark">{checagem.nome}</span>
      <span className="min-w-0 flex-1 text-corpo text-sakura-muted">
        {checagem.detalhe} · {checagem.ms} ms
      </span>
    </div>
  );
}

function Registro({ titulo, texto, vazio }: { titulo: string; texto: string; vazio: string }) {
  const linhas = ultimasLinhas(texto, 200);
  return (
    <section className="sakura-card p-4">
      <h2 className="mb-2 text-subtitulo font-semibold text-sakura-purple-dark">
        {titulo}{" "}
        <span className="text-rotulo font-normal text-sakura-muted">
          ({linhas.length === 0 ? "nada registrado" : `últimas ${linhas.length} linhas`})
        </span>
      </h2>
      {linhas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">{vazio}</p>
      ) : (
        <pre className="max-h-64 overflow-auto rounded-xl bg-black/30 p-3 text-meta text-sakura-purple-dark">
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

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Diagnóstico</h1>
          <p className="text-corpo text-sakura-muted">
            O estado deste computador, pronto pra mandar pro suporte
          </p>
        </div>
      </header>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={copiarResumo}
          disabled={!dados}
          className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white transition-all hover:bg-sakura-pink disabled:opacity-50"
        >
          {copiado ? "Resumo copiado ✓" : "Copiar resumo"}
        </button>
        <button
          onClick={() => dados && baixarDiagnostico(dados)}
          disabled={!dados}
          className="rounded-xl border border-sakura-borda-campo px-4 py-2 text-corpo font-medium text-sakura-purple-dark transition-all hover:bg-white/10 disabled:opacity-50"
        >
          Salvar arquivo para enviar
        </button>
        <button
          onClick={verificar}
          disabled={carregando}
          className="rounded-xl border border-sakura-borda-campo px-4 py-2 text-corpo font-medium text-sakura-purple-dark transition-all hover:bg-white/10 disabled:opacity-50"
        >
          {carregando ? "Verificando..." : "Verificar de novo"}
        </button>
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
        O pacote <strong>não leva senha, chave nem token</strong> — isso é garantido por teste. Ele
        leva as últimas linhas do registro de erros deste computador, e um erro pode citar algo da
        tela onde ele aconteceu.
      </p>

      {!dados && carregando && (
        <p className="text-corpo text-sakura-muted">Verificando...</p>
      )}

      {dados && (
        <>
          <section className="sakura-card p-4">
            <h2 className="mb-2 text-subtitulo font-semibold text-sakura-purple-dark">
              Checagens ao vivo
            </h2>
            {dados.checagens.map((checagem) => (
              <Checagem key={checagem.nome} checagem={checagem} />
            ))}
          </section>

          <section className="sakura-card p-4">
            <h2 className="mb-2 text-subtitulo font-semibold text-sakura-purple-dark">
              Este computador
            </h2>
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

          <section className="sakura-card p-4">
            <h2 className="mb-2 text-subtitulo font-semibold text-sakura-purple-dark">
              Conexão e sessão
            </h2>
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
