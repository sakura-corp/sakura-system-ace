# Revisão cruzada (só reserva)

> Decisão da Sofia, 22/11/2026 (#1161): **a revisão de colega deixou de ser exigida.** A equipe não
> entendeu o fluxo e ele não funcionou. O arquivo continua com este nome porque outros textos apontam pra cá.

## A regra, em um lugar só

| O que | Regra |
|---|---|
| **Aprovação** | A regra da `main` pede **1 aprovação, e ela é da Sofia, em todo PR** (inclusive banco, dinheiro e nota fiscal). |
| **Revisão de colega** | **Não é exigida em lugar nenhum**: nem em `banco-dinheiro-nota`, nem nos outros PRs. |
| **Reserva** | Só quando a Sofia estiver sem tokens: um colega pode revisar no lugar dela, e a Sofia decide depois se confere. Ela avisa quando for o caso. |
| **O que o PR leva** | CI verde e a revisão de código do Claude colada na descrição. |

- **A marca do painel (última linha da revisão do Claude colada no PR).** O painel lê uma marca
  escondida no comentário da revisão, só quando o comentário é da conta da Sofia. Termine a revisão
  com uma destas linhas, com o commit revisado (o `headRefOid` do PR, 40 letras):
  - pode aprovar (mesmo com teste à mão devido): `<!-- painel:revisao=aprovada commit=<sha> -->`
  - devolvido (o que falta é de quem fez): `<!-- painel:revisao=devolvida commit=<sha> -->`

  **Escreva no PR o que falta**: teste à mão com os passos exatos, ou o ajuste pedido. Uma marca por
  revisão; commit novo depois: cole uma revisão nova, com o commit novo. Não edite a marca de uma
  revisão antiga. De outra conta, o painel ignora.
- **Quem mescla:** só a Sofia, ou sessão com ordem escrita dela (frase "Quem mescla" no topo do
  `CLAUDE.md`). O **plantão do Tiago** (PR só de documentação, quando a Sofia avisar que a cota
  acabou) segue o mesmo: CI verde e revisão do Claude colada.
- **PR da própria Sofia** entra pela exceção de administradora da `main` (Repository admin, Always
  allow), porque ela não aprova o próprio PR.
- **Banco, dinheiro e nota** (`banco-dinheiro-nota`): o rótulo pode continuar nos PRs pra avisar que
  é área sensível. Teste real no PC continua valendo. Migration em loja, produção ou no banco de
  teste (`ssace-teste`): só a Sofia aplica (`docs/supabase-de-teste.md`, "Quem aplica migration").
- Nada de nome civil, valor ou dado de cliente em comentário de PR: o repositório é público.

## Se a reserva for ligada (a Sofia sem tokens)

1. O autor pede a revisão do colega e põe o rótulo `esperando-revisao`.
2. Rodízio: Tiago → Gusta revisa; Gusta → Lázaro revisa; Lázaro → Tiago revisa.
3. O revisor comenta o que testou e viu, e **aprova** ou **pede mudança** (nunca só comentário solto).
4. Commit novo derruba a aprovação: quem revisa, revisa de novo. Tirar `esperando-revisao` ao aprovar.
5. Avisar a Recepção (`docs/recepcao.md`): "Abri: pego a revisão do PR #N" e "Feito: revisão do PR #N".

Rótulos: `esperando-revisao` (PR pronto, esperando o revisor) e `banco-dinheiro-nota`. Nunca usar
"assignee" pra revisão: o painel usa "assignee" nas tarefas.

Comandos (trocar `N` pelo número do PR):

```bash
gh api -X POST repos/sakura-corp/sakura-system-ace/issues/N/labels -f 'labels[]=esperando-revisao'
gh api -X DELETE repos/sakura-corp/sakura-system-ace/issues/N/labels/esperando-revisao
```
