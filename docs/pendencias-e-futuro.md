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

### O que depende dela: virou tarefa no GitHub (A1 da #472, 16/10/2026)

Esta lista era de texto, e lista de texto envelhece. Agora **cada item é uma tarefa com a etiqueta `sofia`**:

- **Tudo o que depende dela, no sistema e na loja**: [github.com/sakura-corp/sakura-system-ace/issues?q=is:issue+is:open+label:sofia](https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aissue+is%3Aopen+label%3Asofia).
  Quando surgir algo novo que dependa dela, abrir a tarefa com a etiqueta `sofia` (e a **data no título**
  quando houver, ex.: "Até 09/10/2027: renovar a chave `TOKEN_VERSOES`"). Feito, fecha a tarefa.
- **Já tinham tarefa antes e continuam valendo**: a equipe no programa das lojas (#474), criar operador
  no programa instalado (#482), enxugar o CI (#442), atualizar o Electron (#385, em saltos), os lotes de
  permissão no banco (#365 a #367), apagar a cópia antiga do token da Focus (#368), a paginação das
  listas (#373, que cobre `listarClientes()` e a busca de ordens, cortadas em 1.000 linhas pelo Supabase).
  O painel em tempo real (#355) saiu daqui: feito e testado ao vivo em 17/10.
- **Assuntos da EMPRESA ficam no repositório privado** (`caranovavidanova/sakura-corp`), nunca aqui, e não
  são detalhados neste arquivo. Os que continuam pendentes, só pelo nome: **a TFE; o capital; o Claude Team
  (assinatura marcada para 19/10); a troca do plano da Focus antes do 2º CNPJ; o preço/mensalidade das lojas
  novas; o Termo de Colaboração, a cessão e o memorando da equipe; a conversa com o contador sobre o dinheiro
  que entrou; levar o contrato e a LGPD (item 10) a um advogado ou à contabilidade; e o que falta da abertura
  da empresa e da 1ª NFS-e da Pneus Amigão.** Pra tratar de qualquer um, adicionar o privado à sessão
  (`add_repo`, com a autorização dela) e ler lá.
- **Depende do horário dela e do privado, ainda sem tarefa**: o resumo agendado da segunda de manhã (A2 da
  #472; `docs/jeito-de-trabalhar.md`).
- **Assunto importante: segurança contra ataque e contra cópia do código** (ela, 17/10). Não precisa de
  tudo de uma vez, mas precisa de um caminho que cresce junto com o projeto. As fases propostas (o que
  fazer agora de graça, em 3 a 12 meses e depois de ~30 lojas) estão no item **B2** do plano de 17/10, no
  privado (`docs/jeito-de-trabalhar.md`, "A direção"). Cada fase vira tarefa quando ela aprovar.

**Conferência dela, ainda por fazer**: abrir a busca `label:sofia` acima e dizer se falta algo que estava na
lista antiga (a versão antiga está no histórico do Git, no PR que trouxe esta mudança).

**O que já foi respondido pela contabilidade da Pneus Amigão** (13/10, pra consulta; as perguntas que
faltam viraram tarefa `sofia`):
- **CSOSN `500`**: não leva ICMS-ST retido na venda ao consumidor final (item 1, "frágil" 2);
- **Ambiente Nacional**: a prefeitura já manda as notas pra lá (item 1, "Ambiente Nacional");
- **o pacote do mês** (#383): as notas **até o dia 7** e o **extrato do banco até o dia 10**, em OFX e PDF.
  O sistema deles já puxa as notas sozinho, mas eles gostam de receber pra conferir. **O extrato é a única
  coisa que eles não conseguem puxar.** Na primeira vez, pode ir um extrato só, desde a abertura da empresa.

**A equipe no programa das lojas** (decidido em 13/10; o plano até começar, aprovado em 14/10, é
a [#474](https://github.com/sakura-corp/sakura-system-ace/issues/474); o que é da empresa fica no
privado, `EQUIPE.md`). Um no painel (o Gustavo) e dois no programa das lojas. A ordem:
1. **já**: a mensagem pros três (nome do e-mail, usuário do GitHub, Windows ou Mac, horas por
   semana), a cessão dela e a #470 (segredo barrado antes de sair do computador), **pronta antes
   de os novos começarem**;
2. **contas, depois de 16/10**: e-mail da Sakura, Claude Team e **verificação em duas etapas
   obrigatória na organização do GitHub** (antes de ligar, conferir que o Gustavo já usa: quem não
   usa sai da organização na hora);
3. **papéis**: o Termo de Colaboração, **o mesmo pra todos**, assinado **antes de ter acesso ao
   código** (o Gustavo assina junto); depois o memorando. Só então os dois novos são convidados;
4. **o programa pronto pra equipe** (a parte do Claude ficou pronta em 16/10: `docs/equipe.md`, `docs/rascunhos/`,
   `docs/supabase-de-teste.md`; o banco foi criado pela Sofia em 19/10, #517): o **Supabase de teste** (separado da Pneus Amigão, com dados
   de exemplo e um login pra cada um), a regra nova da seção 0 (mudou em 19/10: os três no programa das lojas), um manual da
   equipe e as primeiras tarefas no formato da equipe, **na `leva-0`** (`docs/painel.md`);
5. **começar**: o "Primeiro dia" de cada um, e a primeira tarefa.

**As primeiras tarefas do programa** (ela, 14/10): uma de **aquecimento** pra cada um, pequena e
sem dinheiro, nota nem migration (#455 e #459); depois, a **1ª parte da #457**: importar clientes
de uma planilha qualquer, com a pessoa escolhendo qual coluna é o quê. Essa parte não depende do
cabeçalho do sistema antigo das lojas, que ainda não chegou. **Cuidado**: com três pessoas, todo
PR espera a aprovação dela; o tamanho das levas tem que caber no tempo dela de revisar.

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
| **Da visão** (12/10, `docs/visao.md`) | |
| #454 | Central do dia: o que precisa de atenção hoje, no Início (o assistente sem IA) |
| #455 | Clientes que sumiram (`FN-11`) |
| #456 | Pix copia e cola na cobrança e no faturamento |
| #457 | Importar do sistema antigo, por planilha (`FN-15`); as lojas da fase 2 usam outro sistema |
| #458 | Desenho do assistente de IA (conversa, sem código) |
| #459 | Pedir avaliação no Google depois do serviço |

**A ordem** (sem custo primeiro, em ondas) está em `docs/visao.md`, "Prioridade", e cada tarefa
tem a linha "**Prioridade** (12/10)".

O orçamento rápido no balcão entrou na #379, e a assinatura do cliente na #380. Ficaram **sem
tarefa**, de propósito: MDF-e, SPED (é da contabilidade), SMS (o WhatsApp cobre), expedição e
cheque (só se uma loja pedir).

**Quando uma tarefa `guia` for feita**: o PR fecha a issue (`Closes #N`) e a linha sai desta tabela.

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
  - **Onde**: portal do Giap (`https://araraquara.giap.com.br/ords/pma/f?p=559:70` →
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
3. **O "Ambiente Nacional" da NFS-e**: a Focus avisa que só vale pra empresa obrigada (ex: MEI),
   e a loja é Ltda no Simples. **Resposta da contabilidade (13/10)**: a prefeitura de Araraquara
   já manda tudo pro ambiente nacional, inclusive a última nota da loja, e o sistema deles puxa
   certinho. Eles estão conferindo, prefeitura por prefeitura, se o portal municipal vai ser
   desligado ou se continua mandando pro nacional (o comum); se mudar, mandam um manual antes de
   1º/11. **Se o portal municipal for desligado**, a emissão pela Focus precisa passar pro padrão
   nacional: conferir com a Focus na hora.

> **Credenciais que já estiveram neste repositório** (o CSC da SEFAZ, o token do Giap e a senha
> do portal da prefeitura) continuam no histórico do Git, mas **foram trocadas em 19/10/2026**
> (#505): as que estão lá não valem mais. As novas estão no Bitwarden dela (itens "Pneus Amigão –
> …"). **Nunca colar credencial aqui**: o lugar é o painel do serviço. Se precisar trocar de novo,
> o caminho que funcionou, sempre gerando a nova, colando na Focus e só então matando a antiga:
> - **Token do Giap** (vai na Focus, NFSe → "Login prefeitura" → Senha): portal da NFS-e
>   (`https://araraquara.giap.com.br/ords/pma/f?p=559:70`) → Contribuintes → **Dados Cadastrais**
>   → link "Gerar Token". O token antigo deixa de valer na hora.
> - **CSC da NFC-e** (vai na Focus, NFCe → CSC e ID Token de produção): portal da NFC-e da
>   SEFAZ-SP → **Gerenciar Cód Segurança**, com o e-CNPJ da loja → "Novo Cód Segurança" (ganha o
>   próximo ID, e os dois ficam ativos) → trocar na Focus → marcar o antigo e "Revogar".
> - **Senha do portal** (não vai na Focus): portal da NFS-e → **Alterar Senha**. Avisar a
>   contabilidade, que entra lá todo mês pra cadastrar a alíquota.

#### NFS-e pelo Padrão Nacional (#837, código em PR rascunho de 29/10/2026)

Desde **01/11/2026** a empresa do **Simples** em Araraquara só emite NFS-e pelo **Padrão Nacional**
(comunicado da prefeitura de 19/10, Resolução CGSN nº 191/2026); o Giap deixa de emitir pra ela.
**Como o programa decide**: regime "Simples Nacional" nos dados fiscais → caminho nacional
(`/v2/nfsen`); os outros regimes continuam no municipal (`/v2/nfse`). Sem coluna nova. A nota
nacional ganha a `ref` `os<numero>-nfsen-<instante>`, e é a `ref` que diz por onde consultar,
cancelar e baixar (nota antiga do Giap continua indo pelo municipal).

**Confirmado na documentação da Focus NFe** (lida em 29/10/2026):
- Emitir: `POST /v2/nfsen?ref=<ref>`, corpo "achatado" (sem objetos `prestador`/`tomador`/`servico`),
  resposta `processando_autorizacao` e consulta depois
  ([Emitir](https://doc.focusnfe.com.br/reference/emitir_dps_nacional);
  [lista completa dos campos](https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html)).
  Obrigatórios usados: `data_emissao` (com fuso), `serie_dps` (API: 1 a 49999), `numero_dps`,
  `data_competencia`, `emitente_dps`, `codigo_municipio_emissora`, `cnpj_prestador`,
  `codigo_opcao_simples_nacional`, `regime_especial_tributacao`, `cpf_tomador`/`cnpj_tomador`,
  `codigo_municipio_prestacao`, `codigo_tributacao_nacional_iss` (6 dígitos), `descricao_servico`,
  `valor_servico`, `tributacao_iss`.
- Consultar: `GET /v2/nfsen/<ref>`; os status são os mesmos da municipal; a autorizada traz
  `numero`, `codigo_verificacao`, `url` (consulta pública, com a chave de 50 dígitos),
  `caminho_xml_nota_fiscal` e `url_danfse` (PDF num endereço do S3 da Focus)
  ([Consultar](https://doc.focusnfe.com.br/reference/consultar_nfse_nacional)).
- Cancelar: `DELETE /v2/nfsen/<ref>` com `{ "justificativa": ... }`, resposta síncrona `cancelado`
  ou `erro_cancelamento` ([Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfse_nacional)).

**Respondido em 30/10/2026** (suporte da Focus por e-mail; contabilidade pelo WhatsApp):
- **Focus**: habilitar o documento **"Ambiente da NFSe Nacional"** no cadastro da empresa (painel →
  empresa → **Documentos Fiscais**; há um interruptor pra Homologação e outro pra Produção, cada um
  com "Série" e "Próximo número"). **O token do Giap deixa de ser necessário**: a nota nacional usa
  só o certificado digital. A Pneus Amigão está com a **homologação ligada** desde 30/10; a produção
  liga depois do ensaio.
- **IBS e CBS** (`finalidade_emissao`, `consumidor_final`, `indicador_destinatario`,
  `ibs_cbs_situacao_tributaria`, `ibs_cbs_classificacao_tributaria`): **só obrigatórios em 2027**
  (as duas responderam igual). O programa segue sem mandar; os valores de 2027 ficam na #838.

**Ainda em aberto** (com a contabilidade; o ensaio em homologação também mostra):
1. O **código de tributação nacional**: o programa usa o item da LC 116 + desdobro `01`
   (`14.01` → `140101`; item em branco vale `14.01`). Outro desdobro se digita como `14.01.02`.
2. A **alíquota** (`percentual_aliquota_relativa_municipio`): o programa manda a da competência.
   A documentação diz que, se o município está no sistema nacional, ela vem parametrizada.
3. `codigo_opcao_simples_nacional = 3` (ME/EPP) e `regime_tributario_simples_nacional = 1`
   (tudo pelo Simples).
4. O **número da DPS** é o instante em milissegundos (não se repete, nem com dois computadores).
   A contabilidade disse "o DPS não precisa selecionar, pode deixar em branco", sem dizer qual
   campo. E o painel da Focus tem um "Próximo número" próprio: o ensaio mostra qual número vale.

**O ensaio** (roteiro no PR #839): no `ssace-teste`, com o token de homologação guardado na loja de
exemplo (#832, opção a; tirar depois, #842).

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
   completa campo fiscal que a gente não manda (suporte, 03/09). **Respondido pela contabilidade
   (13/10)**: o CSOSN 500 quer dizer que o ICMS já foi recolhido antes, e na venda ao
   **consumidor final** não tem ICMS-ST retido; **só na revenda pra outra oficina**. Ou seja, a
   NFC-e está certa como está, e a questão volta na **NF-e modelo 55** (#409), que é a nota de
   venda pra empresa. Rejeição falando em substituição tributária: olhar aqui primeiro.
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
   **Empresa do Simples**: a NFS-e sai pelo Padrão Nacional (ver "NFS-e pelo Padrão Nacional"
   acima); o token do portal municipal provavelmente deixa de ser necessário (confirmar com a Focus).
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

### 12. Repositório só de versões: feito em 08/10/2026 (PR #447, `v0.9.51`)

Ela escolheu fazer agora, sem pagar nada ("B sem pagar"; o código continua público). Já existem
o **`sakura-corp/ssace-versoes`** (público, só ela escreve) e a chave **`TOKEN_VERSOES`** no
cofre `lojas`. O PR #447 faz:
- o Release publicar lá e mandar uma cópia pro endereço antigo;
- o Liberar liberar nos dois;
- o programa procurar atualização lá.

A `v0.9.51`, a versão de transição, saiu em 08/10 nos dois endereços e foi **liberada no mesmo
dia**; o PC dela já atualizou por ela, e o link de baixar o instalador passou pro endereço novo.
Fecha o furo do item 78 da seção 6 quando todos os computadores passarem da `0.9.51`.
Fechar o código depois fica sendo só o plano Team e parar a cópia no endereço antigo (custo no
privado; antes, a #442). **Cuidado barato até lá**: o Balcão no canal normal, pra versão de teste
só chegar no PC dela.

### 13. Painel da equipe (`docs/painel.md`)

A **leva 0** foi criada em 30/09 (issues #350 a #355): o painel no ar, login, a leva com contador e
tempo real. Depois, a **leva 1** (montada em 17/10: cabeçalho, pegar tarefa, horas por pessoa e três do
programa; ver `docs/painel.md`, "Andamento"), a leva 2 (fases da leva, relatório e aprovação) e o **financeiro com DRE**, num banco privado (nunca no GitHub).
O exemplo de DRE está no repositório privado (`dre/`).

### 14. Atualizar o Electron (tarefa #385; ritmo decidido por ela em 03/10/2026)

O programa estava na **linha 33 do Electron** (Chromium 130), sem correção de segurança desde
2025. O aviso `electron-desatualizado.yml` fica vermelho todo dia 1 por isso, e está certo.
- **Destino: a linha 44**, não a 42: sai uma linha nova a cada 8 semanas e o suporte é das três
  últimas, então a 42 perde o suporte quando a 45 sair (~20/10/2026). A 44 vai até ~fev/2027.
- **Andamento**: salto 1 (**36**) publicado no teste em 04/10 como `v0.9.50`, e no Balcão desde
  05/10; no laboratório, nenhuma das 61 telas mudou a olho e os campos se comportaram igual.
  Falta o teste dela. **Salto 2 (40)**: PR da #385 (23/10), com o `electron` em `^40.10.6`
  (Chromium 144, Node 24); no laboratório, 36.9.5 × 40.10.6 deu 0 de 64 telas mudadas a olho
  (só o contorno de um "0" no calendário do Início) e os campos iguais; `test:electron` e o
  build com as quatro chavinhas ok. Falta publicar no teste e o teste dela na loja; o aviso
  mensal continua vermelho até a 44 (o suporte hoje é da 43 à 45).
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

Integração com maquininha de cartão (TEF), assistente de IA (a direção dela está em
`docs/visao.md`), importador de dados de outros sistemas, app de celular, outras edições do Sakura
System. Manter a arquitetura aberta pra isso, sem construir.

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
