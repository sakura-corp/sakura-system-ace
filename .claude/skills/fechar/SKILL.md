---
name: fechar
description: Fecha uma sessão do jeito certo — junta o que foi decidido, o que ficou aberto e o que vai ser anotado (e onde), espera a Sofia conferir, grava na memória do projeto, atualiza o "Onde parou", faz commit/PR e entrega a frase pra abrir a próxima sessão. Use quando ela digitar /fechar, disser "vamos fechar", "encerrar a sessão", "acabou o assunto", ou quando o aviso de conversa comprida aparecer e ela concordar.
---

# Fechar a sessão — Sakura System

Existe pra fechar uma sessão sem depender de alguém lembrar. O combinado de 14/10/2026
(`docs/jeito-de-trabalhar.md`) é **uma sessão por assunto**: a memória do projeto faz a ponte, não
a conversa. Fale **sempre em português simples**.

**Regra de ouro: o passo 2 (gravar) só começa depois de a pessoa dizer que conferiu o passo 1.**
Se ela pedir ajuste, ajuste e mostre de novo. Silêncio não é "pode".

## 0. Quem está fechando?

Conferir como na seção 0 do `PROJETO_STATUS.md` (`mcp__github__get_me` ou `git config user.email`).
- **Sofia** (`caranovavidanova`): fluxo completo abaixo.
- **Equipe**: não mexe no "Onde parou" (é da Sofia), não mescla. O andamento vai na descrição do PR
  (o do painel, também em `docs/painel.md`). Pular os passos 2.3 e 3 (mesclar) e dizer isso a ela.

## 1. Juntar e mostrar — e PARAR pra ela conferir

Montar, em linguagem simples e curto, três listas:
1. **Foi decidido** — o que ficou combinado nesta sessão (e o que ela mandou "deixar na gaveta" entra
   como **adiado**, não como decidido).
2. **Ficou aberto** — o que não terminou, perguntas sem resposta, o que depende de alguém.
3. **Vai ser anotado, e onde** — cada item com o arquivo certo:
   - decisão técnica → `docs/decisoes.md`; pasta/padrão de código → `docs/estrutura.md`;
   - banco/migration → `docs/banco.md`; bug novo ou lição → `docs/licoes.md`;
   - estado de uma tela → `docs/modulos.md`; método de trabalho → `docs/jeito-de-trabalhar.md`;
   - publicar/rodar/instalar → `docs/operacao.md`; painel → `docs/painel.md`;
   - preferência da pessoa sobre *como* trabalhar → o caderno dela (seção 1 do índice);
   - **o que depende dela** → as tarefas com a etiqueta `sofia` (ver `docs/pendencias-e-futuro.md`);
   - assunto da empresa (sócios, dinheiro, contrato, preço) → **nunca neste repositório**, que é
     público: fica no privado `caranovavidanova/sakura-corp`, e só se ela autorizar adicioná-lo.
   - **nenhuma senha, token, chave ou dado pessoal em lugar nenhum.**

Terminar com a pergunta: **"Confere? Posso gravar assim?"** — e **esperar a resposta**.

## 2. Gravar (só depois do "confere")

1. Anotar cada item no arquivo combinado. Detalhe de módulo, migration ou bug vai pro `docs/` certo,
   **nunca** pro `PROJETO_STATUS.md`.
2. O que depende dela vira tarefa no GitHub com a etiqueta `sofia` (procurar duplicata antes com
   `search_issues`).
3. **Só a Sofia**: substituir o bloco "Onde parou" (seção 4 do `PROJETO_STATUS.md`) pelo novo, de **no
   máximo 8 linhas** (estado do código, o que foi feito, o que depende dela, o próximo passo), e mover o
   antigo pro **topo** dos marcos em `docs/historico.md`. O detalhe vai pra tarefa ou pro `docs/` certo.
4. Medir o índice (`wc -c PROJETO_STATUS.md`): **até 15 KB** (15360 bytes). Passou, enxugar antes do
   commit (o CI também avisa). Preferência nova vai pro caderno da pessoa, não pro índice.

## 3. Entregar

1. Validar o que mudou (`npm run typecheck` e `npm run lint` se mexeu em código; só texto não precisa).
2. Commit em branch de trabalho (nunca direto na `main`) e PR. Só a Sofia mescla; a equipe para no PR.
3. Se a pessoa é a Sofia e pediu pra mesclar, mesclar; depois dizer a ela, em português simples, o que
   mudou e o que ela precisa fazer.

## 4. Terminar com a frase pronta

A última coisa da resposta é a frase pra abrir a próxima sessão, em bloco de citação, pronta pra
copiar. Formato:

> Abra uma sessão nova e diga: "<o assunto da próxima sessão, numa frase, citando a tarefa ou o
> arquivo se houver>"

Se não há próximo assunto, dizer: "Não tem nada pendente; abra uma sessão nova quando tiver assunto."
