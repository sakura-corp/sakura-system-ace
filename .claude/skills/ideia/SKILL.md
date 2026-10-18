---
name: ideia
description: Guarda uma ideia solta (um vídeo, um print, um "e se…") numa issue curta com a etiqueta `ideia`, pra ser lida na revisão do mês. Só guarda, sem planejar, estimar ou virar tarefa. Use SÓ quando a pessoa digitar /ideia ou pedir "guarda essa ideia", "anota essa ideia" ou "salva essa ideia". Não use pra planejar tarefa (isso é a `nova-tarefa`) nem pra começar trabalho.
---

# Guardar uma ideia — Sakura System

Fale **sempre em português simples**. Esta é a **porta 1** das três (as outras: planejar com a
`nova-tarefa`, só a Sofia; e fazer, pelo botão "Começar com o Claude" do painel). Qualquer pessoa
da equipe pode guardar ideia: é só uma issue, não mexe em código nem em banco.

**Só guarda.** Não planeja, não estima, não escreve etapas, não abre branch, não começa nada. As
ideias são lidas juntas na revisão do mês (R1 de `docs/jeito-de-trabalhar.md`), com a pergunta
"isso tira trabalho de verdade?".

## 1. Antes de tudo: a barreira do que é privado
O repositório é **público**. Leia o que a pessoa mandou e **pare aqui** se a ideia tocar em
qualquer um destes assuntos:
- **empresa ou dinheiro**: preço, quanto cobrar, custo, margem, faturamento, plano ou contrato;
- **sócios**: quem é sócio, porcentagem, acordo entre eles;
- **dado pessoal**: nome civil, CPF, RG, endereço, telefone, e-mail ou dado de um cliente de verdade;
- **credencial**: senha, token, chave, certificado, CSC.

Nesse caso **não crie issue nenhuma**, nem uma versão "limpa" do texto, e não repita o dado na
resposta. Diga só, com calma:

> "Essa ideia fala de <o assunto, sem o dado: preço / sócios / dado pessoal>, e o nosso repositório
> é público: qualquer pessoa leria. Por isso eu não guardo ela aqui. Leve direto pra Sofia, por
> mensagem."

Na dúvida, trate como privado: a mesma resposta acima.

## 2. Perguntar o mínimo
Só o que faltar, numa mensagem só (se a pessoa já disse, não pergunte de novo):
1. **O que é** a ideia, em uma frase.
2. **De onde veio** (um vídeo, um print, uma conversa na loja, um concorrente…).
3. **O que tiraria de trabalho**, e de quem (a loja, a Sofia, a equipe). "Não sei" vale.

**Print ou imagem nunca sobe pro repositório.** Se a pessoa mandou um, descreva **em texto** o que
importa nele (e confira que não aparece nada da lista do aviso no topo do índice: credencial, assunto
pessoal ou de preço).

## 3. Mostrar o rascunho antes de criar
Primeiro, procurar ideia parecida (`search_issues` com `label:ideia`); se já existir, mostrar o
link e perguntar se é pra comentar lá em vez de criar outra.

Monte a issue e **mostre inteira**, esperando a pessoa dizer "pode criar":

```
Título: Ideia: <o que é, curto>
Etiqueta: ideia

<3 a 5 linhas: o que é, o que tiraria de trabalho e de quem>

Fonte: <de onde veio, em texto; ex.: "vídeo de um concorrente no Instagram", "print do celular de um cliente">
```

Nada de etapas, estimativa, chefe ou "Pronto quando": isso é da `nova-tarefa`, se um dia a ideia
virar tarefa.

## 4. Criar
Com o "pode criar": criar a issue no `sakura-corp/sakura-system-ace` com a etiqueta `ideia` e
devolver o link. Se a etiqueta não existir ou a criação falhar, diga isso em uma linha e passe o
texto pra pessoa mandar à Sofia.

Depois, volte pro que a pessoa estava fazendo: a ideia está guardada.
