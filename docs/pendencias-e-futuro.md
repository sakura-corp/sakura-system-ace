# O que não existe ainda e próximos passos

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 8. O que NÃO existe ainda (próximos passos possíveis)

**Estado geral (05/10/2026)**: o sistema está em uso real na Pneus Amigão (cadastro, OS, venda de
balcão, estoque, caixa, contas, comissões, fornecedores), **com NFC-e e NFS-e emitidas em produção**.
A fase atual é preparar a venda pra outras empresas (seção 2). Os itens abaixo mantêm a numeração
antiga porque outros arquivos citam "item N da seção 8".

### O que depende dela, numa lista só (juntada em 30/09/2026)

Antes desta lista, essas coisas estavam espalhadas pelos marcos antigos do `docs/historico.md`.
**Manter aqui**: quando uma sair, riscar ou apagar; quando surgir outra, acrescentar.

**Testes na loja que faltam** (lista de 28/09; nada disso dá pra testar daqui; o Balcão está na
`0.9.50` desde 05/10):
- venda de balcão com o leitor, a NFC-e dela e o caixa do dia batendo;
- ficha do veículo; Fechamento do Caixa; "Registrar pagamento" de comissão; a trava do desconto;
- pagar e desfazer uma conta; faturar OS "recebido agora" e "a receber";
- confirmar que o `DESKTOP-PKJ2A3B` (`0.9.44`, canal de teste) é o PC da casa dela e dar um
  apelido (senão, esquecer esse computador).

**Testar a `v0.9.50` (Electron 36, o 1º salto da #385)**: publicada no canal de teste em 04/10;
**o Balcão atualizou sozinho em 05/10** e ela está usando. A impressora da loja estava parada:
testar a impressão pela "Microsoft Print to PDF". No Windows dela e no Balcão: abrir o Diagnóstico
(o "i" ao lado do nome, embaixo à esquerda) e ver "Electron / Chromium" = `36.9.5 / 136...`;
usar normalmente; **imprimir** uma garantia, um recibo e uma nota (a impressão é a única coisa
que o laboratório não testa). Só depois disso vem a `v0.9.51` (o conserto da rodinha, #436), que
de quebra prova que o atualizador da 36 funciona, e então o salto pra 40.

**Liberar a `v0.9.49` pras outras lojas** quando ela achar que rodou o bastante (publicada em
03/10 só no canal de teste; leva junto a `v0.9.48`, que nunca foi liberada). Hoje a Pneus Amigão
é a única empresa, então não tem pressa. Na loja, vale olhar a lista de OS no Balcão com os dados
de verdade (nomes e valores maiores que os de demonstração).

**Com data** (a alíquota de 10/2026 foi cadastrada em 1º/10 e conferida): **10/10** a primeira
fatura da Focus; a partir de **16/10** o que depende do dinheiro da empresa (a TFE, que é a taxa
anual da prefeitura de SP; o capital; o Claude Team); trocar a Focus do Solo pro Start **antes do
2º CNPJ** (esses estão no repositório privado); **antes de 1º/11**, a pergunta do Ambiente
Nacional da NFS-e (abaixo, em "Perguntas pra fora").

**Abertura da empresa**: o **CNPJ saiu em 02/10**, já no Simples, e o licenciamento da prefeitura
em 05/10. O que falta (a conta PJ, esperando aprovação; o certificado digital, travado num erro de
cadastro que a Contabilizei está corrigindo; a procuração; a TFE; e a 1ª NFS-e da Pneus Amigão,
prevista entre ~17/10 e ~01/11) está no privado, `EMPRESA.md`, seção "Abertura: o que falta".

**O que falta do guia de melhorias e o que o concorrente tem e nós não** (`docs/comparativo-anexar.md`)
**viraram tarefa no GitHub** (30/09, etiqueta `guia`, #365 a #385 e #386 a #412), cada uma com o que fazer, onde, "Pronto quando", o que não fazer e, quando depende dela, a
instrução de **parar e mandar mensagem pra ela** se quem estiver fazendo não for ela. Por enquanto
só ela (com o Claude dela) mexe nessas: a equipe fica no painel até ela avisar.

| Tarefa | O que é |
|---|---|
| #365, #366, #367 | Permissão no banco: clientes e veículos; peças e estoque; OS (`TR-04.1`, lotes 4 a 6) |
| #368 | Apagar a cópia antiga do token da Focus (`TR-04.2` parte 2) |
| #369 | Uma nota por OS garantida pelo banco (`TR-05.2`) |
| #370 | Erro de tela com as últimas ações (resto do `TR-08.3`) |
| #371 | Menu agrupado (`TR-03.1`, conversa antes) |
| #372 | Busca geral com Ctrl+K (`TR-03.3`) |
| #373 | Listas longas com páginas e ordenação (`TR-03.5`) |
| #374 | Aviso quando a internet cai (`TR-10.1`) |
| #375 | Saber que uma loja parou (`TR-08.2`) |
| #376 | Checklist fiscal da loja nova (`TR-11.6`) |
| #377 | Levantamento da assinatura do instalador (`TR-09.3`) |
| #378 | Exportar os dados de uma loja (`TR-12.4`) |
| #379 | Orçamento (`FN-01`) |
| #380 | Checklist de entrada com fotos (`FN-02`) |
| #381 | Lembrete de revisão (`FN-06`) |
| #382 | Sugestão de compra (`FN-07`) |
| #383 | Relatório mensal pra contabilidade (`FN-13`) |
| #384 | Modo demonstração (`FN-14`) |
| #385 | Atualizar o Electron (item 14) |
| **Do comparativo** | |
| #386 → #387 → #388 | **DRE**, nesta ordem: plano de contas em grupos; taxa da maquininha; a tela do DRE. O DRE de modelo, com números reais, fica só no repositório privado (`dre/`) |
| #389 | Fluxo de caixa projetado |
| #390 | Curva ABC |
| #391 | Limite de crédito por cliente (aviso, nunca tranca) |
| #392 | Vales de funcionário |
| #393 | Tela do cliente: o que comprou, pagou e deve |
| #394 | Mais de uma conta (gaveta, banco, maquininha) e transferência |
| #395 | Centro de custo (melhor depois da #386) |
| #396 | Renegociar conta a receber atrasada |
| #397 | Resumo pro dono no WhatsApp |
| #398 | Metas do mês (`FN-12`) |
| #399 | Devolução e troca (`FN-08`) |
| #400 | Agenda (`FN-05`; pro perfil de loja grande) |
| #401 | Reserva de produto |
| #402 | Etiqueta com código de barras, com a impressão térmica (`FN-10`) |
| #403 | Manutenção dos equipamentos da loja |
| #404 | Relatório por marca e modelo de veículo |
| #405 | Relatórios com filtro livre |
| #406 | Horas do mecânico em cada OS |
| #407, #408 | Tabela de preço por tipo de cliente; convênio (fatura do mês). Quando aparecer loja com frota |
| #409, #410 | NF-e modelo 55; manifestação do destinatário (MD-e). Fiscal: só com ela |
| #411 | Boleto (levantamento) |
| #412 | App de celular pro mecânico (levantamento; decisão estrutural) |

O orçamento rápido no balcão entrou na #379, e a assinatura do cliente na #380. Ficaram **sem
tarefa**, de propósito: MDF-e, SPED (é da contabilidade), SMS (o WhatsApp cobre), expedição e
cheque (só se uma loja pedir).

**Quando uma tarefa `guia` for feita**: o PR fecha a issue (`Closes #N`) e a linha sai desta tabela.

**Decisões dela, sem prazo:**
- o valor da mensalidade das lojas novas (privado);
- levar o `ANTES-DA-PRIMEIRA-VENDA.md` a um advogado ou à contabilidade (item 10);
- atualizar o Electron (item 14, tarefa #385): **em andamento desde 03/10**, em três saltos
  (33 → 36 → 40 → 44); cada um precisa do teste dela na loja antes do próximo (o 1º, a
  `v0.9.50`, está no canal de teste desde 04/10);
- os próximos lotes de permissão no banco: clientes, peças/estoque e OS (item 1 da seção 6;
  tarefas #365 a #367, cada uma diz o que ela precisa decidir);
- a parte 2 do `TR-04.2`, apagar a cópia antiga do token (liberada desde 28/09; tarefa #368);
- **cancelar uma nota deveria estornar estoque e Caixa?** (pergunta de desenho nunca respondida,
  desde 03/09; conversa com a devolução, #399);
- **6 testes de `npm run test:fusos` reprovam no Windows** (`scripts/atualizar-bancos.test.ts` e
  `scripts/gerar-instalacao-completa.test.ts`: o caminho vem com `\` e o fim de linha em CRLF).
  Quem achou foi o Gustavo, no PR #424, em 01/10. O CI, que roda em Linux, passa, e o app não é
  afetado. Só atrapalha quem roda os testes no PC;
- o repositório só de versões e fechar o código (item 12);
- **as duas janelas de importação** (XML do fornecedor e notas no estoque) foram montadas à mão e
  não têm o que o `Modal` tem: Esc pra fechar, Tab preso dentro e `role="dialog"`. Achado na
  revisão de 03/10; o conserto é passar as duas a usar o `Modal`, com uma opção de largura.

**Segurança, fora do código:**
- **trocar as três credenciais fiscais expostas** no histórico público (CSC da SEFAZ, token do
  Giap, senha do portal da prefeitura; passo a passo no item 1). A varredura automática não pega
  essas (item 50 da seção 6);
- trocar a chave `sb_secret_...` do Supabase que um dia foi colada no chat, se ainda não trocou
  (item 3 da seção 6);
- ~~conferir se o ruleset `main protegida` exige o CI verde~~: **feito em 30/09**. Ela ligou
  "Require status checks to pass" com os 5 testes do CI (Tipos/lint/testes, Matriz de RLS,
  Varredura de segredo, Electron de verdade, Contraste nas telas). Admin continua isenta.

**Perguntas pra fora:**
- **contabilidade** (a da Pneus Amigão): com CSOSN `500`, as peças deveriam levar ICMS-ST retido?
  (item 1, "frágil" 2); a migração do Simples pro Ambiente Nacional da NFS-e em **1º/11/2026**
  vale pra loja? (**perguntar antes dessa data**: se valer, a NFS-e da loja pode mudar de portal);
- **Focus NFe**: o formato do CNPJ com letras na API ("frágil" 6);
- **prefeitura**: o "Processado: Não" das notas e o `cNBS` errado no cadastro da empresa.

### 1. Parte fiscal: funcionando em produção desde 27/08/2026

NFC-e (peça) e NFS-e (serviço) emitem de ponta a ponta pela Focus NFe, na conta dela. O caminho até
aqui está no histórico do Git; o que uma sessão nova precisa saber é isto:

- **NFC-e**: CNPJ credenciado na SEFAZ-SP, CSC e ID Token de **produção** cadastrados na Focus.
  **Falta o de homologação** (o servidor de teste da SEFAZ-SP nunca respondeu,
  `ERR_CONNECTION_TIMED_OUT`); não bloqueia nada, só serviria pra testar sem gerar nota real. Pra
  tentar de novo: portal `www.nfce.fazenda.sp.gov.br/NFCePortal/` → Gerenciar Cód Segurança →
  "ambiente de testes".
- **NFS-e**: token da prefeitura de Araraquara (portal Giap) e CNAE da loja cadastrados. Rotina.
- **CSOSN `500`**: confirmado pela contabilidade em 31/08 como o código certo das peças.
- **Numeração de RPS** (resolvida em 31/08): a NFS-e começou a falhar com *"O número de RPS 7 já
  existe"*. O Sakura System **não manda número de RPS**; quem conta é a Focus. A empresa já tinha
  usado a numeração antes, emitindo pelo portal, e a Focus começou do 1. O suporte ajustou o
  contador pra 100; dá pra fazer sozinha em Painel da API → **Documentos Fiscais**. Vale pra toda
  loja nova que já emitia nota (passo C.3 do playbook abaixo).
- **⚠️ A alíquota da competência precisa ser cadastrada TODO MÊS no portal da prefeitura, antes da
  primeira NFS-e do mês.** Sem isso a nota é recusada com *"conclua o cadastro de todas as
  alíquotas referentes à competência vigente"*. Não é código nosso: o app manda a alíquota certa
  (`configuracoes_fiscais_loja.aliquota_iss`, 3%). **O sistema lembra** desde 11/09 (`TR-11.2`):
  faixa no Início e dentro da janela de emitir NFS-e, com o botão "Já cadastrei" (seção 7, "Aviso
  da alíquota do mês"). Desde 26/09 isso é responsabilidade da contabilidade de cada empresa
  (seção 3).
  - **Onde**: portal do Giap (site da prefeitura → Serviços Empresa → Nota Fiscal Eletrônica →
    Contribuintes; o usuário é o número de inscrição) → **Emissor/Consulta NFS-e** → **Cadastro de
    Alíquota**. Mês/Ano (ex: `10/2026`), Alíquota (`3`), Atividade, e **"Replicar Alíquota"** (é o
    botão de salvar).
  - A empresa tem **três atividades** (CNAE 452000100 mecânica, 452000400 alinhamento e
    balanceamento, 452000600 borracharia), todas a 3%. **O "Replicar" cadastra as três de uma
    vez** (confirmado em 1º/10/2026: cadastrada uma só, e a primeira NFS-e de outubro, a nº 25
    da OS 15, que é de mão de obra/alinhamento, saiu autorizada).
  - **Mudar o valor**: se a contabilidade mandar outro percentual, trocar **também** em
    Configurações → Dados fiscais, senão a nota sai com um valor e a prefeitura tem outro.
- **Duas coisas do portal da prefeitura, que são com a prefeitura** (o suporte da Focus confirmou;
  nenhuma exige código): (a) toda nota emitida pela API aparece lá como "Processado: Não", sem
  chave e com um erro genérico, mas a autorização foi feita (o XML tem `cStat 100`, número, chave e
  assinatura do município: a nota vale); (b) o XML sai com `cNBS 120013430` ("manutenção de
  foguetes e equipamentos aeroespaciais"), que vem do cadastro da empresa no portal. **Nenhuma das
  duas foi levada à prefeitura.**

**Os bloqueios já vencidos, um por linha** (pra reconhecer o padrão se algo voltar): `Failed to
fetch` (CORS; resolvido chamando a Focus pelo processo principal do Electron, item 29 da seção 6)
→ CNPJ vazio em Configurações → empresa não habilitada (self-service no painel da Focus: Empresas →
Documentos Fiscais → ligar NFCe/NFSe) → CST em vez de CSOSN pro Simples → grupo IBS/CBS faltando e
depois com alíquota errada → CNPJ não credenciado na SEFAZ-SP (**quem credencia é o lojista**, com
certificado digital) → na NFS-e, "Lote RPS" (instabilidade da homologação da prefeitura; resolveu
testando em produção) → autenticação com a prefeitura → CNAE faltando.

**Três coisas que não são óbvias:**
1. **O "login da prefeitura" que a Focus pede não é a senha do portal**: é um **token** gerado no
   portal Giap, em "Dados Cadastrais" (o menu só aparece depois de marcar como lido o comunicado
   pendente da prefeitura). O usuário é o número de inscrição.
2. **CSC e ID Token da NFC-e** saem do portal da SEFAZ-SP, com certificado digital, e **homologação
   e produção são pares separados**.
3. **O "Ambiente Nacional" da NFS-e foi descartado**: a Focus avisa que só vale pra empresa
   obrigada (ex: MEI), e a loja é Ltda no Simples. **Fato novo possível**: perguntar à
   contabilidade se a migração do Simples pro Ambiente Nacional em **1º/11/2026** vale pra ela.

> ⚠️ **Credenciais que já estiveram neste repositório** (o CSC da SEFAZ, o token do Giap e a senha
> do portal da prefeitura) foram tiradas em 02/09, mas **continuam no histórico do Git**: o certo
> é **trocar as três** (SEFAZ → Gerenciar Cód Segurança; Giap → Dados Cadastrais → Gerar Token; a
> senha do portal, com a contabilidade) e atualizar no painel da Focus. **Nunca colar credencial
> aqui**: o lugar é o painel do serviço.

#### O que ainda está frágil na parte fiscal

Não são bugs pra sair corrigindo: são limites conhecidos, e parte depende de confirmação de fora.

1. **NFC-e pra cliente pessoa jurídica: feito (03/09)**, mas **nenhuma emitida de verdade ainda**.
   PJ vai com `cnpj_destinatario` + `indicador_inscricao_estadual_destinatario: "9"`, **sem** a
   inscrição estadual (`montarDestinatarioNFCe()` em `src/lib/focusNfe.ts`, com teste). Cliente PJ
   sem CNPJ no cadastro sai como consumidor não identificado, e a tela avisa antes. Veio junto,
   do suporte da Focus:
   - o nome do destinatário é opcional (o sistema manda quando tem);
   - **entrega a domicílio exige o endereço completo** do destinatário, que o sistema não manda
     (hoje é só venda presencial, `presenca_comprador: "1"`);
   - **acima do limite da UF (em geral R$ 10.000)** a SEFAZ exige o destinatário identificado, e
     o sistema não avisa disso antes.
2. **CSOSN `500` vai sem os campos de ICMS-ST** (`vBCSTRet`, `vICMSSTRet` e afins). A Focus **não**
   completa campo fiscal que a gente não manda (suporte, 03/09). As notas continuam autorizadas,
   então **não mexer às cegas**: é pergunta pra contabilidade ("essas peças deveriam levar ICMS-ST
   retido?"). Se sim, a mudança é em `montarItemNFCe()`. Rejeição falando em substituição
   tributária: olhar aqui primeiro.
3. **Nada no banco impede duas notas do mesmo tipo pra mesma OS**: a proteção é da tela. Os dois
   caminhos que furavam isso têm aviso (item 46 da seção 6). Um índice único sozinho seria **pior**
   (revisto em 25/09, `TR-05.2`): a nota só é gravada **depois** que a SEFAZ autoriza, então o
   banco recusaria guardar o XML de uma nota que já vale lá fora. O desenho certo é o do item 5:
   gravar "processando" **antes** de enviar, com o índice valendo sobre essa linha. Fica pra
   depois da parte 2 do `TR-04.2`.
4. **Quase nada de Configurações → "Dados fiscais" vai pra nota**: só o **CNPJ** (mais inscrição
   municipal, código do município, CNAE e alíquota na NFS-e). Razão social, IE, endereço e regime
   **não saem na nota**: a emitente de verdade é a empresa cadastrada no painel da Focus. Esses
   campos alimentam o **documento de garantia**.
5. **A `ref` da emissão não é guardada antes do envio** (`os<numero>-<tipo>-<timestamp>`, gravada
   só com a nota autorizada). Por isso o item 46 da seção 6 **mostra** a `ref` quando a espera vence,
   em vez de recuperar sozinho. Guardar antes exige uma linha "em andamento" em
   `notas_fiscais_arquivos` (migration). O timestamp **não deve virar fixo**: é ele que permite
   reemitir depois de cancelar.
6. **CNPJ com letras** (a Receita emite desde julho/2026): o cadastro aceita (trava da `0060`), mas
   a montagem da nota tira tudo que não é dígito, em `src/lib/focusNfe.ts`, no porteiro
   (`supabase/functions/focus-nfe/index.ts`), em `EmitirNotaFiscalModal.tsx` e em
   `src/lib/notaFiscalXmlFornecedor.ts`. Com uma empresa dessas, a nota sairia com o CNPJ mutilado
   ou o porteiro recusaria. **Antes de mexer**, confirmar com a Focus o formato que a API espera.
   **Pesa na fase 2**: loja aberta de julho pra cá já nasce assim.

#### Playbook de habilitação fiscal por loja nova

A lição da primeira loja: os bloqueios são de três tipos, e só um some sozinho quando entra uma
loja nova.

**(A) Igual pra toda loja: já resolvido no código, custo zero.** Formato do JSON da NFC-e e da
NFS-e (conferido contra os exemplos oficiais da Focus); os campos de IBS/CBS com as alíquotas de
teste de 2026 (`cbs_aliquota = 0.90`, `ibs_uf_aliquota = 0.10`, `ibs_mun_aliquota = 0.00`, regra
**nacional** fixada por lei); o rateio do pagamento em OS com peça e serviço; a chamada pelo
processo principal (sem CORS); e o erro real da Focus na tela.

**(B) Muda por loja, mas é preencher uma tela.** Configurações → "Dados fiscais da loja": CNPJ,
razão social, IE e IM, regime, endereço, telefone, token da Focus e, só pra NFS-e, código IBGE do
município, item da LC 116, alíquota de ISS e código tributário do município. **Campo em branco aqui
vira erro que parece bug** (ex: `prestador.cnpj não informado` era o CNPJ vazio).

**(C) Muda por loja e depende de terceiros: é o caro.** Nada disso é código; leva dias ou semanas:
1. **Habilitar os documentos no painel da Focus** (Empresas → empresa → Documentos Fiscais → ligar
   NFCe e NFSe). É self-service; o suporte não faz.
2. **Credenciar o CNPJ na SEFAZ do estado pra NFC-e**, feito pelo lojista ou pela contabilidade:
   (a) o **credenciamento** (homologação e produção são separados; rejeição 245 é isso);
   (b) o **certificado digital** da empresa, vinculado no painel da Focus; (c) **CSC e ID token**
   gerados na SEFAZ (um par por ambiente) e informados na Focus. Em SP o portal da NFC-e é próprio
   (`nfce.fazenda.sp.gov.br`). **Varia por estado.** É o passo mais pesado.
3. **Conferir a numeração de RPS antes da primeira NFS-e**, se a loja já emitia nota de serviço:
   ajustar o contador da Focus pra bem acima do maior já usado.
4. **Cadastrar a alíquota da competência todo mês** (pelo menos em Araraquara). É tarefa
   recorrente da contabilidade, não de instalação.
5. **Acesso ao portal da prefeitura pra NFS-e**: **varia por município**, inclusive o fornecedor
   do sistema municipal (Araraquara usa o Giap).
6. **Confirmar CST/CSOSN com a contabilidade do cliente**: depende do regime **daquela** empresa. A
   SEFAZ rejeita código incompatível com o regime, mas não confere se é o código certo do produto.

**Consequência pro site de assinatura (item 2)**: assinar o sistema pode ser instantâneo, **emitir
nota não**. Tratar **"usar o sistema" e "emitir nota" como duas ativações separadas** (a loja usa
cadastro, OS, estoque e caixa desde o primeiro dia, como a Pneus Amigão fez), e conduzir o bucket
(C) junto com o cliente, por este playbook. **Uma conta só da Focus pra todas as lojas** (o
porteiro já permite: é colar o mesmo token em cada loja, decisão comercial no privado) tira o C.1
da mão do cliente, mas **não** o C.2, C.3 e C.4, que são no CNPJ dele.

### 2. Site externo de assinatura

Cria a primeira conta de cada loja sozinho (hoje é manual, seção 9). Fica pra versão comercial
(fase 3).

### 3. Logo oficial

**Não é prioridade, por decisão dela.** Continua com os SVGs feitos à mão (seção 2). Não sugerir
nem perguntar; só retomar se ela trouxer.

### 4. Refinamentos nos módulos

Conforme o uso real e o que ela pedir. O cardápio de ideias é o `MELHORIAS.md`, e o que o
concorrente tem e nós não está em `docs/comparativo-anexar.md`. **Nada disso é pra construir sem
ela pedir.** Os três ajustes que ela pediu em 28/09 (#361, #362 e #363) foram feitos em 03/10,
junto da #417 e da #425.

### 5. Fornecedores: completo

Cadastro, Pedido de Compra, Receber pedido, Cotação por fornecedor, Depósitos e Importar XML da
nota do fornecedor (seção 7). Fora da lista combinada, sem ordem: **garantia do fornecedor na
compra** (diferente da garantia ao cliente), pra quando ela sentir falta.

### 6 e 7. (Custos por loja, preço e plano de equipe)

Foram pro repositório privado `caranovavidanova/sakura-corp` em 27/09/2026.

### 8. Conexão com o banco por computador: feito

Um instalador serve qualquer empresa (seção 7, "Conexão com o banco").

### 9. Site de apresentação (`site/`): pronto, mas PARADO por decisão dela (28/08)

Página em HTML e CSS puros, com telas do sistema e dados inventados, pronta pra publicar na Vercel
(passo a passo em `site/README.md`). Ela disse: *"nem precisava ter feito site ainda... não vou
mexer com isso agora"*. **Não retomar sozinho.** Quando ela quiser: apontar a Vercel pra pasta
`site`, conferir o botão de download (aponta pro instalador da última versão) e decidir se entra
um WhatsApp (hoje o contato é só o e-mail dela).

### 10. ⚠️ Contrato e papéis de LGPD, antes da primeira venda pra terceiro (`TR-12.2`)

Não é código: **ela precisa levar isso a um advogado ou à contabilidade.** O texto de uma página
está em **`ANTES-DA-PRIMEIRA-VENDA.md`**, na raiz: os seis pontos da cláusula de dados e o registro
de operações de tratamento. Na LGPD **a loja é a controladora** dos dados dos clientes e **a
operadora é a empresa dela** (a Sakura Corp, com CNPJ desde 02/10/2026; as contas dos serviços
foram abertas no nome dela antes disso, e se precisam passar pra empresa é pergunta pro advogado). **Não escrever contrato por ela nem
dar como aconselhamento jurídico.** O ponto mais fácil de esquecer: o que acontece quando o
contrato acaba (cópia dos dados pra loja, exclusão do resto, e em quantos dias). **O contrato é de
adesão** (termos aceitos pela loja, detalhe no privado). Ideia anotada, não pedida: o sistema
mostrar os termos no primeiro login do admin e gravar o aceite.

### 11. Botão "Atualizar o banco de todas as empresas": feito (25/09/2026)

Cada empresa tem o próprio banco, e migration era colada à mão em cada um. Agora é o workflow
`.github/workflows/atualizar-bancos.yml` (lógica em `scripts/atualizar-bancos.mjs`). **Como usar
está na seção 9.** O que ele faz:
- Só roda na mão, na `main`, com a aprovação dela (cofre `lojas`). Lê o `BACKUP_EMPRESAS` (campos
  `nome` e `banco`): empresa que entra no backup entra no botão.
- Em cada banco, lê `max(versao)` de `schema_versao` (sem a tabela, recusa e explica). Pendentes =
  as migrations do repositório com número maior, em **ordem numérica**.
- **`ensaiar`** (padrão) roda as pendentes numa transação e **desfaz**. **`aplicar`** ensaia em
  todos primeiro e, se um falhar, não aplica em nenhum; depois aplica banco por banco (Pneus
  Amigão primeiro), **cada migration na própria transação**, e **para no primeiro erro**. No fim,
  confere a versão de cada banco.
- **Trava de 15 s** (`lock_timeout`): tabela ocupada pela loja faz a migration desistir, em vez de
  congelar a tela da loja.
- Recusa banco **mais novo** que o código (sinal de branch antiga). Não roda junto com o backup.
- **Espera os computadores atrasados** (desde a `0063`): migration com
  `-- versao-minima-do-programa: X` só é aplicada quando nenhum computador em uso (visto nos
  últimos 30 dias) está abaixo de X, a menos que a caixinha "aplicar mesmo com computadores
  atrasados" esteja marcada.
- Testado com `psql` de mentira (`scripts/atualizar-bancos.test.ts`) e contra Postgres de verdade
  no CI (`npm run test:atualizar-bancos`).
- **Descartado, e por quê**: a CLI do Supabase (não conhece as migrations já rodadas); um script
  no PC dela (exigiria a senha dos bancos e Postgres no Windows); o app se atualizar sozinho ao
  abrir (**proibido**: exigiria a senha principal do banco no instalador).
- **Ideia, não pedida**: o Release conferir, antes de publicar, que nenhum banco está atrás da
  última migration.

### 12. Repositório só de versões (combinado em 30/09/2026, pra depois)

As versões (instalador + `latest.yml`) passariam a ser publicadas num repositório público separado,
onde colaborador não escreve, com um token dela no cofre `lojas`. Fecha o furo do item 78 da seção
6 e é o pré-requisito pra deixar o `sakura-system-ace` privado. A transição e os custos estão no
marco de 29-30/09 do `docs/historico.md`. **Cuidado barato até lá**: o Balcão no canal normal, pra
versão de teste só chegar no PC dela.

### 13. Painel da equipe (`docs/painel.md`)

A **leva 0** foi criada em 30/09 (issues #350 a #355): o painel no ar, login, a leva com contador e
tempo real. Depois, a **leva 1** (a linha de produção completa: pegar tarefa, fases da leva, horas
por pessoa, relatório e aprovação) e o **financeiro com DRE**, num banco privado (nunca no GitHub).
O exemplo de DRE está no repositório privado (`dre/`).

### 14. Atualizar o Electron (tarefa #385; ritmo decidido por ela em 03/10/2026)

O programa estava na **linha 33 do Electron** (Chromium 130), sem correção de segurança desde
2025. O aviso `electron-desatualizado.yml` fica vermelho todo dia 1 por isso, e está certo.
- **Destino: a linha 44**, não a 42: sai uma linha nova a cada 8 semanas e o suporte é das três
  últimas, então a 42 perde o suporte quando a 45 sair (~20/10/2026). A 44 vai até ~fev/2027.
- **Andamento**: salto 1 (**36**) publicado no teste em 04/10 como `v0.9.50`, e no Balcão desde
  05/10; no laboratório, nenhuma das 61 telas mudou a olho e os campos se comportaram igual.
  Falta o teste dela. **Salto 2 (40) já passou no laboratório** (05/10): 36 × 40 deu as 61 telas
  idênticas ponto por ponto.
- **O Balcão é Windows 10 Home 22H2**: nenhuma linha até a 46 deixa de rodar nele (o Electron
  exige Windows 10 ou mais novo desde a 23). Ficar de olho quando o Chromium anunciar o fim do
  Windows 10.
- **Ritmo escolhido por ela: três saltos, 33 → 36 → 40 → 44** (em vez de 11 versões, uma por
  linha). Os cortes caem onde o Node troca de versão grande (22 na 35, 24 na 40): cada salto
  troca no máximo um. Cada salto é **uma versão sozinha**, sem nenhuma outra mudança junto,
  publicada no teste, testada por ela no Windows dela e no Balcão, e só então o próximo.
- **Em cada salto**: `npm run comparar:electron -- <linha>` (as telas e os campos dentro de
  cada Electron, lição 82), `test:electron`, `test:fusos`, typecheck, lint, e o build com as
  chavinhas (`scripts/ligar-fuses.mjs`). O que o laboratório não alcança e a loja testa:
  **imprimir** (garantia, recibo, nota, comissões) e o uso do dia a dia. O atualizador da versão
  nova só é posto à prova na versão SEGUINTE (é ela que vai chegar por ele).
- **O que muda no código**: a lista oficial da 34 à 44 não toca em nada que o programa usa. Na
  **42**, o Electron para de se baixar sozinho no `npm ci` (afeta o CI e o `test:electron`); na
  **44**, deixa de existir Windows 32 bits (o instalador já é só 64).
- **O electron-builder 26** (destrava a chavinha de integridade do asar) vai junto de um dos
  saltos; avisar ela em qual antes.
- **Depois de chegar na 44**: um salto a cada ~4 meses mantém o programa com suporte.

### Futuro, só com pedido explícito

Integração com maquininha de cartão (TEF), assistente de IA pro estoque, importador de dados de
outros sistemas, app de celular, outras edições do Sakura System. Manter a arquitetura aberta pra
isso, sem construir.

## Linha do tempo (o que cada sessão deixou pronto)

O detalhe de cada sessão está nos PRs (e, dos marcos até 27/09, no Git: `git show
0505661:docs/historico.md`); o estado de hoje, nas seções 6, 7
e 8. Conferir a versão publicada nas releases do GitHub, nunca só por esta tabela.

| Quando | O que saiu |
|---|---|
| 27/08 | **A parte fiscal fechou**: NFC-e e NFS-e emitidas em produção pela primeira vez. |
| 28/08 (manhã) | Instalação de empresa nova num **arquivo SQL único** + checklist de venda (itens 36 e 37 da seção 6). O **site de apresentação**, guardado sem publicar (item 9). |
| 28/08 (tarde) | Ajustes de uso real: cartão parcelado dentro do pagamento dividido, OS "Finalizada", "+ adicionar item" no rodapé, total por item, e os **três cálculos de lucro divergentes** (item 40 da seção 6). `v0.9.21` a `v0.9.24`. |
| 31/08 | Campo numérico sem mudar pelas setas (item 41), calendário do Início com os dias do mês vizinho, **CSOSN `500` confirmado**. `v0.9.25`. |
| 01/09 | A primeira NFS-e de um mês novo revelou o **cadastro mensal da alíquota** no portal. |
| 02/09 | XMLs de um mês num **`.zip`**, a aba **Comissões**, e **12 correções** de duas varreduras (itens 42 a 46 da seção 6). `v0.9.26`. |
| 03/09 | **NFC-e no CNPJ do cliente empresa**, período **Anual** em Relações, Comissões dentro de Funcionários, botão do calendário visível. `v0.9.27`. |
| 08-11/09 | **Etapas 1 e 2 do `MELHORIAS.md`**: CI, travas de fuso e de arquitetura, Ver DANFE, aviso da alíquota, acessibilidade, cartões do Início, categoria obrigatória no caixa, cliente e veículo sem sair da OS. `v0.9.28` a `v0.9.32`. |
| 12/09 | Fecha a Etapa 2 (estoque mínimo, campos fiscais explicados, WhatsApp, contraste; `v0.9.33`) e 3 itens da Etapa 3 (borda dos campos, rateio, teste-ouro da nota, teste de tela nos formulários de dinheiro; `v0.9.34`). |
| 13/09 | Começa a **Etapa 4**: auditoria em mais tabelas (`TR-04.9`), voltar versão (`TR-09.2`), a função de permissão por módulo (`TR-04.1`, etapa 1). Migrations `0053`/`0054`, `v0.9.35`. Depois, a **matriz de RLS** (`TR-07.3`). |
| 15/09 | **Diagnóstico** (`TR-08.1`) e `ErrorBoundary` (`v0.9.36`). O banco diz a própria versão (`TR-05.7`, migration `0055`) e o app avisa qual arquivo falta (`v0.9.37`). |
| 17/09 | **LGPD** (`TR-12.2`, `ANTES-DA-PRIMEIRA-VENDA.md`) e **Electron endurecido** (`TR-04.6`, `npm run test:electron`). `v0.9.38`. |
| 18/09 | **Backup próprio do banco** (`TR-12.1`), cifrado, em dois lugares, todo dia às 3h. **Dado de RH só com o módulo** (`TR-04.3`, migration `0056`). |
| 25/09 | `0056` rodada e `v0.9.39`. **Canal de teste** (`TR-09.1`, `v0.9.40`). **Porteiro da Focus** (`TR-04.2` parte 1, migration `0057`, `v0.9.41`). Apresentação comercial; "Importar por foto" desligado. **Botão de atualizar os bancos**, fechamento de caixa (`TR-06.4`), comissão paga congelada (`TL-46.1`), travas de dado (`TR-05.1`); `0058`–`0060` pelo botão e `v0.9.42`. |
| 26/09 | **Contas protegidas no banco** (`TR-04.1` lote 2, `0061`) e **Caixa protegido** (lote 3, `0062`); `v0.9.43`. **A versão de cada computador** (`0063`, `v0.9.44`). **Venda de balcão** (`FN-09`, `0064`, `v0.9.45`). |
| 27/09 | **Ficha do veículo** (`FN-04`, `v0.9.46`). Memória reorganizada em `docs/`. Organização da equipe, domínio e e-mail (privado). |
| 28/09 | Testes na loja (NFS-e cancelada pelo porteiro) e a preparação do painel. |
| 29/09 | Comparativo com o Anexar e o exemplo de DRE (privado). |
| 29-30/09 | Repositório na organização **`sakura-corp`** (`v0.9.47`, só o endereço do atualizador). Senhas no Bitwarden, **cofres** `backup` e `lojas`, rulesets `main protegida` e `versões`, aprovação dela no Release, Liberar e Atualizar bancos. Seção 0 da memória, manual do painel e **leva 0** (#350 a #355). |
| 01/10 | **Painel no ar** na Cloudflare e a tarefa 1 do Gustavo mesclada (PR #424). NFS-e que demorou na prefeitura: "Conferir de novo" e registrar pela referência (item 80 da seção 6); `v0.9.48`, só no teste. |
| 02/10 | **A Sakura Corp tem CNPJ** (detalhes no privado). |
| 03/10 | Cinco bugs de tela (#361, #362, #363, #417, #425) e a varredura `largura:telas` (item 81 da seção 6); `v0.9.49`, só no teste. |
| 04-05/10 | **Electron 33 → 36** (`v0.9.50`, só no teste; no Balcão desde 05/10), a ferramenta `comparar:electron` (item 82 da seção 6) e o salto pra 40 aprovado no laboratório. Abertura da empresa: licenciamento emitido, certificado sendo destravado (privado). |
