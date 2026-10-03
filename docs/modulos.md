# Estado atual por módulo

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 7. Estado atual por módulo
 (tudo confirmado rodando de verdade pela usuária, salvo indicação contrária)

**Escopo da v1 original** (100% completo): Clientes (+ veículo), Peças/Produtos (campos fiscais
completos), Estoque (entrada/saída, saldo), Ordens de Serviço, Caixa Diário, Relações,
Painel/Início.

**Ordem do menu lateral**: reorganizada a pedido da usuária, agrupando por fluxo de trabalho —
Início, Clientes, Ordens de Serviço, Estoque, Serviços, Caixa Diário, Contas a Pagar, Relações,
Garantias, Notas Fiscais, Funcionários (RH por último, de propósito — é cadastro usado bem menos
no dia a dia do balcão do que os módulos anteriores). Ver `MODULOS` em `src/types/operador.ts`.

**Enter avança pro próximo campo**: em qualquer formulário do app, apertar Enter move o foco pro
próximo campo em vez de tentar enviar o formulário — pensado pra quem trabalha só de teclado, sem
mouse (comum em balcão de loja). No último campo, Enter foca o botão de salvar/confirmar (mais um
Enter confirma). Implementado uma única vez, globalmente (`src/hooks/useEnterParaProximoCampo.ts`,
usado em `App.tsx`) — não precisa de nada especial em cada tela nova, funciona em qualquer
`<form>`. Campos de texto multilinha (`<textarea>`, ex: "Observação" da OS) continuam com Enter
normal (quebra de linha).

**Backspace limpa o campo de data inteiro**: campos `type="date"` usam o seletor
nativo do Chromium, dividido em "caixinhas" (dia/mês/ano) que o navegador não deixa apagar
cruzando uma pra outra via JS — Backspace/Delete num campo de data agora limpa o campo inteiro,
deixando redigitar sem precisar do mouse. Implementado uma única vez, globalmente
(`src/hooks/useLimparDataAoApagar.ts`, mesmo padrão do Enter acima). Ver item 27 da seção 6 pro
bug corrigido no próprio fix (checar `.value` bloqueava o caso mais comum, corrigir um dígito
ainda no meio da digitação).

**Campo numérico só muda digitando** (31/08/2026): em qualquer campo de número do app, as setas
↑/↓ do teclado não somam nem subtraem mais, e as setinhas de spinner dentro do campo foram
escondidas — o valor só muda quando alguém escreve. Vale pros 32 campos numéricos (preço,
quantidade, desconto, juros, alíquota). Global, sem nada a fazer em tela nova
(`src/hooks/useNaoMexerNoNumeroSemDigitar.ts` + CSS em `globals.css`). Ver item 41 da seção 6 pro
estoque de "1,99 UN" que revelou isso.

**Foco de teclado visível em tudo** (11/09/2026, item `TR-02.2` do guia): até aqui o app não
desenhava foco nenhum — o anel padrão do Chromium é escuro e sumia no fundo quase preto. Num app
feito pra ser usado só de teclado no balcão, isso é armadilha: dava pra apertar Enter sem saber em
que campo se estava. Agora todo campo, botão e link mostra um anel ao ser alcançado pelo teclado.
São dois anéis sobrepostos (um escuro colado na borda, um claro 2px pra fora) pra funcionar tanto
sobre o card escuro quanto sobre a faixa amarela de aviso da emissão de nota. Regra única em
`@layer base` do `globals.css`, sem nada a fazer em tela nova. Ver item 51 da seção 6 pro motivo
de os 78 `outline-none` do app terem saído junto.

**Escala tipográfica** (11/09/2026, item `TR-01.1` do guia): o tamanho de fonte agora sai de uma
escala única no `@theme` do `globals.css`, com nome por **papel** e não por tamanho — `text-metrica`
(número grande de cartão), `text-titulo` (o `<h1>` da tela), `text-destaque` (valor que salta num
card), `text-subtitulo`, `text-corpo` (texto normal, 14px), `text-tabela` (tabela densa, 13px),
`text-rotulo` (rótulo/etiqueta, 13px) e `text-meta` (só metadado, 12px). Cada uma carrega a própria
altura de linha. Em tela nova, **escolher pelo papel do texto** — não voltar a `text-xs`/`text-sm`,
que `src/schemas/tipografia.test.ts` reprova apontando arquivo e linha.
**Nada encolheu nessa troca**: o menor texto do app subiu de 12 pra 13px e o de 10/11px pra 12px.
Duas coisas contra a intuição: a tabela **comum** usa `text-corpo` (14px), não `text-tabela` — o
guia supunha tabela em 11-12px, mas 25 das 28 já eram 14px, e baixar seria piorar; e `tabela` e
`rotulo` têm o mesmo tamanho de propósito, são o mesmo degrau com papéis diferentes.

**Ações de linha das listas** (11/09/2026, item `TR-02.1` do guia): em toda lista, o trio
`Editar Inativar Excluir` era três palavras coladas em texto de ~10px, com o destrutivo
encostado no anterior. Virou um padrão único (`components/AcoesDaLinha.tsx`): ícone de 32x32 com
8px de folga pro que é do dia a dia, e menu de três pontinhos pro que não dá pra desfazer — então
excluir um cliente passou a ser dois gestos, não um clique torto. Onde virar ícone seria
adivinhação ("Marcar como paga", "Receber", "Ver DANFE"), a palavra continua lá, num botão de
32px de altura. Vale em Clientes, Produtos, Serviços, Fornecedores, Pedidos de compra,
Funcionários, Contas a Pagar, Notas Fiscais e Operadores. **Ela viu a tela renderizada e escolheu
manter o ícone** (11/09/2026) — "Editar" e "Inativar" ficam como lápis e afins, com o nome no
balãozinho do mouse. Assunto fechado, não reabrir.

**Tabela larga rola de lado, dentro da própria caixa** (03/10/2026, #425): numa janela de 1366
(o Balcão) a lista de OS passava do lado direito, e "Faturar"/"Fechamento" ficavam fora da tela,
sem barra pra chegar neles. Duas causas: o `<main>` do `App.tsx` não tinha `min-w-0` (numa linha
flex, ele crescia até a largura da tabela mais larga), e toda tabela morava num `overflow-hidden
sakura-card`, que corta. Agora o `<main>` tem `min-w-0` e o envoltório das tabelas é
`overflow-x-auto sakura-card`: o que não couber rola dentro da caixa da tabela. **Tabela nova usa
`overflow-x-auto`, nunca `overflow-hidden`.** O item da OS (Quantidade, Preço, Desconto, Técnico)
virou grade de 2 colunas abaixo de 1280 de janela e 4 a partir daí: em 1024 o Técnico saía
pra fora. Quem confere é o `npm run largura:telas` (todas as telas em 1024, 1280, 1366, 1536 e 1600), que
roda no CI.

**Lista de OS cabe inteira em 1366** (03/10/2026, #425, **versão "B", escolhida por ela pela
imagem**; a outra opção juntava Total e Lucro numa coluna só): **abaixo de 1600px de janela,
Peças e Serviços somem** (Total e Lucro ficam; de 1600 pra cima as duas voltam); a coluna
"Abertura" mostra a data **sem o ano quando é do ano corrente** ("03/10"; `dataCurta` em
`src/lib/datas.ts`); nome de cliente comprido pode quebrar no meio da palavra; a placa não quebra
linha; e as células têm `px-2.5` em vez de `px-4`. **Não é o `2xl` (1536) do Tailwind**: em 1536
a tabela com as duas colunas não cabia (1202px numa caixa de 1198), e 1536 é a largura de um
notebook Full HD com zoom de 125%. Folga medida: 56px em 1366, 226 em 1536, 92 em 1600. A cena
`07-ordens` tem `semRolarAPartirDe: 1366`, então o `largura:telas` **reprova se a lista precisar
rolar de lado** de 1366 pra cima (coluna nova aqui precisa caber nessa folga).

**Janela (modal) opaca** (03/10/2026, #361, **versão "sólida", escolhida por ela pela imagem**; a
outra opção borrava a tela de trás): o painel era o vidro do `sakura-card` e o texto da tela de
trás aparecia através dele. Agora as três janelas (`Modal.tsx`, `ImportarNotaFiscalXmlModal.tsx`,
`ImportarNotasFiscaisModal.tsx`) usam `sakura-modal-fundo` (tela de trás nítida, escurecida a
60%) e `sakura-modal` (painel opaco, mesma borda, brilho e sombra do card), em
`src/styles/globals.css`. **Janela nova usa esses dois**, nunca `sakura-card` +
`bg-black/40`. O `sakura-modal-fundo` zera a margem: dentro de um `space-y-*`, a margem do filho
encurtava o fundo fixo (a janela de importar XML deixava 24px sem escurecer no pé da tela).

**Modal com foco preso** (11/09/2026, item `TR-02.3` do guia): o `Modal.tsx` — usado em
confirmação de dinheiro e de documento fiscal — deixava o Tab escapar pra tela de trás. Agora
prende o Tab, fecha no `Esc`, devolve o foco pro botão que abriu e marca o fundo como inerte. O
foco inicial cai sempre no ✕: num modal de cancelar nota, um Enter no automático fecha, nunca
confirma.

**Auto-save de rascunho**: os formulários longos guardam sozinhos uma
cópia local do que está digitado, a cada 30s — **não é um "salvar" de verdade** (não manda nada pro
banco nem substitui o botão Salvar), é rede de segurança pra quando o programa fecha de repente ou
a tela recarrega sozinha (ver item 30 da seção 6). Ao reabrir o mesmo registro, aparece a faixa
"Encontramos um rascunho não salvo... Restaurar?" (`components/AvisoRascunho.tsx`); salvar de
verdade descarta o rascunho. Cobre **Ordem de Serviço, Cliente, Funcionário, Produto e Pedido de
Compra** — os cinco formulários onde dá pra perder bastante digitação. Ligar num formulário novo
são duas linhas: o hook `useRascunho(chave, watch, reset)` (`src/hooks/useRascunhoFormulario.ts`)
mais o `<AvisoRascunho>`. **Cuidado embutido**: o autosave compara com o retrato de quando a tela
abriu e ignora formulário intocado — sem isso, só abrir uma tela e deixar 30s já criaria um
rascunho falso pra próxima abertura, o que em cinco telas viraria chateação.

**WhatsApp (12/09/2026, item `FN-03` do guia)**: o sistema abre a conversa no WhatsApp com a
mensagem já escrita, em três lugares — **"Cobrar"** em cada conta pendente de Contas a Receber,
**"Avisar"** ("seu carro está pronto") em cada OS concluída ou faturada, e **"Enviar"** em cada
pedido de compra ainda não recebido, com a lista de itens. Existe porque o WhatsApp já é o canal
por onde essa operação funciona — é por lá que o pai dela manda foto de nota, que ela fala com a
contabilidade e com o suporte, e que a senha temporária de um operador é repassada; o sistema era
a única parte do fluxo que ignorava isso, e quem precisava cobrar copiava valor e data na mão.
Quatro coisas que valem saber:
- **Os textos são editáveis em Configurações → "Mensagens de WhatsApp"**, com marcadores no mesmo
  padrão do texto de garantia (`{cliente}`, `{valor}`, `{vencimento}`, `{os}`, `{placa}`,
  `{loja}`...). Cada loja fala do seu jeito, e o que o dono manda pro cliente dele é decisão dele.
  Sem linha no banco, vale o padrão de `src/schemas/whatsapp.ts` — loja nova já manda mensagem
  sem configurar nada.
- **O sistema registra que a conversa foi ABERTA, nunca que foi enviada** — ele abre o WhatsApp
  com o texto pronto e, dali em diante, quem decide é a pessoa. Afirmar "enviada" seria uma
  mentira que um dia viraria decisão de cobrança. Em Contas a Receber isso aparece como "cobrado
  em dd/mm" ao lado do botão, que responde a pergunta que hoje mora só na memória de quem cobrou.
- **O telefone é normalizado** pra `55 + DDD + número` (`schemas/whatsapp.ts`, testado): tira
  pontuação e o zero do DDD, não duplica o 55 de quem cadastrou com DDI, e acrescenta o nono
  dígito em celular antigo — mas **não** em telefone fixo, porque isso criaria um número que não
  existe. Sem DDD, ele **recusa e explica**, em vez de abrir conversa com o número errado.
- **Quem abre é o processo principal do Electron** (`shell.openExternal`), que **confere de novo**
  que a URL é `https://wa.me/` antes de entregar pro sistema operacional — é o item 15 do
  checklist de segurança do Electron, e URL montada com dado do banco (telefone + texto editável)
  é exatamente o caso que ele descreve. Fora do Electron cai num `window.open`.
**Ainda não visto por ela na loja.**

- **Conexão com o banco (multi-empresa)** — **confirmada funcionando por ela** desde a `v0.9.18`
  (instalou no notebook, colou URL + chave e entrou). Antes, a URL/chave do Supabase eram gravadas dentro do instalador (secrets
  do GitHub no `release.yml`), então **um instalador servia uma empresa só**. Agora cada computador
  escolhe a conexão na primeira abertura, numa tela própria (`pages/conexao/ConexaoPage.tsx`) que
  aparece no lugar do login enquanto não houver conexão salva; o valor fica guardado **só naquela
  máquina**, num `conexao.json` dentro da pasta de dados do app (no Windows, algo como
  `%APPDATA%\Sakura System - AutoCenter Edition\conexao.json`). A tela tem "Testar conexão" e
  também testa sozinha antes de salvar — salvar um endereço com erro de digitação deixaria o app
  numa tela de login que nunca funciona, sem explicação. Pra trocar depois, há um link discreto
  **na própria tela de login** (de propósito: se a conexão estiver errada ninguém entra, então o
  conserto não pode estar atrás do login, em Configurações).
  - **Decisão importante tomada junto**: os secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
    foram **removidos do `release.yml`**, ou seja, o instalador não carrega mais a conexão de
    empresa nenhuma. O motivo é de segurança de dado, não de arquitetura: mantendo os secrets, o
    instalador entregue ao amigo do pai dela viria pré-preenchido com o banco da **Pneus Amigão** —
    um clique distraído e ele estaria vendo os dados dos clientes de outra empresa. Com eles fora,
    a tela nasce vazia pra todo mundo. Em `npm run dev` nada muda: o `.env` continua valendo, e a
    tela nem aparece (`import.meta.env.DEV` manda; ver `src/lib/conexao.ts`).
  - **Como o valor chega na tela sem IPC assíncrono**: `electron/main.ts` lê o `conexao.json` na
    abertura e joga em `process.env.SAKURA_SUPABASE_URL`/`SAKURA_SUPABASE_ANON_KEY`; o preload
    repassa isso pro app via `contextBridge`. É de propósito o **mesmo mecanismo** já usado pela
    versão do app (`SAKURA_APP_VERSION`): o cliente do Supabase é criado assim que a tela carrega,
    antes de qualquer IPC conseguir responder, então o valor precisa estar disponível de forma
    síncrona — e ler arquivo direto de dentro do preload empacotado já falhou de um jeito
    silencioso antes (item 18 da seção 6). Salvar grava o arquivo e **recarrega a tela**, porque o
    cliente do Supabase é montado uma vez só.
  - **Testado no Electron de verdade** (hoje dentro do `npm run test:electron`): o único jeito de
    pegar falha silenciosa de preload.
- **Login e permissões**: usuário/senha (sem digitar e-mail), sessão não persiste entre aberturas
  do app (a pedido explícito — o programa fica aberto o dia todo, cada abertura pede login de
  novo). Menu lateral e rotas filtrados por permissão (`PermissaoRoute`/`AdminRoute`). Tela
  Configurações (admin) gerencia operadores com checkboxes de módulo. **Redefinir senha esquecida**: o login não usa e-mail de verdade, então o
  "esqueci minha senha" do Supabase não funciona. Em vez disso, um admin clica "Redefinir senha" no
  card de outro operador (Configurações → Operadores): o sistema gera uma senha temporária (mostrada
  uma vez, pra repassar pessoalmente ou pelo WhatsApp) e obriga a troca no próximo login
  (`TrocarSenhaPage.tsx`). Por trás, a Edge Function `redefinir-senha-operador` confere do lado do
  servidor que quem chama é admin (a chave de serviço nunca sai do Supabase). Uma versão mais
  simples publicada por engano numa sessão paralela foi substituída pela atual (seção 9).
  O login de dev `@sakura` aparece como "Suporte" na lista de
  operadores, e o "Operador Teste" (`@teste`, resíduo sem uso real) foi **excluído de verdade**
  pelo painel do Supabase (Authentication → Users) — não só inativado. Ver item 23 da seção 6 pro
  detalhe do bug que impedia excluir/inativar esse operador pela tela do app (RLS bloqueando em
  silêncio por ele não ter loja vinculada) e por que a correção foi feita direto no Supabase, sem
  mudar código.
- **Clientes**: CRUD completo (com edição) +
  múltiplos veículos por cliente, pessoa física/jurídica (rótulos de campo mudam conforme o tipo),
  aniversário do cliente no calendário do Início, tipo de veículo (ícone 2D por carroceria, pintado
  com a cor cadastrada) exibido na seção "Veículos no pátio". **Editar cliente preserva o `id` dos
  veículos já existentes** (`atualizarCliente` em `lib/clientes.ts` faz `upsert`, não
  apaga-e-recria como `funcionario_filhos`) — importante porque `ordens_servico.veiculo_id`
  referencia esse `id`; recriar do zero desconectaria OS antigas do veículo (a FK é `on delete set
  null`, então o dado não quebraria, mas o vínculo se perderia silenciosamente). Corrigido um bug real onde um veículo com Marca/Modelo preenchidos
  mas Placa em branco era descartado em silêncio ao salvar (ver item 26 da seção 6); campo "Marca"
  agora sugere uma lista de ~80 montadoras via Combobox, mas aceita digitar qualquer coisa que não
  esteja na lista (`permitirLivre`, ver seção 4); "Modelo" continua texto livre sem sugestão (tem
  modelo demais no mundo pra listar, pedido explícito da usuária). **"Ver veículos" (03/10/2026,
  #417)**: a lista não tem mais a coluna Veículos (uma caixinha de placa por carro, poluída, e
  carro sem placa virava caixinha vazia). No lugar, um botão "Ver veículos" nas ações da linha,
  igual ao "Ver DANFE", só em cliente com carro; abre uma janela com os carros
  (`VeiculosDoClienteModal.tsx`), cada um levando pra ficha. Carro sem placa aparece como "sem
  placa", com marca e modelo.
- **Estoque**: 4 abas — Produtos (cadastro completo com campos fiscais NCM/CFOP/CST-CSOSN/ICMS,
  categoria, garantia em dias, margem calculada nos dois sentidos), Movimentações (com filtro por
  produto e campo/coluna de Depósito), Contagem (inventário físico, agora
  **por depósito** — mostra o saldo do sistema daquele depósito específico, não o total da loja —,
  gera ajuste automático na diferença), Relatórios (estoque físico-financeiro, saldo por situação,
  produtos sem movimentação — esses três continuam olhando pro saldo total da loja, somando todos
  os depósitos, sem mudança). **Depósito**: cadastro em Configurações → seção
  "Depósitos" (locais físicos de estoque, ex: "Depósito Principal", "Fundos" — ver seção 5/8); toda
  loja já nasce com um, então quem usa um só lugar físico não percebe diferença nenhuma no dia a
  dia — só quem criar um segundo depósito passa a escolher entre eles nas telas de Movimentações e
  Contagem. O cadastro de produto tem edição (nasceu pra corrigir
  peça com CST/CSOSN errado, item 1 da seção 8). **Importar por foto/PDF**:
  botão ao lado de "+ Novo produto" (ícone de câmera, SVG) — lê uma ou mais fotos **ou PDFs** de
  nota fiscal (pode ser mais de uma nota junto) via Claude (Sonnet 5, saída estruturada) através
  da Edge Function `ler-notas-fiscais`, mostra uma tabela editável com os produtos identificados e
  cadastra em lote (`ImportarNotasFiscaisModal.tsx`). Chave da Anthropic fica só como secret da
  Edge Function. **Desde 09/09/2026, o CST/CSOSN lido na nota do fornecedor já entra corrigido
  pro padrão da loja** (a coluna continua editável), com aviso quando algum produto ficar sem um
  código que sirva — ver item 47 da seção 6.
  **⛔ DESLIGADO desde 25/09/2026, a pedido dela** ("o importar por foto tem créditos, mas eu
  gostaria de desabilitar ele por enquanto, resolvemos isso depois"). O botão some da tela; o
  código inteiro continua lá. Religar = `IMPORTAR_POR_FOTO_LIGADO = true` em
  `src/pages/estoque/ProdutosSection.tsx` **e** descomentar a cena `13-importar-foto` em
  `site/ferramentas/cenas.mjs` (a varredura de contraste do CI clica nesse botão — com o botão
  escondido e a cena ativa, o job de contraste nas telas fica vermelho). Não retomar sozinho.

  **A lista de Produtos respondendo "o que preciso comprar?" (12/09/2026, item `TL-11` do
  guia)** — até aqui "Estoque atual" era um número neutro: dava pra ver que sobrou 1, mas não
  dava pra saber se 1 é pouco. Quatro coisas mudaram:
  - **Estoque mínimo por peça** (campo novo no cadastro, migration `0051`). Chegando no mínimo, a
    peça aparece destacada e entra no filtro **"Precisa comprar"**, com a contagem ao lado. Peça
    sem mínimo cadastrado nunca vira aviso — e é assim que o catálogo inteiro nasce, então nada
    muda pra quem não quiser usar.
  - **Saldo com semântica**: negativo em vermelho e escrito ("negativo"), porque saldo negativo
    **não é pouco estoque, é erro de lançamento** — saiu peça que nunca entrou; zerado e "no
    mínimo ou abaixo" em amarelo. A regra fica em `schemas/estoque.ts`, função pura testada, pra
    a mesma leitura valer na lista, no relatório e na abertura de OS — este projeto já viu quatro
    vezes o que dá reescrever regra de negócio em cada tela (itens 35, 40, 44 e 49 da seção 6).
  - **Busca com leitor de código de barras**: um campo no topo, já focado ao abrir, que filtra por
    descrição, referência, código, marca e **medida do pneu**. O leitor se comporta como um
    teclado (digita o código e aperta Enter), então Enter com correspondência **exata** abre a
    peça direto. Exata, e não "contém", de propósito: abrir a peça errada é pior que não abrir
    nada — e com duas peças de mesmo código ele não escolhe sozinho, só filtra a lista.
  - **Coluna de margem %**, que já era calculada e não aparecia.

  **O cadastro de produto explicando os campos fiscais (12/09/2026, item `TL-12`)** — eles são a
  maior fonte de erro deste sistema, e o erro deles é silencioso: o campo fica com cara de
  preenchido e certo, e a conta chega semanas depois numa nota recusada (item 47 da seção 6).
  Agora cada campo fiscal tem um "?" com uma frase dizendo o que é e **de onde tirar o valor**
  ("NCM: código de 8 dígitos, está na nota do fornecedor"), e o **CST/CSOSN já nasce preenchido
  com o código que a própria loja mais usa** — a sugestão existia só na importação de XML, ou
  seja, faltava justo no caminho mais usado. Só em peça nova, e só se o campo estiver vazio.
  Junto: **aviso quando o preço de venda fica abaixo do custo** (erro de digitação em preço não
  dá erro em lugar nenhum, só vira prejuízo repetido até alguém reparar), **unidade virou lista
  fechada** com uma saída "Outra..." (UN/Un/un viravam três coisas em qualquer agrupamento, e
  unidade divergente é rejeição de nota), e o **bloco de pneu** (medida, índice de carga e
  velocidade, DOT) que aparece só quando a categoria escolhida é a de Pneus. Nenhum dos avisos
  trava o salvar — são todos aviso (item 33 da seção 6).
  **Ainda não visto por ela na loja.**
- **Serviços**: catálogo simples (descrição, código opcional, preço padrão, **custo** — ex: mão de
  obra, usado pela aba Lucratividade —, categoria de serviço opcional), sem estoque/fiscal. Vem
  semeado com ~17 serviços padrão sem preço (organizados por categoria: Pneus, Suspensão,
  Amortecedores, Freios, Alinhamento, Outros Serviços), baseados numa ficha de orçamento de
  referência do ramo — ponto de partida, não os preços/serviços reais dela.
- **Fornecedores** (duas abas): "Cadastro" — nome/razão social, CNPJ, telefone, e-mail, endereço
  completo, ativo/inativo; compartilhado entre lojas (mesmo padrão de Clientes). "Pedidos de
  compra" — por loja, número sequencial (`numero`, mesmo padrão de OS), itens de peça com
  quantidade pedida + preço unitário, status (`pendente`/`parcial`/`recebido`/`cancelado`). Botão
  **"Receber"** abre uma conferência: a usuária confirma quanto chegou de cada item (pode ser
  parcial, em mais de uma vez) e o sistema já lança a entrada em Estoque → Movimentações sozinho
  (motivo "Compra"), soma na quantidade recebida do item, e recalcula o status do pedido inteiro.
  **Cotação de peças**: ao escolher a peça num item do pedido, aparece um resumo das cotações
  anteriores daquela peça por fornecedor (mais barato primeiro, com a data da última compra), com
  um botão "usar esse preço" que preenche o campo — sem tela própria, é gravado sozinho toda vez
  que um pedido é criado com preço numa peça (`PedidoCompraItemRow.tsx` + `lib/cotacoesPecas.ts`,
  histórico completo em `cotacoes_pecas`, nunca sobrescreve — ver seção 5). **Importar XML de nota
  fiscal**: botão "Importar XML de nota fiscal" ao lado de "+ Novo pedido" —
  lê o arquivo XML que o **fornecedor** emite (formato público/estável do governo, puro parsing
  com `DOMParser`, sem IA/Edge Function — não confundir com o "Importar por foto" de Estoque, que
  lê a nota **por foto/PDF via IA**, nem com a emissão de nota **pro cliente**), acha o fornecedor pelo CNPJ (cria um novo automaticamente se não achar) e
  casa cada item com uma peça já cadastrada por código de barras/código interno (deixa escolher
  outra peça ou cadastrar nova pra quem não bateu), pede o depósito de destino uma vez só pro lote
  inteiro, e confirma criando um Pedido de Compra que já nasce **"Recebido"** (a nota já é a prova
  de que chegou) — com entrada em Estoque e cotação de cada item gravadas sozinhas
  (`ImportarNotaFiscalXmlModal.tsx` + `lib/notaFiscalXmlFornecedor.ts` +
  `lib/pedidosCompra.ts` → `importarNotaFiscalCompra()`). Garantia do fornecedor na compra ainda não existe (item 5
  da seção 8). **Desde 09/09/2026 a importação não copia mais o código de ICMS do
  fornecedor pras peças novas** (era o que gerava nota rejeitada, ver item 47 da seção 6): quando
  o código do XML não serve pro regime da loja, aparece um aviso e um campo "CSOSN das peças
  novas", já preenchido com o código que a própria loja mais usa no cadastro dela.
- **Ordens de Serviço**: cada OS tem um número sequencial **por loja** (`numero`, 1/2/3...,
  atribuído por trigger no insert) — é como a OS é identificada em toda tela ("OS 12"), nunca mais
  o UUID cortado. Status simplificado pra só 3 etapas: **em_andamento** (nasce assim direto, sem
  "aberta" separada) → **concluída** → **faturada**. Form em duas colunas, reabre pra editar (só
  permite acrescentar itens, não editar/remover item já lançado — evita desfazer baixa de estoque).
  **Acrescentar item só funciona até a OS estar "faturada"** (item 31 da seção 6) — depois de faturada, o "+ adicionar item" some e a peça/serviço esquecido vira uma OS
  nova; faturar (o botão "Confirmar faturamento") agora pede confirmação explícita antes, avisando
  que essa trava passa a valer.
  **Abrir a OS sem sair dela pra cadastrar (11/09/2026, item `TL-08` do guia)** — o gesto mais
  comum do balcão é chegar um carro de cliente novo, e isso exigia abandonar a OS pela metade,
  ir em Clientes, cadastrar e recomeçar do zero. Cinco coisas mudaram de uma vez:
  - **"+ Cadastrar cliente novo" / "+ Cadastrar veículo novo"** no fim da própria lista do campo
    (`Combobox` ganhou a opção `acaoExtra`), abrindo um modal enxuto — nome, telefone, placa,
    marca, modelo — que devolve o registro **já escolhido** na OS
    (`CadastroRapidoModais.tsx`). **Não duplicam schema**: usam o `clienteFormSchema`/
    `veiculoFormSchema` e as funções de conversão do cadastro completo; muda só quantos campos
    aparecem. O resto (CPF, endereço, aniversário) continua sendo preenchido em Clientes.
  - **Cliente com um veículo só preenche o veículo sozinho** (item `TR-02.5`).
  - **O KM da última passagem do carro aparece como referência**, com um "usar" ao lado, e um
    **aviso quando o KM digitado é menor** que o anterior (quase sempre é dígito faltando).
    **Não preenche sozinho de propósito**: o KM de entrada é o do painel do carro *hoje*, e
    aceitar o valor antigo no automático estragaria justamente o histórico que esse campo existe
    pra formar. O guia pedia "preencher como sugestão" — aqui a premissa dele foi ajustada.
  - **O total virou barra fixa no rodapé** (peças, serviços e total, junto com Cancelar/Salvar):
    ele ficava logo abaixo da lista de itens e, com a OS cheia de peça, saía de vista. É
    `sticky`, nunca `fixed` — elemento `fixed` dentro de `sakura-card` se prende ao card por
    causa do `backdrop-filter` (item 51 da seção 6).
  - **Saldo em estoque ao escolher a peça**, com aviso quando a quantidade passa do saldo, e
    aviso quando a peça está **sem preço de custo** (ela infla o lucro da OS e a comissão — a
    tela de Comissões já avisava disso depois; avisar na hora é o que dá chance de consertar).
  **Nenhuma dessas checagens impede de salvar** — são todas aviso (item 33 da seção 6). Sem
  migration. As regras e a conta do rodapé são funções puras testadas
  (`schemas/avisosOrdemServico.ts`, `totaisDaOrdem` em `schemas/ordemServico.ts`). O saldo só é
  consultado quando o formulário abre, e recarregado a cada abertura — mesma ideia da aba
  Comissões. Ver item 57 da seção 6 pro bug de foco que só apareceu rodando o app de verdade.

  **Corrigir um item já lançado (08/09/2026, pedido dela usando o sistema: digitou R$120 num
  alinhamento que era R$60 e não tinha como consertar pela tela)**: cada linha de "Já lançados
  nesta OS" ganhou um "Editar" que abre ali mesmo os campos do item (tipo, peça/serviço,
  quantidade, preço, desconto, técnico) — `ItemExistenteRow.tsx`. É salvo na hora, item por item,
  **sem** passar pelo "Salvar alterações" da OS (que continua cuidando só dos campos de cima e dos
  itens novos). Três coisas que valem saber:
  - **O estoque se acerta sozinho.** A saída que o item original gerou continua valendo, então só
    a **diferença** é lançada (`diferencasDeEstoque()` em `lib/ordensServico.ts`, testada): mudou
    só o preço → nenhuma movimentação; quantidade subiu → saída da diferença (motivo "uso em OS");
    quantidade caiu, peça trocada ou peça virou serviço → entrada de volta (motivo "ajuste"). A
    referência sai como "OS 12 (correção de item)", pra dar pra achar em Movimentações.
  - **Trava em dois casos**, os dois com aviso na tela explicando: OS já **faturada** (o pagamento
    já entrou no Caixa com o total antigo — mesma razão do item 31 da seção 6) e OS que já tem
    **nota fiscal emitida** e não cancelada (corrigir aqui deixaria a nota diferente da OS). No
    segundo caso o caminho é cancelar a nota antes (Notas Fiscais → "Cancelar nota").
  - **Não tem "Remover"** — só editar. Um item lançado por engano ainda precisa ser transformado em
    outro item pela edição; excluir de vez não foi construído (não foi pedido, e teria a mesma
    conversa de estoque/nota). Fácil de acrescentar depois, se fizer falta.
  - **Passou a ser auditado em 13/09/2026** (migration `0053`, rodada por ela no mesmo dia):
    `ordens_servico_itens` entrou na trilha de auditoria, inclusive a criação do item. Era a
    ponta solta registrada aqui desde a `v0.9.28` — mexer no valor de um item não deixava rastro
    nenhum. Ver "Auditoria" nesta seção.

  **Aviso de código fiscal antes de emitir (09/09/2026)**: a aba Fechamento → "Emitir NFC-e"
  agora confere o CST/CSOSN de cada peça da nota contra o regime da loja **antes** de mandar, e
  lista pelo nome as que não servem ("BIEL SUSP GM DT ACO LD/LE — está com o CST 00, que é do
  regime normal — sua loja é Simples Nacional e usa CSOSN"). Substitui o `[nItem:1]` enigmático
  que a SEFAZ devolve. **Não bloqueia a emissão** — ver item 47 da seção 6.
  Não existe mais seletor manual de status no form — o cabeçalho mostra o status atual (badge) e,
  enquanto "em_andamento", um botão **"Encerrar OS"** que marca como concluída e já abre a tela de
  faturamento na sequência, num fluxo só. Tem rascunho automático (ver "Auto-save de rascunho" no começo desta seção). Técnico por item + vendedor/atendente da OS (ambos listam
  `funcionarios`, não só operadores). Lista de OS tem filtro de período (De/Até) e busca por
  cliente/placa — OS em aberto sempre aparecem, não importa a data (só o histórico já faturado é
  filtrado por período, pra lista não crescer sem controle); colunas de Nº/Peças/Serviços/Total/Lucro
  por ordem; status com cor por etapa (Concluída em laranja, de propósito, pra chamar atenção de que
  falta faturar) — mesma cor no card "OS abertas" do Início. Faturamento (`FaturamentoCard.tsx`)
  calcula parcelas automaticamente conforme os juros configurados em Configurações, deixa **dividir
  o pagamento em mais de uma forma** (ex: metade Pix, metade cartão — cada forma vira seu próprio
  lançamento de Caixa, e a soma precisa bater com o total **dos itens** antes de confirmar), e deixa
  escolher entre "Recebido agora" (lança a Entrada no
  Caixa na hora, como sempre foi) ou "A receber depois" (não lança nada no Caixa ainda, cria uma
  pendência em Contas a Receber — ver módulo abaixo; aqui não dá pra dividir forma de pagamento,
  só ao receber depois). Aba "Fechamento" (só aparece com status concluída/faturada): botões "Emitir
  NFC-e"/"Emitir NFS-e" (`EmitirNotaFiscalModal.tsx`: emitem pela Focus NFe e esperam a
  autorização da SEFAZ/prefeitura; assim que autorizada, o PDF/DANFE já carrega direto num preview embutido dentro
  do próprio modal — mesmo padrão de `iframe` já usado em "Ver garantia"/"Versão para o cliente" —
  com botões "Baixar PDF", "Imprimir" e "OK", em vez do antigo botão único "Ver DANFE" que abria
  numa aba separada; em produção desde 27/08, item 1 da seção 8) e "Ver garantia" (abre preview do documento completo — cabeçalho da loja, dados de
  cliente/veículo, itens, totais, forma de pagamento com parcelas reais, assinaturas — com opção de
  baixar HTML/imprimir via `iframe`).
  **Parcelar cartão dentro do pagamento dividido** (28/08/2026, pedido dela usando o sistema de
  verdade — **confirmado por ela funcionando na loja**): antes, marcar "dividir em mais de uma forma"
  travava tudo em 1x, então quem passava parte no cartão parcelado não tinha onde registrar. Agora
  **cada forma tem seu próprio número de parcelas** (o seletor só habilita no cartão de crédito;
  Pix/dinheiro/débito são sempre à vista), e o **juro incide só sobre a parte que passou no
  cartão**, não sobre a OS inteira — igual à maquininha. Consequência visível na tela: a soma das
  formas fecha com o total **dos itens** (valor combinado, sem juros) e o juro aparece somado à
  parte, na linha "Com os juros do cartão"; cada linha parcelada mostra o valor da parcela. Como
  `ordens_servico.parcelas` é um número só, o pagamento dividido grava o **maior** parcelamento
  usado (na prática, o do cartão). Sem migration. As contas viraram funções puras testadas em
  `schemas/faturamento.ts` (`calcularLinhasPagamento`, `somarLinhasCobradas`, `parcelasDaOrdem`).
  **Correção junto, que essa mudança destapava**: o rateio do pagamento na NFC-e
  (`buscarPagamentosParaNota`, ver item 32 da seção 6) dividia o total da nota pelo total da OS —
  com juros de cartão o que entra no Caixa é maior que o total dos itens, e uma linha podia estourar
  o total da nota deixando a última **negativa** (rejeição da SEFAZ). Passou a ratear pela **soma
  das formas de pagamento** (`ratearPagamentos`, função pura testada): resultado idêntico quando não
  há juros, sem negativo quando há.

  **"Finalizada" — a OS sabe de que nota ela precisa** (28/08/2026, pedido dela usando o sistema;
  **confirmado por ela funcionando na loja**): o sistema deduz, pelos itens, qual nota cada OS precisa —
  só peça → NFC-e, só serviço → NFS-e, os dois → as duas — e cruza com as notas já ligadas àquela
  OS. Consequências na tela: (a) na lista, uma OS faturada que ainda deve nota continua "Faturada"
  (agora em **azul**, porque ainda pede uma ação) com um "falta NFS-e" embaixo, e vira
  **"Finalizada"** (verde) quando todas as notas dela saíram; (b) na aba Fechamento, só aparece o
  botão da nota que aquela OS precisa (uma OS só de serviço não mostra mais "Emitir NFC-e", que
  daria erro de qualquer forma), com uma linha dizendo o que falta, e o botão de uma nota já
  emitida aparece como "NFC-e emitida ✓". **Nota cancelada volta a contar como pendente**, e nota
  enviada à mão (upload de XML vinculado à OS) conta como emitida igual às automáticas.
  **Sem migration e sem status novo no banco**: `ordens_servico.status` continua
  em_andamento/concluida/faturada — "Finalizada" é derivado na hora (`schemas/situacaoFiscal.ts`,
  funções puras testadas), mesma filosofia do módulo de Garantias. Derivar em vez de gravar também
  evita o status mentir se uma nota for cancelada depois. **Decisão dela junto**: não existe
  "OS sem nota" — toda OS vai ter nota emitida, então não foi criado nenhum jeito de marcar uma OS
  como dispensada de nota (se um dia fizer falta, é uma coluna nova + migration).

  **Dois ajustes de ergonomia na lista de itens** (mesma leva, mesmo motivo — uso real no balcão):
  o botão "+ adicionar item" saiu do cabeçalho e foi pro **rodapé da lista, alinhado à direita**
  (com a OS cheia de peça, subir a tela toda pra lançar mais uma era o que atrapalhava); e cada item
  passou a mostrar o **total da linha** (quantidade × preço − desconto) além do preço unitário, pra
  não haver confusão em par de peça (2x pneu, por exemplo).

- **Venda de balcão** (26/09/2026, item `FN-09`, migration `0064`, `v0.9.45` — **ainda não
  testada por ela na loja**): vender uma peça pra quem não vai deixar o carro, numa tela
  só. Botão **"+ Venda de balcão"** na tela de Ordens de Serviço (mesma permissão do módulo). O
  que a tela faz:
  - **Cliente começa no "Consumidor"** ("não se identificou"). Pra CPF na nota, escolhe-se um
    cliente ou cadastra ali mesmo ("+ Cadastrar cliente (CPF na nota)" — nome, pessoa
    física/empresa, CPF/CNPJ e telefone, sem veículo). A linha embaixo do campo diz como a nota
    vai sair.
  - **Leitor de código de barras**: o campo de busca já abre focado; Enter com o código exato
    (ou uma peça só na busca) põe a peça; **passar de novo soma 1 na mesma linha**. Com várias
    parecidas, o Enter não escolhe — aparece a lista. O Enter do leitor **não** pula de campo
    (segura o atalho global — ver item 77 da seção 6).
  - **Só peça**, de propósito: serviço pede NFS-e com tomador identificado — é o mundo da OS.
  - **Pagamento** é o mesmo `FaturamentoCard` da OS (dividir em formas, parcelar cartão). Enquanto
    ele está aberto, as peças travam ("Mudar as peças" destrava). **No Consumidor não existe "a
    receber depois"**: não há de quem cobrar.
  - **Gravar e faturar é um clique só** (`registrarVendaBalcao` em `lib/ordensServico.ts`). Se
    falhar antes de o pagamento entrar, a venda é **desfeita inteira** e tentar de novo é seguro;
    se falhar NO pagamento, a venda fica (o estoque já baixou) e a tela diz pra **faturar a que
    existe**, nunca registrar outra (`VendaSemFaturamentoError`).
  - **Depois de registrada, a NFC-e abre sozinha** — nada é emitido sem o "Confirmar emissão"
    dela. A NFC-e do Consumidor sai sempre **sem identificação**, mesmo que alguém grave um CPF
    nele (`montarDestinatarioNFCe`).
  - **Na lista, uma aba própria** ("Vendas de balcão (N)"), sem as colunas de veículo e serviço;
    abrir uma venda mostra o fechamento (NFC-e, DANFE, garantia) e, se o pagamento não entrou, o
    botão Faturar. Sem "Avisar" no WhatsApp (não há carro pronto).
  - **Nos números**: a venda entra em vendas, custo e lucro (Início, Caixa, Relações) e na
    comissão do vendedor, mas **fica fora do ticket médio** (que responde "quanto rende cada carro
    atendido") — o "?" do cartão diz isso. O rótulo é "Venda 17" no caixa, na movimentação de
    estoque, nas comissões, no recibo de comissão e na garantia.
- **Ficha do veículo** (27/09/2026, item `FN-04`, sem migration, `v0.9.46` — **ainda não
  testada por ela na loja**): tudo que já foi feito num carro,
  por placa. Rota `/veiculos/:id`, sem entrada no menu — abre pelo **"Ver veículos"** em
  Clientes, ou **clicando na placa** na lista de OS e em Garantias. É a pergunta que chega no balcão junto com o carro ("quando foi a última troca?", "esse pneu ainda
  está na garantia?"), e é a base do lembrete de revisão (`FN-06`). O que a tela mostra:
  - **Dono atual** (o cliente em cujo cadastro o carro está hoje) e telefone;
  - **KM mais recente** — o da OS mais recente, nunca o maior já digitado (mesma regra do
    `ultimoKmConhecido` da abertura de OS) — e **quanto o carro roda por mês, escrito como
    estimativa**. A estimativa se recusa, dizendo o motivo, com menos de duas visitas com KM,
    visitas a menos de um mês uma da outra, KM que desceu ou KM igual em todas;
  - **Total em OS faturadas** (soma dos itens, com desconto, sem os juros do cartão — o mesmo
    "Total" da lista de OS);
  - **Visitas** (dias diferentes — duas OS no mesmo dia são uma visita), a última e a média de
    dias entre uma e outra;
  - **Peças na garantia**, da que vence primeiro, com os dias que faltam, e quantas já venceram;
  - **Histórico**: cada OS com data, "há quanto tempo", número, KM, itens, status e total, e um
    aviso quando o KM desceu em relação à visita anterior. **"Abrir OS"** leva pra OS — só
    aparece pra quem tem o módulo de OS **e** quando a OS é da loja ativa (a lista de OS só
    carrega a loja ativa; o atalho numa OS da outra loja não abriria nada).
  Quatro coisas que valem saber:
  - **As OS não são filtradas pela loja ativa, de propósito**: a ficha é a história do CARRO, e o
    cadastro de clientes/veículos é compartilhado justamente pra um cliente que passa nas duas
    lojas ter um histórico só. A RLS decide o que cada operador vê. Quando o carro passou em mais
    de uma loja, cada visita diz de qual.
  - **Permissão**: abre pra quem tem **Clientes ou Ordens de Serviço** (o `PermissaoRoute`
    passou a aceitar uma lista, "basta um"). Em Garantias, quem só tem Garantias vê a placa como
    texto, sem o atalho.
  - **A tela de Garantias mudou um detalhe junto**: o vencimento passou a ser conta de dia de
    calendário (`schemas/garantia.ts`, a mesma da ficha) — a garantia **vale o dia do vencimento
    inteiro**. Antes comparava o instante exato, e uma peça vendida às 15h saía da garantia às 15h
    do último dia.
  - **Não abre de dentro do formulário da OS** — sair da OS no meio perderia o que foi digitado.
    Se fizer falta ver o histórico na hora de abrir a OS, o caminho é a ficha numa janela
    (modal), não um link. Não foi pedido.
- **Funcionários** (duas abas desde 03/09/2026): **"Cadastro"** — RH completo (documentos,
  endereço, cargo/admissão, família/filhos; o formulário em si tem as sub-abas "Dados
  gerais"/"Família"). Todo operador ganha um `funcionarios` espelhado automaticamente. E
  **"Comissões"** (02/09/2026, pedido do pai dela; morava em Relações até 03/09/2026, quando ela
  pediu pra mover pra cá).
  - **Desde 18/09/2026 o módulo é protegido pelo BANCO, não só pela tela** (item `TR-04.3`,
    migration `0056`). Antes, "esconder" era literal: a tela não mostrava, mas qualquer
    operador logado podia pedir a tabela inteira pela API — salário, CPF, RG, CNH, filiação,
    nome do cônjuge e dos filhos — com a chave que está no computador dele. Agora o banco
    recusa. **Nada muda pra quem tem o módulo**, e nada muda pra quem monta OS: nome e cargo
    continuam saindo pela view `funcionarios_publico` (ver seção 5), que é o que alimenta os
    seletores de técnico e vendedor e o "técnico: Fulano" na OS e na garantia.
    **O que muda, e vale saber**: a partir daqui, tirar a permissão "Funcionários" de alguém
    não esconde só o menu — a tela abre **vazia** se ela for alcançada por outro caminho. É o
    preço de proteger de verdade, e vale pras próximas tabelas da série (item 1 da seção 6).
  - **A página virou orquestrador de abas** (mesmo padrão de Fornecedores/Caixa): a lista + o
    formulário saíram pra `FuncionariosSection.tsx`, e `ComissoesSection.tsx` mudou de pasta junto.
    Os dados que só a aba Comissões usa (OS, peças, serviços, contas a receber — 4 consultas) só
    são buscados quando alguém abre essa aba, pra não deixar mais lenta a tela de quem só veio
    cadastrar funcionário.
  - **Regras, decididas com ela** (estão escritas também no topo de `src/schemas/comissoes.ts`):
    os **dois papéis** contam, separados — o **vendedor** da OS leva pela OS inteira que atendeu,
    o **técnico** só pelos itens que executou; a base é o **lucro** (venda − custo), na
    porcentagem de `funcionarios.comissao`; e só conta **OS faturada**, pela data do faturamento.
  - **Não precisou de migration** — `ordens_servico.vendedor_id`,
    `ordens_servico_itens.tecnico_id` e o campo "Comissão (%)" do cadastro já existiam.
  - Uma linha por funcionário (vendeu / lucro gerado / comissão a pagar); "Ver as OS" abre o
    detalhe separado por papel, listando cada OS que formou o número — é o que deixa o pai dela
    conferir de onde veio cada real em vez de confiar no total.
  - **A tela avisa quando o número merece desconfiança**: comissão vinda de OS faturada como "a
    receber depois" que o cliente ainda não pagou; item vendido **sem preço de custo cadastrado**
    (entra como lucro cheio e infla a comissão); funcionário sem porcentagem cadastrada; e OS sem
    vendedor / item sem técnico, que caem numa linha "Sem funcionário definido" no fim da lista em
    vez de sumirem caladas.
  - **Cuidado de conta que vale saber**: quem vendeu **e** executou a mesma OS aparece nos dois
    papéis, mas o lucro é contado **uma vez só** (somar os dois inflaria; pegar o maior perderia
    OS onde a pessoa só executou). Já a comissão soma os dois de propósito — são pagamentos
    diferentes, mesmo caindo pra mesma pessoa.
  - **Por que fica em Funcionários e não em Relações**: ficou em Relações quando nasceu (o número
    sai das OS, não do cadastro da pessoa), mas ela pediu pra mover em 03/09/2026 — na cabeça de
    quem usa, comissão é assunto de funcionário. Consequência de permissão: quem enxerga
    Funcionários passa a enxergar comissão. Sem novidade de verdade — o cadastro de funcionário já
    mostra salário e a porcentagem de comissão de cada um.
  - **Comissão paga fica registrada e congelada (25/09/2026, item `TL-46.1`, migration `0059`,
    `v0.9.42`)**. O problema: a comissão é sempre recalculada a partir
    das OS, e desde a `v0.9.28` dá pra corrigir o valor de um item de OS já lançado — uma
    correção numa OS antiga mudava, calada, uma comissão já paga. Agora cada linha tem
    **"Registrar pagamento"** (valor pago, data, observação), que grava junto um **retrato das
    OS** que formaram o valor. Daí em diante:
    - o período pago mostra "✓ R$ X em dd/mm" no lugar do botão, com o **recibo** pra imprimir
      (feito do retrato, não do recálculo — recibo diz o que foi pago naquele dia);
    - se o recálculo de hoje **divergir** do retrato, aparece uma faixa dizendo quanto foi pago,
      quanto dá hoje, e **qual OS mudou** (antes → agora, inclusive OS que entrou ou saiu do
      período). Mostrar, nunca esconder: é o sinal de que alguém editou uma OS depois;
    - escolhendo um período que cruza com um já pago ("de 15/09 a 15/10" depois de pagar
      setembro), aparece quanto daquela comissão **vem de OS já pagas**, com os números — aviso,
      não trava;
    - embaixo, "Pagamentos já registrados", com recibo e (só admin) "Desfazer" — que apaga só o
      **registro**, nunca mexe em dinheiro. Registrar **não lança nada no Caixa**, de propósito:
      comissão sai de jeitos diferentes em cada loja.
    As contas ficam em `src/schemas/comissoesPagas.ts`; o recibo em `src/lib/reciboComissao.ts`
    (todo texto do banco escapado). **Ainda não testado por ela na loja.** Dos sub-itens do `TL-46`, ficaram
    de fora os links nos avisos (levar ao cadastro da peça/à OS) e o gráfico de evolução.
- **Caixa Diário**: abas Diário (tudo — OS faturadas + manual) / Entradas / Saídas (só
  lançamentos manuais, com categoria via `categorias_caixa`).
  **A categoria virou obrigatória em 11/09/2026** (item `TL-27` do guia): era opcional, então
  ninguém preenchia, e o bloco "Por categoria" da tela de Saídas virava um balde só — "Sem
  categoria: R$ 31.000,00", o mês inteiro de despesa junto. Três coisas que valem saber:
  - **A obrigatoriedade é do formulário manual, não da tabela.** O faturamento de uma OS continua
    entrando no caixa sem categoria (é venda, aparece no Diário), e o histórico já gravado não é
    recusado pelo banco — `caixa_movimentos.categoria_id` **não** virou NOT NULL.
  - **Existe sempre uma saída**: a migration `0050` semeia a categoria "Outros" pros dois tipos,
    porque `categorias_caixa` nunca foi semeada e um banco novo tem zero categorias. Se ainda
    assim não houver nenhuma categoria do tipo (ela atualizar o app antes de rodar a migration),
    o campo **explica onde criar uma** em vez de virar beco sem saída — a regra do item 33 da
    seção 6, de que validação incerta é aviso e não tranca.
  - **O passado também foi consertado.** Tornar obrigatório arruma só o futuro; os R$ 31.000,00
    já lançados não se movem sozinhos. As abas Entradas e Saídas mostram uma faixa dizendo
    quantos lançamentos estão sem categoria e quanto somam, com um painel que categoriza **em
    lote** (`CategorizarSemCategoria.tsx`), incluindo "aplicar a todos os que estão em branco" —
    que só preenche o que ainda está vazio, pra não desfazer o que já foi escolhido à mão. Linha
    deixada em branco não é gravada. As contas ficam em `schemas/caixa.ts`, como função pura
    testada. Card de "Lucro do dia" +
  resumo por forma de recebimento. **Desde 28/08/2026 o "Lucro do dia" é confiável** (ver item 40
  da seção 6): conta o custo de cada OS uma vez só mesmo com pagamento dividido, inclui o custo do
  serviço (não só o da peça) e desconta as saídas lançadas à mão. A coluna "Lucro" da tabela
  reparte o lucro da OS entre os lançamentos dela, então a coluna fecha com o total.
  **Aba "Fechamento" (25/09/2026, item `TR-06.4`, migration `0058`, `v0.9.42`)**: no fim do dia, conta-se o dinheiro da gaveta e o sistema compara com o que ele
  esperava — **troco que estava na gaveta ao abrir + entradas em dinheiro − saídas em
  dinheiro**. Pix e cartão aparecem à parte, "confira com o extrato", porque não passam pela
  gaveta. Seis coisas que valem saber:
  - **A diferença nunca some**: faltou vira uma Saída "Quebra de caixa", sobrou vira uma Entrada
    "Sobra de caixa", as duas em dinheiro — o espelho da Contagem de Estoque gerando ajuste. Por
    ser em dinheiro, depois de fechado o esperado passa a bater com o contado sozinho.
  - **O troco vem sugerido** com o do último fechamento — loja costuma deixar sempre o mesmo.
  - **Lançamento sem forma de pagamento não entra na conta** (não dá pra saber se saiu da
    gaveta), e a tela mostra à parte: "se foram em dinheiro, a diferença provavelmente vem daí".
  - **Dá pra fechar um dia que passou** (fechou só na manhã seguinte): a quebra cai às 23:59
    daquele dia, no fuso de quem usa — senão cairia no dia errado.
  - **Lançar depois de fechado não é proibido** (aviso, nunca tranca): o lançamento manual pede
    confirmação, e no Diário tudo que entrou depois do fechamento — manual ou OS faturada —
    aparece com a etiqueta "depois do fechamento". No próprio fechamento, uma faixa lista esses
    lançamentos.
  - **Desfazer é só de admin** (o botão nem aparece pra quem não é), e o histórico embaixo
    soma as diferenças dos últimos dias — a resposta pra "está faltando dinheiro no caixa?".
  As contas ficam em `src/schemas/fechamentoCaixa.ts`, com teste (inclusive de propriedade:
  o esperado fecha no centavo e só depende das linhas em dinheiro). **Ainda não testada por ela na
  loja.**
  **Desde a migration `0062` (aplicada em 26/09/2026) o Caixa é protegido pelo BANCO**:
  sem o módulo, ninguém lê, lança, edita nem apaga lançamento pela API. Quatro portas estreitas
  mantêm o resto do sistema funcionando, cada uma do tamanho do que faz — **Relações** lê tudo
  (só lê); quem **fatura OS** lança a entrada da OS e lê só os lançamentos de OS (a NFC-e e a
  garantia precisam); quem **paga conta** lança a saída e apaga só a da própria conta (o
  "desfazer"); quem **recebe conta** lança a entrada. Ninguém dessas portas vê aluguel, sangria
  nem quebra de caixa. Detalhe na entrada da `0062`, seção 5.
- **Contas a Pagar**: contas mensais com vencimento (diferente de Entradas/Saídas manuais, que só
  registram dinheiro que já saiu). Marcar como paga gera Saída automática no Caixa; se recorrente,
  já cria a próxima ocorrência sozinha. **"Desfazer pagamento"**: botão
  na lista "Pagas recentemente" — volta a conta pra pendente e remove a Saída gerada (se a conta
  era recorrente, a próxima
  ocorrência já criada continua existindo, pendente). **"Recorrente até"**: campo
  opcional que só aparece quando "Conta mensal recorrente" está marcado — em branco, continua
  recorrendo pra sempre (como sempre foi); preenchido com um mês, `pagarConta()` para de criar a
  próxima ocorrência depois dessa data (migration `0043`).
  **Desde a migration `0061` (aplicada em 26/09/2026) o módulo é protegido pelo BANCO**, não
  só pela tela: sem a permissão, a lista chega vazia e criar/pagar/apagar é recusado. Pra quem
  não tem o módulo, o cartão "Contas a pagar vencendo" do Início mostra "—" e "Sem acesso a
  Contas a Pagar" (em vez de um R$ 0,00 que parece verdade), e as contas não aparecem no
  calendário dele. Admin e quem tem o módulo não veem diferença nenhuma.
  **Com a `0062`, "desfazer pagamento" mudou de ordem**: apaga a saída do Caixa **primeiro** e só
  depois volta a conta pra pendente (antes era o contrário). Pra quem usa, nada muda; pra quem só
  tem Contas a Pagar, é o que faz a saída sumir de verdade em vez de ficar órfã no Caixa. E, se o
  banco não apagar a saída, a tela avisa e a conta **continua paga** — nunca fica "pendente" com a
  saída ainda lançada.
- **Contas a Receber**: espelha Contas a Pagar, mas do lado do que a loja tem a receber. Nasce
  automaticamente quando uma OS é faturada escolhendo "A receber depois" em vez de "Recebido
  agora" — pensado pra resolver o caso de faturar uma OS (serviço entregue/cobrado) sem o cliente
  ter pago tudo na hora. **Também aceita cadastro manual** ("+ Nova conta", igual
  Contas a Pagar): cliente, descrição, valor e previsão de recebimento — pra cobrança que não
  passou por OS nenhuma. Marcar como recebido gera Entrada automática no Caixa (mesmo padrão do
  Contas a Pagar), venha a conta de qual dos dois jeitos for.
  **Desde a migration `0061` (aplicada em 26/09/2026) o módulo é protegido pelo BANCO.**
  Duas coisas de fora continuam funcionando, de propósito: **faturar uma OS "a receber depois"**
  cria a conta mesmo pra quem não tem o módulo (só a conta daquela OS), e **a aba Comissões**
  continua sabendo quais OS o cliente ainda não pagou (quem tem Funcionários lê a lista). Se o
  banco recusar uma gravação por permissão, a tela diz em português a quem pedir, em vez de
  "violates row-level security policy" (`MENSAGEM_SEM_PERMISSAO`, `src/lib/errors.ts`).
- **Notas Fiscais**: as notas de cada mês — as emitidas pelo sistema entram sozinhas, e as feitas
  por fora entram por upload manual do XML (NFe/NFS-e), organizado por mês de competência
  (Supabase Storage), vínculo opcional com uma OS. **Coluna "Situação" (03/10/2026, #362)**: cada
  linha diz se a nota está **Autorizada** (verde), **Cancelada** (vermelho) ou **Enviada à mão**
  (XML que alguém subiu: o sistema não sabe o que a SEFAZ disse dele); outro status da Focus
  aparece escrito como veio. A regra é `situacaoDaNota` (`src/schemas/situacaoFiscal.ts`). O
  texto do topo da tela dizia que a emissão automática "ainda não existe" até 03/10 (#363). **Baixar o mês inteiro (02/09/2026)**: cada
  faixa de mês tem um botão "Baixar XMLs do mês (N)" que junta os XMLs daquela competência num
  `.zip` só (`nfse-2026-08.zip`) — é o formato que a contabilidade pede, e evita clicar nota por
  nota. O `.zip` é montado sem biblioteca externa (`src/lib/zip.ts`, formato "stored", sem
  compressão: XML de nota é arquivo pequeno, comprimir não mudaria o tamanho de forma relevante).
  Cuidados cobertos por teste: nome repetido no mesmo mês vira `nota (2).xml` (senão o
  descompactador perde um dos dois), nome com acento sai certo no Windows, e o download é feito
  em lotes de 5 pra um mês cheio não disparar dezenas de requisições juntas. Botão "Versão para o cliente" interpreta o XML
  e monta um recibo HTML (não é o DANFE oficial, sem código de barras/QR code). **Botão "Cancelar
  nota"**: até aqui, cancelar uma nota emitida automaticamente (NFC-e/NFS-e via
  Focus NFe) só dava pra fazer direto no painel deles — as funções `cancelarNFCe`/`cancelarNFSe`
  já existiam em `lib/focusNfe.ts`, mas nenhuma tela chamava. Agora aparece um botão "Cancelar
  nota" na lista, só pra notas com `origem = "automatica"` e ainda `status = "autorizado"` — pede
  uma justificativa (mínimo 15 caracteres, exigido pela Focus NFe) num modal
  (`CancelarNotaModal.tsx`) antes de confirmar. Precisou de uma migration nova (`0046`) porque o
  `ref` que a Focus NFe usa pra identificar a nota (gerado na hora da emissão) nunca tinha sido
  salvo em lugar nenhum — sem ele, não tem como cancelar depois. Usado de verdade em 28/09 (NFS-e 22 cancelada pelo porteiro).
  **Botão "Ver DANFE" (11/09/2026, item `TR-11.1` do guia de melhorias)**: reabre o PDF de uma
  nota que o sistema emitiu — o pedido de balcão mais comum que existe (o cliente volta e pede a
  nota de novo). Antes, o PDF só existia dentro da janela de emissão: fechou, acabou, e a única
  saída era entrar no painel da Focus NFe. O PDF **não** fica guardado aqui (o que é salvo é o
  XML, que é o documento que a lei manda guardar 5 anos) — ele é pedido de volta pra Focus NFe
  pela `focus_nfe_ref` da migration `0046`, mostrado no mesmo `iframe` de sempre, com "Baixar PDF"
  e "Imprimir" (`VerDanfeModal.tsx`). O mesmo botão aparece na aba Fechamento da OS. Os dois casos
  em que não dá (nota enviada à mão pelo XML; nota emitida antes da `0046`, sem referência) viram
  **texto explicando o que fazer**, não erro cru — a regra é função pura testada
  (`schemas/danfe.ts`). Na lista, o rótulo é "Ver DANFE" na aba NFe e "Ver PDF" na de NFS-e
  (DANFE é nome de documento da NFe).
- **Relações** (ex-"Relatórios", label mudou antes; agora também absorveu o módulo antigo
  "Lucratividade" — um módulo só, com abas): aba "Gráficos" — gráfico de barras (Vendas x Custos x
  Lucro, **Diário/Semanal/Mensal/Anual**) + radar comparando o período atual com o anterior, sem
  biblioteca externa de gráficos, paleta categórica própria (verde/laranja/violeta); aba
  "Lucratividade" — margem por peça/serviço, período filtrável. **O "Anual" entrou em 03/09/2026**
  (pedido dela): mostra 5 anos, e os cartões do topo ganharam um quarto, "Vendas este ano".
  **A aba "Comissões" saiu daqui em 03/09/2026** — foi pra dentro de Funcionários, a pedido dela
  (ver o módulo Funcionários logo abaixo).
  **Com a `0062` (aplicada em 26/09/2026), Relações continua lendo o Caixa inteiro**, por
  decisão dela: quem recebe o relatório do dinheiro recebe pra ver esses números. Só lê.
- **Início — calendário mostra também os dias vizinhos** (31/08/2026, pedido dela): a grade tem
  **6 semanas fixas** (como a do Windows), então a sobra do mês anterior e os primeiros dias do mês
  **seguinte** aparecem sempre, em cinza apagado. Motivo: o calendário mostra só o mês corrente e
  não tem seta pra avançar — uma conta que vencesse dia 1º ficava invisível no dia 31, justamente
  quando ela mais precisava ser vista. Os eventos (feriado, aniversário, conta a vencer/vencida)
  passaram a ser montados pra **toda a grade visível**, não só pro mês, e a lista embaixo do
  calendário mostra `dd/mm` quando o evento é de outro mês. `components/MiniCalendario.tsx` recebe
  evento com `data` ISO (era só o número do dia); `lib/calendario.ts` guarda as duas funções puras
  (`diasDoCalendario`, `chaveData` — essa usa `toLocaleDateString("sv-SE")`, nunca `toISOString`,
  pelo motivo do item 34 da seção 6), com teste. **Desde 11/09/2026 o calendário também anda de
  mês**, com as setas ‹ › no cabeçalho e um "Voltar para hoje" que só aparece fora do mês
  corrente (item `TL-04` do guia) — a grade de 6 semanas resolvia o dia 31, mas "o que vence mês
  que vem?" continuava sem resposta. **Os cartões não seguem a navegação de propósito**: eles são
  sempre do mês corrente, senão "Vendas mês" mudaria junto e viraria armadilha.
- **Início**: 3 cartões de tendência personalizáveis (Configurações → "Cartões do Início", padrão
  Vendas/Lucro/Ticket médio; **"Lucros mês" e "Ticket médio" foram
  corrigidos em 28/08/2026** — o lucro passou a descontar o custo real de peça e serviço, e o
  ticket médio a dividir por OS e não por lançamento de Caixa; ver item 40 da seção 6. O número do
  lucro **caiu bastante** com a correção, porque antes mostrava o faturamento quase inteiro),
  calendário do mês com feriados
  nacionais + aniversário de cliente + contas a pagar vencendo/vencidas, seção "OS abertas" e
  "Veículos no pátio" (com ícone por tipo/cor).
  **Os cartões foram retrabalhados em 11/09/2026 (item `TL-04` do guia de melhorias)**, em quatro
  frentes — todas com a conta em `schemas/painelInicio.ts`, como função pura testada:
  - **"Contas a pagar vencendo" deixou de olhar o mês corrente** e passou a somar os **próximos
    15 dias corridos**, já incluindo o que passou do vencimento. Era o ponto cego conhecido: no
    dia 31 o cartão mostrava R$ 0,00 com uma conta vencendo no dia seguinte, porque a fronteira
    do mês não quer dizer nada pra quem paga conta.
  - **Número negativo agora parece negativo**: cor de alerta, seta pra baixo e o sinal escrito
    (`components/Valor.tsx`). Antes um "Lucro mês −R$ 8.368,00" saía igualzinho a um número
    positivo, nesta que é a tela que o dono olha todo dia de relance. As três marcas juntas são
    de propósito — cor sozinha não serve pra quem não distingue vermelho de verde. O mesmo
    componente passou a ser usado no "Lucro do dia" e nos totais do Caixa Diário, pelo mesmo
    motivo; o resto das tabelas de dinheiro do app ainda usa o texto cru (troca mecânica, pode
    ir acontecendo conforme cada tela for mexida).
  - **A seta "›" genérica virou a variação de verdade** ("↑ +12%"), medida contra **a mesma fatia
    do mês anterior** (do dia 1º até o mesmo dia) — comparar meio mês com um mês inteiro diria
    que a loja está sempre caindo. Sem período anterior, **não aparece nada**, em vez de uma seta
    que promete tendência e não entrega. Verde/vermelho dependem do cartão: custo subindo não
    sai em verde.
  - **Cada cartão ganhou um "?"** com a definição em uma frase (`components/Explicacao.tsx`,
    texto em `CARTAO_METRICA_DESCRICAO`). Existe porque a definição de "lucro" deste sistema já
    mudou uma vez e o número caiu bastante — sem a explicação, quem olha acha que o negócio
    piorou.
  **E "OS abertas" e "Veículos no pátio" passaram a dizer há quanto tempo** ("ontem", "há 6
  dias"), em cor de alerta a partir de 3 dias (`DIAS_PARA_ALERTAR_OS`) — a data crua obrigava a
  contar nos dedos, e carro parado no pátio é dinheiro parado. A data exata continua no
  balãozinho do mouse. **O limite de 3 dias é constante no código, não configuração de tela** —
  virar ajuste por loja pediria migration.
  **Cartão sem o módulo (26/09/2026, migration `0061`)**: quem não tem Contas a Pagar vê "—" e
  "Sem acesso a Contas a Pagar" no cartão de contas, e as contas não entram no calendário dele — o
  programa nem pergunta ao banco. A regra de qual cartão exige qual módulo é `MODULOS_DO_CARTAO`
  (`schemas/painelInicio.ts`).
  **E os quatro cartões de dinheiro, desde a `0062`** (Vendas, Custos, Lucro, Ticket médio):
  mostram "—" e "Sem acesso a Caixa Diário" pra quem não tem **nem Caixa nem Relações** —
  qualquer um dos dois abre os cartões. Decisão dela: o Início não ganhou exceção no banco. Pra
  essa pessoa o programa nem pede o Caixa ao banco — e é de propósito que não pede "só o que ela
  enxerga": quem só fatura OS enxerga os lançamentos de OS, e somar só esses daria um "Vendas
  mês" que parece o número da loja e não é. Junto, o botão **"Ver relações completas"** passou a
  aparecer só pra quem tem Relações (antes aparecia pra todo mundo e levava a uma tela que a
  permissão não deixava abrir).
  **Aviso da alíquota do mês (11/09/2026, item `TR-11.2` do guia de melhorias)**: no topo do
  Início, uma faixa avisa que a alíquota daquela competência precisa ser cadastrada no portal da
  prefeitura antes da primeira NFS-e do mês — com o passo a passo curto e um botão "Já cadastrei"
  que some com o aviso até o mês seguinte. Existe porque essa recusa é mensal, conhecida, com data
  e consequência certas (ver item 1 da seção 8), e já custou uma manhã. Três cuidados que valem
  saber: (a) o aviso **só aparece pra quem emite NFS-e** (loja com token da Focus NFe e inscrição
  municipal preenchidos) — quem não emite nunca vê; (b) **toda NFS-e autorizada no mês marca a
  competência sozinha** (se a prefeitura autorizou, a alíquota está cadastrada), então na prática
  ele só aparece antes da primeira nota — valendo só pras notas emitidas **depois** desse código
  existir, então no primeiro mês o aviso aparece mesmo com a alíquota já cadastrada, e o caminho é
  clicar em "Já cadastrei" uma vez; (c) o mesmo aviso aparece dentro da janela de emitir
  NFS-e, sem o botão — ali o que resolve é ir no portal. A regra é função pura testada
  (`schemas/aliquotaCompetencia.ts`), o texto do passo a passo é editável em Configurações →
  Dados fiscais (padrão: Araraquara/Giap), e a competência confirmada fica em
  `configuracoes_fiscais_loja` (migration `0049`).
- **Configurações** (admin): Operadores (sempre visível, com "+ Novo operador", e agora um
  multi-select de lojas dentro do form, só aparece com 2+ lojas cadastradas), Lojas (novo card,
  sempre visível — criar/editar nome-cidade-UF/inativar lojas; **excluir de verdade** também é
  possível, mas só funciona com a loja "vazia" — sem estoque/caixa/OS/funcionários vinculados; com
  dado de negócio, o app explica e sugere inativar em vez de excluir), e seções recolhíveis — Juros
  de parcelamento, Categorias de produto, Categorias de serviço, Categorias de caixa, Texto de
  garantia, **Mensagens de WhatsApp**, Dados fiscais da loja, Cartões do Início (essas últimas 4, junto com Juros, agora são
  **por loja** — ver seção 5). Em "Dados fiscais da loja" há também, desde 11/09/2026, o campo
  "Como cadastrar a alíquota no portal da prefeitura" — texto livre que alimenta o aviso mensal do
  Início; em branco, vale o passo a passo de Araraquara que está no código. E, no fim, desde
  25/09/2026, **"Atualizações deste computador"** — a única seção que não mora no banco (ver
  "Canal de atualização" logo abaixo) — e, desde 26/09/2026, **"Computadores desta empresa"**
  (a versão de cada computador; ver o item logo depois de "Canal de atualização").
- **Canal de atualização** (25/09/2026, item `TR-09.1`): até aqui, publicar uma versão atualizava
  **todas** as lojas no mesmo minuto. Agora são dois canais:
  - **Teste** — recebe toda versão nova assim que ela sai. É pra ser o computador dela e o da
    Pneus Amigão: quem usa todo dia e consegue dizer "quebrou" antes de chegar em mais ninguém.
  - **Normal** (o padrão) — só recebe a versão depois que ela for **liberada** pelo workflow
    "Liberar versão para todas as lojas". É todo o resto, e é como um computador novo nasce.
  Quatro coisas que valem saber:
  - **A escolha é por computador**, em Configurações → "Atualizações deste computador" (só
    admin), e fica num arquivo próprio, `atualizacao.json`, na pasta de dados do app — **não**
    dentro do `conexao.json` como o guia sugeria, porque aquele arquivo é regravado inteiro a
    cada vez que alguém salva a conexão, e é ele que decide se a loja consegue entrar.
    Vale a partir da próxima vez que o programa abrir.
  - **Sair do canal de teste nunca rebaixa o computador**: ele fica na versão que já tem até as
    lojas liberadas passarem dela. (`allowDowngrade` fica desligado de propósito — item 70 da
    seção 6 conta a armadilha que quase religava ele.)
  - **O número da versão é o mesmo nos dois canais** (nada de `0.9.40-beta`), e liberar não refaz
    build: é a mesma release, só sem a marca de pré-lançamento.
  - **Aparece no Diagnóstico e no resumo do WhatsApp**, junto da versão — loja no canal de teste
    pode estar numa versão que as outras ainda não receberam.
  **Quem está em qual canal (28/09)**: o computador dela e o da loja ("Balcão") no **teste**.
  Se a loja tiver mais de um computador, todos no mesmo canal, pra loja inteira ficar na mesma
  versão. Cuidado barato sugerido: o Balcão no normal (item 12 da seção 8).
- **Computadores desta empresa** (26/09/2026, migration `0063` — aplicada, e o programa na
  `v0.9.44`, publicada e liberada no mesmo dia; **confirmada por ela funcionando no mesmo dia**:
  o computador dela apareceu sozinho na lista, com `0.9.44`, "canal de teste", "este computador",
  a loja e "hoje, por Pneus Amigao" — o Supabase e o Windows de verdade, que não dava pra
  conferir daqui): Configurações → "Computadores desta empresa" (só admin) mostra cada computador que
  abre o sistema — apelido ou nome da máquina, **versão**, canal, loja e **quando foi usado pela
  última vez, e por quem**. Existe pra responder "quem ficou pra trás numa atualização?", que até
  aqui só se respondia perguntando na loja. Cinco coisas que valem saber:
  - **Ninguém cadastra nada**: cada computador aparece sozinho no primeiro login numa versão que
    registra (a partir da que levar isto). **Os que ainda estão numa versão antiga não aparecem** —
    a tela diz isso, pra lista vazia não parecer "tudo certo".
  - **A identidade é do computador**: um número criado na primeira abertura e guardado em
    `computador.json`, na pasta de dados do app. Reinstalar o programa não troca; apagar a pasta
    de dados troca (e o computador aparece duas vezes — o admin esquece a linha velha).
  - **"Mais antiga" é comparada com a versão do computador de quem está olhando**, não com "a
    mais nova que existe" — o programa não sabe se há uma versão em teste que as lojas ainda não
    receberam, e isso não é atraso. Computador no canal de teste numa versão MAIS NOVA não é
    marcado.
  - **"Em uso" = visto nos últimos 30 dias.** Os outros ficam embaixo, apagados, com a opção de
    esquecer — nunca somem sozinhos (um notebook na gaveta pode voltar). O mesmo número vale no
    botão de atualizar os bancos; um teste confere que os dois batem.
  - **O registro nunca atrapalha o login**: sem rede, sem a migration ou fora do Electron, ele
    simplesmente não acontece. Em `npm run dev` também não, pra máquina de quem programa não
    aparecer na lista da loja. E o "visto em" se atualiza a cada login, ao trocar de loja e a cada
    renovação da sessão (de tempos em tempos), então um computador que fica aberto o dia inteiro
    não parece sumido.
- **Aviso de banco desatualizado** (15/09/2026, item `TR-05.7`): uma faixa no topo de qualquer
  tela quando o programa e o banco daquela empresa não estão na mesma versão. Existe porque as
  duas coisas andam por caminhos diferentes — o auto-update chega em todas as lojas no mesmo
  minuto, e a migration é manual, um projeto Supabase por vez. Quando saem de sincronia, o que
  aparecia era `column ... does not exist` numa tela qualquer: erro que não diz o que houve nem o
  que fazer, e que parece defeito de quem estava usando. Agora a faixa diz o que aconteceu e
  **qual arquivo falta rodar** ("0055"), ou, no caminho inverso, que aquele computador é que está
  atrasado e basta fechar e abrir. Quatro coisas que valem saber:
  - **Aparece pra qualquer operador, não só pro admin.** Quem topa com o erro é quem está no
    balcão; o texto diz o que está havendo e quem resolve.
  - **Nunca bloqueia.** O sistema inteiro continua funcionando, e na maioria das telas não há
    diferença nenhuma — é a regra do item 33 da seção 6, de que validação incerta é aviso e não
    tranca.
  - **Queda de rede não vira aviso.** Não dar pra perguntar e "o banco está atrás" significam
    coisas opostas, e confundi-las deixaria o app acusando a usuária toda vez que a internet
    oscilasse (`lib/schemaVersao.ts` separa as duas pelo código de erro).
  - **A versão do banco também entra no Diagnóstico e no resumo do WhatsApp** — era a ponta solta
    do `TR-08.1`, e é a primeira coisa a olhar quando uma tela "quebrou sozinha depois da
    atualização".
  A regra é função pura testada (`schemas/versaoEsquema.ts`), e a constante que diz o que esta
  build espera não envelhece sozinha: um teste reprova se ela ficar atrás da pasta de migrations.
- **Diagnóstico** (13/09/2026, item `TR-08.1`): ícone no rodapé da Sidebar, **visível pra
  qualquer operador** — e isso é a decisão que importa: quem liga pedindo socorro é quem está no
  balcão com o cliente na frente, não o admin. A tela recolhe sozinha ao abrir e mostra: as três
  **checagens ao vivo** com o tempo de cada uma (alcança a internet — o GitHub, que é de onde vem
  a atualização; o endereço do banco responde; consegue ler uma linha de `lojas`); versão do app,
  Electron/Chromium, sistema, **data/hora e fuso do computador** (é a informação que teria
  encurtado o item 34 da seção 6); endereço do banco daquela empresa, usuário logado e loja ativa;
  e as últimas 200 linhas de `erros.log` e `atualizacoes.log`. **Desde 15/09/2026 mostra também a
  versão do banco daquela empresa** contra a que o programa espera (item `TR-05.7`) — era o pedaço
  que faltava, e é a primeira coisa a olhar quando uma tela quebra logo depois de uma atualização. Dois botões: **"Copiar resumo"**
  (texto curto pro WhatsApp) e **"Salvar arquivo para enviar"** (um `.zip`, montado pelo
  `lib/zip.ts` que já existia).
  **A promessa que é testada, não prometida**: senha, chave e token **não saem** no pacote. O
  relatório é montado campo a campo (nada é despejado), e o que vem de fora — os dois registros em
  disco — passa por `mascararSegredos` (`schemas/diagnostico.ts`), que esconde a chave deste
  computador e mais cinco formatos conhecidos (Anthropic, Supabase, JWT, `Bearer`, `Basic`). O
  resumo do WhatsApp não leva **nenhuma** linha de registro. O que o código **não** promete, e a
  própria tela diz: uma linha de `erros.log` pode citar um dado da tela onde o erro aconteceu.
  **Junto veio a metade do `TR-08.3` que dava pra fazer sem migration**: um `ErrorBoundary`
  (`components/ErrorBoundary.tsx`) em volta das rotas — erro de renderização deixava a janela
  **em branco**, sem saída a não ser fechar o programa; agora vira "Alguma coisa quebrou nesta
  tela" com "Voltar ao Início" e "Abrir diagnóstico", e o erro vai pro `erros.log` com a pilha de
  componentes. E o `erros.log` passou a gravar **rota, usuário, loja e versão** junto com a pilha.
  **Ficou de fora, de propósito**: a trilha das últimas 20 ações do usuário (o resto do `TR-08.3`).
- **Segurança do app em si** (17/09/2026, item `TR-04.6`): nada disso aparece na tela — é o que
  impede que um problema dentro de uma tela vire acesso à máquina de quem usa. Sete frentes, em
  `electron/main.ts`:
  - **As quatro travas da janela declaradas** (`contextIsolation`, `sandbox`, `webSecurity`
    ligados; `nodeIntegration` desligado). Já eram o padrão do Electron 33 — foram conferidas
    ligadas, rodando o app, antes de virarem texto; estão escritas pra que uma troca de padrão
    numa atualização futura não mude a postura do app sem alguém decidir.
  - **Uma política de segurança de conteúdo (CSP)**, declarada por cabeçalho. O efeito prático:
    script embutido na página é **recusado**, e o app só consegue falar com uma lista curta de
    endereços (o Supabase, o ViaCEP e o GitHub). Sem isso, um texto envenenado vindo do banco
    podia mandar dado da loja pra qualquer lugar. Só no app empacotado: em `npm run dev` ela
    atrapalharia a ferramenta de trabalho sem proteger o que vai pra loja.
  - **A ponte da Focus NFe deixou de aceitar qualquer endereço.** Ela carrega o token que
    **emite e cancela nota no CNPJ da loja**; agora só fala com os dois endereços da Focus NFe,
    conferidos por host exato. **Desde o `TR-04.2` (25/09/2026) a tela não usa mais essa ponte**
    — quem fala com a Focus NFe é o porteiro, no Supabase (ver "Token da Focus NFe" logo
    abaixo). Ela continua existindo até a parte 2 do item, e sai junto com a coluna antiga.
  - **Todo pedido da tela pro processo principal é conferido** (é a tela do app mesmo que está
    pedindo?). Vale pra salvar conexão, abrir WhatsApp, ler registro e diagnóstico.
  - **Nada navega pra fora do app nem abre janela nova** — sem barra de endereço, uma janela
    dessas seria indistinguível do sistema.
  - **As "chavinhas" (fuses) gravadas no executável**: quem tem o programa instalado não
    consegue mais rodá-lo como um Node.js comum nem acoplar depurador — que era o atalho pra ler
    tudo que o processo principal enxerga, a conexão do banco inclusive. Gravadas no build
    (`scripts/ligar-fuses.mjs`), e conferidas no binário empacotado.
  - **Um teste que abre o app de verdade** (`npm run test:electron`, 22 checagens) — ver item 65
    da seção 6 pro que só apareceu medindo.
  É o tipo de mudança que só se percebe se algo quebrar: depois de mexer aqui, conferir o de
  sempre funcionando (abrir uma OS, buscar CEP, ver a garantia, emitir nota, abrir o WhatsApp).
- **Token da Focus NFe e o porteiro** (25/09/2026, item `TR-04.2`, **parte 1 de 2**, migration
  `0057` + Edge Function `focus-nfe`, `v0.9.41`; emissão e cancelamento pelo porteiro conferidos na
  loja em 28/09): o token que emite e cancela nota no CNPJ da loja **não chega mais no computador de
  ninguém**. Ele mora num cofre do banco que nenhum operador lê, e quem fala com a Focus NFe é o
  **porteiro** — a Edge Function `focus-nfe`, no Supabase de cada empresa. Pra quem usa, nada
  muda: emitir, reabrir o PDF e cancelar continuam nos mesmos botões, e a nota que sai é
  idêntica (o teste-ouro passou sem mudar um byte). O que muda:
  - **Configurações → Dados fiscais**: o token não aparece mais. A tela diz "✓ Já existe um token
    cadastrado", e o campo serve só pra **trocar** — em branco, mantém o atual. Não dá pra apagar
    o token pela tela (não foi pedido, e sem token a emissão para).
  - **O porteiro confere antes de repassar**: quem pede tem o módulo (emitir/reabrir: Ordens de
    Serviço ou Notas Fiscais; cancelar: só Notas Fiscais — a mesma regra que a tela já seguia);
    o CNPJ da nota é o da loja; a nota a cancelar foi emitida por esta loja; e o PDF/XML é buscado
    no endereço que a própria Focus NFe devolveu, nunca num que o pedido escolheu.
  - **Mensagens novas que podem aparecer**: "falta publicar o porteiro" (a Edge Function não foi
    publicada naquele Supabase), "você não tem permissão..." e "essa nota não é desta loja".
  **A função tem que estar publicada antes de a loja emitir** (seção 9, "Publicar uma Edge
  Function"). E a proteção só fica completa com a **parte 2**, que limpa a cópia antiga do token
  na tabela de configurações (item 71 da seção 6): liberada desde 28/09, **quando ela pedir**.
- **Auditoria**: admin-only, acesso via ícone no rodapé da Sidebar (ao lado da engrenagem de
  Configurações), não é permissão de operador comum nem entra em `MODULOS`. Lista quem **criou**,
  editou ou excluiu o quê e quando, com filtro por tabela, por **ação** e por operador, e um "Ver
  detalhes" que mostra o registro inteiro em JSON (antes/depois numa edição; só "depois" numa
  criação; só "antes" numa exclusão). É gravado por trigger de banco, não pelo código do app —
  funciona mesmo se a alteração vier de outro lugar (SQL Editor manual, por exemplo).
  **Ampliado em 13/09/2026 (item `TR-04.9` do guia, migration `0053`)**: passou a cobrir **criação** e mais cinco tabelas. A que mais importa é
  `ordens_servico_itens` — desde a `v0.9.28` dá pra corrigir o **valor** de um item de OS pela
  tela, e até aqui essa mudança não deixava rastro nenhum; era a ponta solta registrada em
  "Ordens de Serviço" e em 10/09/2026, agora fechada. Entraram junto
  `notas_fiscais_arquivos` (excluir nota é ação séria), `configuracoes_fiscais_loja` e
  `configuracoes_juros_parcelas` (mexer aqui muda documento fiscal e o que o cliente paga) e
  `operador_lojas` (dar a alguém acesso a uma loja). Três coisas que valem saber:
  - **O token da Focus NFe sai mascarado** (`***`). Sem isso, auditar os dados fiscais
    transformaria a própria trilha no lugar novo onde o segredo fica legível — o contrário do que
    ela existe pra fazer. O que não é segredo (CNPJ, alíquota) continua auditável normalmente.
  - **A trilha cresce bem mais rápido agora**, porque toda criação gera linha. Existe
    `expurgar_auditoria(meses)` pra isso, mas ela **não roda sozinha** — apagar histórico é
    decisão dela, não efeito colateral de migration, e só quem tem o SQL Editor consegue chamar.
    Quando for a hora: `select expurgar_auditoria(24);` no SQL Editor devolve quantas linhas
    apagou. O padrão sugerido é 24 meses, e a função recusa menos de 6.
  - **O "quem" passou a ser gravado junto com o fato** (`operador_nome`), e não buscado por join.
    Isso é o que permite excluir um operador pelo painel do Supabase sem a trilha travar — e é
    como registro histórico deve funcionar de qualquer forma: ele conta o que era verdade naquele
    dia, não o que o cadastro diz hoje. Ver a migration `0053` na seção 5 pro detalhe da FK.
- **Multi-loja** — já aplicada e testada de verdade no Supabase real da usuária (criou uma 2ª loja
  de teste pra validar o fluxo, o que revelou o bug corrigido na migration 0034; a loja de teste
  foi excluída depois). 1 projeto Supabase serve 2+ lojas com um painel único (não
  instalações separadas). Catálogo compartilhado (clientes, peças, serviços, categorias);
  estoque/caixa/OS/contas a pagar/contas a receber/notas fiscais/funcionários/configurações
  separados por loja. Um operador pode ter acesso a 1 ou mais lojas (`operador_lojas`);
  `LojaSwitcher.tsx` na Sidebar deixa trocar de loja ativa, só aparece pra quem tem 2+. Detalhe
  completo do desenho na seção 5, subseção "Multi-loja". **Hoje só existe uma loja de verdade: "Pneus
  Amigão" (Araraquara).**
- **Empacotamento e versões**: `electron-builder` (NSIS) + `electron-updater`, publicado no
  GitHub Releases pelo workflow Release (como publicar e liberar: seção 9). A versão aparece
  pequena no canto inferior direito de toda tela (`VersaoApp.tsx`). **Antes de dizer qual é a
  última versão, conferir as releases reais** (`mcp__github__list_releases`): a `v0.9.21` saiu numa
  sessão que não atualizou esta lista, e a seguinte informou a versão errada pra ela.
  - **Auto-update**: o `electron-updater` baixa o `latest.yml` **sem login**, por isso o repositório
    é público (item 21 da seção 6). Se parar de atualizar, o primeiro lugar pra olhar é
    `%APPDATA%\Sakura System - AutoCenter Edition\atualizacoes.log`.
  - **Instalador de nome fixo desde a `v0.9.22`** (`SakuraSystem-Setup.exe`): o endereço
    `/releases/latest/download/SakuraSystem-Setup.exe` sempre entrega a última versão **liberada**.
    As releases anteriores têm o número no nome.
  - **Desde a `v0.9.40`, publicar não chega em todas as lojas**: nasce no canal de teste e só chega
    no resto pelo "Liberar". Uma loja nova que baixa o instalador também recebe a liberada.
  - **Incidentes que moldaram o processo** (o detalhe está no histórico do Git deste arquivo):
    publicar pela tela `releases/new` reaproveitou duas vezes um rascunho antigo com o mesmo nome
    de tag (`v0.9.10` e `v0.9.12`; a `v0.9.12` ficou queimada, e o `get_release_by_tag` não
    enxerga rascunho); o gatilho por tag travou na fila do GitHub
    (`v0.9.13`), o que trouxe o "Run workflow"; e a `v0.9.38` saiu sem o `latest.yml` (item 66 da
    seção 6). **Número de versão que já circulou nunca se reusa.**

  | Versão | Data | O que trouxe (migration, quando teve) |
  |---|---|---|
  | `v0.9.2`–`v0.9.7` | até 19/08 | Primeira versão de verdade na loja e as correções do lançamento: número da OS por loja, pagamento dividido, excluir loja vazia, versão aparecendo no app, log do atualizador, "Importar por foto" com erro real, sem a barra de menu do Electron |
  | `v0.9.8`–`v0.9.10` | 19–25/08 | Veículo sem placa, marca com sugestão, Backspace na data, "Recorrente até", código do município, a primeira emissão de NFC-e/NFS-e pela Focus (`0044`, `0045`) e a edição de produto |
  | `v0.9.11`, `v0.9.13`–`v0.9.15` | 26/08 | Alíquota de teste do IBS/CBS, trava de item depois de faturar, pagamento da NFC-e com peça e serviço |
  | `v0.9.16`–`v0.9.18` | 26/08 | **Conexão escolhida em cada computador** (um instalador pra qualquer empresa), rascunho automático, cadastro manual em Contas a Receber |
  | `v0.9.19`–`v0.9.20` | 27/08 | Cancelar nota (`0046`), CNAE na NFS-e (`0047`), OS faturada à noite sumindo (fuso), recibo da NFS-e do Giap |
  | `v0.9.21`–`v0.9.25` | 27–31/08 | Cartão parcelado no pagamento dividido, OS "Finalizada", erros em `erros.log`, os três cálculos de lucro, campo numérico sem setas, calendário com os dias vizinhos |
  | `v0.9.26` | 02/09 | XMLs do mês em `.zip`, aba Comissões, 12 correções de cálculo e fiscais |
  | `v0.9.27` | 03/09 | NFC-e pra cliente empresa, período Anual, Comissões em Funcionários, calendário visível |
  | `v0.9.28` | 09/09 | Corrigir um item já lançado na OS |
  | `v0.9.29`–`v0.9.30` | 11/09 | Aviso de CST/CSOSN pelo nome, XML do fornecedor sem copiar o ICMS, Ver DANFE, aviso da alíquota (`0048`, `0049`) |
  | `v0.9.31`–`v0.9.33` | 11–12/09 | Foco visível, modal com foco preso, ações de linha, escala tipográfica, cartões do Início, categoria obrigatória no caixa (`0050`), estoque mínimo e leitor, campos fiscais explicados, WhatsApp, cliente e veículo sem sair da OS (`0051`, `0052`) |
  | `v0.9.34` | 12/09 | Borda dos campos, rateio sem negativo, teste-ouro da nota, teste de tela nos formulários de dinheiro |
  | `v0.9.35` | 12/09 (noite) | Auditoria ampliada (`0053`) e função de permissão por módulo (`0054`) |
  | `v0.9.36`–`v0.9.37` | 13 e 15/09 | Diagnóstico, `ErrorBoundary`, aviso de banco desatualizado (`0055`) |
  | `v0.9.38` | 17/09 | Electron endurecido (CSP, pontes conferidas, fuses) |
  | `v0.9.39` | 25/09 | Dado de RH só com o módulo (`0056`) |
  | `v0.9.40` | 25/09 | Canal de teste e o "Liberar" |
  | `v0.9.41` | 25/09 | O porteiro da Focus NFe (`0057`) |
  | `v0.9.42` | 25/09 | Fechamento de caixa, comissão paga, travas de dado (`0058`–`0060`), "Importar por foto" desligado |
  | `v0.9.43` | 25/09 (noite) | Contas e Caixa só com o módulo, do lado do programa (**saiu antes** da `0061`/`0062`) |
  | `v0.9.44` | 26/09 | A versão de cada computador (`0063`) |
  | `v0.9.45` | 26/09 (liberada 27/09) | Venda de balcão (`0064`) |
  | `v0.9.46` | 27/09 | Ficha do veículo |
  | `v0.9.47` | 29/09 | Só o endereço novo do atualizador (`sakura-corp/sakura-system-ace`) |
  | `v0.9.48` | 01/10 (só no teste) | NFS-e: "Conferir de novo" quando a prefeitura demora, e registrar nota pela referência (`docs/licoes.md`, item 80) |
