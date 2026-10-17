// A sala do painel (tarefa #355): um Durable Object (versão com SQLite, que está no plano grátis)
// que segura as conexões WebSocket de todos os painéis abertos e repassa cada aviso a todas.
// Só existe uma sala (`idFromName("painel")`). Ela não guarda nada: quem se conecta e o que
// chega são passageiros, então a API com hibernação (`acceptWebSocket`) deixa a sala dormir
// sem derrubar as conexões.
//
// Não estende `DurableObject` (de "cloudflare:workers") pra o worker continuar testável no Node;
// o runtime aceita a classe simples com `fetch` e os `webSocket*`.

/** Pedaço do `DurableObjectState` que a sala usa. */
export interface EstadoDaSala {
  acceptWebSocket(ws: unknown): void;
  getWebSockets(): { send(mensagem: string): void }[];
}

// Só existem dentro do runtime da Cloudflare.
declare const WebSocketPair: new () => { 0: unknown; 1: unknown };

export class SalaDoPainel {
  constructor(private readonly ctx: EstadoDaSala, _env: unknown) {}

  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Interno: o worker repassa o aviso do webhook. A sala só é alcançável pelo binding.
    if (pathname === "/aviso") {
      if (request.method !== "POST") return new Response("método não permitido", { status: 405 });
      this.avisar(await request.text());
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("esta rota espera uma conexão WebSocket", { status: 426 });
    }
    const par = new WebSocketPair();
    this.ctx.acceptWebSocket(par[1]);
    return new Response(null, { status: 101, webSocket: par[0] } as ResponseInit);
  }

  /** Manda o texto a todas as conexões; uma que já morreu não derruba as outras. */
  avisar(mensagem: string): number {
    let enviados = 0;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(mensagem);
        enviados++;
      } catch {
        // conexão que caiu: o painel dela reconecta sozinho
      }
    }
    return enviados;
  }

  /** O painel não manda nada à sala; o que vier é ignorado. */
  webSocketMessage(): void {}

  webSocketClose(ws: { close(codigo?: number): void }): void {
    try {
      ws.close(1000);
    } catch {
      // já fechada
    }
  }

  webSocketError(ws: { close(codigo?: number): void }): void {
    this.webSocketClose(ws);
  }
}
