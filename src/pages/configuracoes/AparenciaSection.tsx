import { Check, Moon, Sun } from "lucide-react";
import { definirTema, TEMA_ROTULO, TEMAS, useTema, type Tema } from "@/lib/tema";

// O tema DESTE computador (visual novo, #990): escuro, o padrão, ou claro.
// Como o canal de atualização, não mora no banco: cada computador tem a sua
// escolha, guardada nele mesmo. Troca na hora, sem botão de salvar: é só
// aparência, e a pessoa vê o resultado no próprio clique.
const DESCRICAO: Record<Tema, string> = {
  escuro: "Fundo escuro, letra clara. É o padrão do programa.",
  claro: "Fundo claro, letra escura. Bom pra balcão com muita luz, de frente pra rua.",
};
const ICONE = { escuro: Moon, claro: Sun } as const;

export function AparenciaSection() {
  const atual = useTema();
  return (
    <fieldset>
      <legend className="sr-only">Tema deste computador</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {TEMAS.map((tema) => {
          const Icone = ICONE[tema];
          const escolhido = tema === atual;
          return (
            <label
              key={tema}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco ${
                escolhido ? "border-acao bg-acao/10" : "border-linha-forte hover:bg-passar"
              }`}
            >
              <input
                type="radio"
                name="tema"
                className="sr-only"
                checked={escolhido}
                onChange={() => definirTema(tema)}
              />
              <Icone aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-acao-clara" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-corpo font-semibold text-texto">
                  {TEMA_ROTULO[tema]}
                  {escolhido && (
                    <span className="inline-flex items-center gap-1 text-rotulo font-medium text-texto-2">
                      <Check aria-hidden className="h-3.5 w-3.5" />
                      em uso
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-rotulo text-texto-2">{DESCRICAO[tema]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
