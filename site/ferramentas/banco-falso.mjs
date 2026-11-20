import { responderComoSupabase, filtrarComoOSupabase, tabelasSemDados } from "./dados-demo.mjs";

// Responde as chamadas ao Supabase com os dados inventados, pra conseguir
// abrir o app de verdade num navegador sem tocar no banco de loja nenhuma.
// Usado tanto pelas imagens do site (gerar-telas.mjs) quanto pelo catálogo
// completo de telas (gerar-catalogo-telas.mjs). Quem decide O QUE responder é
// src/demo/supabaseFalso.ts (a mesma cópia que o modo demonstração do
// programa usa); aqui só se traduz a rota do Playwright pra esse responder.

export { filtrarComoOSupabase, tabelasSemDados };

export async function instalarBancoFalso(contexto) {
  await contexto.route("**demo.supabase.co/**", async (rota) => {
    const req = rota.request();
    const r = responderComoSupabase({
      metodo: req.method(),
      url: req.url(),
      cabecalhos: req.headers(),
      corpo: req.postData(),
    });
    return rota.fulfill({ status: r.status, headers: r.cabecalhos, body: r.corpo });
  });
}
