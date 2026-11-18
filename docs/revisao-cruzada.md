# Revisão cruzada entre a equipe

> Pedido da Sofia em 18/11/2026: "um por todos e todos por um". Os três (@tigasss1, @GustavoSakuras e
> @2oraza) revisam os PRs uns dos outros, e **ninguém revisa o mesmo PR ao mesmo tempo**. O Claude de
> cada um faz os passos abaixo sozinho e avisa a Recepção (`docs/recepcao.md`).
> Isto **junta** com o que já existe: a revisão da Sofia e a do Claude dela continuam
> (`docs/jeito-de-trabalhar.md`, "Testar de uma vez"). Aqui é só a revisão entre colegas.

## O quadro: rótulos do PR (nunca "assignees")

O painel usa "assignee" nas tarefas, então **não misturar**. O quadro são rótulos, que todos e todos os Claudes enxergam:

| Rótulo | Quer dizer |
|---|---|
| `esperando-revisao` | PR pronto, esperando um colega pegar |
| `revisando-tigasss1`, `revisando-GustavoSakuras`, `revisando-2oraza` | aquela pessoa pegou a revisão (um por pessoa) |
| `banco-dinheiro-nota` | mexe em migration, dinheiro ou nota fiscal (regra especial, abaixo) |

## 1. Autor: ao abrir o PR

1. Pôr `esperando-revisao` (e `banco-dinheiro-nota` se mexe em migration, dinheiro ou nota fiscal).
2. A descrição já traz o relatório:
   - o que mudou e por quê (link da tarefa);
   - como testar, passo a passo, no PC (Windows 10, tela 1366), com prints;
   - o que pode quebrar e o que ficou de fora;
   - se mexe em banco: o número da migration;
   - CI verde e a branch em dia com a `main`.
3. Avisar a Recepção: `Abri: PR #N esperando revisão`.

## 2. Revisor: antes de escolher

1. Listar os PRs esperando, sem ninguém revisando e que não são seus (trocar `SEU_LOGIN`):

```bash
gh api -X GET repos/sakura-corp/sakura-system-ace/issues -f labels=esperando-revisao -f state=open \
  -f sort=created -f direction=asc --paginate \
  --jq '.[] | select(.pull_request) | select(([.labels[].name] | map(startswith("revisando-")) | any) | not)
        | select(.user.login != "SEU_LOGIN") | "#\(.number) \(.created_at) \(.title)"'
```

2. Escolher o **mais antigo** (a lista já vem na ordem). Se o PR já tem `revisando-*`, **não revisa**: escolhe outro. **Nunca** o próprio PR.
3. **Na hora**, trocar o rótulo e avisar no PR (N = número do PR):

```bash
gh api -X DELETE repos/sakura-corp/sakura-system-ace/issues/N/labels/esperando-revisao
gh api -X POST repos/sakura-corp/sakura-system-ace/issues/N/labels -f 'labels[]=revisando-SEU_LOGIN'
gh api -X POST repos/sakura-corp/sakura-system-ace/issues/N/comments -f body='Pego a revisão (@SEU_LOGIN)'
```

4. Avisar a Recepção: `Abri: pego a revisão do PR #N`.

## 3. Revisor: ao terminar

1. Comentar o relatório: o que testou e viu (com print), o que achou, e "pode aprovar" ou "falta isso".
2. **Aprovar** ou **pedir mudança** (nunca só comentário solto, como na regra da Sofia de 11/11).
3. Tirar `revisando-SEU_LOGIN`. Se pediu mudança, devolver `esperando-revisao`. Se aprovou, só o rótulo some.
4. Avisar a Recepção: `Feito: revisão do PR #N`.

## 4. Regras

- **Prazo**: passou de 1 dia útil sem andar, libera: tira o `revisando-*`, comenta "Liberei a revisão" e devolve `esperando-revisao`, pra outro pegar.
- **Regra de ouro**: a aprovação cai com commit novo (o painel mostra "Em revisão de novo"). Quem revisa de novo avisa do mesmo jeito (passos 2 e 3).
- **`banco-dinheiro-nota`**: o colega revisa **e** a Sofia (ou sessão dela com ordem direta) também confere. Só a aprovação do colega não basta. O teste real no PC é obrigatório.
- **Visual, documentação e painel**: a aprovação de um colega basta pra a Sofia mesclar. Quem mescla continua sendo só a Sofia (ou o plantão do Tiago, em documentação; `docs/equipe.md`).
- Nada de nome civil, valor ou dado de cliente em comentário de PR: o repositório é público.

## Próximo passo (não feito agora)

Uma GitHub Action que ponha `esperando-revisao` sozinha em PR novo e liste no painel os PRs esperando. Mexe em workflow, por isso fica pra outra tarefa.
