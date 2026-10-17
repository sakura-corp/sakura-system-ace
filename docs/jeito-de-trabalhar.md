# O jeito de trabalhar com o Claude: as gavetas (aprovado por ela em 14/10/2026)

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md`. Abrir ao mexer em skill,
> gatilho, tarefa agendada ou no jeito de organizar as sessões, e na revisão do mês (R1).

## A ideia

**Ela abre o app, diz o assunto, e o Claude já sabe tudo, já sabe fazer, não consegue fazer
besteira e avisa o que falta**, sem ela precisar repetir, lembrar ou conferir.

Até 14/10 a memória fazia tudo isso sozinha. Agora cada coisa vai pra **gaveta certa**:

| Gaveta | O que guarda | Onde fica |
|---|---|---|
| **Memória** (o que o Claude sabe) | decisões, lições, quem ela é, como o projeto é | `PROJETO_STATUS.md` + `docs/` (continua igual) |
| **Skills** (o que ele sabe fazer) | as receitas que se repetem | `.claude/skills/`, cada uma lida só quando é usada |
| **Trancas** (o que não pode acontecer) | as regras que não podem depender de o Claude lembrar | gatilhos em `.claude/settings.json`, CI, regras do GitHub |
| **Afazeres** (o que falta fazer) | o que depende dela e as datas | tarefas no GitHub (as da empresa no privado) + o resumo da segunda |
| **Ver** | o que está acontecendo, de um jeito visual | a sala da Sakura no painel, e o que vier |

## Onde trabalhar e como usar as sessões (14/10)

- **A base é o app do Claude no desktop (Windows)**, e o celular é o controle remoto. Ela já
  trabalhava assim; quase não abre o VS Code nem o PowerShell.
- **As sessões do SSACE continuam na nuvem por padrão.** Uma sessão **no PC dela** fica pra
  quando for preciso ver o programa funcionando, testar ou mexer em arquivos dela. Antes de o
  Claude no PC abrir e clicar no SSACE: o **Supabase de teste** (ninguém testa no banco da Pneus
  Amigão).
- **Uma sessão por assunto.** Acabou o assunto, fecha (o `/fechar` da #471, quando existir). Não
  precisa de sessão de "continuação": a memória faz a ponte. Passou de uns **30 a 40% de
  contexto** (o número no canto direito do app), fecha e abre outra.
- **Por quê**: a cada mensagem o Claude relê a conversa inteira. Sessão parada não custa nada;
  sessão comprida gasta o limite e trabalha pior. Em 14/10, 21 das 75 sessões na nuvem passavam
  de 500 mil tokens.
- **Modelo por tarefa**: o mais forte onde o erro custa caro (nota, dinheiro, migration,
  publicação); o mais rápido pra só ler e resumir. A tabela das categorias (forte, médio, rápido), com o
  modelo de reserva quando um falha, está em `docs/tarefas.md` (17/10).

## Como usar o `/fechar` e o aviso de conversa comprida (S1 + A3)

**O `/fechar`** (`.claude/skills/fechar/SKILL.md`): digitar `/` mostra ele na lista; ou dizer "vamos
fechar". Ele junta **o que foi decidido, o que ficou aberto e o que vai ser anotado (e onde)** e
**para pra ela conferir**; só depois grava nos arquivos de `docs/`, troca o "Onde parou" (movendo o
antigo pro topo de `docs/historico.md`), faz o commit e o PR (mescla só se for ela), e termina com a
frase "Abra uma sessão nova e diga: …". Se quem fecha é da equipe, ele não mexe no "Onde parou" nem
mescla.

**O aviso** (`scripts/aviso-conversa-comprida.mjs`, ligado em `.claude/settings.json` como gatilho
`UserPromptSubmit`): a cada mensagem ele mede o tamanho da conversa pela última resposta do Claude
no histórico. Passando do limite, avisa o Claude, **uma vez só por sessão**, pra sugerir o `/fechar`.
- **Mudar o limite**: no topo do script, `LIMITE_PERCENTUAL` (hoje 35) e `JANELA_TOKENS` (hoje
  1.000.000, a janela das sessões na nuvem, que mostram `max_tokens` de 1 milhão). Se o app mostrar uma porcentagem diferente da que o aviso
  diz, ajustar a `JANELA_TOKENS`.
- **Testar com o limite baixado** (sem mexer no arquivo): `SSACE_AVISO_LIMITE_PERCENTUAL=1` e
  `SSACE_AVISO_PASTA=<pasta qualquer>` na frente do comando; o teste `npm test --
  scripts/aviso-conversa-comprida` já faz isso.
- **Limite do que foi provado**: o script e o formato do histórico foram provados rodando de verdade;
  que o app dispara o gatilho a cada mensagem e entrega o texto ao Claude é comportamento do Claude
  Code, não foi visto de dentro do app. Conferir na primeira sessão comprida de verdade e, se não
  aparecer, avisar (a lição vira item de `docs/licoes.md`).

## A lista (todas aprovadas em 14/10)

**A fila** (uma sessão por item, cada uma com a sua tarefa no GitHub):
1. ~~**T1**: segredo barrado antes de sair do computador~~ **feita e provada em 15/10** ([#470](https://github.com/sakura-corp/sakura-system-ace/issues/470), fechada): push protection + ganchos do git + gatilho do Claude (`docs/licoes.md`, item 50).
2. ~~**S1 + A3**: a skill `/fechar` e o aviso de conversa comprida~~ **feitos** ([#471](https://github.com/sakura-corp/sakura-system-ace/issues/471)); como usar, logo abaixo.
3. **A1 + A2**: o que depende dela vira tarefa, e o resumo da segunda de manhã: [#472](https://github.com/sakura-corp/sakura-system-ace/issues/472). **A1 feita em 16/10** (parte pública: etiqueta `sofia`; os da empresa ficam no privado); **A2 depende dela** (horário do resumo e leitura do privado), ainda não feita.
4. O resto, aos poucos. **Cada item só vira tarefa no GitHub quando chegar a vez dele**, pra não
   encher a lista à toa.

### Memória
- **M1.** O formato continua: índice pequeno que carrega sozinho + `docs/` abertos quando o
  assunto pede.
- **M2.** Saem dela, aos poucos: as receitas (viram skills), as regras (viram trancas) e as
  listas de afazeres (viram tarefas). O "Onde parou" fica curto.
- **M3.** Corrigir o que envelheceu: **feito em 14/10** (seção 1 do índice).
- **M4.** As preferências novas: **feito em 14/10** (seção 1 do índice).

### Skills (o `/gerar-modulo` já existe)
| # | Skill | O que faz |
|---|---|---|
| S1 | `/fechar` | fim de sessão (#471) — **feita**, ver "Como usar o `/fechar` e o aviso" |
| S2 | `/nova-tarefa` | tarefa no **modelo único** de `docs/tarefas.md` — **rascunho de 17/10**, junto com a skill `ritual-de-tarefa` (sessão mãe) |
| S3 | `/publicar` | publica no canal de teste e, quando ela pedir, libera, com o link da rodada |
| S4 | `/atualizar-bancos` | ensaia e aplica a migration em todas as empresas |
| S5 | `/nova-migration` | as regras da seção 3 do índice |
| S6 | `/validar` | as conferências antes de mesclar, e a revisão de código em PR grande |
| S7 | `/mensagem` | texto pra outra pessoa: curto, informal e completo (seção 1 do índice) |
| S8 | `/comparar-visual` | mudança de aparência em 2 ou 3 versões numa página, pra ela escolher |
| S9 | `/loja-nova` | instalação + o roteiro fiscal de loja nova |
| S10 | `/faxina-memoria` | a faxina da memória |

**S3, S4 e S5 rodam sempre no modelo mais forte.**

Como as skills funcionam:
- **Não precisa decorar**: o Claude reconhece pelo pedido, e digitar `/` mostra a lista.
- **Skill nova só com a aprovação dela**: quando algo se repetir umas 3 vezes, o Claude propõe.
- **Skill que "evolui sozinha" (16/10)**: o agente só **propõe** a skill nova ou a mudança, e ela
  aprova antes. A proposta natural é a revisão do mês (R1). Mexer em trancas (publicar, liberar,
  banco, regras do repositório) nunca é sozinho. Os agentes do Escritório: `docs/painel.md`.
- **Quando uma skill falhar**, ou ela corrigir o Claude no meio de uma, a skill é consertada na
  hora, como as lições.

### Os chefes por função (rascunho de 17/10, a Sofia ainda aprova)
Cinco skills, uma por função, em `.claude/skills/chefe-<função>/`: `chefe-frontend`,
`chefe-backend` (backend e dados), `chefe-seguranca`, `chefe-marketing` (marketing e conteúdo) e
`chefe-tester`. Só são acionadas quando o texto da tarefa pede "você é o chefe de <função>" (o
painel monta esse texto a partir da etiqueta `chefe:<função>`). O chefe chama ajudantes dentro da
própria sessão e termina com PR aberto e relatório; nunca mescla nem publica. Manual para quem
trabalha: `docs/equipe.md`, "Começar uma tarefa com o chefe". Evolução dessas skills é proposta e
entra na revisão do mês (R1).
**Relatórios e revisor (17/10)**: cada chefe grava o relatório da tarefa em `docs/relatorios/`
(formato em `docs/relatorios/README.md`) e a skill `revisor-de-chefes` lê essa pasta e propõe
melhorias nas skills dos chefes, **sempre em PR aberto** para a Sofia aprovar. Sob demanda: abrir uma
sessão e escrever "use a skill revisor-de-chefes" (pode dizer o chefe, a tarefa ou o período).

### Trancas
Já existiam em 14/10:
- o CI (tipos, lint, fusos, contraste, telas, Electron, permissões, migrations, `gitleaks`);
- a `main` protegida;
- o cofre `lojas`;
- as versões no `ssace-versoes`.

As novas:
- **T1.** Segredo barrado antes de sair do computador (#470): **feita e provada em 15/10** (o 1º teste numa sessão nova falhou e levou aos ganchos do git; o 2º passou).
- **T2.** As regras da equipe (seção 0 do índice) viram configuração: o Claude deles fica
  impedido de publicar, liberar, mexer em banco ou adicionar o repositório privado. Com o Claude
  Team, isso se trava de um lugar só.
- **T3.** As regras de código da seção 3 do índice que ainda são só texto viram lint (o `??` no
  `import.meta.env`, o `toISOString().slice`, o `window.prompt`).
- **T4.** Um aviso automático se o índice da memória passar de 30 KB.

### Afazeres
- **A1.** O que depende dela vira tarefa no GitHub (#472): **feita a parte pública em 16/10**. Os itens do sistema e da loja são tarefas com a etiqueta `sofia` (busca `label:sofia`); os da empresa continuam no repositório privado e na lista de `docs/pendencias-e-futuro.md`, só pelo nome.
- **A2.** O resumo da segunda de manhã (#472): **criado em 17/10** como tarefa agendada, toda segunda às **9h29** (Brasília), com aviso no celular; só lê. **Fixado no modelo Opus em 17/10**, pra não falhar por falta de crédito de outro modelo. Pra mudar o horário ou desligar, pedir na sessão (a tarefa se chama "Resumo de segunda"). Se o acesso ao privado for recusado na sessão nova, ele resume só o público.
- **A3.** O aviso de conversa comprida (#471): **feito**, ver "Como usar o `/fechar` e o aviso".
- **A4.** Arquivar as sessões antigas que estiverem seguras: **depois** (ela, 14/10). O Claude
  confere quais têm trabalho fora do GitHub e mostra a lista antes de arquivar.

### Reavaliar
- **R1.** **Uma vez por mês**, uma sessão agendada traz uma proposta curta: quais skills foram
  usadas e quais nunca; o que se repetiu e ainda não é skill; onde o Claude errou; que ferramenta
  nova vale testar. **A revisão do mês inclui rodar o `revisor-de-chefes`** (relatórios em
  `docs/relatorios/`), cujo PR aberto entra nesta mesma proposta. Ela aprova ou corta. **Ferramenta vista em vídeo entra aqui**, e passa pelo
  filtro "isso tira trabalho de verdade?".

### Ver
- **V1.** Testar um visualizador pronto (Pixel Agents e parecidos): só numa sessão no PC, e
  **depois de ler o código** (eles leem as sessões, e as sessões têm coisa sensível). Eles só
  enxergam sessões que rodam no PC.
- **V2.** Um mod no app do Claude, um painel ao lado da conversa com as sessões e o que cada uma
  está fazendo.
- **V3.** **A sala da Sakura**, no painel: **já está na leva 0**, tarefas **#467** (com dados de
  exemplo, a 3ª) e **#468** (ao vivo, a última). Detalhe em `docs/painel.md`.

## Outra coisa combinada: arrumar o PC dela (depois)

Os arquivos do PC dela estão bagunçados, e ela não sabe se tem a pasta do projeto lá. O plano,
numa sessão própria **no PC**:
1. **inventário**: nada se mexe, só uma lista;
2. **decidir juntas** como fica;
3. **arrumar**: o Claude move com a aprovação dela e **não apaga nada** (o que parecer lixo vai
   pra uma pasta "Revisar").

Os cuidados:
- não mexer na instalação do SSACE nem em pasta de sistema;
- antes de mover uma pasta ligada ao GitHub, conferir se ela tem trabalho que não subiu;
- documento pessoal pode ser organizado, mas **nunca vai pra memória**.
