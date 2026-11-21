# Revisão cruzada entre a equipe

## Colinha (5 linhas)

1. **Terminei meu PR?** Rótulo `esperando-revisao` e relatório na descrição.
2. **Quem revisa quem:** Tiago → o Gusta revisa. Gusta → o Lázaro revisa. Lázaro → o Tiago revisa.
3. **Revisou?** Aprova ou pede mudança, com relatório curto.
4. **Banco, dinheiro ou nota** (`banco-dinheiro-nota`): colega revisa **e** a Sofia também confere. Nos outros PRs, o colega é opcional (veja "A regra, em um lugar só").
5. **Dúvida?** Pergunta no grupo, não trava.

> Pedido da Sofia em 18/11/2026: "um por todos e todos por um". Os três (@tigasss1, @GustavoSakuras e
> @2oraza) revisam os PRs uns dos outros. O Claude de cada um faz os passos abaixo sozinho e avisa a
> Recepção (`docs/recepcao.md`). Isto **junta** com o que já existe: a revisão da Sofia e a do Claude
> dela continuam (`docs/jeito-de-trabalhar.md`, "Testar de uma vez"). Aqui é só a revisão entre colegas.

## A regra, em um lugar só (Sofia, 20/11 e 21/11/2026)

Os outros documentos apontam pra cá em vez de repetir. A revisão de um colega **era provisória**, de
quando a Sofia estava sem tokens; hoje vale assim:

| Tipo de PR | O que precisa pra mesclar |
|---|---|
| **Com `banco-dinheiro-nota`** (migration, dinheiro, nota fiscal) | CI verde, revisão do Claude colada no PR, **colega revisa** e a **Sofia** (ou sessão dela com ordem direta) também confere. Teste real no PC obrigatório. |
| **Todos os outros** | CI verde e revisão do Claude colada no PR. Revisão de colega é **opcional**. |

- **Quem mescla:** só a Sofia, ou sessão com ordem escrita dela (frase "Quem mescla" no topo do
  `CLAUDE.md`). O **plantão do Tiago** (PR só de documentação, quando a Sofia avisar que a cota acabou)
  segue a mesma tabela: CI verde + revisão do Claude colada; colega só se for `banco-dinheiro-nota`.
- **PR da própria Sofia** entra pela exceção de administradora da `main` (Repository admin, Always
  allow); a regra de 1 aprovação em si está em #1161.
- **Migration:** a equipe **pode** aplicar o ensaio e a migration no banco de **teste** (`ssace-teste`)
  e contar no PR. **No banco de loja ou de produção, ninguém: só a Sofia.**

## Mini-glossário

- **Aprovar** = o botão *Approve* no GitHub.
- **Testar no PC** = outro passo: rodar no computador e pôr os prints no PR. Aprovar não substitui.
- **"A Sofia confere"** vale só pra banco, dinheiro e nota fiscal.

## O rodízio (fixo)

| Autor do PR | Quem revisa |
|---|---|
| Tiago (@tigasss1) | Gusta (@GustavoSakuras) |
| Gusta (@GustavoSakuras) | Lázaro (@2oraza) |
| Lázaro (@2oraza) | Tiago (@tigasss1) |

O revisor pedido no PR já diz quem pegou: ninguém revisa o PR de outro fora do rodízio, então não
tem disputa. Se o revisor da vez não pode, avisa no grupo e outro cobre.

**Rebalanceio de hoje** (os PRs do Gusta são 5): o Lázaro revisa #1122, #1124 e #1121; o Tiago revisa
#1118 e #1126 (e o do Lázaro).

## O quadro: rótulos do PR (nunca "assignees")

O painel usa "assignee" nas tarefas, então **não misturar**. Rótulos:

| Rótulo | Quer dizer |
|---|---|
| `esperando-revisao` | PR pronto, esperando o revisor |
| `banco-dinheiro-nota` | mexe em migration, dinheiro ou nota fiscal (regra especial, abaixo) |
| `revisando-<login>` | ainda existe, mas **não é exigido**: o revisor pedido no PR já mostra quem pegou |

## 1. Autor: ao abrir o PR

1. Pedir a revisão do colega do rodízio e pôr `esperando-revisao` (e `banco-dinheiro-nota` se mexe em migration, dinheiro ou nota fiscal).
2. A descrição já traz o relatório:
   - o que mudou e por quê (link da tarefa);
   - como testar, passo a passo, no PC (Windows 10, tela 1366), com prints;
   - o que pode quebrar e o que ficou de fora;
   - se mexe em banco: o número da migration;
   - CI verde e a branch em dia com a `main`.
3. Avisar a Recepção: `Abri: PR #N esperando revisão`.

## 2. Revisor: ao terminar

1. Comentar o relatório curto: o que testou e viu (com print), o que achou, e "pode aprovar" ou "falta isso".
2. **Aprovar** ou **pedir mudança** (nunca só comentário solto, como na regra da Sofia de 11/11).
3. Se pediu mudança, o autor corrige e devolve `esperando-revisao`. Se aprovou, tirar `esperando-revisao`.
4. Avisar a Recepção: `Feito: revisão do PR #N`.

## 3. Regras

- **A Sofia pode revisar qualquer PR**; a revisão dela vale no lugar da do colega. A revisão de colega é obrigatória só em `banco-dinheiro-nota` (tabela acima).
- **PR da própria Sofia** entra pela exceção de administradora da regra "main protegida" (Repository admin, Always allow), sem aprovação de colega, porque ela não consegue aprovar o próprio PR (Sofia, 21/11/2026). A sessão dela só usa a exceção com o "sim" dela **para aquele PR**. Se a aprovação obrigatória continua ou não: #1161.
- **Prazo**: passou de 1 dia útil sem andar, avisa no grupo pra outro cobrir.
- **Regra de ouro**: a aprovação cai com commit novo (o painel mostra "Em revisão de novo"). Quem revisa de novo avisa do mesmo jeito.
- **`banco-dinheiro-nota`**: obrigatório colega **e** Sofia (tabela acima). Só a aprovação do colega não basta. O teste real no PC é obrigatório.
- **Visual, documentação e painel**: o colega é opcional (tabela acima). Quem mescla: veja "Quem mescla" acima.
- **Banco de TESTE** (`ssace-teste`): a equipe aplica o ensaio e a migration e conta o resultado no PR. **Banco de loja/produção e Release/Liberar versão: só a Sofia.**
- Nada de nome civil, valor ou dado de cliente em comentário de PR: o repositório é público.

## Ordem de mesclar

- Migrations: **0087 = #1146 (já na loja)**; #1120 = 0088, #1121 = 0089, #1123 = 0090. Ordem de mesclar: **#1120 → #1121 → #1123**.
- **#1122 antes do #1124**.

## Próximo passo (não feito agora)

Uma GitHub Action que ponha `esperando-revisao` sozinha em PR novo e liste no painel os PRs esperando. Mexe em workflow, por isso fica pra outra tarefa.

## Pra o Claude (não precisa ler)

Listar PRs esperando que não são seus (trocar `SEU_LOGIN`):

```bash
gh api -X GET repos/sakura-corp/sakura-system-ace/issues -f labels=esperando-revisao -f state=open \
  -f sort=created -f direction=asc --paginate \
  --jq '.[] | select(.pull_request) | select(.user.login != "SEU_LOGIN") | "#\(.number) \(.created_at) \(.title)"'
```

Pôr o rótulo de espera num PR novo (N = número do PR):

```bash
gh api -X POST repos/sakura-corp/sakura-system-ace/issues/N/labels -f 'labels[]=esperando-revisao'
```

Depois de aprovar, tirar o rótulo:

```bash
gh api -X DELETE repos/sakura-corp/sakura-system-ace/issues/N/labels/esperando-revisao
```

Opcional, se quiser marcar que pegou: `-f 'labels[]=revisando-SEU_LOGIN'` no POST acima (não é exigido).
