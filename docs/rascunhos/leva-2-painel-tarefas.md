# Leva 2 do painel: rascunhos das tarefas novas (19/10/2026)

> **Rascunho pra Sofia aprovar. Nenhuma issue foi criada.** Escritos no modelo de `docs/tarefas.md`
> (skill `nova-tarefa`). As decisões vieram da entrevista de 19/10 com a Sofia (duas rodadas, "sim pra
> tudo" nas duas). Depois de criadas, **a issue é que vale**; este arquivo fica só como histórico.
>
> **`Depende de` com "F1"**: o modelo pede número de issue. Ao criar, a F1 vai primeiro, e cada "F1"
> é trocado pelo número que ela ganhar.
>
> **Etiquetas**: o `chefe:` de cada uma. **A `leva-2` só entra quando a leva 1 terminar** (regra de
> `docs/painel.md`: o painel mostra como atual a maior leva com tarefa aberta), nestas 7 e na #547, #548
> e #549. A etiqueta `defeito` é criada junto com as issues.
>
> **Second brain**: todas no padrão (sem a linha), porque nenhuma é pequena demais.

## A ordem e o que depende do quê

```
#547 tela da leva redesenhada ─┐
F1 a fase de cada leva ────────┼── F2 as fases na tela (topo da leva, Início, Sala)
                               ├── F3 a fase Testando (aviso, o que testar, defeitos)
                               └── F4 a página do Relatório e o modelo de cinco partes
D1 Decisões da Sofia   (sem dependência)
D2 Versões             (sem dependência)
D3 Pessoas             (sem dependência)
```

Total: **28 h** (F1 5, F2 4, F3 4, F4 5, D1 3, D2 4, D3 3).

## Decisões da entrevista de 19/10 (valem pras F1 a F4)

- **Cinco fases**: Montando, Trabalhando, Testando, Relatório, Aprovada.
- **A fase muda sozinha, lendo o GitHub**, sem botão: tem tarefa aberta = Trabalhando; todas fechadas =
  Testando; PR aberto com `docs/relatorios/leva-N.md` = Relatório; esse arquivo na `main` = Aprovada.
- **O relatório é o arquivo `docs/relatorios/leva-N.md`, num PR; aprovar é a Sofia mesclar.**
- **Cinco partes fixas** no relatório: o que entrou (tarefas e PRs); horas estimadas e entregues **no total
  da leva** (sem separar por pessoa); defeitos achados nos testes; o que ficou pra próxima; o que depende da
  Sofia. **Nunca dinheiro, nunca nota por pessoa.**
- **Testando** mostra: o aviso "leva congelada, não pegue tarefa nova", a lista do que testar
  (`docs/relatorios/leva-N-testes.md`, escrita pelo Claude da Sofia) e os defeitos.
- **Defeito** nasce só com a etiqueta `defeito`, **sem `leva-N`**. A Sofia decide: entra na leva atual (põe a
  etiqueta, e a leva volta pra Trabalhando de propósito) ou fica pra próxima.
- **Leva nova fica em Montando e só vira a atual depois que a anterior for aprovada**; até lá as tarefas dela
  aparecem, mas ninguém pega.
- **Levas antigas**: a leva 0 aparece como Aprovada, "antes das fases", sem relatório. **A leva 1 já estreia as
  fases.**
- **Onde aparece**: no topo da tela da leva (as cinco, com a atual acesa), uma linha no Início, e na Sala o ponto
  de luz da Sofia fica em "precisa de você" quando a leva está em Relatório. **Sem aviso automático no WhatsApp.**

---

## F1. Painel: a fase de cada leva, lida do GitHub

```markdown
Chefe: backend
Ajudantes: tester (casos de cada fase, com o teste visto reprovar)
Estimativa: 5 h
Depende de: nada
Sessões filhas: não

## Pra que serve
Hoje o painel só sabe qual é a leva atual. Esta tarefa ensina o worker a dizer **em que fase** cada leva
está (Montando, Trabalhando, Testando, Relatório, Aprovada), só olhando o GitHub, pra as telas das
próximas tarefas mostrarem. Sem tela nesta tarefa.

## Decisões já tomadas
- (as da entrevista de 19/10, no topo de `docs/rascunhos/leva-2-painel-tarefas.md`; colar aqui ao criar)
- A leva 0 é "Aprovada, antes das fases". A partir da leva 1, as regras valem.
- **A leva atual muda**: deixa de ser "a maior com tarefa aberta" e passa a ser "a mais antiga que ainda não
  foi aprovada". A seguinte, com tarefas, fica em Montando e com o "Pegar tarefa" desligado ("a leva N ainda
  não foi aprovada").
- Tarefa com `defeito` e sem `leva-N` não conta em leva nenhuma.

## O que fazer
1. `painel/src/logica/fases.ts` (novo): `faseDaLeva()` como função pura, a partir de: quantas tarefas abertas e
   fechadas, se existe PR aberto que muda `docs/relatorios/leva-N.md`, se o arquivo já está na `main`.
2. `painel/src/logica/estado.ts`: `levaAtual()` com a regra nova (a mais antiga não aprovada; a leva 0 conta
   como aprovada).
3. `painel/worker/tarefas.ts`: a consulta das levas traz também os PRs abertos que mexem em
   `docs/relatorios/leva-*.md` e os arquivos `leva-*.md` que já estão na `main` (uma consulta só, sem uma
   chamada por leva).
4. `/api/levas` devolve a fase de cada leva; `/api/leva/<n>`, a fase dela.
5. `painel/worker/pegar.ts`: recusar pegar tarefa de leva em Montando, com o motivo.
6. `painel/src/tipos.ts`: o tipo `FaseDaLeva`.

## Arquivos
- `painel/src/logica/fases.ts` e `fases.test.ts` (novos)
- `painel/src/logica/estado.ts` e `estado.test.ts`
- `painel/worker/tarefas.ts`, `tarefas.test.ts`, `index.test.ts`
- `painel/worker/pegar.ts` e `pegar.test.ts`
- `painel/src/tipos.ts`
- `docs/painel.md` (uma linha em "Andamento")
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | a regra da leva atual muda o painel inteiro |
| Achar os arquivos | ajudante explorador | rápido | só lê |
| `faseDaLeva()` e `levaAtual()` com testes | ajudante | médio | plano pronto |
| A consulta do worker | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] Um teste por fase, mais a leva 0 "antes das fases", cada um visto reprovar antes de passar
- [ ] Leva 2 com tarefas enquanto a 1 espera aprovação: a atual continua a 1, a 2 sai em Montando, e o worker recusa pegar tarefa dela
- [ ] Tarefa com `defeito` e sem `leva-N` não muda a fase
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] Nada na tela ainda; a leva 1 continua aparecendo como atual

## Não fazer
- Nenhuma tela (F2, F3 e F4).
- Nenhum botão de mudar fase: a fase só é lida.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## F2. Painel: as fases na tela (topo da leva, Início e Sala)

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: F1, #547
Sessões filhas: não

## Pra que serve
Mostrar pra todo mundo em que fase a leva está, nos três lugares combinados, e chamar a Sofia pela Sala
quando o relatório espera por ela.

## Decisões já tomadas
- (as da entrevista de 19/10)
- Topo da tela da leva: as cinco fases em linha, a atual acesa, as passadas marcadas como feitas. No celular,
  só a fase atual e "fase N de 5".
- Início: uma linha "Leva N: <fase>", que leva pra tela da leva.
- Sala: em Relatório, o ponto de luz da Sofia fica em "precisa de você", com o balão "relatório da leva N".
- Leva em Montando: a tela mostra as tarefas, com o aviso "esperando a aprovação da leva N".
- Cores e contraste do `docs/painel.md` (Design); nada de cor nova sem conferir o contraste.

## O que fazer
1. `painel/src/componentes/FasesDaLeva.tsx` (novo), usado no topo de `TelaDaLeva.tsx`.
2. `PaginaInicio.tsx` / `logica/inicio.ts`: a linha da fase.
3. `logica/sala.ts` (`precisaDe()`): a Sofia precisa quando a leva atual está em Relatório.

## Arquivos
- `painel/src/componentes/FasesDaLeva.tsx` e teste (novos)
- `painel/src/componentes/TelaDaLeva.tsx`
- `painel/src/componentes/PaginaInicio.tsx`, `painel/src/logica/inicio.ts` e testes
- `painel/src/logica/sala.ts` e `sala.test.ts`
- `docs/painel.md` (Andamento)
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | — |
| Componente e telas | ajudante | médio | plano pronto |
| Olhar renderizada (320 e 1000 px, claro e escuro) | ajudante | rápido | rodar comando e conferir |
| Revisão final do diff | ajudante revisor | forte | — |

## Pronto quando
**No PR** (a sessão prova):
- [ ] As cinco fases aparecem com a atual acesa, com teste visto reprovar
- [ ] Fotos em 320 e 1000 px, claro e escuro; contraste AA; sem rolagem lateral
- [ ] Em Relatório, a Sofia aparece em "precisa de você" na Sala (teste)
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] A leva 1 aparece em Trabalhando no topo da leva e no Início

## Não fazer
- A fase Testando por dentro (F3) e a página do relatório (F4).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## F3. Painel: a fase Testando (aviso, o que testar e os defeitos)

```markdown
Chefe: frontend
Ajudantes: backend (ler o arquivo de testes e as issues `defeito` no worker), tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: F1
Sessões filhas: não

## Pra que serve
Quando a última tarefa fecha, a equipe precisa saber que a leva congelou, o que testar e quais defeitos já
foram achados, sem procurar no GitHub.

## Decisões já tomadas
- (as da entrevista de 19/10)
- O aviso "leva congelada, não pegue tarefa nova" fica no topo, grande.
- A lista do que testar vem de `docs/relatorios/leva-N-testes.md` (na `main`), mostrada como texto, sem
  executar nada; se o arquivo ainda não existe: "a lista de testes ainda não foi escrita".
- Os defeitos são as issues abertas com `defeito` criadas desde que a leva entrou em Testando, com link pro
  GitHub (só endereço `https://github.com/sakura-corp/`).

## O que fazer
1. Worker: `/api/leva/<n>/testes` com o texto do arquivo e a lista de defeitos.
2. `painel/src/componentes/FaseTestando.tsx` (novo), dentro da `TelaDaLeva.tsx` quando a fase é Testando.

## Arquivos
- `painel/worker/testes.ts` e teste (novos), `painel/worker/index.ts`
- `painel/src/componentes/FaseTestando.tsx` e teste (novos)
- `painel/src/componentes/TelaDaLeva.tsx`
- `docs/painel.md` (Andamento)
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | — |
| Worker | ajudante | médio | plano pronto |
| Tela | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | texto de arquivo vindo do repositório vai pra tela |

## Pronto quando
**No PR** (a sessão prova):
- [ ] O texto do arquivo aparece como texto (um `<script>` no arquivo não roda), com teste visto reprovar
- [ ] Sem arquivo: a frase "ainda não foi escrita"
- [ ] Fotos em 320 e 1000 px, claro e escuro; contraste AA
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] No fim da leva 1: o aviso, a lista e os defeitos aparecem

## Não fazer
- Abrir defeito pelo painel (continua pelo GitHub).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## F4. Painel: a página do Relatório da leva e o modelo de cinco partes

```markdown
Chefe: backend
Ajudantes: frontend (a página), tester (conferir o Pronto quando)
Estimativa: 5 h
Depende de: F1
Sessões filhas: não

## Pra que serve
Tira o "Relatório da leva" do "em breve": a página mostra o relatório de cada leva (aprovado ou esperando a
Sofia), e o Claude da Sofia ganha um modelo fixo pra escrever.

## Decisões já tomadas
- (as da entrevista de 19/10)
- O modelo mora em `docs/relatorios/modelo-leva.md`, com as cinco partes, e o `docs/painel.md` ("Fim de uma
  leva") aponta pra ele.
- Na fase Relatório a página mostra o texto do PR aberto, com "esperando a aprovação da Sofia" e o link do PR;
  aprovada, o arquivo da `main`.
- Leva 0: "antes das fases, sem relatório".

## O que fazer
1. `docs/relatorios/modelo-leva.md` (novo) e a linha no `docs/painel.md`.
2. Worker: `/api/leva/<n>/relatorio`.
3. Página `/leva/<n>/relatorio` e o item "Relatório da leva" sai do "em breve" em `navegacao.ts` / `emBreve.ts`.

## Arquivos
- `docs/relatorios/modelo-leva.md` (novo), `docs/painel.md`
- `painel/worker/relatorio.ts` e teste (novos), `painel/worker/index.ts`
- `painel/src/componentes/PaginaRelatorio.tsx` e teste (novos), `painel/src/App.tsx`
- `painel/src/logica/navegacao.ts`, `emBreve.ts` e testes
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | — |
| Modelo do relatório | sessão mãe | médio | texto |
| Worker e página | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | texto de arquivo vindo do repositório vai pra tela |

## Pronto quando
**No PR** (a sessão prova):
- [ ] As três situações (esperando, aprovado, leva 0) com teste visto reprovar
- [ ] O texto aparece como texto, sem rodar nada
- [ ] O teste da navegação continua garantindo que nenhum endereço sumiu
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] O item "Relatório da leva" abre a página; no fim da leva 1, o relatório aparece lá

## Não fazer
- Aprovar pelo painel: aprovar é mesclar o PR no GitHub.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## D1. Painel: Decisões da Sofia (a lista do que espera por ela)

```markdown
Chefe: frontend
Ajudantes: backend (a consulta no worker), tester (conferir o Pronto quando)
Estimativa: 3 h
Depende de: nada
Sessões filhas: não

## Pra que serve
A Cobertura do prédio ganha a sua página: tudo que espera a Sofia (as issues abertas com a etiqueta
`sofia`) num lugar só, a mais antiga em cima.

## Decisões já tomadas
- Decidido pela Sofia em 19/10: entra na leva 2.
- Cada linha: o título, há quantos dias está aberta, e o link pro GitHub. Prazo no título ("Até 26/10") aparece
  destacado quando faltam 3 dias ou menos.
- Todo mundo que entra no painel vê a lista (as issues já são públicas).

## O que fazer
1. Worker: `/api/decisoes` (issues abertas com `sofia`, no máximo 100).
2. Página `/decisoes`; o item "Decisões da Sofia" sai do "em breve".

## Arquivos
- `painel/worker/decisoes.ts` e teste (novos), `painel/worker/index.ts`
- `painel/src/componentes/PaginaDecisoes.tsx` e teste (novos), `painel/src/App.tsx`
- `painel/src/logica/navegacao.ts`, `emBreve.ts` e testes
- `docs/painel.md` (Andamento)
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | — |
| Worker e página | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | — |

## Pronto quando
**No PR** (a sessão prova):
- [ ] A ordem (mais antiga em cima) e o destaque do prazo, com teste visto reprovar
- [ ] Fotos em 320 e 1000 px, claro e escuro; contraste AA
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] A lista bate com `label:sofia` no GitHub

## Não fazer
- Fechar ou responder issue pelo painel.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## D2. Painel: Versões (publicadas e liberadas)

```markdown
Chefe: backend
Ajudantes: frontend (a página), tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: nada
Sessões filhas: não

## Pra que serve
O 4º andar ganha a página Versões: quais versões do programa das lojas existem, qual está no canal de
teste e qual já chegou em todas as lojas.

## Decisões já tomadas
- Decidido pela Sofia em 19/10: entra na leva 2.
- As versões moram no `sakura-corp/ssace-versoes` (público, `docs/operacao.md`). **Canal de teste** = release
  marcada como pré-lançamento; **liberada** = sem essa marca.
- **Só lê.** Nenhum botão de publicar ou liberar (isso continua nos workflows, com a aprovação da Sofia).
- As últimas 20 versões, a mais nova em cima, com a data e o link da release.

## O que fazer
1. Conferir primeiro se o login do painel consegue ler as releases do `ssace-versoes` (o app está instalado só
   no `sakura-system-ace`; repositório público costuma ser legível). **Se não conseguir: parar e avisar a Sofia**,
   com o que ela precisaria mudar no app.
2. Worker: `/api/versoes`.
3. Página `/versoes`; o item "Versões" sai do "em breve".

## Arquivos
- `painel/worker/versoes.ts` e teste (novos), `painel/worker/index.ts`
- `painel/src/componentes/PaginaVersoes.tsx` e teste (novos), `painel/src/App.tsx`
- `painel/src/logica/navegacao.ts`, `emBreve.ts` e testes
- `docs/painel.md` (Andamento)
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | — |
| Conferir o acesso ao `ssace-versoes` | ajudante | rápido | rodar comando |
| Worker e página | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | — |

## Pronto quando
**No PR** (a sessão prova):
- [ ] Teste e liberada separadas certo, com teste visto reprovar
- [ ] Fotos em 320 e 1000 px, claro e escuro; contraste AA
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] A versão marcada como liberada é a que as lojas usam hoje

## Não fazer
- Publicar, liberar ou voltar versão pelo painel.
- Mexer no app do GitHub (é da Sofia).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## D3. Painel: Pessoas

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 3 h
Depende de: nada
Sessões filhas: não

## Pra que serve
Tira "Pessoas" do "em breve": quem está na equipe e em que cada um está mexendo agora.

## Decisões já tomadas
- Decidido pela Sofia em 19/10: entra na leva 2.
- **Sem nota por pessoa**: nem ranking nem número de produtividade (regra da Sala, `docs/painel.md`).
- Cada pessoa: a foto e o login do GitHub e a tarefa que está segurando agora (ou "sem tarefa"). As horas por
  pessoa continuam só no quadro da tela da leva.
- Usa os mesmos dados que a Sala já busca (os responsáveis da leva atual), sem consulta nova.

## O que fazer
1. Página `/pessoas`, com os dados de `useSala`; o item "Pessoas" sai do "em breve".

## Arquivos
- `painel/src/componentes/PaginaPessoas.tsx` e teste (novos), `painel/src/App.tsx`
- `painel/src/logica/navegacao.ts`, `emBreve.ts` e testes
- `docs/painel.md` (Andamento)
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | — |
| Página | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | — |

## Pronto quando
**No PR** (a sessão prova):
- [ ] Pessoa com e sem tarefa, com teste visto reprovar
- [ ] Fotos em 320 e 1000 px, claro e escuro; contraste AA
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] Os três aparecem com a tarefa certa

## Não fazer
- Horas, ranking ou qualquer número por pessoa.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```
