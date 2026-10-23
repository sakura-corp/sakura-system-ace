# Tarefas: o modelo único, as etiquetas e os modelos do Claude (rascunho de 17/10/2026)

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md`. Abrir ao **escrever ou reescrever
> uma tarefa** (skill `nova-tarefa`), ao **começar uma** (skill `ritual-de-tarefa`) e quando uma
> sessão **falhar por causa do modelo**. **Rascunho: vale depois que a Sofia aprovar o PR.**

## Por que existe

Pra fazer tarefas em massa pelo painel (botão "Começar com o Claude", chefes por função, relatórios),
toda tarefa precisa ser **específica e no mesmo formato**, e o jeito de conduzir precisa ser **o
mesmo ritual**, que mora num lugar só (a skill `ritual-de-tarefa`), nunca colado em cada issue.
O buraco que isto fecha: a #468 saiu sem chefe e a sessão teve que perguntar; em 17/10 havia cinco
formatos de issue convivendo, e nenhuma das 80 abertas tinha chefe ou leva.

## Decidido pela Sofia (17/10)

1. **Sessão mãe, híbrido**: a sessão em que a tarefa começa é a mãe, e é ela quem fecha com PR e
   relatório. Por padrão ela usa **ajudantes dentro da própria sessão**, cada um no modelo da etapa.
   **Sessão filha** só quando a issue diz `Sessões filhas: sim`.
2. **Modelo por categoria** (forte, médio, rápido), com **uma tabela só** (abaixo) e **reserva**
   quando o modelo falhar. Ninguém se embola na issue por causa de crédito.
3. **Reescrever só as tarefas que entram numa leva**, na hora em que entram. O resumo de segunda
   conta quantas ainda estão fora do modelo, pra ninguém esquecer.
4. **O ritual numa skill compartilhada** (`ritual-de-tarefa`), usada por todos os chefes.

## As etiquetas

| Etiqueta | Quer dizer |
|---|---|
| `leva-N` | a tarefa está na leva N (o painel mostra só a leva atual) |
| `chefe:<função>` | o chefe que lidera: `frontend`, `backend`, `seguranca`, `marketing` ou `tester`. **Uma só por tarefa.** |
| `sofia` | **só a Sofia faz ou decide** (decisão, conta, órgão, loja). **Nunca** em tarefa de programar. |
| `guia` | ideia do guia de melhorias, ainda **fora do modelo** (vira tarefa no modelo quando entrar numa leva) |
| `ideia` | ideia solta guardada pela skill `/ideia`; **não é tarefa**, é lida na revisão do mês (R1) |

Nos **projetos secundários**, as tarefas usam as mesmas etiquetas, no repositório de cada projeto
(com `leva-N` contada a partir de 1 em cada um); as **propostas** de projeto têm etiquetas próprias,
no `sakura-corp/secundarios` (`docs/projetos-secundarios.md`).

Decisão que trava uma tarefa **vira uma issue `sofia` própria** e entra no `Depende de` da tarefa.
Nada de "Precisa da Sofia?" escondido no meio do texto: o painel não enxerga.

## O modelo único de issue

O cabeçalho são **linhas fixas**, uma por linha, exatamente com estes nomes (o painel vai ler). A
sexta, `Second brain`, é **opcional**: só aparece quando é `não precisa` (regras abaixo). A
`Prioridade` também é **opcional** e vem por último, no mesmo bloco (regras abaixo).

```markdown
Chefe: backend
Ajudantes: frontend (a tela de Configurações), tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: #386, #507
Sessões filhas: não
Second brain: não precisa
Prioridade: 1

## Pra que serve
<uma ou duas frases: o que muda pra loja (ou pro painel) e por quê>

## Decisões já tomadas
- <o que já está decidido e por quem; decisão que falta é issue `sofia` no "Depende de">

## O que fazer
1. <passo, com o arquivo>
2. <passo>

## Arquivos
- `<caminho>`: <o que muda>
<mexer fora desta lista: parar e perguntar à Sofia>

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Achar os arquivos | ajudante explorador | rápido | só lê |
| Escrever a migration | ajudante | forte | banco e RLS |
| Escrever a tela | ajudante | médio | plano já pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] <coisa verificável, com o teste visto reprovar>
- [ ] `typecheck`, `lint` e o CI verdes

**No PC de quem fez** (a pessoa testa antes de abrir o PR, guiada pelo Claude, no Supabase de teste):
- [ ] <passo a passo: onde clicar e o que deve aparecer; "nada" só se não tiver tela>

**Depois de publicar** (a Sofia confere no dia de teste do fim de semana):
- [ ] <só o que não dá pra ver no PC de quem fez (impressora da loja, nota de verdade, o `.exe`
  do Windows), em passos exatos; "nada" se não houver>

## Não fazer
- <o que fica de fora, e qual tarefa cuida disso>

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

Regras do modelo:
- **`Depende de`**: só números de issue, separados por vírgula, ou `nada`. Tarefa ou issue `sofia`:
  precisa estar **fechada como concluída** (o PR que entra na `main` fecha assim; à mão, "Close as
  completed"). Fechada como "não planejada" ou duplicada **não libera**: o painel continua mostrando
  "Espera #N" (Sofia, 17/10).
- **`Sessões filhas: sim`** só quando a tarefa tem **partes independentes** (ex.: banco e tela em
  paralelo) ou uma etapa longa que encheria a conversa da mãe. Aí a seção "Etapas e modelos" diz
  quais etapas são filhas, cada uma com os **seus arquivos** (duas filhas nunca mexem no mesmo arquivo).
- **`Estimativa`** em horas, sempre. Nada de "pequena/média/grande".
- **`Second brain: não precisa`** (Sofia, 18/10, #608): por padrão, a sessão abre o caderno de quem
  está trabalhando (`<usuário>/segundo-cerebro`, seção 0 do índice) e não há linha nenhuma. A linha
  só entra, sempre com estas palavras, quando a tarefa é **pequena demais** pra valer abrir o
  caderno (trocar um texto, conferir um número, ajuste de uma linha). Nunca `Second brain: precisa`.
  O painel não lê esta linha; quem lê é a sessão.
- **`Prioridade: N`** (Sofia, 23/10, #776), **opcional**: N é um número inteiro (1, 2, 3…), e **1 é
  a mais importante**. Vem logo abaixo das cinco linhas (e da `Second brain`, se houver), no mesmo
  bloco. Quem põe é a Sofia, ao montar a leva. O painel mostra a lista **agrupada por estado** e,
  dentro de cada grupo, nessa ordem, com o selinho "1º", "2º"…; tarefa sem prioridade vai pro fim
  do grupo, pela ordem do número da issue; empate também vai pelo número. **Aviso, nunca tranca**:
  a linha faltando, ou escrita errada (`Prioridade: alta`), é ignorada, **não** deixa a tarefa
  "incompleta" e não impede pegar. Pegar a 3ª antes da 1ª é permitido: o painel só avisa, embaixo
  do "Pegar tarefa", que há uma de prioridade maior livre.
- **Nada privado**: preço, sócio, dado pessoal ou credencial nunca entram (o repositório é público).
- Defeito achado de passagem continua no formato da #425 enquanto não entra numa leva; ao entrar,
  vira este modelo (o "o que acontece / por quê" vai em "Pra que serve").

## Os modelos: a tabela única

A issue diz só a **categoria**. É esta tabela que diz qual modelo é cada uma. Quando sair modelo
novo, **muda só aqui**.

| Categoria | Para quê | Modelo | Esforço | Ajudante (nome curto) | Reserva, se falhar |
|---|---|---|---|---|---|
| **forte** | planejar, migration, RLS, dinheiro, nota fiscal, segurança, revisão final, publicar | `claude-opus-5-5` | **alto** (`high`) em migration, RLS, dinheiro, nota fiscal, segurança e revisão final; **médio** (`medium`) no resto (planejar, publicar) | `opus` | `claude-opus-5` |
| **médio** | escrever código ou texto com o plano pronto, testar | `claude-sonnet-5-5` | médio (`medium`) | `sonnet` | `claude-opus-5-5` |
| **rápido** | achar arquivos, rodar comando, resumir, conferir texto | `claude-haiku-5-5` | baixo (`low`) | `haiku` | `claude-sonnet-5-5` |

- **O esforço** muda o gasto tanto quanto o modelo. O ajudante é chamado com o `model` e o `effort` da linha (a ferramenta de agente aceita os dois por chamada) ou pelo agente pronto da categoria em `.claude/agents/` (`ajudante-forte`, `ajudante-medio`, `ajudante-rapido`), que já traz o modelo, o esforço e o limite de turnos. A skill declara o dela no cabeçalho (`model:` e `effort:`). Pede o **Claude Code v2.1.293 ou mais novo** (antes disso o `haiku` e o `sonnet` apontam pra modelos mais velhos e o esforço na chamada não existe). Campos conferidos na documentação em 18/10: [skills](https://code.claude.com/docs/en/skills.md), [agentes](https://code.claude.com/docs/en/sub-agents.md).
- **O Fable não está na tabela de propósito**: em 17/10 uma sessão aberta no Fable falhou por falta
  de crédito. Só entra quando **todo mundo da equipe** tiver acesso a ele.
- **A conferir no Team (19/10)**: que os três modelos acima aparecem pra todo mundo da equipe.

## Quando o modelo falha (o que a pessoa faz)

O botão do painel **não escolhe o modelo**: a sessão abre no modelo padrão de quem clicou. Se ela
falhar logo no começo, com aviso de **crédito, limite ou modelo indisponível**:

1. Na mesma conversa, digite: `/model claude-opus-5-5` e Enter.
2. Depois clique em **"Tentar novamente"** (ou mande a mesma mensagem de novo).
3. Se falhar de novo, troque pela reserva (`/model claude-opus-5`) e repita.
4. Se mesmo assim não for, **não mexa na issue**: mande pra Sofia um print do aviso.

O modelo **nunca** se resolve editando a issue, e a tarefa não muda por causa disso.
Dentro da sessão, a mãe faz o mesmo sozinha com ajudantes e filhas (skill `ritual-de-tarefa`).

## Quem escreve a tarefa

- **No SSACE**: só a Sofia, com o Claude dela (skill `nova-tarefa`). A equipe não escreve tarefa.
- **Exceção, só nos projetos secundários** (Sofia, 22/10/2026, #733): com a proposta aprovada, o
  **Gusta** cria as tarefas do projeto, **neste mesmo modelo**, abre e fecha as levas de lá e mescla
  os PRs (CI verde e uma revisão do Claude antes). Tarefa que toca cobrança, preço, contrato,
  domínio, publicar pra cliente de verdade ou dado de cliente vira issue `sofia` antes, como aqui.
  Fluxo inteiro em `docs/projetos-secundarios.md`.

## Quando reescrever

- **Ao entrar numa leva**: a skill `nova-tarefa` reescreve a issue no modelo, põe `chefe:` e
  `leva-N`, e a Sofia revisa o rascunho antes.
- **Toda segunda** (item 6 da tarefa agendada "Resumo de segunda", colado pela Sofia no app em 17/10, porque a trava da sessão recusou a mudança feita pelo Claude), o resumo de segunda conta as tarefas abertas **com etiqueta de leva** que ainda
  estão fora do modelo (sem `Chefe:` na 1ª linha ou sem `chefe:`), e lista as `guia` que estão
  paradas há mais de 60 dias. Só lê; quem reescreve é uma sessão, com ela aprovando.
- **Na revisão do mês (R1)**: o `revisor-de-chefes` também olha se o modelo de issue precisa mudar
  (ex.: o chefe teve que adivinhar algo que a issue devia dizer).
