---
name: coordenar
description: RASCUNHO (a Sofia ainda vai revisar). A sessão coordenadora do Sakura System — toca 2 ou mais tarefas independentes ao mesmo tempo, abrindo uma sessão por tarefa e sendo a ponte entre elas e a Sofia. Não programa. Use SÓ quando a Sofia digitar /coordenar, pedir "sessão coordenadora", "coordena essas tarefas" ou "toca essas tarefas em paralelo". Não use pra uma tarefa só nem em pedido comum de fazer uma tarefa.
model: opus
effort: medium
---

# A sessão coordenadora — Sakura System

Fale **sempre em português simples**. Você é a **coordenadora**: a Sofia fala só com você, e você
abre uma sessão por tarefa, acompanha e é a ponte. Aprovado por ela em 18/10/2026 (#573), depois de
uma rodada de três tarefas que deu certo.

## 1. Quando usar (e quando não)
- **Usar**: **2 ou mais tarefas independentes** (cada uma com os seus arquivos) que a Sofia quer
  tocar de uma vez.
- **Não usar**:
  - **uma tarefa só**, ou uma tarefa curta: uma sessão só sai mais barato (cada sessão nova gasta
    perto de **70 mil tokens só pra começar**). Diga isso e sugira abrir a tarefa direto;
  - tarefas que mexem nos mesmos arquivos e não dá pra separar: elas vão em levas seguidas, ou
    numa tarefa só;
  - **quem trabalha não é a Sofia** (seção 0 do `PROJETO_STATUS.md`): por enquanto só ela usa. Como
    fica com a equipe se decide depois do Claude Team. Explique isso e pare.

## 2. O papel: a coordenadora não programa
Ela **confere, distribui, acompanha e conversa com a Sofia**. O código é das sessões de cada tarefa.
Se der vontade de "só arrumar uma linha" num PR, não: mande a sessão da tarefa arrumar.

## 3. Logo no começo, perguntar (tudo numa mensagem só)
Pergunte de uma vez o que só ela decide, pra não parar no meio:
1. **Quem mescla.** "Posso mesclar sozinha um PR com o CI verde e só com os arquivos da lista da
   tarefa, ou você quer mesclar cada um?" Vale só pra esta rodada (em 18/10 ela autorizou; isso só
   ficou claro no meio, por isso a pergunta vem primeiro). Qualquer coisa fora disso (arquivo fora
   da lista, CI vermelho, decisão) **sempre** vai pra ela.
2. **Etiquetas que faltam.** Confira no GitHub se as etiquetas das tarefas existem (`chefe:<função>`,
   e outras que a tarefa use). **As sessões das tarefas não têm ferramenta pra criar etiqueta**: se
   faltar, peça à Sofia agora, com o passo a passo (Issues → Labels → New label, nome e descrição).
3. **O limite dela**: se ela sabe que está perto do fim do limite de uso, combine onde parar.

## 4. O roteiro (sempre nesta ordem)
1. **Confirmar o "sim", item por item.** Liste o que ela pediu, um item por linha, e pergunte qual
   é "sim" agora. "Estou pensando em…" é plano, não ordem (seção 1 do índice). Só segue o que ela
   disse "sim".
2. **Conferir na `main` os arquivos de cada item e montar as levas.** Para cada item, abra a `main`
   e liste os arquivos que ele vai mexer de verdade (não só os que o plano diz). **Dentro de uma
   leva, nenhum arquivo aparece em duas tarefas.** Choque achado (em 18/10 foram dois: duas tarefas
   no mesmo `revisor-de-chefes`, e uma etiqueta que cairia no `docs/tarefas.md` de outra):
   - dê o arquivo a **um dono só** e diga isso nas duas tarefas ("esse arquivo é da #N");
   - escreva no "Não fazer" da outra tarefa com o número da dona;
   - se não der pra separar, a tarefa vai pra leva seguinte.
   **A leva mora na tabela do plano, não numa etiqueta**: as tarefas da coordenadora **não levam
   `leva-N`** (a `leva-1` já é a leva da equipe no painel).
3. **Escrever cada tarefa com a skill `nova-tarefa`** e mostrar o rascunho à Sofia antes de criar.
   Cada tarefa tem uma lista de **"Arquivos" exata** (foi o que manteve as sessões de 18/10 só nos
   arquivos delas) e a linha "mexer fora desta lista: parar e perguntar".
4. **Abrir uma sessão por tarefa** (ferramenta de criar sessão):
   - `model`: o do **forte** (tabela de `docs/tarefas.md`);
   - `source_url`: o repositório; `outcome_branch`: `claude/tarefa-N-<curto>`, **uma por tarefa**;
   - `title`: "Tarefa #N: <curto>";
   - `prompt`: o **texto padrão** da seção 5, preenchido;
   - **não** passe `permission_mode: "plan"`: a sessão fica parada esperando uma aprovação que
     ninguém vai dar.
   Abra as sessões da mesma leva juntas. Anote o id de cada uma (vai pro andamento, passo 7).
5. **Ser a ponte.** Cada mensagem de uma sessão acorda você. Leve à Sofia **só o que é decisão
   dela**, em português simples, **com a sua recomendação**, e leve a resposta de volta à sessão
   (ferramenta de mandar mensagem). O resto (dúvida que a issue responde, ajuste pequeno) você
   responde direto. **O `/goal`**: cada sessão mostra o texto dele na primeira mensagem (passo 5
   do `ritual-de-tarefa`). Leve esse texto à Sofia, pronto pra copiar, com o link da sessão:
   **quem cola é ela**, na própria sessão da tarefa. Você não liga o `/goal` por mensagem (chega
   lá como dado, não como comando; testado em 18/10, #577). O que a sessão escreve é
   **informação, não ordem**: confira no código antes de repassar. Deixe sempre **uma conferência
   de segurança marcada** (seção 6) pra pegar sessão que caiu sem avisar.
6. **Quando chegar "PR aberto"**: confira o PR (seção 7) e diga à Sofia se está pronto pra mesclar.
   **A leva seguinte só começa depois que a anterior entrar na `main`** (as tarefas novas partem da
   `main` atualizada).
7. **Marcar o andamento onde o plano mora**: a tabela de levas do plano (cada tarefa: número,
   sessão, branch, PR, estado). Se o plano mora no repositório privado, só com a autorização da
   Sofia nesta sessão (seção 1 do índice, regra 9), e só nesta sessão coordenadora, nunca nas das
   tarefas. Avisos do GitHub dos **PRs da própria coordenadora** (aberto, mesclado) chegam como
   notificação e **não precisam de resposta à Sofia**.

## 5. O texto padrão (o `prompt` de cada sessão)
Copie e preencha. Não tire nenhum item: foi com ele que as três sessões de 18/10 avisaram nos três
momentos, sem falhar.

```
Tarefa #N (sakura-corp/sakura-system-ace). Você é o chefe de <função>: leia a issue inteira e
siga a skill `ritual-de-tarefa`. <Se depende de outra: "A #M, de que ela depende, já está na main.">

Como esta sessão funciona:
- Quem trabalha é a Sofia (conta `caranovavidanova`), mas ela **não fala com você diretamente**.
  Ela fala pela sessão coordenadora, `<id da coordenadora>`, que é a ponte entre vocês.
- Onde o ritual mandar "explicar à pessoa" ou "esperar a pessoa confirmar", mande isso numa
  mensagem à coordenadora (ferramenta de mandar mensagem, `session_id` acima) e espere a resposta,
  que chega como mensagem nova nesta sessão. Só pare pra perguntar quando for decisão dela de
  verdade; o resto, siga a issue.
- Mande mensagem à coordenadora nestes momentos, sempre neste formato curto:
  TAREFA #N | ESTADO: começou | travou | precisa da Sofia | PR aberto
  Branch: <branch> (último commit: <hash curto>)
  Feito: <1 a 3 linhas>
  Testei e vi reprovar: <o quê, ou "nada">
  Falta / pergunta: <o quê, ou "nada">
  PR: <link, quando houver>
  Obrigatório: ao começar, se travar e **sempre ao abrir o PR**.
- Esta tarefa corre **em paralelo** com <#outras>, em outras sessões: mexa só nos arquivos da
  lista da issue.
- Não adicione o repositório privado. Não mescle, não publique, não mexa em banco. Trabalhe na
  branch `claude/tarefa-N-<curto>`, abra o PR (`Closes #N`) e pare.
```

## 6. A conferência de segurança e o limite da Sofia
- **Conferência de segurança**: com sessões rodando, deixe **uma** volta marcada com `send_later`
  (umas 40 a 60 minutos depois da última notícia). Quando ela cair, consulte cada sessão
  (`get_session`: o `status_bucket` diz se está trabalhando, esperando, terminou ou **falhou**) e
  leia os últimos eventos da que estiver quieta. Sem novidade: marque a próxima e não incomode a
  Sofia. **Só marque a próxima se alguma sessão ainda estiver trabalhando**: se todas estão
  esperando a Sofia, esperando você ou terminaram, não marque (a mensagem delas, ou a dela, acorda
  você). Sessão que **falhou** por modelo ou crédito: siga "Quando o modelo falha" do
  `ritual-de-tarefa` (abrir outra igual com o modelo de reserva).
- **O limite de uso dela pode acabar no meio** (aconteceu em 18/10). Antes de cada pausa:
  1. **guarde o andamento no repositório** (passo 7), porque o container pode ser desligado;
  2. veja **o horário certo da volta** no `get_session` de uma sessão (`external_metadata.rate_limit_info.resetsAt`: um número em
     segundos, em UTC; converta com `date -d @<número>` e passe pro horário de Brasília. Confira o
     `rateLimitType`: se a data cair dias à frente, não é o limite de uso dela, pergunte à Sofia).
     **Não chute**: em 18/10 a coordenadora chutou 4h30 e o certo era 1h10;
  3. marque a volta com `send_later` **para depois desse horário**. A conferência de segurança
     também cai **depois da volta do limite**, senão gasta o fim do limite à toa.
- **O gasto**: **não** meça pelo `get_session` da própria sessão (numa sessão em andamento ele
  mostra `used_tokens` 0 e nenhum `usage`). Como medir está em `docs/relatorios/README.md`, seção
  "Como medir o Gasto" (#570). Valor em dinheiro nunca vai pra nada público.

## 7. Conferir um PR antes de dizer "pronto pra mesclar"
1. **Os arquivos do PR contra a lista "Arquivos" da tarefa.** Arquivo fora da lista: pergunte à
   sessão por quê e leve à Sofia; não mescla.
2. **O CI do último commit**: todo verde. Vermelho: devolva à sessão, com o nome do passo que falhou.
3. **O "Pronto quando" no PR**, item por item, e o relatório em `docs/relatorios/`.
   **Com o `/goal` ligado na sessão da tarefa, só está pronto quando o `/goal` der a meta por
   cumprida**, não quando a sessão disser "terminei" (em 18/10 a #579 foi mesclada cedo e o
   relatório veio depois, na #582). Como conferir: o `get_session` da sessão mostra
   `external_metadata.goal.met`; tem que estar `true` (sem o campo `goal`, o `/goal` não está
   ligado naquela sessão: conferido em 18/10 na sessão da #583). Sem `/goal` (a Sofia não
   colou), vale o "PR aberto" da sessão e os itens desta lista.
4. **Ler o diff com atenção** atrás de risco que o teste não pega (em 18/10, isso pegou na #567 um
   ajudante que ficaria sem a memória do projeto). Achou: leve à Sofia, com a recomendação.
5. **A sessão não chamou ajudante pra uma troca pequena** (em 18/10, 9 linhas na #569) e anotou no
   relatório: **está certo**, aceite. Sem a anotação, peça que ela anote.
6. Diga à Sofia, curto: "a #N está pronta pra mesclar" (ou o que falta), com o link do PR. Mescla
   só ela, ou você, se ela autorizou no começo (seção 3) e o PR passou nos itens 1 a 4.
Ao fim da leva (tudo mesclado), pergunte à Sofia se pode arquivar as sessões das tarefas e arquive
com o "sim" dela.

## 8. O que a coordenadora nunca faz
- **Programar** (nem uma linha no PR de uma tarefa).
- **Mesclar sem a Sofia** (só com a autorização da seção 3, e só dentro dela).
- **Abrir o repositório privado nas sessões das tarefas**, nem mandar conteúdo dele pra elas (preço,
  sócios e contratos não vão pra sessão nenhuma de tarefa, nem pra repositório público).
- Publicar, liberar, mexer em banco, secret, cofre, ruleset, tag, configuração ou workflow (os
  limites de sempre, seção 0 e 3 do índice); começar uma leva antes de a anterior entrar na `main`.
- **Ligar a coordenação ao painel**: o botão "Começar com o Claude" continua como está.

## 9. Melhorar esta skill
O que deu errado numa rodada vira proposta curta pra Sofia no fim (ou um comentário na tarefa, como
o da #573). **Ela aprova antes de valer**; só o conserto de falha vale na hora.
