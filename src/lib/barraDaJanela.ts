/** (Tarefa 6, #990.) Marca o `<html>` quando há barra própria, pro CSS descer o programa abaixo dela. */
export function aplicarBarraDaJanela() {
  const altura = window.sakuraApp?.barraDaJanela ?? 0;
  if (altura <= 0) return;
  document.documentElement.dataset.barra = "propria";
  document.documentElement.style.setProperty("--barra-janela", `${altura}px`);
}
