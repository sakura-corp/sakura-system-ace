/**
 * A barra de cima da janela (visual novo, #990, tarefa 6): na cor do programa,
 * com a flor e o nome. Os três botões (minimizar, maximizar, fechar) NÃO são
 * daqui: o Windows os põe por cima, no canto direito (`titleBarOverlay` em
 * electron/main.ts). Esta barra é a faixa de arrastar: arrastar a janela, o
 * duplo clique que maximiza e o encaixe na lateral continuam funcionando.
 *
 * Só aparece no Electron que escondeu a barra do sistema (`barraDaJanela`
 * vem do preload); no navegador e no Mac não existe. Nada do programa pode
 * ficar embaixo dos botões: o `#root` começa abaixo desta barra (globals.css,
 * bloco "tarefa 6").
 */
export function BarraDaJanela() {
  const altura = window.sakuraApp?.barraDaJanela ?? 0;
  if (altura <= 0) return null;
  return (
    <div className="sakura-barra-janela" data-testid="barra-da-janela">
      <img src={`${import.meta.env.BASE_URL}sakura-icon-mini.svg`} alt="" width={16} height={16} />
      <span>Sakura System · AutoCenter Edition</span>
    </div>
  );
}
