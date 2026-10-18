---
name: loja-nova
description: O roteiro da loja nova do Sakura System, do contrato à primeira venda com nota e ao acompanhamento dos primeiros 30 dias, um passo por vez. Aponta pros documentos de instalação e do fiscal, sem copiar. Use quando a Sofia digitar /loja-nova ou pedir "loja nova", "instalar loja", "instalar uma empresa nova" ou "começar uma loja cliente". Não use pra criar uma loja a mais dentro de uma empresa que já usa o sistema (isso é só cadastrar a loja no programa).
model: opus
effort: medium
---

# Loja nova — do contrato aos 30 dias

Fale **sempre em português simples**. Esta skill é um **roteiro**: ela diz a ordem e confere o
"pronto quando" de cada fase. Os passos de verdade moram nos documentos, e ela **aponta** pra eles
pelo caminho e pelo título da seção, **sem copiar**. Os textos de WhatsApp estão em `mensagens.md`.

## 1. Antes de tudo: quem roda e o que é da loja não fica aqui
**Só a Sofia roda esta skill**, porque instalar mexe em banco e em secret. Confira quem trabalha
(seção 0 do `PROJETO_STATUS.md`). Se não é ela, pare e explique: "Loja nova é com a Sofia, regra
dela. Fale com ela."

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
- Achou erro num documento: **não corrija**; abra issue no formato da #425.
- Erro conhecido, a **#592**: a Parte 4 do guia manda publicar a `ler-notas-fiscais`, que pela
  decisão de 27/09 **não vai** nas lojas novas, e esconde ali a `redefinir-senha-operador`, que é
  **obrigatória**. Até a #592 ser resolvida: publicar a `redefinir-senha-operador`; a
  `ler-notas-fiscais`, não. A #592 também registra que o guia fala de "o secret"
  `BACKUP_EMPRESAS`, e o `docs/operacao.md` manda trocar **nos dois cofres**: vale o operacao.
- **Lembretes**: ao fechar cada fase, diga a data da próxima (contando do 1º pagamento) e sugira
  que ela ponha um lembrete no celular. A skill não cria tarefa agendada sozinha.

## 3. Fase 0: o começo
Pergunte, numa mensagem só: (1) **em que fase a loja está** (pode começar no meio); (2) **o dia do
1º pagamento**, pra contar os dias. Mostre a lista das fases abaixo, marcando onde está.

## 4. As fases
**Fase 1. Antes de começar**
- Quando: antes de instalar qualquer coisa.
- O que fazer: ter o contrato assinado e escolher o "campeão" da loja (o dono + 1 funcionário, quem
  aprende primeiro e ensina os outros). **Já pedir agora** o que demora e depende de terceiros: o
  certificado digital e o contato da contabilidade, porque a Parte 5 do guia avisa que o fiscal
  leva "dias a semanas" e a meta de 7 dias depende disso.
- Documento que manda: `docs/pendencias-e-futuro.md`, item "10. ⚠️ Contrato e papéis de LGPD,
  antes da primeira venda pra terceiro" (que manda ler o `ANTES-DA-PRIMEIRA-VENDA.md`, na raiz);
  e o "Playbook de habilitação fiscal por loja nova", parte C.
- Pronto quando: contrato assinado e guardado no privado; campeão escolhido; certificado e
  contabilidade pedidos.

**Fase 2. Minutos depois do 1º pagamento**
- O que fazer: WhatsApp de boas-vindas, com "o que acontece nos próximos 7 dias" e quem atende.
- Documento que manda: `mensagens.md`, modelo 1.
- Pronto quando: a mensagem foi mandada.

**Fase 3. Dias 1 a 3: instalação** (presencial, se der)
- O que fazer: banco, computadores, cadastros, impressora, certificado.
- Documento que manda: `supabase/instalacao/INSTALAR-LOJA-NOVA.md`, "Parte 1 — Banco de dados",
  "Parte 2 — Deixar o app rodando na loja", "Parte 3 — Configurar o sistema pra loja" e "Depois de
  entregue"; e `docs/operacao.md`, "Instalar uma empresa nova". Se algo falhar: "Quando algo der
  errado". Lembrar do aviso da #592 (seção 2).
- Atenção: em "Depois de entregue" está o bloco do `BACKUP_EMPRESAS`, que é a Sofia que cola,
  **nos dois cofres**, `backup` e `lojas` (`docs/operacao.md`, "Os secrets: nos cofres (Settings →
  Environments)"). Sem ele a empresa fica fora do backup e do botão de atualizar o banco, e
  ninguém avisa.
- Edge Function: publicar a `redefinir-senha-operador` (aviso da #592; o jeito de publicar está em
  `docs/operacao.md`, "Publicar uma Edge Function (a pegadinha do nome)").
- Impressora: nenhum documento do projeto explica. No dia da instalação, **imprimir um teste de
  cada coisa que a loja vai imprimir**. Se não sair, anotar o problema numa issue (sem dado da loja).
- Pronto quando: todo computador da loja entra com o login; operadores criados (dono e campeão);
  cadastros básicos conferidos (Parte 3); impressora imprimiu o teste; a `redefinir-senha-operador`
  publicada (o botão "Redefinir senha" de um operador, em Configurações, funciona); empresa no
  `BACKUP_EMPRESAS` dos dois cofres.

**Fase 4. A primeira vitória, até o dia 7**
- O que fazer: a primeira venda com nota emitida e o caixa fechado. É o marco de sucesso da loja.
- Documento que manda: `docs/pendencias-e-futuro.md`, "Playbook de habilitação fiscal por loja
  nova" (partes B e C); e `supabase/instalacao/INSTALAR-LOJA-NOVA.md`, "Parte 5 — Nota fiscal"
  (a função `focus-nfe` e o token, que a Sofia cola na tela do programa e **nunca na conversa**).
- A parte C é a que trava: os passos dela dependem de terceiros. Siga um por vez, pelo playbook.
- Pronto quando: uma nota **autorizada de verdade** e o caixa daquele dia fechado.
- Chegou o dia 7 sem isso: diga à Sofia **qual passo da parte C trava** e mande a mensagem "dia 7"
  na versão "ainda não" (`mensagens.md`, modelo 2).

**Fase 5. Dias 7, 14 e 30**
- O que fazer: conversa curta no WhatsApp em cada data (`mensagens.md`, modelos 2, 3 e 4).
- Pronto quando: cada uma foi mandada no dia; o problema que a loja contou virou issue (sem dado da
  loja) ou ajuste.

**Fase 6. Nota de satisfação (0 a 10)**
- Quando: aos 30 dias e depois a cada 90 (`mensagens.md`, modelos 4 e 5).
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
