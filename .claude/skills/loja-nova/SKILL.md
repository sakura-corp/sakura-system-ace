---
name: loja-nova
description: RASCUNHO (a Sofia ainda vai revisar). O roteiro da loja nova do Sakura System, do contrato à primeira nota, à entrega e ao acompanhamento dos primeiros 30 dias, um passo por vez. Aponta pros documentos de instalação e do fiscal, sem copiar. Use quando a Sofia digitar /loja-nova ou pedir "loja nova", "instalar loja", "instalar uma empresa nova" ou "começar uma loja cliente". Não use pra criar uma loja a mais dentro de uma empresa que já usa o sistema (isso é só cadastrar a loja no programa).
model: opus
effort: medium
---

# Loja nova — do contrato aos 30 dias da entrega

Fale **sempre em português simples**. Esta skill é um **roteiro**: ela diz a ordem e confere o
"pronto quando" de cada fase. Os passos de verdade moram nos documentos, e ela **aponta** pra eles
pelo caminho e pelo título da seção, **sem copiar**. Os textos de WhatsApp estão em `mensagens.md`.

## 1. Antes de tudo: quem roda e o que é da loja não fica aqui
**Só a Sofia roda esta skill**, porque instalar mexe em banco e em secret. Confira quem trabalha
(seção 0 do `PROJETO_STATUS.md`). Se não é ela, pare e explique: "Loja nova é com a Sofia, regra
dela. Fale com ela." (exceto no modo ensaio, abaixo).

**Modo ensaio** (Sofia, 04/11/2026): quem é da equipe pode seguir esta skill contra o banco de
teste (`ssace-teste`), na loja de exemplo, pra achar o que falta. Os passos de SQL, Supabase, Auth,
Edge Function, secret, cofre, token, certificado e Focus são só lidos e marcados "fica pra Sofia".

O repositório é **público**. **Nada da loja cliente** entra aqui, nem em issue, nem em commit,
nem no que o Claude escreve: nome da loja, CNPJ, contato, nome de pessoa, contrato, chave, token,
senha. Cada coisa tem o seu lugar:
- **Senha, token e chave**: no painel do próprio serviço (Supabase, Focus NFe) ou na tela do
  programa feita pra isso (o token da Focus, em Dados fiscais). Nunca na conversa.
- **Contrato, dados da loja e do campeão, nota de satisfação**: no repositório privado
  `caranovavidanova/sakura-corp`. Ele **só entra na sessão com a autorização dela, com todas as
  letras**. Esta skill nunca o adiciona sozinha.
- **Problema achado na loja**: vira issue **sem dado da loja** (descreve o defeito, não a loja).

## 2. Como conduzir
- **Um passo por vez**: diga onde clicar e o que deve aparecer, e **espere a Sofia confirmar**
  antes do próximo. Pelo celular, dê o link exato de cada passo.
- **O Claude nunca roda SQL nem mexe em Supabase, secret, cofre ou workflow.** Quem clica é a
  Sofia; o Claude guia e confere o que ela mostra (print se confere com atenção).
- Achou erro num documento: **não corrija** no meio da instalação; abra issue dizendo "o que
  aconteceu, por quê e onde (sem dado da loja)". No **modo ensaio**, os achados viram um PR só, com
  a revisão da Sofia (como no ensaio de 04/11/2026).
- **Lembretes**: ao fechar cada fase, diga a data da próxima e sugira que ela ponha um lembrete no
  celular. Os 30 dias e as conversas contam **da entrega** (Fase 5). A skill não cria tarefa
  agendada sozinha.

## 3. Fase 0: o começo
Pergunte, numa mensagem só: (1) **em que fase a loja está** (pode começar no meio); (2) **o dia do
1º pagamento** e, se já houver, o dia da primeira nota e o da entrega, pra contar os dias. Mostre a
lista das fases abaixo, marcando onde está.

## 4. As fases
**Regra de ordem (Sofia, 29/10/2026, escritorio#56)**: a loja só recebe acesso ao sistema quando ele
**já está pronto e emitindo nota**. A parte fiscal é passo da instalação, antes de entregar; não
existe "2ª ativação". Por isso a primeira nota vem **antes** da entrega, e os dias (os 30 dias, os
"dias 1 a 3") contam **da entrega**.

**Fase 1. Antes de começar**
- Quando: antes de instalar qualquer coisa.
- O que fazer: ter o contrato assinado e escolher o "campeão" da loja (o dono + 1 funcionário, quem
  aprende primeiro e ensina os outros). **Já pedir agora** a parte C do playbook fiscal, que leva
  dias a semanas e depende de terceiros: o certificado digital (playbook, parte C.2(b)), o contato
  da contabilidade e os acessos da SEFAZ e da prefeitura. A entrega só acontece depois da primeira
  nota (Fase 4), então quanto antes começar, antes a loja recebe.
- Documento que manda: `docs/pendencias-e-futuro.md`, item "10. ⚠️ Contrato e papéis de LGPD,
  antes da primeira venda pra terceiro" (que manda ler o `ANTES-DA-PRIMEIRA-VENDA.md`, na raiz);
  e o "Playbook de habilitação fiscal por loja nova", parte C.
- Pronto quando: contrato assinado e guardado no privado; campeão escolhido; certificado e
  contabilidade pedidos (parte C começada).

**Fase 2. Minutos depois do 1º pagamento**
- O que fazer: WhatsApp de boas-vindas, com o que acontece nos próximos dias e o que a loja
  precisa mandar (a entrega acontece quando a nota já sai) e quem atende.
- Documento que manda: `mensagens.md`, modelo 1.
- Pronto quando: a mensagem foi mandada.

**Fase 3. Montar sem entregar** (banco, funções, backup e cadastros; os logins do dia a dia
**não** são dados à loja ainda)
- O que fazer: banco, funções, backup e cadastros. Só o login do primeiro admin (dono) existe, e é
  da Sofia.
- Documento que manda: `supabase/instalacao/INSTALAR-LOJA-NOVA.md`, "Parte 1 — Banco de dados",
  "Parte 3 — Configurar o sistema pra loja" e o bloco `BACKUP_EMPRESAS` ("Antes da primeira nota", antes da Parte 4);
  e `docs/operacao.md`, "Instalar uma empresa nova". Se algo falhar: "Quando algo der errado".
- Atenção: o bloco do `BACKUP_EMPRESAS` é a Sofia que cola, **nos dois cofres**, `backup` e
  `lojas` (`docs/operacao.md`, "Os secrets: nos cofres (Settings → Environments)"). Sem ele a
  empresa fica fora do backup e do botão de atualizar o banco, e ninguém avisa. **Entra antes da
  primeira nota**, porque ela já é dado real.
- Edge Function: a `redefinir-senha-operador` é obrigatória (guia, Parte 1, passo 7, com o teste
  na Parte 3, passo 3). A `ler-notas-fiscais` **não** vai.
- Pronto quando: banco instalado (`select max(versao) from schema_versao` bate com a última linha
  do script); plano Pro e cópia diária aparecendo (guia, Parte 1, passo 2); operadores criados
  (dono e campeão); cadastros básicos conferidos (Parte 3); a `redefinir-senha-operador` publicada
  (o botão "Redefinir senha" de um operador, em Configurações, funciona); empresa no
  `BACKUP_EMPRESAS` dos dois cofres.

**Fase 4. Fiscal até a primeira nota**
- O que fazer: seguir a parte B e a parte C do playbook, a Parte 4 do guia (a função `focus-nfe` e
  o token, que a Sofia cola na tela do programa e **nunca na conversa**) e deixar o Ambiente em
  **Produção**. A parte C é a que trava: os passos dela dependem de terceiros. Siga um por vez,
  pelo playbook; no certificado, "playbook, parte C.2(b)".
- Documento que manda: `docs/pendencias-e-futuro.md`, "Playbook de habilitação fiscal por loja
  nova" (partes B e C); e `supabase/instalacao/INSTALAR-LOJA-NOVA.md`, "Parte 4 — Nota fiscal".
- Pronto quando: a primeira de cada tipo que a loja vai usar (NFC-e pra peça, NFS-e pra serviço),
  **autorizada em produção, emitida pelo programa**.
- **Atraso de terceiro** (SEFAZ, prefeitura, contabilidade): anote o motivo (qual passo da parte C
  e quem está devendo, sem dado da loja no público) e peça à Sofia pra **avisar a loja antes de ela
  perguntar** (`mensagens.md`, modelo 7: a entrega atrasou porque falta X, com Y). Atraso de
  terceiro **não conta como falha da loja** (nem, no futuro, nos "sinais de que a loja vai embora").

**Fase 5. Entregar** (presencial, se der)
- O que fazer: dar os logins, instalar o programa nos computadores da loja, impressora, treino e a
  primeira venda.
- Documento que manda: `supabase/instalacao/INSTALAR-LOJA-NOVA.md`, "Parte 2 — Deixar o app
  rodando na loja" e "Depois de entregue".
- Impressora: guia, Parte 2, passo 6 (os itens a, b e c), em cada computador que imprime. O item b
  é feito na primeira OS do treino, então o treino entra nesta fase.
- Pronto quando: todo computador da loja entra com o login; impressora padrão e o teste saiu
  inteiro; até **3 dias depois da entrega**, a primeira venda registrada e o caixa daquele dia
  fechado. Passou dos 3 dias: diga à Sofia o que trava, pra resolver com a loja.

**Fase 6. Dias 7, 14 e 30** (contados da entrega)
- O que fazer: conversa curta no WhatsApp em cada data (`mensagens.md`, modelos 2, 3 e 4).
- Pronto quando: cada uma foi mandada no dia; o problema que a loja contou virou issue (sem dado da
  loja) ou ajuste.

**Fase 7. Nota de satisfação (0 a 10)**
- Quando: aos 30 dias da entrega e depois a cada 90 (`mensagens.md`, modelos 4 e 5).
- O que fazer: nota até 6 vira **ligação** da Sofia, não mensagem. A nota é anotada **no privado**.
- Pronto quando: nota recebida e, se for até 6, a ligação marcada.

## 5. O que esta skill não faz
- **Cobrança e preço** (Pix Automático, boleto, tarifa): são do privado.
- **"Sinais de que a loja vai embora" no painel**: tarefa futura.
- **Portal do cliente**: só quando houver 10 a 15 lojas.

## 6. Limites (valem sempre)
**Nunca**: rodar SQL, mexer em Supabase, secret, cofre ou workflow; pôr dado da loja em arquivo,
issue ou commit do repositório público; adicionar o privado `sakura-corp` sem a autorização dela;
copiar o conteúdo dos documentos pra cá (aponte e pronto). Dúvida sobre **o que** fazer: parar e
perguntar à Sofia.
