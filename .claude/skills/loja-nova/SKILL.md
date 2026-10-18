---
name: loja-nova
description: RASCUNHO (a Sofia ainda vai revisar). O roteiro da loja nova do Sakura System, um passo por vez — do contrato à primeira venda com nota emitida e o caixa fechado em 7 dias, com o lado técnico (banco, computadores, nota fiscal) e o lado do cliente (boas-vindas, acompanhamento, satisfação). Use quando a pessoa digitar /loja-nova ou falar em "loja nova", "instalar loja", "empresa nova", "cliente novo" ou "primeira venda com nota". Não use para criar a segunda unidade de uma empresa que já usa o sistema (isso é só Configurações → Lojas → "+ Nova loja"), nem em pedido comum de mexer no código.
model: opus
effort: medium
---

# Loja nova — do contrato à primeira venda com nota (Sakura System)

Fale **sempre em português simples**. Esta skill é a **S9** de `docs/jeito-de-trabalhar.md`. Ela é
um **roteiro**: diz a ordem, o "pronto quando" de cada fase e **qual documento abrir**. Ela **não
copia** o passo a passo técnico: ele mora nos três documentos abaixo, e é lá que se corrige.

| Documento | O que tem |
|---|---|
| `supabase/instalacao/INSTALAR-LOJA-NOVA.md` | o técnico, Partes 1 a 5 e "Depois de entregue" |
| `docs/pendencias-e-futuro.md`, bloco "Playbook de habilitação fiscal por loja nova" | a nota fiscal, com os bloqueios (A), (B) e (C) |
| `docs/operacao.md`, "Instalar uma empresa nova" | o resumo pra uma sessão entender, e "Publicar uma Edge Function" |

## 0. Regras que valem o tempo todo

1. **Quem é?** Conferir quem trabalha (seção 0 do `PROJETO_STATUS.md`). **Só a Sofia instala loja**:
   banco, Edge Functions, cofres e nota fiscal são dela. Se for outra pessoa, parar e dizer que
   isso é com a Sofia.
2. **Claude guia, a Sofia faz.** Colar o `supabase/instalacao/instalacao-completa.sql`, ligar e desligar as opções de
   login, publicar função, mexer no `BACKUP_EMPRESAS`, colar token: **a Sofia faz com as mãos**,
   guiada. Claude nunca roda SQL, nunca mexe em secret nem em cofre, nunca publica nem libera.
3. **Um passo por vez** (regra 4 do índice): dizer onde clicar e o que deve aparecer, e **esperar
   ela confirmar** antes do próximo. Pelo celular, o link exato de cada passo. Print que ela manda
   se confere com atenção. Documento oficial sem volta (contrato, certificado): ela manda antes
   de clicar, Claude confere.
4. **Nada da loja cliente vai pro repositório público**: nome, CNPJ, telefone, e-mail, URL e chave
   do Supabase, token da Focus, certificado, CSC, preço, plano. Nem em commit, nem em issue, nem em
   PR, nem na memória. Isso fica com a Sofia, no lugar privado. O repositório privado só entra na
   sessão com a autorização dela, com todas as letras (regra 9 do índice); a skill nunca o
   adiciona sozinha.
5. **A skill não guarda estado.** Por isso, ao começar, perguntar: *"Em que passo estamos? Já tem
   contrato assinado? Já instalou algo?"* e retomar dali.
6. **Defeito achado nos documentos** (passo que não bate com a tela): não consertar aqui; abrir
   issue no formato da #425 (regra 7 do índice).

## 1. Primeiro: é empresa nova ou segunda unidade?

Perguntar antes de tudo. É a distinção que abre `INSTALAR-LOJA-NOVA.md`:
- **Segunda unidade de uma empresa que já usa o sistema** (mesmo dono, mesmo CNPJ raiz): **não é
  esta skill.** É Configurações → Lojas → "+ Nova loja", e marcar a loja nova no cadastro de quem
  vai ter acesso. Dizer isso e parar.
- **Empresa nova** (dono diferente, outro CNPJ): segue o roteiro abaixo.

## 2. O roteiro, em ordem

### Fase 1 — Antes de começar
- **Pronto quando**: contrato assinado e um **campeão** na loja (o dono e mais um funcionário que
  vai usar o sistema todo dia).
- **Já nesta fase, puxar a nota fiscal**: ela leva dias ou semanas e depende da SEFAZ, da
  prefeitura e da contabilidade do cliente. Pedir ao cliente, **no dia do contrato**, que acione a
  contabilidade e comece o certificado digital e o credenciamento. A primeira venda com nota em 7
  dias só é possível se isso já andou. O que pedir e a quem: bloco (C) do playbook.
- Sem preço e sem cobrança aqui: isso é do repositório privado.

### Fase 2 — Minutos depois do primeiro pagamento
- **Pronto quando**: o cliente recebeu a mensagem de boas-vindas, que diz **o que acontece nos
  próximos 7 dias** e **quem atende**.
- Modelo: `.claude/skills/loja-nova/mensagens.md`, "Boas-vindas". A Sofia confere o texto antes de
  mandar (regra de mensagem de `docs/sofia.md`).

### Fase 3 — Dias 1 a 3: instalação
- **Pronto quando**: o sistema abre na loja, com o admin criado e **vinculado à loja**
  (`operador_lojas`, o erro mais fácil de cometer), os cadastros básicos feitos e a impressora
  imprimindo. Presencial, se der.
- **Banco e Edge Functions**: `INSTALAR-LOJA-NOVA.md`, "Parte 1" a "Parte 3"; a pegadinha do nome
  da função está em `docs/operacao.md`, "Publicar uma Edge Function". O "Importar por foto" é
  opcional (Parte 4).
- **Computadores**: "Parte 2" (instalador e tela de conexão). Computador de loja nova fica no canal
  **Normal**.
- **Depois de entregue**: as quatro coisas do bloco "Depois de entregue" do mesmo arquivo —
  conferir o backup, o bloco da empresa no `BACKUP_EMPRESAS` (**nos dois cofres**), a atualização
  e o suporte. Sem o bloco, a empresa fica de fora do backup e do botão de atualizar, e ninguém
  avisa.
- **Certificado e nota fiscal**: ver a fase 4.

### Fase 4 — Primeira vitória em 7 dias
- **O marco de sucesso da loja** = **a primeira venda com nota emitida e o caixa fechado**.
- **Pronto quando**: uma venda real saiu com nota (NFC-e, e NFS-e se a loja presta serviço) e o
  caixa do dia foi fechado.
- **Roteiro fiscal**: `INSTALAR-LOJA-NOVA.md`, "Parte 5", e o playbook de `docs/pendencias-e-futuro.md`
  (bloqueios A, B e C). Usar e emitir são **duas ativações separadas**: a loja usa cadastro, OS,
  estoque e caixa desde o primeiro dia, e a emissão entra quando o bloco (C) estiver pronto.
- **Se o prazo de 7 dias não vai fechar** (SEFAZ ou prefeitura atrasaram): isso não é falha da
  instalação. Dizer à Sofia, combinar com o cliente o que ele já ganha usando o sistema sem nota, e
  contar o marco a partir do dia em que a nota ficar liberada.

### Fase 5 — Dias 7, 14 e 30: conversa curta
- **Pronto quando**: a Sofia mandou uma conversa curta de WhatsApp em cada data, e anotou (no lugar
  privado) o que o cliente respondeu.
- Modelos: `mensagens.md`, "Dia 7", "Dia 14" e "Dia 30".
- **Calendário**: ao fim da fase 3, dar à Sofia as **datas** dos dias 7, 14, 30 e dos 90 para ela
  pôr na agenda dela. A skill não agenda nada sozinha.

### Fase 6 — Satisfação
- **Pronto quando**: o cliente deu uma nota de 0 a 10 aos **30 dias** e a cada **90 dias**.
- Modelo: `mensagens.md`, "Pesquisa de satisfação".
- **Nota até 6 vira ligação** da Sofia, no mesmo dia. Não responder por mensagem.

## 3. Quando algo der errado
`INSTALAR-LOJA-NOVA.md`, "Quando algo der errado", e os erros do porteiro em `docs/operacao.md`
("falta publicar o porteiro", "Token do Focus NFe não configurado"). Suporte hoje é por WhatsApp
com print; pedir sempre o número da versão (canto inferior direito).

## 4. O que esta skill não faz
- Cobrança (Pix Automático, boleto, tarifa) e preço: privado.
- Painel de "sinais de que a loja vai embora": tarefa própria, depois.
- Portal do cliente: só com 10 a 15 lojas.
- Mudar o `INSTALAR-LOJA-NOVA.md` ou o playbook.
- Ligar ao Supabase de uma loja de verdade, ou agendar mensagem.
