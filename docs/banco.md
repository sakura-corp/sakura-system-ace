# Banco de dados (Supabase / Postgres)

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 5. Modelagem de dados (Supabase / Postgres) — como está hoje

**Estado (30/09/2026)**: as migrations `0001` a `0064` estão aplicadas no banco da Pneus Amigão,
a única empresa até agora. A `0065` (orçamento, tarefa #379) e a `0067` (juntar peças, tarefa #656) foram escritas em
22/10/2026 e **ainda não estão aplicadas em banco nenhum**. Todas são idempotentes; migration nova entra pelo botão "Atualizar o
banco de todas as empresas" (seção 9). As `0001` a `0027` criam a base (cadastros, OS, estoque,
caixa, operadores, RLS de login) e estão descritas tabela por tabela mais abaixo. O que cada uma
das seguintes trouxe, e as decisões que valem saber antes de mexer:

- `0028`: migra quem só tinha a permissão "Lucratividade" liberada (sem "Relações").
- `0029`: cria `categorias_servicos` + coluna `servicos.categoria_id`.
- `0030`: semeia categorias de peça/serviço padrão e ~17 serviços padrão (sem preço), baseados
  numa ficha de orçamento de referência do ramo — nenhuma "peça" é criada (exigiria dado fiscal
  real, que não dá pra inventar com segurança).
- `0031`/`0032`/`0033`: **fundação multi-loja** — ver subseção "Multi-loja" logo abaixo pro
  desenho completo. Resumo: cria `lojas` + `operador_lojas`; adiciona `loja_id` nas tabelas
  operacionais; converte as 4 tabelas de configuração de singleton pra "1 linha por loja"; reescreve
  toda a RLS pra checar acesso à loja (não só login). A loja real dela vira "Loja 1" via backfill
  automático — nenhum dado existente é perdido.
- `0034`: corrige um bug real de RLS que impedia criar uma loja nova pelo app (a policy de
  `operador_lojas` exigia já ser admin da loja alvo pra se vincular a ela — impossível pra uma loja
  recém-criada, que ainda não tem ninguém vinculado). Também reconecta automaticamente qualquer
  loja que tenha ficado "órfã" (criada, mas sem ninguém vinculado) por causa desse bug.
- `0035`: adiciona `custo` a `servicos` (mesmo padrão de `pecas.preco_custo`) — sem isso, a aba
  Lucratividade sempre considerava o custo de serviço como zero.
- `0036`: cria `contas_receber` — ver módulo "Contas a Receber" na seção 7.
- `0037`: três mudanças pedidas pela usuária depois de usar o sistema na prática — (a) número
  sequencial por loja em `ordens_servico.numero` (1, 2, 3... por loja, via trigger `before insert`,
  em vez do UUID cortado que aparecia como "OS #a0270a6e"); (b) simplifica `status` da OS, removendo
  "aberta" como estado distinto de "em_andamento" (toda OS nova já nasce "em_andamento"); (c) remove
  a trava de "1 lançamento de Caixa por OS" (`caixa_movimentos_ordem_id_idx_unique`), permitindo
  faturar dividindo entre mais de uma forma de pagamento (1 lançamento por forma usada). Corrige
  também, de brinde, um bug real encontrado testando a exclusão de loja: nunca existiu policy de
  RLS pra `DELETE` em `lojas` (só select/insert/update) — sem policy nenhuma cobrindo o comando, o
  delete "funcionava" sem erro nenhum, mas apagava 0 linhas (bug silencioso, sem mensagem de erro
  nenhuma). Ver item 15 da seção 6.
  Desde a `0065`, a numeração, o `set not null` e a trava de 3 status ficam numa guarda (só rodam
  se `numero_orcamento` ainda não existe), senão reaplicar a instalação num banco com orçamento
  quebrava (`docs/licoes.md`, item 36).
- `0038`: adiciona `operadores.deve_trocar_senha` (bool, default `false`) — suporte pra
  redefinição de senha esquecida (ver "Login e permissões" na seção 7).
- `0039`: cria o módulo de Fornecedores — `fornecedores` (compartilhado), `pedidos_compra` (por
  loja, número sequencial via trigger, mesmo padrão de `ordens_servico.numero`) e
  `pedidos_compra_itens` (sem `loja_id` próprio, herda via `pedido_compra_id`, mesmo padrão de
  `ordens_servico_itens`). Ver "Fornecedores" na seção 7.
- `0040`: cria a trilha de auditoria — tabela genérica `auditoria` + função `registrar_auditoria()`
  (trigger, `security definer`) aplicada via `UPDATE`/`DELETE` num conjunto de tabelas sensíveis
  (`operadores`, `pecas`, `servicos`, `caixa_movimentos`, `contas_pagar`, `contas_receber`,
  `ordens_servico`, `clientes`, `fornecedores`, `pedidos_compra`, `lojas`). Ver "Auditoria" na
  seção 7.
- `0041`: cria o cadastro de Depósito — tabela `depositos` (locais físicos de
  estoque dentro de uma loja, ex: "Depósito Principal", "Fundos") + `deposito_id` em
  `estoque_movimentos` e `contagens_estoque` (mesmo padrão nullable → backfill → not null das
  migrations 0031-0033 pra `loja_id`). Toda loja (já existente, via backfill dinâmico por loja —
  testado com 2 lojas simuladas, não só a Loja 1 — ou criada depois desta migration, via
  `lib/lojas.ts` → `criarLoja()`) já nasce com um "Depósito Principal" sozinho, então nada muda pra
  quem usa um só lugar físico. Ver "Depósitos" na seção 7 e a subseção logo abaixo dos tipos de
  `estoque_movimentos`/`contagens_estoque`.
- `0042`: cria `cotacoes_pecas` — histórico de preço por fornecedor
  (peça, fornecedor, preço, data), compartilhado entre lojas (mesmo padrão RLS de `fornecedores`:
  qualquer logado lê/grava, sem escopo de loja). Gravado sozinho pelo app a cada Pedido de Compra
  com preço (não tem formulário próprio) — ver "Cotação de peças" na seção 7.
- `0043`: adiciona
  `contas_pagar.recorrente_ate` (date, opcional). Sem valor, uma conta recorrente continua sendo
  recriada pra sempre ao pagar (comportamento de sempre); preenchido, `pagarConta()`
  (`lib/contasPagar.ts`) para de criar a próxima ocorrência quando o próximo vencimento passar
  dessa data. Ver "Contas a Pagar" na seção 7.
- `0044`: adiciona 4 colunas opcionais a
  `configuracoes_fiscais_loja`, só usadas na emissão de NFS-e — `codigo_municipio` (IBGE da
  cidade da loja), `item_lista_servico` (código da LC 116/2003, default `'14.01'`),
  `aliquota_iss`, `codigo_tributario_municipio`. NFC-e não depende de nenhuma delas. Ver item 1 da
  seção 8.
- `0045`: adiciona `clientes.codigo_municipio` (código IBGE), preenchido sozinho junto com o resto
  do endereço quando o CEP é buscado — evita digitar esse código toda vez que emite uma NFS-e pro
  mesmo cliente.
- `0046`: adiciona `notas_fiscais_arquivos.focus_nfe_ref` —
  guarda a referência que a Focus NFe usa pra identificar a nota, gerada na hora da emissão
  automática. Sem essa coluna, não tinha como cancelar uma nota emitida automaticamente depois
  (ver botão "Cancelar nota" na seção 7, módulo "Notas Fiscais").
- `0047`: adiciona `configuracoes_fiscais_loja.codigo_cnae`
  — campo exigido por Araraquara (e provavelmente outras prefeituras) pra autorizar a NFS-e, que o
  Sakura System não pedia nem mandava. Ver item 1 da seção 8.
- `0048`: declara a precisão de 5 colunas de valor que eram `numeric`
  "solto", sem casas decimais — `contas_pagar.valor`, `contas_receber.valor`,
  `funcionarios.salario`, `servicos.custo` (todas pra `numeric(12,2)`) e
  `configuracoes_fiscais_loja.aliquota_iss` (pra `numeric(5,2)`). **Não é mudança cosmética**:
  `numeric` sem casas guarda exatamente o que mandarem, e o valor que ia pra
  `contas_receber.valor` ao faturar uma OS vinha de uma soma **sem arredondamento** — dá pra ver
  o efeito no teste que foi feito: um `1234.5600000000002` foi gravado inteiro, com as 13 casas.
  Depois da migration ele vira `1234.56`. Ver item 49 da seção 6 pro lado do aplicativo, que foi
  corrigido junto.
- `0049`: duas colunas em `configuracoes_fiscais_loja` pro lembrete da
  alíquota da competência (NFS-e) — `competencia_aliquota_confirmada` (date: o mês, sempre no dia
  1º, cuja alíquota já foi cadastrada no portal da prefeitura) e `aliquota_passo_a_passo` (text: o
  caminho dentro do portal, editável porque muda de município; em branco vale o padrão de
  Araraquara, que está em `src/schemas/aliquotaCompetencia.ts`). Ver "Aviso da alíquota do mês" na
  seção 7. **Ordem importa**: essa migration precisa estar rodada ANTES de a versão nova chegar no
  computador da loja — sem as colunas, salvar em Configurações → Dados fiscais dá erro de "coluna
  não existe".
- `0050`: semeia a categoria
  **"Outros"** em `categorias_caixa`, uma para cada tipo (entrada e saída).
  **Por que isso não é detalhe**: `categorias_caixa` (migration `0020`) nunca foi semeada por
  migration nenhuma — diferente de `categorias` e `categorias_servicos`, que a `0030` semeia. Ou
  seja, banco recém-instalado tem **zero** categorias de caixa. Como a categoria do lançamento
  manual passou a ser obrigatória (item TL-27, ver "Caixa Diário" na seção 7), sem essa semente o
  operador ficaria sem conseguir lançar nada, sem saída pela tela.
  **Não torna `caixa_movimentos.categoria_id` NOT NULL**, de propósito: o faturamento de uma OS
  entra no caixa sem categoria e deve continuar assim, e o histórico já gravado não pode ser
  recusado pelo banco. A obrigatoriedade é do formulário, não da tabela.
  **Ordem**: a migration antes da versão (a menos que já exista uma categoria de caixa de cada
  tipo).
- `0051`: quatro
  colunas opcionais em `pecas`. O **estoque
  mínimo** (`estoque_minimo numeric(12,2)`, item TL-11 do guia) é o campo que faltava pro sistema
  responder "o que eu preciso comprar?"; e o **bloco de pneu** (`medida`,
  `indice_carga_velocidade`, `dot`, todos texto, item TL-12) tira da descrição em texto livre o
  dado que está escrito na lateral do pneu. Duas escolhas que valem saber: (a) `numeric(12,2)`, e
  não `(12,3)` como o guia sugeria — TODA quantidade deste banco é `(12,2)`, e um mínimo com três
  casas só criaria divergência; (b) o mínimo nasce **NULL** em todo o catálogo, de propósito: NULL
  quer dizer "essa peça não tem mínimo" e nunca vira aviso, enquanto zero é um mínimo de verdade.
  Um backfill com zero transformaria cada peça sem saldo num alarme no dia em que a coluna
  nascesse. `pecas` é compartilhada entre as lojas, então nada aqui precisa de backfill por loja
  nem de policy nova.
- `0052`: as duas tabelas do WhatsApp (item FN-03). `configuracoes_whatsapp` (PK composta
  `loja_id, chave`, mesma forma de `configuracoes_juros_parcelas`) guarda os textos editáveis de
  cada loja — **uma linha por modelo, e não uma coluna por modelo**, pra que um modelo novo seja
  uma linha e não uma migration. **Nada é semeado**: sem linha, vale o texto padrão de
  `src/schemas/whatsapp.ts`, então uma loja recém-instalada já manda mensagem sem configurar nada
  (o contrário do que aconteceu com as categorias de caixa na `0050`). E `whatsapp_mensagens`
  registra que uma conversa foi **aberta** — nunca "enviada", que é uma coisa que este sistema não
  tem como saber (ver "WhatsApp" na seção 7).
- `0053`: a trilha de auditoria passa a cobrir o que
  escapava. `INSERT` vira `acao = 'criar'`; entram `ordens_servico_itens` (o buraco mais grave —
  desde a `v0.9.28` dá pra corrigir o **valor** de um item de OS pela tela, e isso não deixava
  rastro nenhum), `notas_fiscais_arquivos`, `configuracoes_fiscais_loja`,
  `configuracoes_juros_parcelas` e `operador_lojas`; o `focus_nfe_token` sai **mascarado**; e
  nasce `expurgar_auditoria(meses)`, que **não roda sozinha**. Quatro decisões que valem saber
  antes de mexer aqui:
  (a) **a coluna-chave virou argumento do trigger** — três das cinco tabelas novas não têm coluna
  `id` (a `0033` derrubou o `id` de `configuracoes_fiscais_loja`, e duas têm PK composta), e a
  função da `0040` gravava `new.id` fixo; o resto da chave composta não se perde, porque a linha
  inteira continua indo em `dados_antes`/`dados_depois`.
  (b) **a FK `auditoria.operador_id` foi REMOVIDA** e o nome de quem fez passou a ser gravado no
  momento do fato (`operador_nome`, com backfill das linhas antigas) — com criação auditada, todo
  operador passa a ter linha na trilha, e a FK faria a exclusão de operador pelo painel do
  Supabase falhar, que é justamente o caminho documentado no item 23 da seção 6. **`on delete set
  null` não resolve** e vale saber por quê antes de alguém tentar: a linha é gravada DEPOIS da
  exclusão, então um admin que exclui a própria conta estoura na FK (testado, não suposto).
  Trilha append-only não deve ter chave capaz de bloquear ou reescrever o passado.
  (c) **o `revoke execute` do expurgo é a trava que importa** — sem ele, `security definer` +
  permissão padrão do Postgres deixaria qualquer operador logado apagar a própria pegada pela API.
  Depois do revoke, só quem tem acesso de dono ao banco (o SQL Editor) consegue. Retenção mínima
  de 6 meses; o padrão sugerido é 24 (`select expurgar_auditoria(24);`).
  (d) **a máscara é por NOME DE COLUNA, não por tabela** — coluna nova com esse nome já nasce
  protegida. Teste repetível em `supabase/scripts/testar-auditoria.sql` (7 checagens).
- `0054`: a função
  `operador_tem_permissao(modulo text)`, **etapa 1 de 3** do item `TR-04.1` (RLS por módulo).
  **Nenhuma policy usa ela ainda, e rodar esta migration não muda comportamento nenhum** — as
  policies são a etapa 2, que é mudança de arquitetura de segurança e precisa ser decidida com
  ela antes. `security definer` pelo motivo do item 13 da seção 6 (recursão de policy). O
  cabeçalho da migration guarda como chamar na etapa 2 — `TO authenticated` e a chamada envolvida
  em `select`, que são desempenho medido e documentado pelo Supabase, não estilo. Teste em
  `supabase/scripts/testar-permissao-modulo.sql` (5 perfis).

- `0055`: cria
  `schema_versao`, o item `TR-05.7`. Uma linha por migration já aplicada neste
  banco; o app compara o maior número daqui com o que a build dele espera e avisa, em português,
  qual arquivo falta rodar — em vez de estourar `column ... does not exist` numa tela qualquer.
  Quatro decisões que valem saber:
  (a) **ninguém escreve nela pela API** — não existe policy de insert/update/delete, mesma escolha
  da trilha de auditoria. Quem grava é a própria migration rodando no SQL Editor. Um app capaz de
  declarar a si mesmo "em dia" não serviria de nada: bastaria o bug que ele deveria denunciar pra
  ele mentir.
  (b) **a leitura é aberta a qualquer um logado**, inclusive operador sem loja: a faixa precisa
  aparecer antes de qualquer tela, e número de versão de esquema não é dado de pessoa nenhuma.
  (c) **o backfill registra de 1 a 55 de uma vez**, assumindo o óbvio — quem chegou nesta migration
  rodou as anteriores, porque elas rodam em ordem (e a instalação única é a ordem inteira).
  (d) **a ordem "migration antes da tag" continua valendo, mas aqui ela deixa de ser armadilha**:
  se a versão nova chegar primeiro, o próprio app explica o que falta, em vez de quebrar.
- `0056`: dado de RH só pra quem tem o módulo. É o item
  `TR-04.3`, e é a **primeira tabela da etapa 2 do `TR-04.1`** — ou seja, a primeira vez que a
  função `operador_tem_permissao()` da `0054` é usada por uma policy de verdade.
  `funcionarios` e `funcionario_filhos` passam a exigir a permissão `funcionarios` nos quatro
  comandos, e nasce a view `funcionarios_publico` com a janela que o resto do sistema precisa
  (id, loja_id, nome, cargo, operador_id, ativo). Quatro decisões que valem saber:
  (a) **a receita do guia está errada, e medi antes de seguir** — o item pede a view com
  `security_invoker = true`, e nessa configuração ela obedece à RLS da tabela base, devolvendo
  **zero** linha justamente pra quem ela existe pra atender. Só `security_invoker = false`
  atravessa. A consequência é a regra da migration: **como a view passa por cima da RLS, o
  filtro de loja tem que estar escrito dentro dela** — sem o `where operador_tem_acesso_loja()`,
  ela entrega o cadastro de todas as lojas da empresa pra qualquer um.
  (b) **o `revoke` não é zelo, é a tranca** — a view é simples, logo **auto-atualizável**, e sem
  revogar insert/update/delete daria pra escrever na tabela base por dentro dela, passando por
  cima das policies. Medido: tirando só essa linha, a matriz de RLS acusa 11 células, inclusive
  o **anônimo** conseguindo inserir.
  (c) **quatro policies separadas, não uma `for all`** — policy é permissiva, então uma `for all`
  sobrevivente daria `select` a quem a policy nova quer barrar.
  (d) **o gatilho que espelha operador → funcionário (0019) continua funcionando**, porque é
  `security definer`: criar operador não passou a exigir o módulo Funcionários.
  Teste repetível em `supabase/scripts/testar-rh-permissao.sql` (11 checagens, as duas metades —
  o que o balconista não alcança **e** o que ele ainda consegue fazer).
- `0057`: o cofre do
  token da Focus NFe, item `TR-04.2`,
  **parte 1 de 2**. Cria `segredos_fiscais_loja` (loja_id, focus_nfe_token, atualizado_em) **sem
  policy nenhuma** — nenhum operador lê nem escreve, nem admin; só a service role, que existe
  apenas dentro das Edge Functions — e **copia sozinha** o token que já está em
  `configuracoes_fiscais_loja`, então ninguém precisa colar de novo. Mais três funções:
  `definir_token_focus_nfe()` (só admin da loja grava; não devolve nada),
  `loja_tem_token_focus_nfe()` (a tela só pergunta "tem?") e `pode_usar_focus_nfe()` (a regra do
  porteiro, igual à da tela: emitir/consultar/baixar pra quem tem OS ou Notas Fiscais, cancelar só
  pra quem tem Notas Fiscais). Quatro decisões que valem saber:
  (a) **a coluna antiga NÃO sai aqui**, pela regra de "Voltar uma versão" (seção 9): se a versão
  do porteiro sair ruim e for preciso voltar pra `v0.9.40`, aquela versão lê o token da coluna
  antiga, e emitir nota não pode parar por causa de um rollback. **A proteção de verdade chega
  com a parte 2**, que limpa a coluna — só depois de uma nota emitida e uma cancelada pelo
  porteiro. Até lá o token continua legível pela API, como sempre foi;
  (b) **a cópia é `on conflict do nothing`**: rodar de novo depois de o admin trocar o token pelo
  cofre não passa o antigo por cima do novo (testado);
  (c) **o `revoke ... from public, anon` das três funções é a tranca** — sem ele, `security
  definer` + a permissão padrão do Postgres deixariam quem não está logado perguntar;
  (d) **o cofre é auditado e o token sai `***`** — a máscara da `0053` é por nome de coluna, e a
  coluna se chama `focus_nfe_token` de propósito. Na tela de Auditoria aparece como "Token da
  Focus NFe": quem trocou e quando, sem o valor.
  Teste repetível em `supabase/scripts/testar-porteiro-focus-nfe.sql` (17 checagens), conferido
  com nove mutações — inclusive uma policy de leitura plantada no cofre, que a matriz de RLS
  também pega.
- `0058`: o **fechamento de caixa do dia**, item
  `TR-06.4`. Cria `fechamentos_caixa` (uma linha por loja por dia: troco, esperado em espécie,
  contado, diferença, os totais de cada forma de pagamento), semeia as categorias de caixa
  "Quebra de caixa" (saída) e "Sobra de caixa" (entrada), e as funções `fechar_caixa()` e
  `desfazer_fechamento_caixa()`. Quatro decisões que valem saber:
  (a) **fechar é uma função, não dois inserts do app** — o lançamento da diferença e o registro
  do fechamento entram na mesma transação; feito em dois pedidos, uma falha no meio deixaria uma
  "quebra de caixa" órfã. A função é `security invoker`: a RLS das duas tabelas vale como se o
  operador tivesse feito cada insert;
  (b) **ninguém altera um fechamento** (sem policy de update, declarado na matriz de RLS);
  (c) **desfazer é só de admin da loja** — se quem fecha pudesse desfazer, bastaria fechar com
  falta, desfazer e fechar de novo "certo". Desfazer apaga o lançamento da diferença junto, e a
  auditoria guarda os dois lados;
  (d) **fechar e ler exigem o módulo Caixa no banco** — a etapa 2 do `TR-04.1` aplicada desde o
  nascimento, que em tabela nova não tem comportamento antigo pra quebrar.
  Teste repetível em `supabase/scripts/testar-fechamento-caixa.sql` (9 blocos), conferido com
  seis mutações — e duas delas **passaram na primeira versão do teste**, o que vale guardar:
  o `returning` de dentro da função também passa pela policy de LEITURA, então tirar a
  permissão só da policy de INSERT não era pego (o teste agora insere direto, sem `returning`);
  e `mov.forma_pagamento <> 'dinheiro'` com forma NULA dá nulo, e a checagem passava calada
  (virou `is distinct from`).
- `0059`: a
  **comissão paga**, item `TL-46.1`. Cria `comissoes_fechamentos` — um registro por funcionário
  por período, com o retrato das OS (`snapshot`). Leitura e registro exigem o módulo
  **Funcionários** no banco (é onde a aba Comissões mora, e `funcionarios` já exige o mesmo desde
  a `0056`); sem update; desfazer é de admin; auditado. Teste repetível em
  `supabase/scripts/testar-comissoes-pagas.sql` (9 blocos), com cinco mutações — e duas delas
  **não entravam** na primeira rodada, o que vale guardar pra qualquer teste de migration: rodar
  de novo uma migration idempotente sobre um banco que já tem a tabela **não aplica mudança de
  tabela** (`create table if not exists` pula), então "tirar a unique" e "trocar o `on delete`"
  só foram de fato testadas derrubando a tabela antes.
- `0060`: as **travas de dado impossível**,
  item `TR-05.1`. São 17 `check` com nome `ck_<tabela>_<regra>`: preço e desconto de item de OS
  (o desconto nunca maior que a própria linha), preços/custo/garantia/ICMS de peça, preço e custo
  de serviço, valor de conta a pagar/receber, preço e quantidade recebida de pedido de compra,
  datas da OS, juros de parcelamento, alíquota de ISS e CNPJ (da loja, e do cliente pessoa
  jurídica). Quatro decisões que valem saber:
  (a) **cada trava só é criada se o dado que já existe deixar.** O guia manda consultar o banco
  real antes, e daqui não se alcança banco real nenhum — então a migration confere sozinha, trava
  por trava: dado fora da regra → a trava **não** é criada, **nada é alterado**, e o resultado
  aparece numa tabelinha no fim do Run ("NÃO criada — N linha(s) fora da regra"). Rodar esta
  migration nunca falha por causa do dado de uma loja. **Consequência prática**: se alguma sair
  "NÃO criada", o dado é conversa com ela; depois de corrigido, colar a `0060` de novo no SQL
  Editor cria o que faltou — o botão de atualizar os bancos **não** roda de novo uma migration
  que já está registrada;
  (b) **valor de conta é `>= 0`, não `> 0`** como o guia pedia: OS de garantia tem total zero e,
  faturada "a receber depois", cria conta a receber de valor zero;
  (c) **a data de fechamento pode ser até um dia antes da abertura**: a abertura usa o relógio do
  servidor e o faturamento o do computador da loja — um Windows uns minutos atrasado bateria numa
  trava de "maior ou igual";
  (d) **o CNPJ conta letras e números**, não só dígitos: a Receita emite CNPJ alfanumérico desde
  julho de 2026, e uma trava de "14 dígitos" recusaria toda empresa aberta de lá pra cá.
  Cada trava tem uma frase em português em `src/lib/errors.ts` (`MENSAGEM_DA_TRAVA`), e um teste
  reprova trava nova sem frase. O formulário da OS confere o desconto **antes** de gravar — o banco
  recusaria o item, mas a OS nova já teria sido criada sem ele. Teste repetível em
  `supabase/scripts/testar-travas-de-dado.sql` (18 recusas + os casos estranhos-mas-verdadeiros
  aceitos), conferido com quatro mutações; e o caminho "dado ruim → não cria → corrige → cria"
  exercitado num banco no estado `0059`.
  **O `TR-05.2` (uma nota por OS por tipo) NÃO entrou aqui, de propósito** — ver o item 3 de "O
  que ainda está frágil na parte fiscal", seção 8.
- `0061`: **Contas a
  Pagar e Contas a Receber só pra quem tem o módulo**, o segundo lote da etapa 2 do `TR-04.1`
  (o primeiro foi o RH, `0056`). Decisão dela, 26/09/2026, entre as opções. Quatro policies por
  tabela, e duas **portas estreitas** em `contas_receber`, que são o que evita quebrar outro
  módulo:
  (a) **quem tem Ordens de Serviço pode CRIAR** — mas só uma conta amarrada a uma OS da mesma
  loja. É o faturamento "a receber depois"; cobrança avulsa continua sendo só do módulo. O insert
  do faturamento não pede a linha de volta, e precisa continuar assim: com `returning`, a policy
  de leitura também teria de deixar;
  (b) **quem tem Funcionários pode LER** — a aba Comissões avisa, com essas contas, quais OS o
  cliente ainda não pagou. Uma view estreita (como a da `0056`) ficou pra quando `ordens_servico`
  for fechada: hoje a lista de OS, com cliente e valor, continua aberta, então a view não
  esconderia nada;
  (c) **pagar e receber lançam no Caixa** — continua funcionando porque `caixa_movimentos` ainda
  não foi fechada. **Quando for** (próximo lote), Contas a Pagar e Contas a Receber precisam
  continuar podendo lançar ali;
  (d) **o Início** não ganhou exceção no banco: quem não tem Contas a Pagar vê "—" no cartão (ver
  "Início" na seção 7).
  Teste repetível em `supabase/scripts/testar-contas-permissao.sql` (28 checagens, seis perfis),
  conferido com **seis mutações** — e uma delas (tirar a conferência de loja da porta do
  faturamento) **passou na primeira versão do teste**, ver item 73 da seção 6. Desempenho medido
  com 20 mil contas por loja: 77–78 ms antes, 80–81 ms depois (a checagem de permissão vira
  `InitPlan`, roda uma vez por consulta). As checagens de "não altera / não apaga" foram
  reescritas junto com a `0062` (comando sem filtro + `get diagnostics`, item 74 da seção 6).
- `0062`: **o Caixa só pra quem tem o módulo**, o terceiro
  lote da etapa 2 do `TR-04.1`. Decisões dela, 26/09/2026: o Início mostra "—" nos cartões de
  dinheiro pra quem não tem Caixa nem Relações, e Relações continua lendo tudo. É a tabela mais
  "atravessada" até aqui, então cada módulo que grava ou lê nela ganhou uma **porta estreita**:
  (a) **Relações LÊ tudo** e só lê;
  (b) **Ordens de Serviço** lê só os lançamentos ligados a uma OS (a NFC-e rateia o pagamento e
  a garantia mostra a forma de pagamento com eles) e lança só **entrada de uma OS da mesma
  loja** (o faturamento "recebido agora");
  (c) **Contas a Pagar** lança **saída sem OS**, e lê/apaga só o lançamento ligado a uma conta a
  pagar **da mesma loja** (o "desfazer pagamento");
  (d) **Contas a Receber** lança **entrada** (se de uma OS, da mesma loja) e lê só o lançamento
  ligado a uma conta a receber da mesma loja;
  (e) **editar** (categorizar em lote) é só do Caixa. O fechamento de caixa (`0058`) não mudou.
  Três coisas que valem saber:
  - **A pergunta "este lançamento é de uma conta?" mora numa função** (`caixa_movimento_de_conta_
    pagar/receber`, `security definer`, com `revoke` de `anon`), e não num `exists` dentro da
    policy — **por desempenho, medido**: com o `exists`, o planejador estimava a lista do Caixa
    30× mais cara, ligava o JIT e gastava ~16 ms compilando a cada abertura (item 75 da seção 6).
    Por ser `security definer`, a própria função confere que a conta é **da mesma loja** do
    lançamento, que o `exists` herdava da RLS das contas.
  - **Duas mudanças no app vieram junto, e sem elas as portas não bastariam**: lançar no Caixa
    **não pede mais a linha de volta** (o id é gerado antes, `crypto.randomUUID()`), e "desfazer
    pagamento" **apaga o lançamento ANTES** de desligar a conta (a FK é `on delete set null`, então
    apagar já desliga). Na ordem antiga, quem só tem Contas a Pagar apagaria zero linhas em
    silêncio e deixaria a saída órfã no Caixa. As duas têm teste (`src/lib/caixa.test.ts`).
  - **Índices novos** em `contas_pagar.caixa_movimento_id` e `contas_receber.caixa_movimento_id`,
    que as funções usam.
  - **⚠️ A ordem de subir é AO CONTRÁRIO da de sempre: a versão do app (0.9.43) primeiro, a
    migration depois.** A `v0.9.42` grava no Caixa pedindo a linha de volta; com a `0062` rodada
    e ela ainda instalada, quem não tem o Caixa e paga ou recebe conta leva erro de permissão
    (medido num Postgres local; admin e faturar OS não são afetados). A versão nova funciona com
    o banco antigo. Está escrito no cabeçalho da própria migration.
  Teste repetível em `supabase/scripts/testar-caixa-permissao.sql` (35 checagens, sete perfis —
  inclusive um com OS nas duas lojas), conferido com **catorze mutações**, todas vermelhas — e uma
  delas (a porta de exclusão de Contas a Pagar sem a conferência da conta) **passou na primeira
  versão do teste**, ver item 74 da seção 6. Desempenho com 20 mil lançamentos por loja, quem tem
  o Caixa abrindo a lista: 76 ms antes, 76–77 ms depois.
  **Em 26/09/2026 a `0062` ganhou no cabeçalho a linha `-- versao-minima-do-programa: 0.9.43`**
  (ver `0063` logo abaixo) — só comentário, o SQL é o mesmo, e ela já está aplicada em todo banco.
- `0063`: **cada computador diz ao banco em que
  versão está.** Pedido dela entre as opções (26/09/2026), e a proposta registrada no marco
  anterior: sem isso, "posso rodar uma migration que quebra a versão velha?" só se respondia
  conferindo à mão, como na `0062`. Cria a tabela `computadores` (ver abaixo), a função
  `registrar_computador()` (qualquer operador ativo grava a linha do computador em que está —
  **sem poder ler a lista**) e `definir_apelido_computador()` (só admin). Quatro decisões:
  (a) **a identidade é do computador, não do banco**: um número aleatório criado na primeira
  abertura e guardado em `computador.json`, na pasta de dados do app — arquivo próprio, pelo
  mesmo motivo do `atualizacao.json` (o `conexao.json` é regravado inteiro ao salvar a conexão);
  (b) **ler e "esquecer" é do admin da loja em que o computador foi visto por último**; sem loja
  (a loja foi excluída), qualquer admin — senão viraria linha que ninguém alcança (§6 item 23);
  (c) **sem auditoria**, de propósito: a linha muda a cada login e encheria a trilha;
  (d) **limite aceito**: um operador que descubra o id de outro computador consegue gravar por
  cima da linha dele (mentir uma versão). O id só o admin vê, e nenhum dado da loja fica exposto.
  Teste repetível em `supabase/scripts/testar-computadores.sql` (11 blocos, as duas metades),
  conferido com **doze mutações** — e uma delas (dar ao `anon` permissão de chamar a função)
  **passou na primeira versão do teste**, ver item 76 da seção 6.
  **Ordem de subir: a de sempre** (migration primeiro), mas aqui qualquer ordem é segura: a
  versão nova sem a migration só não registra (e mostra a faixa de banco desatualizado); a
  migration sem a versão nova só fica vazia.
- `0064`: a **venda de balcão**, item
  `FN-09`. Duas coisas só: a coluna `ordens_servico.tipo` (`'os'`/`'venda_balcao'`, padrão
  `'os'`, trava `ck_ordens_servico_tipo`) e o cliente fixo **"Consumidor"**, com UUID fixo
  `00000000-0000-0000-0000-00000000c000` (mesmo espírito da "Loja 1"). Três decisões:
  (a) **o número é o mesmo contador das OS** — o gatilho da `0037` não mudou; uma venda pode ser
  a "Venda 17" entre a "OS 16" e a "OS 18". Contador próprio deixaria "OS 3" e "Venda 3" na
  mesma loja, e esse número aparece sozinho na movimentação de estoque e na referência da nota;
  (b) **"Consumidor" em vez de cliente opcional** (escolha dela) — a regra em uso não muda;
  (c) **nada de versão mínima**: a versão anterior do programa só mostra a venda como se fosse
  uma OS. `supabase/scripts/limpar-dados-de-teste.sql` passou a **preservar** o Consumidor.
  Teste repetível em `supabase/scripts/testar-venda-balcao.sql` (6 blocos, as duas metades —
  o que já existe continua igual, e o balconista só-OS vende no Consumidor), conferido com três
  mutações, todas vermelhas. **Ordem de subir: qualquer uma é segura** (a versão nova sem a
  migration funciona em tudo, menos em registrar uma venda — e a faixa de banco desatualizado
  avisa), mas o certo continua sendo a migration primeiro.
- `0065`: o **orçamento como etapa da OS** (tarefa #379). **Não é tabela nova**: o orçamento é
  uma linha de `ordens_servico` com `status = 'orcamento'`; aprovado, a MESMA linha vira OS
  (`em_andamento`), com os mesmos itens; recusado, vira `recusado` e fica guardado. O status
  ganha esses dois valores (padrão continua `em_andamento`), e entram as colunas
  `numero_orcamento`, `validade`, `aprovado_por` (texto livre), `aprovado_em`, `motivo_recusa`
  (`preco`/`prazo`/`outro_lugar`/`desistiu`/`outro` ou vazio, trava
  `ck_ordens_servico_motivo_recusa`), `recusado_em` e `orcado_em`. Três decisões: (a) **o número da OS só
  nasce na aprovação** — `numero` deixou de ser obrigatório, e a trava
  `ck_ordens_servico_numero_orcamento` diz que ele fica vazio **se e só se** a linha é orçamento
  ou recusado (daí sai que OS numerada nunca volta a orçamento e que nenhuma OS fica sem
  número); o orçamento tem contador próprio por loja (`numero_orcamento`, índice único
  `ordens_servico_loja_numero_orcamento_unique`, obrigatório pela
  `ck_ordens_servico_numero_orcamento_obrigatorio`) e o mantém depois de aprovado. Ao contrário
  da venda de balcão, **o número da OS não pula**: orçamento recusado nunca foi documento; (b) o
  gatilho `definir_numero_ordem_servico` (o da `0037`) agora roda também no **update do
  status** (`before insert or update of status`, só quando o comando mexe no status): quando
  um orçamento vira OS, ganha ali o próximo número **e a data da aprovação vira a
  `data_abertura`** (a do orçamento fica guardada em `orcado_em`; decisão da Sofia na revisão do
  PR #705 — a Lucratividade, o Início, a lista de OS e a ficha do veículo contam pela
  `data_abertura`, e um orçamento de 20 dias aprovado hoje é OS de hoje); e pega uma **tranca por loja**
  (`pg_advisory_xact_lock`) antes de procurar o maior número, na aprovação e na OS comum, pra
  dois aprovando juntos não pegarem o mesmo; e confere o **caminho** (trava
  `ck_ordens_servico_transicao_orcamento`, que vem do gatilho com a frase de um CHECK, porque um
  CHECK não vê o status de antes): orçamento só vai pra `em_andamento` ou `recusado`, e recusado
  não muda mais (sem ela, um recusado virava OS sem baixar estoque); (c) **estoque não é
  assunto do banco**: quem deixa de baixar peça no orçamento e baixa só na aprovação é o programa. Declara
  `-- versao-minima-do-programa: 0.9.52` (a versão anterior mostraria "OS null" e baixaria
  estoque ao lançar peça num orçamento). Teste repetível em
  `supabase/scripts/testar-orcamento.sql` (as duas metades, mais rodar a **instalação inteira** de
  novo com orçamentos gravados e aprovar depois), conferido com 11 mutações, todas vermelhas, e
  mais 4 na revisão (a guarda da `0037` e as metades da trava de caminho). **Ordem de subir: a versão
  primeiro** (a linha da versão mínima faz o botão esperar).
- `0067`: **juntar peças repetidas** (tarefa #656). A `0066` é a da peça avulsa (#655), escrita
  em paralelo; as duas sobem **em ordem** (a `0066` primeiro). **Não é tabela nova**: duas funções
  `security definer` que o programa chama. `resumo_peca_para_juntar(peça)` é a **prévia** (quantos
  movimentos, itens de OS, OS, contagens, itens de pedido, pedidos e cotações a peça carrega, e o
  saldo por loja, com a mesma conta de `calcularSaldoPorPeca`); `juntar_pecas(fica, sai, campos)`
  é a **junção**: a peça que fica herda da que sai os campos que a pessoa escolheu (lista fechada
  de 21; `id`, `criado_em` e `ativo` não entram, e `ativo` vira "ou"), as **5 tabelas que apontam
  pra peça** (`estoque_movimentos`, `ordens_servico_itens`, `pedidos_compra_itens`,
  `cotacoes_pecas`, `contagens_estoque`) passam pra peça que fica, e a que sai é apagada. Cinco
  decisões: (a) **tudo ou nada** (uma transação só; erro no meio desfaz tudo); (b) **só
  administrador de todas as lojas** onde qualquer das duas peças aparece; quem não é recebe na
  prévia só `{"lojas_sem_acesso": n}`, sem número de loja alheia, e a junção é recusada; (c) **a
  rede de segurança**: antes de apagar, a função pergunta ao catálogo (`pg_constraint`) quais
  tabelas apontam pra `pecas` e falha inteira, dizendo o nome, se alguma ainda tem linha da peça
  que sai. Duas das cinco são `on delete cascade`: sem a rede, uma tabela nova esquecida aqui
  perderia o histórico calada. **Tabela nova com FK pra `pecas` precisa entrar em
  `juntar_pecas`** (e no `limpar-dados-de-teste.sql`, acima); (d) **a auditoria da junção**: além
  do que o gatilho da `0053` já grava (a peça que sai inteira em `excluir`, a que fica antes e
  depois, cada item de OS que trocou de peça), a função grava **à mão uma linha** na peça que fica
  com `dados_antes.juntada = true`: a peça que saiu inteira, os dois resumos, os campos trazidos e
  os **ids** das linhas de cada uma das 5 tabelas que eram dela (só os itens de OS têm gatilho;
  sem essa linha não daria pra refazer a junção à mão); (e) **prévia velha é recusada**: o
  programa manda em `p_esperado` os dois resumos que a pessoa viu, e se o banco já estiver
  diferente (alguém lançou movimento ou juntou outra peça nesse meio-tempo) a função recusa e
  pede pra conferir de novo. Teste repetível em `supabase/scripts/testar-juntar-pecas.sql`,
  conferido com mais de 12 mutações, todas vermelhas (uma tabela esquecida, a de cascade
  esquecida, sem a rede, erro engolido no último passo, a peça que fica sem conferência de loja,
  sem a linha da junção, sem a comparação da prévia...). **Ordem de subir: migration primeiro** (sem ela, a
  tela de juntar dá erro ao abrir a prévia; o resto do programa não muda).

**Inventário de tipos de coluna (conferido em 11/09/2026 — não precisa checar de novo)**. Feito
rodando a instalação completa num Postgres local e consultando o `information_schema`, a pedido
do guia de melhorias (TR-05.3 e TR-05.5):
- **Dinheiro: nenhuma coluna é `double precision`/`real`.** Todas as 16 colunas de valor são
  `numeric` — ou seja, o erro clássico de ponto flutuante nunca entrou pelo armazenamento. As 5
  que estavam sem casas declaradas foram fechadas pela migration `0048` acima; o resto já era
  `numeric(12,2)` (dinheiro), `numeric(12,2)` (quantidade) ou `numeric(5,2)`/`numeric(6,2)`
  (percentual).
- **Data: nenhuma coluna é `timestamp` sem fuso.** As 28 colunas de instante são `timestamptz`, e
  as 12 de dia de calendário são `date` (vencimento, competência, data do pedido, nascimento,
  admissão, férias) — que é exatamente a separação certa.
- **`caixa_movimentos.data` é `timestamptz` de propósito, não é engano.** À primeira vista parece
  que devia ser `date` ("a data do movimento"), mas o Caixa Diário mostra a **hora** de cada
  lançamento e já converte pro dia local ao filtrar. Não trocar pra `date` — perderia a hora.

**`supabase/scripts/limpar-dados-de-teste.sql`** não é migration: é um script de uso único que
apaga o dado de negócio de teste (clientes, veículos, peças, serviços, OS, caixa, estoque, contas,
notas, fornecedores, pedidos, cotações) e mantém login, lojas, depósitos, configurações e o cliente
"Consumidor". **Tabela nova com FK pra `pecas`, `clientes` ou `fornecedores` precisa entrar nele**,
senão ele quebra com erro de chave estrangeira. A ordem de execução está no topo do arquivo. Foi
usado pra limpar a Pneus Amigão antes do lançamento de verdade.

Todas as migrations são idempotentes — seguro rodar de novo caso precise reconectar ou montar
outro projeto Supabase do zero (ver seção 9).

### Multi-loja: como o acesso por loja funciona (migrations 0031-0033)

- **`lojas`**: id (uuid), nome, cidade, uf, ativo, criado_em. A loja real da usuária virou a "Loja
  1", com um **UUID fixo** (`00000000-0000-0000-0000-000000000001`, não gerado na hora) — é assim
  que o backfill das outras migrations sabe pra qual loja apontar os dados já existentes. Sem
  exclusão pelo app, só `ativo = false` (mesmo padrão de `pecas`/`servicos`/`funcionarios`).
- **`operador_lojas`**: tabela de junção many-to-many (`operador_id`, `loja_id`, PK composta) —
  **não** existe coluna `loja_id` em `operadores`. Um operador comum tem 1 linha (acesso só à
  própria loja); o dono/gerente que administra 2+ lojas tem 2+ linhas. `operadores.admin` continua
  1 boolean só — o que muda é que seu efeito passa a ser sempre escopado pelas lojas em que esse
  operador tem uma linha em `operador_lojas` (um "admin só da loja A" e o "dono admin das duas" são
  a mesma flag `admin=true`, a diferença é só quantas linhas eles têm aqui).
- **Quais tabelas ganharam `loja_id`** (`not null`, exceto a exceção abaixo): `estoque_movimentos`,
  `contagens_estoque`, `ordens_servico`, `caixa_movimentos`, `contas_pagar`,
  `notas_fiscais_arquivos`, e as 4 tabelas de configuração (viraram singleton **por loja**, ver
  próximo item). `ordens_servico_itens` e `funcionario_filhos` **não** ganharam `loja_id` próprio —
  herdam via FK (RLS consulta a tabela-pai). `clientes`/`veiculos`, `pecas`, `servicos`,
  `categorias`/`categorias_servicos`/`categorias_caixa` **continuam compartilhados**, sem
  `loja_id` — decisão explícita da usuária (catálogo único pra empresa toda).
- **`configuracoes_garantia`, `configuracoes_fiscais_loja`, `configuracoes_painel_inicio`**: eram
  "singleton" (`id smallint` fixo em 1) e viraram **1 linha por loja** — a PK trocou de `id` pra
  `loja_id uuid`. `configuracoes_juros_parcelas` (que já era multi-linha, 1 por `numero_parcelas`)
  ganhou `loja_id` na PK composta (`loja_id, numero_parcelas`). Os tipos TS correspondentes
  (`src/types/configuracao.ts`) trocaram o campo `id: 1` por `loja_id: string`.
- **`funcionarios.loja_id` é a única exceção `nullable`**: o gatilho que espelha um `operador` novo
  em `funcionarios` (migration 0019) dispara no `insert` de `operadores`, **antes** do app inserir
  as linhas em `operador_lojas` — nesse instante ainda não dá pra saber a loja. `src/lib/
  operadores.ts` → `criarOperador()` preenche esse campo logo em seguida, via `update`, assim que
  `operador_lojas` é populada. Enquanto `loja_id` está nulo (janela de milissegundos), o registro
  fica invisível pra todo mundo via RLS — comportamento seguro por padrão, não é bug.
- **RLS**: 4 funções `security definer` novas (mesmo padrão de `operador_atual_e_admin()`, migration
  0008, pra evitar `infinite recursion`): `operador_tem_acesso_loja(loja_id)`,
  `operador_e_admin_da_loja(loja_id)`, `operador_atual_e_admin_de_alguma_loja()` (usada só no
  INSERT de `operadores`/`lojas`, quando ainda não existe vínculo com o alvo) e
  `operador_administra(operador_alvo_id)` (usada no UPDATE/DELETE de `operadores`, pra impedir que
  um admin da loja A edite um operador da loja B). Tabelas compartilhadas continuam com a policy de
  sempre (`auth.uid() is not null`); tabelas per-loja passam a exigir
  `operador_tem_acesso_loja(loja_id)`. A leitura de `operadores` (lista completa, todas as lojas)
  **continua aberta pra qualquer logado** — decisão deliberada, dado exposto é baixo risco
  (nome/permissões, não financeiro), documentado como endurecimento futuro possível.
- **Bucket de Storage `notas-fiscais` NÃO foi segmentado por loja** — decisão de escopo deliberada
  (reescrever `storage_path` exigiria migrar objetos já existentes via API, não dá por SQL; a
  tabela `notas_fiscais_arquivos`, por onde o app sempre lê, já fica isolada por `loja_id`/RLS
  corretamente). Risco residual aceito, documentado, endurecimento futuro opcional.
- **Login continua igual**: `operadores.usuario` continua único **globalmente** (não por loja), tela
  de login não mudou, `src/lib/auth.ts` não mudou. "Qual loja estou vendo" é escolhido **depois**
  do login, via `LojaSwitcher.tsx` na Sidebar (só aparece pra quem tem acesso a 2+ lojas — some por
  completo pra quem usa 1 loja só, como ela hoje). Guardado em `localStorage` (`sakura_loja_ativa_id`)
  — é só estado de UI, o limite de segurança real é sempre a RLS no banco.
- **Fora de escopo desta fase** (não construído, mas arquitetura não trava pra depois): relatórios
  consolidando 2+ lojas numa visão só (cada `listar*()` per-loja recebe 1 `lojaId`, não uma lista);
  preço por peça/serviço variando por loja (extensão puramente aditiva se um dia precisar — ver
  comentário na migration 0031); e **transferir peça de uma
  loja pra outra** (conferido em 25/09/2026: não existe — hoje seriam duas movimentações à mão,
  uma saída numa loja e uma entrada na outra). Das três, a visão somada é a que um dono de 2 lojas
  deve pedir primeiro. Nenhuma impede uma empresa assim de começar a usar.

- **`clientes`** (tem um cliente fixo, **"Consumidor"**, UUID `…c000`, migration `0064` — é
  nele que a venda de balcão nasce quando ninguém se identifica; `listarClientes()` o deixa FORA
  do cadastro e das listas de escolha, e a NFC-e nunca leva documento dele): id, nome (vira "Razão social" na tela quando `tipo_pessoa` é jurídica, mesmo
  campo), tipo_pessoa (`fisica`/`juridica`, default `fisica`), cpf_cnpj (rótulo muda pra "CPF" ou
  "CNPJ" conforme o tipo), telefone, email, cep, rua, numero, bairro, cidade, uf,
  data_nascimento (usada pro calendário do Início marcar aniversário do mês), criado_em
- **`veiculos`**: id, cliente_id (FK), placa, marca, modelo, ano, cor, **tipo**
  (`hatch`/`sedan`/`suv`/`picape`/`moto`, opcional — usado só pra escolher o ícone certo na seção
  "Veículos no pátio" do Início), km_atual, criado_em
- **`pecas`**: id, codigo_interno (exibido como "Referência"), codigo_barras, descricao, marca,
  modelo, aplicacao, unidade, preco_custo, preco_venda, ncm, cest, cfop_padrao, origem,
  cst_ou_csosn, aliquota_icms, categoria_id (FK categorias, opcional), prazo_garantia_dias (int,
  opcional, usado pelo módulo Garantias), **estoque_minimo** (numeric, opcional — NULL quer dizer
  "sem mínimo definido" e nunca vira aviso; zero é um mínimo de verdade), **medida** /
  **indice_carga_velocidade** / **dot** (o bloco de pneu, só aparece no formulário quando a
  categoria é a de Pneus), ativo, criado_em. **Margem % não é salva no banco** — é
  só calculada na tela a partir de `preco_custo`/`preco_venda`.
- **`categorias`**: id, nome (único), criado_em. Gerenciada em Configurações (admin), selecionável
  no cadastro de produto. Sem hierarquia nem campos extras, de propósito. Vem semeada com 5
  categorias padrão (Pneus, Suspensão, Amortecedores, Freios, Outras Peças — migration `0030`).
- **`categorias_servicos`**: id, nome (único), criado_em. Mesmo conceito de `categorias`, mas pra
  serviços — tabela própria (não reaproveita `categorias`), mesmo padrão de "conceito parecido,
  tabela separada" já usado com `categorias_caixa`. Vem semeada com 6 categorias padrão (Pneus,
  Suspensão, Amortecedores, Freios, Alinhamento, Outros Serviços — migration `0030`).
- **`servicos`** (catálogo de serviços, análogo a `pecas` mas sem estoque/fiscal): id,
  codigo_interno (opcional), descricao, preco_padrao, categoria_id (FK categorias_servicos,
  opcional), ativo, criado_em. Vem semeado com ~17 serviços padrão sem preço (migration `0030`).
- **`fornecedores`** (compartilhado entre lojas, migration `0039`): id, nome, cnpj, telefone,
  email, cep/rua/numero/bairro/cidade/uf, ativo, criado_em. Mesmo padrão de `clientes`
  (endereço completo) mas sem veículos nem tipo pessoa física/jurídica — fornecedor é sempre
  tratado como uma única "razão social".
- **`pedidos_compra`** (por loja, migration `0039`): id, **numero** (int, sequencial **por loja**,
  trigger no insert, mesmo padrão de `ordens_servico.numero`), loja_id (FK lojas), fornecedor_id
  (FK fornecedores), status (`pendente`/`parcial`/`recebido`/`cancelado`), data_pedido, observacao,
  operador_id (FK operadores — quem criou), criado_em.
- **`pedidos_compra_itens`**: id, pedido_compra_id (FK, `on delete cascade`), peca_id (FK pecas),
  quantidade_pedida, preco_unitario (opcional), quantidade_recebida (default 0, soma conforme a
  usuária confirma recebimentos — pode ser parcial, em mais de uma vez). Sem `loja_id` próprio,
  herda via `pedido_compra_id` (mesmo padrão de `ordens_servico_itens`).
- **`cotacoes_pecas`** (compartilhado entre lojas, migration `0042`): id, peca_id (FK pecas),
  fornecedor_id (FK fornecedores), preco, criado_em. Tabela só de histórico — **não editável nem
  excluível pelo app**, sempre insert: toda vez que um Pedido de Compra é criado com preço numa
  peça, uma linha nova é gravada aqui sozinha (`lib/pedidosCompra.ts` → `criarPedido()`). Ver
  "Cotação de peças" na seção 7.
- **`depositos`** (migration `0041`): id, loja_id (FK lojas), nome, ativo, criado_em. Locais
  físicos de estoque dentro de uma loja (ex: "Depósito Principal", "Fundos") — gerenciado em
  Configurações (admin), igual padrão de `categorias`/`categorias_caixa` (sem exclusão de verdade,
  só inativar). Toda loja já nasce com um "Depósito Principal" sozinho (backfill na migration pras
  já existentes, `criarLoja()` pras novas), então quem usa um só lugar físico nunca precisa criar
  nada — só quem tiver mais de um depósito passa a escolher entre eles.
- **`estoque_movimentos`**: id, loja_id (FK lojas), deposito_id (FK depositos — em qual depósito
  aconteceu), peca_id (FK), tipo (`entrada`/`saida`),
  quantidade, motivo (`compra`/`venda`/`ajuste`/`uso_em_os`), referencia, criado_em. Fluxos que
  lançam movimentação sozinhos (baixa automática ao usar peça numa OS, entrada ao receber Pedido de
  Compra, importação de nota por foto) não perguntam "em qual depósito" pro operador — caem sempre
  no depósito padrão da loja (`buscarDepositoPadraoId()` em `lib/depositos.ts`); só os fluxos onde o
  operador ativamente escolhe (Movimentações → Nova movimentação, Contagem) pedem o depósito na
  tela. Decisão de escopo pra manter o v1 do Depósito enxuto — se um dia fizer falta escolher
  depósito também nesses fluxos automáticos, é extensão aditiva.
- **`ordens_servico`**: id, **numero** (int, sequencial **por loja** — 1, 2, 3..., atribuído
  sozinho por trigger no insert; é como a OS aparece pra usuária em todo o app, nunca o `id`.
  Desde a `0065` fica **vazio no orçamento e no recusado**, e nasce na aprovação, pelo mesmo
  gatilho, com o próximo número, sem buraco),
  **numero_orcamento** (int, contador próprio por loja, só do orçamento — "Orçamento 45"; fica
  na linha depois de aprovada), **validade** (date, quem preenche é o programa, padrão hoje + 7),
  **aprovado_por** (texto livre)/**aprovado_em**, **motivo_recusa** (`preco`/`prazo`/
  `outro_lugar`/`desistiu`/`outro` ou vazio)/**recusado_em**, **orcado_em** (timestamptz, só na
  OS que nasceu de orçamento: a data do orçamento, porque na aprovação o gatilho põe a data da
  aprovação em `data_abertura`) — todos da `0065`,
  **tipo** (`os`/`venda_balcao`, migration `0064` — a venda de balcão usa o MESMO contador de
  número; na tela vira "Venda 17" em vez de "OS 17", pelo `nomeOrdem(numero, tipo)`), loja_id
  (FK lojas), cliente_id (FK), veiculo_id (FK, opcional), status
  (`orcamento`/`em_andamento`/`concluida`/`faturada`/`recusado` — sem "aberta" desde a migration
  0037; `orcamento` e `recusado` desde a `0065`; o padrão continua "em_andamento", então OS criada
  sem dizer o status nasce OS), km_entrada, descricao_problema (rótulo "Observação"), forma_pagamento
  (texto livre — quando o faturamento é dividido em mais de uma forma, vira um resumo tipo "Pix +
  Cartão de crédito"), parcelas (int, default 1, preenchido no faturamento), data_abertura,
  data_fechamento, vendedor_id (FK **funcionarios**)/criado_por_id/atualizado_por_id (FK operadores
  — autoria de sistema).
- **`ordens_servico_itens`**: id, ordem_servico_id (FK), tipo (`peca`/`servico`), peca_id (FK
  opcional, só tipo peça), servico_id (FK opcional, só tipo serviço — item de serviço pode ficar
  sem servico_id quando for "avulso"), tecnico_id (FK **funcionarios**, opcional — técnico
  responsável por aquele item, diferente do vendedor/atendente que é da OS toda), descricao,
  quantidade, preco_unitario, desconto
- **`configuracoes_juros_parcelas`**: loja_id (FK lojas) + numero_parcelas (PK composta, 2 a 12),
  juros_percentual. Editável só pelo admin — define o juro (% sobre o total) cobrado quando o
  cliente parcela no cartão ao faturar uma OS. 1x é sempre à vista, sem juros.
- **`caixa_movimentos`**: id, loja_id (FK lojas), data, ordem_servico_id (FK opcional — **não é mais
  único** desde a migration 0037: uma OS faturada com pagamento dividido em mais de uma forma gera
  1 lançamento por forma usada), tipo (`entrada`/`saida`), forma_pagamento, valor, descricao,
  categoria_id (FK categorias_caixa, opcional). **Desde a `0062` exige o módulo Caixa no banco**,
  com as portas estreitas de Relações, OS e das contas descritas na entrada da migration acima.
- **`categorias_caixa`**: id, nome, tipo (`entrada`/`saida`), criado_em. Gerenciada em
  Configurações (admin), selecionável ao lançar um movimento manual no Caixa (ex: "Aluguel",
  "Sucata"). Tabela separada de `categorias` (que é só pra produtos) — o conceito é diferente.
- **`funcionarios`**: id, loja_id (FK lojas, **nullable** — única exceção, ver subseção
  "Multi-loja" acima), nome, cargo (texto livre, opcional), operador_id (FK operadores,
  opcional e único — presente quando esse funcionário também loga no sistema), ativo, criado_em.
  Cadastro leve pra quem não precisa logar mas precisa ser selecionável como técnico/vendedor.
  **Todo operador criado em Configurações ganha automaticamente um `funcionarios` espelhado**
  (trigger `sincroniza_funcionario_operador`). Campos ampliados (RH completo): documentos (cpf,
  rg, cnh_categoria, cnh_numero, data_nascimento, estado_civil, tipo_sanguineo), endereço/contato
  (cep, endereco, numero, bairro, cidade, estado, complemento, telefone, celular, email),
  cargo/admissão (pis, codigo_registro, cbo, salario, comissao, admissao, data_ferias) e
  família/filiação (pai, mae, naturalidade, sexo, conjuge_nome, conjuge_nascimento,
  data_casamento, conjuge_telefone, conjuge_celular). **Dados de saúde ficaram de fora** por
  escolha explícita (dado sensível, cuidado de LGPD).
  **Desde a migration `0056` a tabela exige a permissão `funcionarios` no banco**, não só na
  tela — quem não tem o módulo lê ZERO linha aqui. O que o resto do sistema usa passa pela view
  abaixo.
- **`funcionarios_publico`** (VIEW, migration `0056`): id, loja_id, nome, cargo, operador_id,
  ativo — a "janela pública" de `funcionarios`, pra qualquer operador com acesso à loja. É por
  ela que os seletores de técnico e vendedor da OS leem, e é ela que dá o nome do técnico na
  lista de OS e no documento de garantia. **Roda com os direitos do dono, então não reage a RLS
  nenhuma**: o isolamento por loja é o `where` de dentro dela, e só `select` é concedido (ver o
  item `0056` acima pro porquê de cada uma das duas coisas).
- **`funcionario_filhos`**: id, funcionario_id (FK, `on delete cascade`), nome, data_nascimento
  (opcional), criado_em. `FuncionarioForm.tsx` salva a lista inteira de uma vez (substitui tudo).
  Desde a `0056` exige a permissão `funcionarios`, e **não tem janela pública nenhuma** — nome e
  nascimento de criança não servem pra tela nenhuma fora do módulo.
- **`contagens_estoque`**: id, loja_id (FK lojas), deposito_id (FK depositos — a contagem física é
  sempre de um depósito específico), peca_id (FK), quantidade_contada,
  saldo_sistema, diferenca, observacao, operador_id (FK operadores), criado_em. Ao salvar com
  diferença, gera automaticamente um ajuste em `estoque_movimentos` (nesse mesmo depósito).
- **`configuracoes_garantia`**: 1 linha **por loja** (`loja_id` é a PK) com `texto` — template do
  texto de garantia, placeholders `{cliente}`/`{veiculo}`/`{itens}`/`{data}` substituídos na hora
  (`lib/garantiaTexto.ts`). Editável só pelo admin.
- **`notas_fiscais_arquivos`**: id, loja_id (FK lojas), tipo (`nfe`/`nfse`), competencia (date, 1º
  dia do mês), nome_arquivo, storage_path, ordem_servico_id (FK opcional), operador_id (FK
  operadores), criado_em, origem (`manual`/`automatica`, default `manual`),
  numero/chave_acesso/status (opcionais, preenchidos nas notas emitidas pelo sistema,
  `origem = automatica`). O XML em si fica no **Supabase Storage**, bucket privado `notas-fiscais` (`storage_path`:
  `<tipo>/<ano>-<mes>/<uuid>-<nome original>`, **não segmentado por loja** — ver subseção
  "Multi-loja" acima).
- **`configuracoes_fiscais_loja`**: 1 linha **por loja** (`loja_id` é a PK) com cnpj, razao_social,
  nome_fantasia, inscricao_estadual, inscricao_municipal, regime_tributario, endereço da loja,
  telefone, email, focus_nfe_ambiente (`homologacao`/`producao`) e `focus_nfe_token` — **que o
  app não lê mais desde o TR-04.2** (o token vive em `segredos_fiscais_loja`; esta coluna é só a
  cópia antiga guardada pra uma volta de versão, e a parte 2 do item a limpa). Por isso
  `buscarConfiguracaoFiscal()` lista as colunas uma a uma, **nunca `select("*")`**. Reaproveitada
  pelo cabeçalho do documento de garantia. Desde a migration `0049` guarda também
  `competencia_aliquota_confirmada` e `aliquota_passo_a_passo`, do lembrete mensal da alíquota
  (ver "Aviso da alíquota do mês" na seção 7) — a primeira **não** é escrita pela tela de
  Configurações, só pelo botão "Já cadastrei" e pela NFS-e autorizada.
- **`segredos_fiscais_loja`** (migration `0057`): loja_id (PK, `on delete cascade` — sai junto
  com a loja), focus_nfe_token, atualizado_em. O cofre do token da Focus NFe. **Sem policy
  nenhuma, de propósito**: nem o admin lê. Quem lê é o porteiro (Edge Function `focus-nfe`, com a
  service role); quem escreve é `definir_token_focus_nfe()`. **Não criar policy de select aqui** —
  seria transformar o cofre de volta numa coluna comum. A matriz de RLS reprova se aparecer uma.
- **`fechamentos_caixa`** (migration `0058`): id, loja_id, data (date — o dia fechado),
  fundo_troco, saldo_sistema (o esperado em espécie, **congelado** no fechamento),
  valor_contado, diferenca (contado − esperado, conferida por `check`), totais_por_forma
  (jsonb), observacao, caixa_movimento_id (a "Quebra/Sobra de caixa" gerada), operador_id,
  criado_em. Único por (loja_id, data). **Gravado só por `fechar_caixa()`**; sem update;
  delete só de admin da loja, por `desfazer_fechamento_caixa()`. A conta do esperado é de
  `src/schemas/fechamentoCaixa.ts`, não do banco.
- **`comissoes_fechamentos`** (migration `0059`): id, loja_id, funcionario_id (`on delete set
  null`), funcionario_nome (congelado — o registro continua dizendo pra quem foi), periodo_inicio,
  periodo_fim, percentual, valor_calculado, valor_pago, data_pagamento, observacao, snapshot
  (jsonb: as OS com papel e comissão no dia do pagamento), operador_id, criado_em. Único por
  (funcionario_id, periodo_inicio, periodo_fim). Ler e registrar exigem o módulo Funcionários
  **no banco**; sem update; delete só de admin da loja.
- **`operadores`**: id (= id do usuário no Supabase Auth), usuario (único **globalmente**, não por
  loja), nome, admin (bool), permissoes (`text[]` com as chaves de `MODULOS` em
  `src/types/operador.ts`), ativo, deve_trocar_senha (bool, default `false` — migration `0038`;
  marcado `true` quando um admin redefine a senha de alguém, obriga trocar antes de liberar o app,
  ver seção 7 "Login e permissões"), criado_em. Não tem `loja_id` — o acesso a loja(s) vem de
  `operador_lojas` (ver subseção "Multi-loja" acima). RLS de verdade baseada em login (ver seção 6).
- **`auditoria`** (migrations `0040` e `0053`): id, tabela (nome da tabela afetada),
  registro_id, acao (`criar`/`atualizar`/`excluir`), operador_id (quem fez — **sem FK desde a
  `0053`**, ver acima), operador_nome (o nome congelado no momento do fato, e é ele que a tela
  mostra — o registro histórico continua respondendo mesmo se o operador for excluído depois),
  dados_antes/dados_depois
  (jsonb, snapshot da linha inteira via `to_jsonb(old)`/`to_jsonb(new)`), criado_em. **Não é
  gravada pelo app** — uma função trigger (`registrar_auditoria()`, `security definer`) grava
  sozinha em `INSERT`/`UPDATE`/`DELETE` das 16 tabelas cobertas (ver a lista no comentário da
  migration `0053`, que é a mais recente),
  então pega qualquer alteração não importa a origem (tela do app, SQL Editor manual, bug futuro).
  Leitura só pra admin (`operador_atual_e_admin()`); sem policy de insert pra ninguém — só a
  função (dona = quem rodou a migration) consegue gravar. Ver "Auditoria" na seção 7.
- **`contas_pagar`**: id, loja_id (FK lojas), descricao, valor, vencimento (date), categoria_id (FK
  categorias_caixa, opcional), recorrente (bool), status (`pendente`/`paga`), data_pagamento
  (opcional), caixa_movimento_id (FK, opcional — a Saída gerada ao marcar como paga), operador_id
  (FK operadores), criado_em. Marcar como paga gera automaticamente uma Saída em
  `caixa_movimentos` e, se `recorrente`, cria a próxima ocorrência (mesmo valor, +1 mês) sozinha.
  **"Desfazer pagamento"** (`desfazerPagamento()` em `lib/contasPagar.ts`) volta a conta pra
  pendente e apaga a Saída que tinha sido gerada.
- **`contas_receber`**: id, loja_id (FK lojas), cliente_id (FK clientes), ordem_servico_id (FK
  ordens_servico, opcional e único — 1 conta a receber por OS faturada), descricao, valor,
  vencimento (date, aqui é "previsão de recebimento"), status (`pendente`/`recebido`),
  data_recebimento (opcional), caixa_movimento_id (FK, opcional — a Entrada gerada ao marcar como
  recebido), operador_id (FK operadores), criado_em. Nasce de dois jeitos: (a) **automaticamente**,
  ao faturar uma OS (`FaturamentoCard.tsx`) escolhendo "A receber depois" em vez de "Recebido
  agora" — não lança Entrada no Caixa na hora, cria uma linha aqui, pendente; marcar como recebido
  (`ReceberContaModal.tsx`) é que gera a Entrada; (b) **à mão**, pelo botão
  "+ Nova conta" da própria tela (`ContaReceberForm.tsx`, mesmo padrão do Contas a Pagar), pra
  cobrança que não passou por OS nenhuma. **Detalhe que valeu conferir antes de construir (b)**: a
  tabela tem `constraint contas_receber_ordem_id_unique unique (ordem_servico_id)`, que à primeira
  vista pareceria impedir mais de uma conta manual (todas com `ordem_servico_id` nulo) — mas o
  Postgres não trata dois nulos como repetidos numa constraint `unique` comum (só com
  `nulls not distinct`, que não foi usado aqui), então cabem quantas contas avulsas forem precisas.
  **Não precisou de migration nova.** `cliente_id` continua obrigatório, então o formulário exige
  escolher o cliente.
- **`configuracoes_whatsapp`** (migration `0052`): loja_id + chave (PK composta), texto,
  atualizado_em. Os textos de mensagem editáveis por loja — uma linha por modelo
  (`cobranca`, `carro_pronto`, `pedido_compra`). A linha só existe depois que alguém edita;
  enquanto não existir, vale o padrão de `src/schemas/whatsapp.ts`.
- **`whatsapp_mensagens`** (migration `0052`): id, loja_id, chave, referencia (o id do que
  motivou a mensagem — conta a receber, OS, pedido —, texto e sem FK de propósito, porque aponta
  pra tabelas diferentes conforme a chave), destino, operador_id, criado_em. Registra que a
  conversa foi **aberta**, nunca que foi enviada.
- **`schema_versao`** (migration `0055`): versao (int, PK — o número da migration), aplicada_em.
  Uma linha por migration aplicada neste banco. Lida pelo app na abertura (`lib/schemaVersao.ts`),
  nunca escrita por ele: só a migration grava, rodando no SQL Editor. Ver "Aviso de banco
  desatualizado" na seção 7.
- **`computadores`** (migration `0063`): id (uuid gerado **pelo próprio computador**, guardado no
  `computador.json` dele), nome_maquina (o nome que o Windows dá), apelido (do admin), versao_app
  (só "números.números.números", por `check`), canal (`normal`/`teste`), sistema, loja_id e
  operador_id (os dois `on delete set null` — excluir loja ou operador não trava), primeiro_acesso,
  visto_em. **Gravada só por `registrar_computador()`** (a cada login e a cada renovação da sessão);
  sem policy de insert/update, declarado como lacuna na matriz de RLS. Lida pelo admin (Configurações
  → "Computadores desta empresa") e pelo botão de atualizar os bancos, que a consulta como dono do
  banco. **Só aparecem computadores que já abriram uma versão que registra** — os que ainda estão
  numa versão antiga ficam invisíveis até atualizarem.
- **`configuracoes_painel_inicio`**: 1 linha **por loja** (`loja_id` é a PK) com `cartoes`
  (`text[]`, até 3 chaves) — define quais indicadores aparecem nos cartões de tendência da tela
  Início. Ajuste por loja, editável só pelo admin. As 5 chaves possíveis ficam em
  `CARTAO_METRICA_LABEL` (`types/configuracao.ts`): vendas_mes, custos_mes, lucros_mes,
  ticket_medio_mes, contas_pagar_vencendo. Padrão atual: Vendas/Lucro/Ticket médio (Custos saiu do
  padrão por não ser legal mostrar "algo negativo" logo de cara).

Regras de negócio já implementadas: ao criar uma OS com item tipo peça, gera automaticamente uma
saída em `estoque_movimentos` (motivo `uso_em_os`). Ao faturar uma OS, gera automaticamente uma
entrada em `caixa_movimentos` com o valor total (já incluindo juros, se parcelado). Garantia dada
ao cliente (módulo "Garantias") **não tem tabela própria** — deriva de `ordens_servico_itens` +
`pecas.prazo_garantia_dias` + `ordens_servico.data_fechamento`. Ao confirmar o recebimento de um
Pedido de Compra (mesmo que parcial), gera automaticamente uma entrada em `estoque_movimentos`
(motivo `compra`) por item recebido, soma em `pedidos_compra_itens.quantidade_recebida`, e
recalcula sozinho o status do pedido (`parcial` até todo item bater a quantidade pedida, aí vira
`recebido`).

**Fora do Postgres** (Supabase Storage): bucket `notas-fiscais` (XMLs enviados manualmente).
**Fora do Postgres/Storage** (Edge Functions): `focus-nfe` (o porteiro do TR-04.2 — usa o token
de `segredos_fiscais_loja` e não guarda nada) e `ler-notas-fiscais`, ver seção 4 — esta não tem tabela
própria, o resultado só passa pela tela de revisão em memória antes de salvar em `pecas`.

