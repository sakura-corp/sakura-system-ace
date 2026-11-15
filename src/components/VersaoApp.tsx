export function VersaoApp() {
  const versao = window.sakuraApp?.version;
  if (!versao) return null;

  return (
    <span className="pointer-events-none fixed bottom-2 right-3 z-50 rounded-full bg-fundo/70 px-2.5 py-0.5 text-meta text-texto-2">
      versão {versao}
    </span>
  );
}
