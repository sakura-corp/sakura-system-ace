import { BarraLateral } from "./componentes/BarraLateral";
import { Contador } from "./componentes/Contador";
import { ListaDeTarefas } from "./componentes/ListaDeTarefas";
import { nomeDaLevaDeExemplo, tarefasDeExemplo } from "./dados/exemplo";
import { pessoasComVariasEmAndamento } from "./logica/contador";

// Tarefa 2 (#351): a leva ainda é de exemplo. A tarefa 6 liga nos dados do GitHub.
export default function App() {
  const tarefas = tarefasDeExemplo;
  const avisos = pessoasComVariasEmAndamento(tarefas);

  return (
    <div className="min-h-screen md:flex">
      <BarraLateral levas={[nomeDaLevaDeExemplo]} atual={nomeDaLevaDeExemplo} />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-8 md:px-8">
        <p className="text-sm font-medium text-texto-2">Painel da Sakura</p>
        <h1 className="font-serif text-3xl font-semibold">{nomeDaLevaDeExemplo}</h1>
        <p className="mt-1 text-sm text-texto-2">Dados de exemplo: ainda sem ligação com o GitHub.</p>

        {avisos.length > 0 && (
          <div role="status" className="mt-4 rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
            {avisos.map((a) => (
              <p key={a.login}>
                {a.login} está com {a.quantas} tarefas em andamento (a regra é uma por vez).
              </p>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Contador tarefas={tarefas} />
        </div>
        <div className="mt-8">
          <ListaDeTarefas tarefas={tarefas} />
        </div>
      </main>
    </div>
  );
}
