# Leva 0: as três primeiras tarefas do programa das lojas (RASCUNHO)

> **Rascunho pra Sofia revisar.** Nada disto virou issue ainda. Cada bloco "Rascunho N" abaixo
> está pronto pra colar como **corpo** da issue (o título vai no campo de título). Depois de
> revisado, as issues #455, #459 e #457 recebem a etiqueta `leva-0`, e o texto delas é trocado por
> este (ou a 1ª parte da #457 vira uma issue nova, ligada à #457; ver pergunta 4).
>
> Conferido no código em 16/10/2026, na `main` da `v0.9.51` (banco na `0064`).

## A ordem sugerida

| Ordem | Tarefa | Quem | Estimativa | Migration? |
|---|---|---|---|---|
| 1 (em paralelo) | #455, Clientes que sumiram | pessoa A | 6 h | não |
| 1 (em paralelo) | #459, Pedir avaliação no Google | pessoa B | 4 h | não (decisão abaixo) |
| 2 | #457, 1ª parte: importar clientes de uma planilha | quem terminar primeiro | 12 h, em 2 PRs | não |

As duas de aquecimento são pequenas, sem dinheiro novo, sem nota fiscal, sem migration, e usam
peças que já existem (o botão de WhatsApp, os modelos de mensagem). Servem pra cada pessoa aprender
o caminho inteiro (branch, testes, fotos, PR, revisão) numa coisa pequena.

## Onde as três podem bater uma na outra (mesmo arquivo)

- **#455 e #459 mexem em `src/schemas/whatsapp.ts`** (as duas acrescentam um modelo novo na lista
  `MODELOS_WHATSAPP` e um nome novo em `ChaveModeloWhatsapp`) e provavelmente em
  `src/schemas/whatsapp.test.ts`. O conflito é pequeno e previsível: **quem tiver o PR aprovado
  depois** atualiza o branch com a `main` e mantém os dois modelos. O Claude da pessoa resolve, e a
  pessoa só confirma.
- **#455 e #457 mexem em `src/pages/clientes/ClientesPage.tsx`** (a #455 põe o filtro; a #457, o
  botão "Importar planilha"). Por isso **a #457 depende da #455 aprovada**.
- **#459 mexe em `src/pages/ordens-servico/OrdensServicoPage.tsx`**, que nenhuma das outras toca.
- Nenhuma das três mexe em banco, em `supabase/` ou em `electron/`.

## Decisões tomadas neste rascunho (a Sofia pode mudar)

1. **#459 sem migration.** A issue sugeria um campo novo "Link de avaliação" por loja (migration).
   Escolhi o caminho sem banco: **o link vai dentro do próprio texto da mensagem**, que cada loja já
   edita em Configurações → Mensagens de WhatsApp. O botão só aparece quando o texto daquela loja
   tem um link `https://`. *Descartado*: a coluna nova (precisaria de migration, teste, matriz de
   RLS e a Sofia aplicando em cada banco, pesado demais pra aquecimento) e guardar o link como uma
   "mensagem falsa" na mesma tabela (mistura configuração com texto). *Custo da escolha*: se um dia
   o link for usado em outro lugar (site, recibo), aí vale o campo próprio.
2. **#455: "total gasto" e "último serviço" contam só OS e vendas faturadas**, da loja aberta no
   momento (é o que o banco deixa cada pessoa ver; o cadastro de clientes é da empresa, mas as OS
   são por loja). *Descartado*: somar as lojas todas (a pessoa de uma loja veria o valor da outra).
3. **#457, 1ª parte: só clientes, só CSV, repetido é pulado (nunca atualizado), sem "desfazer o
   lote"**, e só quem é administrador vê o botão. O motivo é um só: sem desfazer, **nada que a
   importação faça pode estragar um cadastro que já existe**; ela só acrescenta. *Descartado pra
   esta parte*: veículos junto (dobra o tamanho), Excel (biblioteca nova, a #457 pede a decisão da
   Sofia), "atualizar o que já existe" e o "desfazer o lote" (esses dois precisam de uma coluna nova
   no banco, ou seja, migration; ficam pra parte seguinte, num PR em que **quem aplica a migration é
   a Sofia**).

## Perguntas que ainda dependem da Sofia (poucas)

1. **Os textos padrão** das duas mensagens novas. Proposta nos rascunhos 1 e 2; se ela não
   responder, a pessoa usa a proposta e a escolha fica no PR (a própria issue já previa isso).
2. **#455: "X meses" padrão = 6?** (proposta da issue).
3. **#459: o link dentro do texto (sem migration) serve?** Se ela preferir o campo próprio, a #459
   sai do aquecimento e vira tarefa com migration.
4. **#457: a importação pode chegar às lojas sem o "desfazer"**, ou só junto com a parte seguinte?
   Recomendo **só junto** (a 1ª parte entra na `main`, mas a versão que vai pras lojas espera a
   parte com desfazer). E: a 1ª parte vira **issue nova** ligada à #457 (recomendo, pra #457
   continuar sendo o guia das partes) ou troca o texto da #457?

---

## Rascunho 1

**Título**: `Programa 1: Clientes que sumiram, com a mensagem de volta pronta (#455)`

> Se a Sofia preferir manter o número, este texto substitui o corpo da #455.

```markdown
Estimativa: 6 h

**Tarefa de aquecimento do programa das lojas, `leva-0`.** Pequena, sem dinheiro novo, sem nota
fiscal e sem mexer no banco. Serve pra aprender o caminho inteiro (branch, testes, fotos, PR,
revisão) numa coisa pequena.

**Depende de**: nada. Pode andar junto com a "Programa 2" (#459).

## O que é
Em **Clientes**, um filtro **"Sem vir há mais de X meses"** (padrão: 6). Ligado, a lista mostra só
quem não aparece há esse tempo, **ordenada por quem mais gastou**, com duas colunas novas: **último
serviço** (a data e o número da OS, ex: "12/03/2026 · OS 418") e **total gasto**. Cada linha ganha
o botão de **WhatsApp** com a mensagem de volta já escrita.

## Por quê
Trazer de volta quem já comprou custa bem menos que achar cliente novo, e o dado já está no
sistema: são as OS e as vendas de balcão faturadas. Hoje ninguém consegue ver isso sem olhar OS por OS.

## O que fazer (arquivos de verdade, conferidos em 16/10)
1. **A conta, como função pura e testada**: arquivo novo `src/schemas/clientesSumidos.ts` (+
   `clientesSumidos.test.ts`). Recebe a lista de ordens (só `cliente_id`, `numero`, `tipo`,
   `status`, `data_abertura` e os itens) e a data de hoje, e devolve, por cliente: o último dia que
   ele veio, a última ordem e o total gasto.
   - Conta **só ordens com `status = "faturada"`**, OS e venda de balcão (`tipo` `os` e
     `venda_balcao`).
   - **Deixa de fora o cliente "Consumidor"** (`ehConsumidor()` em `src/types/cliente.ts`): ele
     não é uma pessoa.
   - O total de cada ordem sai de `totalOrdem()` (`src/types/os.ts`), a mesma conta da coluna Total
     da lista de OS, e a soma das ordens usa `somar()` de `src/schemas/dinheiro.ts` (nunca `+`
     solto, por causa dos centavos). **Conta de dinheiro nunca dentro da tela.**
   - O "dia" sai de `diaLocal()` e a comparação com hoje usa `hojeLocal()`/`diasEntre()` de
     `src/lib/datas.ts`. **Nunca `toISOString().slice(...)`**: dá o dia errado depois das 21h.
   - Cliente que **nunca** teve ordem faturada não entra no filtro (não "sumiu", nunca veio).
2. **A busca**: uma função em `src/lib/clientes.ts` (ex: `listarOrdensFaturadasParaSumidos(lojaId)`)
   que busca em `ordens_servico` só as colunas do item 1, com os itens
   (`quantidade, preco_unitario, desconto`), filtrando `loja_id` e `status = faturada`. Nada de
   `select("*")`.
3. **A tela**: `src/pages/clientes/ClientesPage.tsx`.
   - O filtro (caixa de marcar + campo de meses, número inteiro de 1 a 36) fica acima da tabela. A
     busca do item 2 só roda quando o filtro é ligado. A loja vem de `useAuth().lojaAtual`, como em
     `OrdensServicoPage.tsx`.
   - Erro do Supabase aparece com `mensagemDeErro()` (`src/lib/errors.ts`), como já faz o resto da
     página.
   - **Permissão**: a coluna "Total gasto" e a ordenação por valor só aparecem pra quem tem a
     permissão de **Relações** (`temPermissao(operador, "relatorios")`, de `src/types/operador.ts`).
     Pra quem não tem, a lista fica ordenada pelo mais tempo sem vir, sem a coluna de valor.
   - O botão é o `BotaoWhatsapp` (`src/components/BotaoWhatsapp.tsx`), igual ao "Avisar" da lista
     de OS. No `aoAbrir`, chama `registrarMensagemAberta()` (`src/lib/modelosWhatsapp.ts`) com a
     chave nova, a referência = id do cliente e o telefone. Registra que a conversa foi **aberta**,
     nunca "enviada".
   - Cuidado com a largura: a tabela precisa caber em 1366 px (`npm run largura:telas`).
4. **A mensagem**: modelo novo em `src/schemas/whatsapp.ts`:
   - acrescentar `"cliente_sumido"` em `ChaveModeloWhatsapp` e um item em `MODELOS_WHATSAPP`, com
     título "Cliente que sumiu", uma descrição dizendo onde o botão aparece, e os marcadores
     `{cliente}`, `{ultimo_servico}`, `{loja}`. Ele aparece sozinho em Configurações → Mensagens de
     WhatsApp (`ModelosWhatsappSection.tsx` já percorre a lista toda; conferir que aparece).
   - **Texto padrão proposto** (a Sofia escolhe no PR; tom de balcão, curto, sem "prezado"):
     > Oi {cliente}, tudo bem? Aqui é da {loja}.
     > Faz um tempinho que você não passa por aqui (a última vez foi {ultimo_servico}).
     > Quer agendar uma olhada no carro? É só responder aqui!
   - Preencher com `preencherModelo()` e `textoDoModelo()`, como o `textoCarroPronto()` da lista de OS.
5. **Catálogo de telas**: uma cena nova em `site/ferramentas/cenas.mjs` com o filtro ligado (e,
   se faltar, ordens faturadas antigas em `site/ferramentas/dados-demo.mjs`), pra as varreduras de
   contraste e de largura olharem a tela nova.

## Pronto quando
- [ ] Os testes da conta (`clientesSumidos.test.ts`) cobrem: cliente com várias ordens (pega a
      última e soma todas), ordem não faturada (não conta), venda de balcão (conta), Consumidor (fica
      de fora), cliente que nunca veio (fica de fora), exatamente no limite dos X meses, e uma ordem
      aberta às 22h (o dia certo, no fuso do Brasil). **Cada teste foi visto falhar** quebrando a conta
      de propósito.
- [ ] No **Supabase de teste** (nunca no da Pneus Amigão; ver `docs/supabase-de-teste.md`), com
      os dados de exemplo: o filtro de 6 meses mostra os clientes certos, e o total de 2 deles foi
      conferido na mão, somando as OS deles na lista de OS. Os números batem.
- [ ] Entrando com um login **sem** a permissão de Relações, a coluna de valor não aparece.
- [ ] O botão abre o WhatsApp com a mensagem certa. Cliente sem telefone com DDD mostra o aviso do
      próprio botão, sem quebrar a tela.
- [ ] O modelo novo aparece em Configurações → Mensagens de WhatsApp, editável.
- [ ] Rodaram limpos: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:fusos`,
      `npm run contraste`, `npm run contraste:telas` e `npm run largura:telas`.
- [ ] O PR tem fotos da tela (filtro ligado, com e sem a permissão de Relações) e o texto padrão
      proposto escrito na descrição, pra Sofia escolher.

## O que não fazer
- **Não mandar em massa nem sozinho**: um clique por cliente, e quem manda é a pessoa.
- Não mexer no banco (nenhuma migration, nenhum SQL) nem em `supabase/`.
- Não criar tabela, coluna ou "campo de última visita": tudo sai das OS que já existem.
- Não somar dinheiro na tela, nem usar `toISOString().slice`, nem `window.prompt()`.
- Não mexer na lista de OS nem no faturamento.
- Nada de nome, telefone ou print com dado de cliente de verdade no PR: só os dados de exemplo do
  Supabase de teste.

---

### Em toda tarefa (resumo do `docs/painel.md`)
- **Antes de tudo**: a seção 0 do `PROJETO_STATUS.md` e o "Como começar uma tarefa". O Claude
  **guia passo a passo, com calma**, em tudo que não for programar.
- **Pôr o seu nome** na tarefa (campo *Assignees*) antes de começar. **Uma tarefa por vez.**
- **Só o Supabase de teste.** Banco de loja de verdade, publicar e liberar versão são da Sofia.
- **No fim**: conferir o "Pronto quando" item por item; abrir o PR com `Closes #<esta issue>` e
  pedir a revisão da `caranovavidanova` (**não mesclar**); o Claude escreve a mensagem de WhatsApp
  pra Sofia; esperar a aprovação antes de pegar a próxima.
- **Nada privado** aqui: o repositório é público.

**Pra começar**, diga ao seu Claude: *"Quero fazer a tarefa #<número> do sakura-corp/sakura-system-ace."*
```

**Por que 6 h**: uma função pura com uns 8 testes (2 h), a busca e a tela com filtro, permissão e
botão (2,5 h), o modelo novo, a cena do catálogo, as varreduras e as fotos (1,5 h). É o tamanho
máximo que ainda cabe numa revisão da Sofia de uma sentada.

---

## Rascunho 2

**Título**: `Programa 2: Pedir avaliação no Google depois do serviço, pelo WhatsApp (#459)`

> Se a Sofia preferir manter o número, este texto substitui o corpo da #459.

```markdown
Estimativa: 4 h

**Tarefa de aquecimento do programa das lojas, `leva-0`.** Pequena, sem dinheiro, sem nota fiscal
e **sem mexer no banco**. Serve pra aprender o caminho inteiro (branch, testes, fotos, PR, revisão)
numa coisa pequena.

**Depende de**: nada. Pode andar junto com a "Programa 1" (#455).

## O que é
Na lista de **Ordens de Serviço**, numa OS ou venda de balcão **faturada**, um botão **"Pedir
avaliação"** que abre o WhatsApp do cliente com uma mensagem curta e o **link de avaliação da loja
no Google**.

## Por quê
Avaliação boa no Google traz cliente novo pra loja. E um sistema que ajuda a loja a ganhar cliente
se vende sozinho.

## Como o link entra (sem campo novo no banco)
O link **vai dentro do próprio texto da mensagem**, que cada loja já edita em **Configurações →
Mensagens de WhatsApp**. O texto padrão vem **sem link**, então:
- **enquanto a loja não colar o link dela no texto, o botão não aparece**;
- quando o texto daquela loja tiver um link que começa com `https://`, o botão aparece.

## O que fazer (arquivos de verdade, conferidos em 16/10)
1. **O modelo novo**, em `src/schemas/whatsapp.ts`:
   - acrescentar `"pedir_avaliacao"` em `ChaveModeloWhatsapp` e um item em `MODELOS_WHATSAPP`, com
     título "Pedir avaliação no Google", marcadores `{cliente}`, `{loja}`, e uma **descrição que
     ensina**: "Cole aqui o link de avaliação da sua loja no Google (Perfil da Empresa → Pedir
     avaliações). O botão 'Pedir avaliação' só aparece na lista de OS depois que o link estiver no
     texto."
   - **Texto padrão proposto** (a Sofia escolhe no PR):
     > Oi {cliente}, aqui é da {loja}! Obrigado pela confiança.
     > Se puder, conta pra gente como foi o atendimento? Leva menos de um minuto:
     > (cole aqui o link de avaliação da loja no Google)
2. **Uma função pura**, no mesmo arquivo (com teste em `src/schemas/whatsapp.test.ts`):
   `linkDeAvaliacao(texto): string | null`, que acha o **primeiro** endereço que começa com
   `https://` no texto e devolve ele, ou `null`. Endereço com `http://` (sem o "s") **não** conta.
3. **O aviso em Configurações** (`src/pages/configuracoes/ModelosWhatsappSection.tsx`), só pra
   este modelo:
   - sem link no texto: aviso amarelo "Sem link, o botão não aparece na lista de OS";
   - com link que não parece do Google (não contém `google.`, `g.page` nem `goo.gl`): aviso amarelo
     "Esse link não parece do Google. Confira antes de salvar."
   - **Os dois são só avisos: salvar continua funcionando sempre** (validação incerta é aviso,
     nunca tranca: item 33 de `docs/licoes.md`).
4. **O botão**, em `src/pages/ordens-servico/OrdensServicoPage.tsx`, ao lado do "Avisar" (que é o
   modelo a copiar, por volta da linha 757):
   - aparece quando: a ordem está **faturada** (OS ou venda de balcão), o cliente **não é o
     Consumidor** (`ehConsumidor()`, de `src/types/cliente.ts`) e
     `linkDeAvaliacao(textoDoModelo(modelosWhatsapp, "pedir_avaliacao"))` não é `null`;
   - texto com `preencherModelo()` + `textoDoModelo()`, como o `textoCarroPronto()`;
   - `aoAbrir` chama `registrarMensagemAberta()` com a chave `"pedir_avaliacao"`, a referência = id
     da ordem e o telefone (registra que a conversa foi **aberta**, nunca "enviada");
   - **largura**: a coluna de ações já tem "Avisar", "Fechamento" e "Faturar". Se o botão novo
     fizer `npm run largura:telas` reprovar em 1366 px, ele vai pra um lugar que caiba (rótulo mais
     curto, só o ícone com a dica no `title`, ou o menu da linha), e a escolha vai com foto no PR.
5. **Catálogo de telas** (`site/ferramentas/cenas.mjs` e `dados-demo.mjs`): os dados de exemplo
   passam a ter o modelo com um link de mentira (ex: `https://g.page/r/exemplo/review`), pra a
   varredura de largura enxergar a lista com o botão novo.

## Pronto quando
- [ ] Os testes de `linkDeAvaliacao` cobrem: texto sem link, com `https://`, com `http://` (não
      conta), com dois links (pega o primeiro), e link no fim da frase seguido de ponto final ou
      quebra de linha. **Cada teste foi visto falhar** quebrando a função de propósito.
- [ ] No **Supabase de teste** (ver `docs/supabase-de-teste.md`): sem link no texto, o botão não
      aparece em OS nenhuma; depois de colar um link no texto em Configurações e salvar, ele aparece
      nas OS e vendas **faturadas**, e só nelas. Venda no nome do Consumidor não tem o botão.
- [ ] O botão abre o WhatsApp com a mensagem e o link certos.
- [ ] Os dois avisos aparecem em Configurações, e salvar funciona com e sem eles.
- [ ] Rodaram limpos: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:fusos`,
      `npm run contraste`, `npm run contraste:telas` e `npm run largura:telas`.
- [ ] O PR tem fotos (a lista com o botão, as duas versões do aviso) e o texto padrão proposto na
      descrição, pra Sofia escolher.

## O que não fazer
- **Não mandar sozinho nem para todos os clientes de uma vez.** Um clique por cliente.
- Não criar campo, coluna nem migration pro link (a decisão foi o link no texto).
- Não barrar o salvamento por causa do link: só avisar.
- Não abrir o link do Google pelo sistema: quem abre é só o WhatsApp, pelo caminho que já existe
  (`abrirConversaWhatsapp`, que só aceita `wa.me`). Não mexer em `electron/`.
- Não usar `window.prompt()`; erro do Supabase sempre com `mensagemDeErro()`.
- Não pôr o link de verdade de nenhuma loja no código, nos testes ou no PR.

---

### Em toda tarefa (resumo do `docs/painel.md`)
- **Antes de tudo**: a seção 0 do `PROJETO_STATUS.md` e o "Como começar uma tarefa". O Claude
  **guia passo a passo, com calma**, em tudo que não for programar.
- **Pôr o seu nome** na tarefa (campo *Assignees*) antes de começar. **Uma tarefa por vez.**
- **Só o Supabase de teste.** Banco de loja de verdade, publicar e liberar versão são da Sofia.
- **No fim**: conferir o "Pronto quando" item por item; abrir o PR com `Closes #<esta issue>` e
  pedir a revisão da `caranovavidanova` (**não mesclar**); o Claude escreve a mensagem de WhatsApp
  pra Sofia; esperar a aprovação antes de pegar a próxima.
- **Nada privado** aqui: o repositório é público.

**Pra começar**, diga ao seu Claude: *"Quero fazer a tarefa #<número> do sakura-corp/sakura-system-ace."*
```

**Por que 4 h**: um modelo, uma função pura pequena com testes (1 h), o botão copiando o "Avisar"
(1 h), o aviso em Configurações (1 h), varreduras e fotos (1 h). A menor das três, de propósito: é a
primeira tarefa da pessoa.

**O que fica com a Sofia, fora da tarefa**: pegar o link de avaliação da Pneus Amigão no Perfil da
Empresa no Google (ela ou o pai, guiados) e colar no texto, quando a versão chegar na loja.

---

## Rascunho 3

**Título**: `Programa 3: Importar clientes de uma planilha CSV, escolhendo qual coluna é o quê (#457, parte 1)`

```markdown
Estimativa: 12 h

**Tarefa do programa das lojas, `leva-0`.** É a 1ª parte da #457 (importar do sistema antigo). Ela
**não depende de saber qual sistema as lojas usam**: funciona com qualquer planilha, porque a
pessoa diz qual coluna é o quê.

**Depende de**: a "Programa 1" (#455) aprovada, porque as duas mexem em `ClientesPage.tsx`.

**Entregue em 2 PRs**, pra revisão da Sofia caber numa sentada cada:
- **PR 1 (≈6 h)**: só as funções puras e os testes (ler o arquivo, entender as colunas, converter,
  achar repetidos). Nenhuma tela.
- **PR 2 (≈6 h)**: a tela (escolher arquivo, escolher colunas, prévia, gravar, relatório).
  Começa depois do PR 1 aprovado.

## O que é
Em **Clientes**, um botão **"Importar planilha"** (só pra administrador). A pessoa escolhe um
arquivo **CSV**, o programa mostra as colunas que achou, e a pessoa diz qual é o quê ("Nome" →
nome, "Fone" → telefone, "Doc" → CPF/CNPJ...). Depois vê **a prévia**, linha por linha, com o que
vai entrar, o que tem aviso e o que vai ser pulado. Só quando ela clica **"Importar N clientes"** é
que alguma coisa é gravada. No fim, um **relatório**: quantos entraram, quantos foram pulados e por
quê, linha a linha.

## Por quê
Uma loja que já usa outro sistema não troca pra recadastrar 2.000 clientes na mão. É a maior
barreira pra vender o SSACE pra quem já tem sistema.

## O que fica de fora desta parte (de propósito)
- **Veículos**: vêm na parte seguinte.
- **Excel (`.xlsx`)**: precisa de biblioteca nova, e biblioteca nova é decisão da Sofia (a #457
  pede). Hoje o programa não tem nenhuma biblioteca de planilha. Quem tiver Excel usa "Salvar
  como → CSV" (o texto da tela ensina isso).
- **Atualizar quem já existe** e **desfazer a importação**: os dois precisam de uma coluna nova no
  banco pra saber "o que veio de qual importação", ou seja, **migration**. Ficam pra parte seguinte,
  num PR em que **quem aplica a migration é a Sofia**. Por isso, nesta parte, **repetido é sempre
  pulado**: a importação só acrescenta e nunca muda um cadastro que já existe.

## O que fazer (arquivos de verdade, conferidos em 16/10)

### PR 1: as funções puras, com testes
Tudo em `src/schemas/`, sem Supabase e sem tela, cada arquivo com o seu `.test.ts`:

1. `src/schemas/planilhaCsv.ts`: **ler o arquivo**, sem biblioteca nova.
   - `decodificarArquivo(bytes: ArrayBuffer): string`: tenta UTF-8 com
     `new TextDecoder("utf-8", { fatal: true })`; se der erro, lê como `windows-1252` (o "formato
     antigo do Windows", o Latin-1 que o Excel brasileiro salva). Tira o BOM do começo, se tiver.
     (O `TextDecoder` já é usado assim em `src/lib/notaFiscalXmlFornecedor.ts`.)
   - `lerCsv(texto: string): { cabecalho: string[]; linhas: string[][]; separador: ";" | "," }`:
     descobre o separador olhando a 1ª linha (o que aparecer mais entre `;` e `,`, fora de aspas);
     entende campo entre aspas, aspas dobradas (`""`) e quebra de linha dentro de aspas; aceita fim
     de linha `\r\n` e `\n`; ignora linha totalmente vazia.
2. `src/schemas/importarClientes.ts`: **entender e converter**.
   - `CAMPOS_IMPORTAVEIS`: os campos de cliente que dá pra importar (`nome`, `cpf_cnpj`,
     `telefone`, `email`, `cep`, `rua`, `numero`, `bairro`, `cidade`, `uf`, `data_nascimento`), com o
     nome que aparece na tela. Os nomes de coluna vêm de `src/types/cliente.ts`.
   - `sugerirMapeamento(cabecalho)`: um palpite inicial pelo nome da coluna, sem acento e sem
     maiúscula ("Nome", "Cliente", "Razão social" → nome; "CPF", "CNPJ", "CPF/CNPJ", "Documento" →
     cpf_cnpj; "Fone", "Celular", "WhatsApp" → telefone...). É só palpite: a pessoa muda na tela.
   - `converterLinha(linha, mapeamento)` → `{ cliente: NovoCliente | null; avisos: string[];
     motivoPulada: string | null }`:
     - **o único obrigatório é o nome**: linha sem nome é **pulada**, com o motivo "sem nome";
     - **CPF/CNPJ**: guarda só os dígitos (e letras, por causa do CNPJ novo com letras). Com 14
       caracteres → `tipo_pessoa: "juridica"`; com qualquer outro tamanho → `"fisica"`. Tamanho
       diferente de 11 e 14 → **entra assim mesmo, com aviso** "documento com tamanho estranho".
       (Isso respeita a trava do banco `ck_clientes_cnpj_juridica`, da migration 0060: pessoa
       jurídica só com CNPJ inteiro.)
     - **telefone**: guarda como veio, só sem espaço sobrando. Se `telefoneParaWhatsapp()`
       (`src/schemas/whatsapp.ts`) devolver `null`, **aviso** "não vai dar pra usar no WhatsApp".
     - **data de nascimento**: aceita `dd/mm/aaaa` e `aaaa-mm-dd` (ano com 2 dígitos não: "05/03/45" pode ser 1945 ou 2045, então fica em branco com aviso), e grava `aaaa-mm-dd`
       montando o texto na mão (**nunca** `new Date(...).toISOString()`, que muda o dia no fuso do
       Brasil). Data impossível (31/02) → fica em branco, com **aviso**.
     - **UF**: 2 letras maiúsculas; outra coisa → fica como veio, com aviso.
     - **coluna sem mapeamento ou vazia** → o campo fica em branco, sem aviso.
   - `acharRepetidos(convertidos, clientesQueJaExistem)`:
     - **mesmo CPF/CNPJ** (comparando só os dígitos) que um cliente que já existe, ou que uma linha
       anterior da mesma planilha → **pulado**, motivo "já existe: <nome do cadastro>";
     - **sem documento, mas mesmo nome (sem acento, sem maiúscula) e mesmo telefone (só dígitos)** →
       **pulado** do mesmo jeito;
     - **só o nome igual** → **entra, com aviso** "tem um cliente com o mesmo nome", e a linha
       nasce **desmarcada** na prévia (a pessoa decide).
   - **Validação é aviso, nunca tranca** (item 33 de `docs/licoes.md`): a única coisa que pula uma
     linha é faltar o nome ou ser repetida. Nenhum aviso impede de importar as outras.

**Testes do PR 1** (cada um visto falhar quebrando a função de propósito): `;` e `,`; UTF-8 com e
sem BOM e o mesmo arquivo em Latin-1 ("Conceição" tem que sair igual); aspas com `;` dentro e com
quebra de linha dentro; CPF com e sem pontos; CNPJ com 14 → jurídica; documento de 9 dígitos →
entra com aviso; data `dd/mm/aaaa` e data impossível; linha sem nome; repetido contra o banco e
dentro da própria planilha; e **uma planilha inventada de 2.000 linhas** convertida em menos de 1
segundo.

### PR 2: a tela
3. `src/lib/clientes.ts`: `importarClientes(clientes: NovoCliente[], aoAvancar)`: grava **em
   pacotes de 200** (`insert` de uma lista), chamando `aoAvancar(feitos, total)` a cada pacote, pra
   a tela mostrar "Gravando 400 de 2.000…" sem travar. Se um pacote der erro, **para ali** e devolve
   quantos entraram e o erro (com `mensagemDeErro()`): nada de tentar de novo sozinho, que
   duplicaria.
4. `src/pages/clientes/ImportarClientesModal.tsx` (novo), dentro do `Modal`
   (`src/components/Modal.tsx`), em 4 passos na mesma janela:
   1. **Escolher o arquivo** (`<input type="file" accept=".csv,text/csv">`), com o texto "Tem um
      arquivo do Excel? Abra no Excel e use Salvar como → CSV". O arquivo é lido no computador, com
      `File.arrayBuffer()`; **não vai pra internet nenhuma** antes de a pessoa confirmar.
   2. **Qual coluna é o quê**: uma linha por coluna da planilha, com um exemplo do conteúdo e uma
      caixinha de escolha (já com o palpite de `sugerirMapeamento`). Sem coluna de nome escolhida,
      o botão "Ver prévia" fica apagado, com a frase dizendo por quê.
   3. **Prévia**: a tabela com as linhas convertidas, uma caixa de marcar por linha, avisos em
      amarelo e puladas em cinza com o motivo. No topo: "N vão entrar · N com aviso · N puladas".
      Pra 2.000 linhas, mostrar as 100 primeiras e um filtro "só as com aviso / só as puladas"
      (tabela de 2.000 linhas na tela trava o computador da loja). O jeito de revisar em tabela
      segue o "Importar por foto" (`src/pages/estoque/ImportarNotasFiscaisModal.tsx`), que a Sofia
      já conhece.
   4. **Gravar e relatório**: a barra de andamento do item 3 e, no fim, o resumo, com um botão
      "Baixar relatório" (CSV com linha, nome, situação e motivo; usar `src/lib/download.ts`).
   - Antes de gravar, a confirmação é um botão **"Importar N clientes"** com o número escrito. Sem
     `window.prompt()` nem `confirm()`.
   - Pra achar repetidos, a lista de quem já existe vem de `listarClientes()`, que já existe e já
     deixa o Consumidor de fora.
5. `src/pages/clientes/ClientesPage.tsx`: o botão "Importar planilha" ao lado de "+ Novo cliente",
   **só pra administrador** (`operador.admin`, de `useAuth()`). No fim, recarrega a lista.
6. **Catálogo de telas** (`site/ferramentas/cenas.mjs`): uma cena com o modal aberto no passo 2 ou
   3, pra as varreduras olharem.

## Pronto quando
- [ ] **PR 1**: todos os testes da lista acima existem, passam, e cada um foi visto falhar.
- [ ] **PR 2**, no **Supabase de teste** (nunca no da Pneus Amigão; ver `docs/supabase-de-teste.md`),
      com planilhas **inventadas** (o Claude gera; nunca de cliente de verdade):
  - [ ] uma planilha com `;` em Latin-1 (como o Excel brasileiro salva) e outra com `,` em UTF-8
        entram certas, com acento certo;
  - [ ] o relatório aponta as linhas com problema, e o número de "entraram" bate com a lista de
        Clientes;
  - [ ] **importar a mesma planilha duas vezes não duplica nada**: na 2ª vez, tudo sai como "já
        existe";
  - [ ] uma planilha de 2.000 linhas inventadas vai até o fim sem a tela congelar, mostrando o
        andamento;
  - [ ] um login que não é administrador não vê o botão;
  - [ ] fechar a janela antes de "Importar N clientes" não grava nada.
- [ ] Rodaram limpos: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:fusos`,
      `npm run contraste`, `npm run contraste:telas` e `npm run largura:telas`.
- [ ] Os PRs têm fotos dos 4 passos (PR 2) e dizem, na descrição, que esta parte **não tem
      desfazer nem atualizar** (pra Sofia decidir quando ela vai pras lojas).

## O que não fazer
- **Não usar planilha de cliente de verdade** em teste, exemplo, foto ou PR (dados pessoais; o
  repositório é público).
- **Não instalar biblioteca nova** (nem de CSV, nem de Excel). Se parecer indispensável, parar e
  perguntar à Sofia pelo PR.
- **Não escrever migration** nesta parte, nem mexer em `supabase/`. Se aparecer a necessidade,
  parar e avisar: migration vai num PR separado e **quem aplica é a Sofia**.
- Não atualizar nem apagar cliente que já existe. Esta parte só acrescenta.
- Não importar veículos, peças nem contas (são as partes seguintes da #457).
- Não mexer em caixa, estoque nem nota fiscal.
- Não barrar a importação inteira por causa de aviso: só nome faltando ou repetido pulam a linha.
- Não construir "importador universal": é uma planilha com escolha de colunas.

---

### Em toda tarefa (resumo do `docs/painel.md`)
- **Antes de tudo**: a seção 0 do `PROJETO_STATUS.md` e o "Como começar uma tarefa". O Claude
  **guia passo a passo, com calma**, em tudo que não for programar.
- **Pôr o seu nome** na tarefa (campo *Assignees*) antes de começar. **Uma tarefa por vez.**
- **Só o Supabase de teste.** Banco de loja de verdade, publicar e liberar versão são da Sofia.
- **No fim de cada PR**: conferir o "Pronto quando" item por item; abrir o PR (o 1º com
  `Parte de #<esta issue>`, o 2º com `Closes #<esta issue>`) e pedir a revisão da
  `caranovavidanova` (**não mesclar**); o Claude escreve a mensagem de WhatsApp pra Sofia; esperar
  a aprovação antes de seguir.
- **Nada privado** aqui: o repositório é público.

**Pra começar**, diga ao seu Claude: *"Quero fazer a tarefa #<número> do sakura-corp/sakura-system-ace."*
```

**Por que 12 h, em 2 PRs**: o leitor de CSV com aspas e dois formatos de letra, a conversão e os
repetidos, com uns 20 testes (6 h); a tela de 4 passos, gravação em pacotes, relatório, varreduras
e fotos (6 h). Uma tarefa de 12 h num PR só seria grande demais pra revisão da Sofia; partida em
duas, cada revisão é do tamanho da #455.

**Sobre migration**: esta parte **não precisa**. A parte seguinte (atualizar quem já existe e
desfazer a importação) precisa de uma coluna como `clientes.importacao_id` (e o mesmo em
`veiculos`, quando os veículos entrarem), escrita num PR e **aplicada pela Sofia**, seguindo as
regras de migration da seção 3 do `PROJETO_STATUS.md`.

**Detalhe pra quem for revisar**: a migration 0053 grava auditoria a cada cliente inserido, então
importar 2.000 clientes cria 2.000 linhas de auditoria. É o esperado, mas vale a Sofia saber.
