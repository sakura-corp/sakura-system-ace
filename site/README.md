# Site de apresentação do Sakura System

Página única, em HTML e CSS puros — **sem etapa de build**. Para mudar um texto, é só abrir o
`index.html`, editar e salvar. Não precisa rodar nada.

Não usa React nem Vite de propósito: uma página só não justifica um segundo `node_modules` dentro
do projeto, e assim ela não corre risco de atrapalhar o build ou os testes do aplicativo.

## Arquivos

```
site/
├── index.html          # a página inteira (todo o texto está aqui)
├── styles.css          # a aparência, na mesma paleta do aplicativo
├── sakura-logo.svg     # cópias das artes do app (public/ do projeto)
├── sakura-icon.svg
├── telas/*.jpg         # imagens das telas do sistema, com dados inventados
└── ferramentas/        # como as imagens de telas/ foram geradas (ver abaixo)
```

## Ver no seu computador antes de publicar

```powershell
cd site
python -m http.server 5299
```

E abrir `http://localhost:5299` no navegador. (Tem que ser assim, servindo por um endereço; abrir o
`index.html` com dois cliques faz as imagens e o estilo não carregarem, porque os caminhos são
absolutos.)

## Publicar na Vercel

O repositório já tem uma conexão com a Vercel, de um projeto antigo. Basta apontá-la para cá:

1. Painel da Vercel → o projeto ligado a `sakura-system-ace` → **Settings → General**
2. **Root Directory**: `site`
3. **Framework Preset**: `Other`
4. **Build Command**: deixar vazio · **Output Directory**: deixar vazio
5. Salvar e mandar publicar de novo (**Deployments → Redeploy**)

A partir daí, todo envio para a `main` republica o site sozinho.

Para usar um endereço próprio depois (ex: `sakurasystem.com.br`), é só comprar o domínio e
adicioná-lo em **Settings → Domains** — não muda nada no código.

## O botão de download

Os botões apontam para o repositório das versões (desde a 0.9.51; antes, para o próprio
`sakura-system-ace`):

```
https://github.com/sakura-corp/ssace-versoes/releases/latest/download/SakuraSystem-Setup.exe
```

Esse endereço entrega **sempre a última versão liberada**, sem precisar mexer no site a cada
lançamento. "Liberada" importa desde o canal de teste (item TR-09.1): uma versão recém-publicada
fica só no teste, e o site só passa a entregá-la depois do workflow "Liberar versão para todas as
lojas" — que é o certo, porque quem baixa pelo site é loja nova.
Para isso o instalador passou a ter nome fixo (`artifactName` no `package.json`, antes o nome
carregava o número da versão).

Como as versões já publicadas foram geradas com o nome antigo, **esse link só vai funcionar depois
que sair uma versão nova** (`v0.9.22` em diante). Publique uma versão antes de divulgar o site.

## Gerar as imagens das telas de novo

Quando o visual do aplicativo mudar, dá para refazer as imagens sem tirar print à mão e sem tocar
no banco de loja nenhuma. A ferramenta abre o aplicativo **de verdade** num navegador e responde as
chamadas ao Supabase com dados inventados (`ferramentas/dados-demo.mjs`).

Rodando **a partir da raiz do repositório**, em dois terminais:

```bash
# 1) sobe o app apontando para um endereço de mentira
printf 'VITE_SUPABASE_URL=https://demo.supabase.co\nVITE_SUPABASE_ANON_KEY=demo\n' > .env
npx vite --config site/ferramentas/vite.telas.config.ts

# 2) noutro terminal, gera as imagens
node site/ferramentas/gerar-telas.mjs site/telas
```

Depois, **apague o `.env`** (ou devolva os valores reais) para não continuar apontando para o
endereço de mentira ao programar.

Precisa do `playwright` disponível (`npx playwright install chromium`, se não tiver).

Ao mexer em `dados-demo.mjs`, dois cuidados que já custaram retrabalho:

- **Nunca usar dado de cliente real.** As imagens vão para um site público.
- `caixa_movimentos.data` é data **com hora** (`timestamptz`). Preencher só `AAAA-MM-DD` faz o
  navegador entender meia-noite em UTC, que no Brasil é o dia anterior — e o lançamento some do
  Caixa do dia.
