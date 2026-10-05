# Changelog

> **Parou na 0.9.2 (30/07/2026).** As versões seguintes estão nas releases do GitHub, e o que
> cada uma trouxe, em `docs/modulos.md` ("Empacotamento e versões").

Todas as mudanças notáveis do Sakura System — AutoCenter Edition são registradas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.9.2] - 2026-07-30

### Corrigido
- Configurações → Lojas: encontrado (testando a exclusão) e corrigido outro bug real de RLS — nunca existiu uma policy de permissão pra excluir loja, então o botão "excluir" simplesmente não fazia nada, sem erro nenhum (Postgres deixava 0 linhas visíveis pro delete, em vez de recusar com uma mensagem).
- Contas a Receber: clicar numa linha agora leva direto pra aquela ordem de serviço em Ordens de Serviço, igual já acontecia no Início.

### Adicionado
- Ordens de Serviço agora têm um número sequencial por loja (OS 1, OS 2, OS 3...) em vez de mostrar um pedaço do código interno (ex: "OS #a0270a6e") — usado em toda tela que referencia uma OS (cabeçalho da OS, lista de Ordens de Serviço, Início, Caixa Diário, garantia).
- Configurações → Lojas: agora dá pra excluir uma loja de verdade (não só inativar) — funciona apenas quando ela está "vazia" (sem estoque, caixa, OS, funcionários...); com dado de negócio vinculado, o app explica e sugere inativar em vez de excluir, pra nunca apagar histórico sem querer.
- Faturar uma OS agora aceita dividir o pagamento em mais de uma forma (ex: metade Pix, metade cartão) — cada forma gera sua própria Entrada no Caixa, e a soma das partes precisa bater com o total antes de confirmar.
- Botão "Encerrar OS": marca a OS como concluída e já abre a tela de faturamento na hora, sem precisar mudar status manualmente antes de faturar.

### Alterado
- Simplifica o status da Ordem de Serviço: removida a diferenciação entre "Aberta" e "Em andamento" — toda OS nova já nasce "Em andamento" diretamente. Status possíveis agora: Em andamento, Concluída, Faturada.
- Removido o bloco de "Status" (seletor manual) e "Criado por/Alterado por" do formulário de Ordem de Serviço — "Criado por" passou pra uma linha discreta no cabeçalho, e trocar status manualmente foi substituído pelo botão "Encerrar OS".

## [0.9.1] - 2026-07-30

### Corrigido
- Configurações → Lojas: corrigido um bug real de permissão (RLS) no Supabase que impedia criar uma loja nova pelo app — o segundo passo (vincular o operador que criou a loja a ela) sempre falhava. Lojas que ficaram "órfãs" (criadas, mas sem ninguém vinculado) por causa desse bug já são reconectadas automaticamente na migration de correção.
- Início: clicar numa linha de "OS abertas" agora leva direto para aquela ordem de serviço em Ordens de Serviço, em vez de só mostrar os dados sem atalho nenhum.

### Adicionado
- Configurações → Lojas: agora dá para editar nome/cidade/UF de uma loja já cadastrada (antes só dava para criar e inativar, o que deixava a "Loja 1" padrão sem jeito de virar o nome real da loja).
- Ordens de Serviço: filtro de período (De/Até) e busca por cliente/placa na lista — OS em aberto sempre aparecem independente da data (só o histórico já faturado é filtrado por período), evitando que a lista cresça sem controle. Buscar por cliente/placa ignora o período e olha todo o histórico.
- Ordens de Serviço: lista ganha colunas de Peças, Serviços e Lucro por ordem (além do Total que já existia), e o status ganha cores diferentes por etapa (Aberta/Em andamento/Concluída/Faturada) — "Concluída" usa laranja de propósito, pra chamar atenção de que falta faturar. O botão "Faturar" também ficou mais visível (virou um botão sólido, não só um link). As mesmas cores de status aparecem também no card "OS abertas" do Início.
- Serviços: novo campo de custo (ex: mão de obra) no cadastro, igual peça já tinha custo/preço — a aba Lucratividade (Relações) agora calcula a margem de serviço de verdade, em vez de considerar o custo do serviço sempre zero. A lista de Serviços ganha uma coluna "Custo" e um botão "Editar" (antes só dava para criar/inativar/excluir, sem jeito de editar um serviço já cadastrado — inclusive os ~17 que já vêm semeados).
- Novo módulo "Contas a Receber": ao faturar uma OS, dá para escolher entre "Recebido agora" (lança a Entrada no Caixa na hora, como sempre foi) ou "A receber depois" (informa uma previsão de data e cria uma pendência, sem lançar nada no Caixa ainda). Marcar como recebido em Contas a Receber gera a Entrada automaticamente no Caixa naquele momento — mesmo padrão já usado em Contas a Pagar.

### Alterado
- Cadastro de Cliente: título da seção de veículos passa de "Veículos (opcional)" para só "Veículos"; o botão "+ Adicionar veículo" foi movido para baixo da lista de veículos (antes ficava em cima, antes de qualquer veículo existir).
- Cadastro de Funcionário (aba Família): o campo "Sexo" estava dentro da seção "Filiação", ao lado de "Pai"/"Mãe" — dava a entender que era sobre outra pessoa, quando é sobre o próprio funcionário. Movido para a aba "Dados gerais", junto de Nome/Data de nascimento.

## [0.9.0] - 2026-07-30

### Adicionado
- Configurações → "Dados fiscais da loja": CNPJ, razão social, IE/IM, regime tributário, endereço e token de integração com o Focus NFe (ambiente de homologação/produção) — preparação para a emissão automática de NFC-e, ainda não habilitada.
- Notas Fiscais: botão "Versão para o cliente" gera um recibo em HTML (imprimir ou baixar) a partir do XML já enviado, além do "Baixar XML" que já existia.
- Garantia da OS (aba Fechamento) redesenhada: cabeçalho com dados da loja, dados do cliente e do veículo, tabela de peças/serviços com técnico, totalização (produtos/serviços/subtotal/descontos), forma de pagamento (com parcelas, se houver) e linhas de assinatura — além do texto de garantia configurável, que continua editável em Configurações.
- Módulo "Contas a Pagar": contas mensais (aluguel, etc.) com valor e vencimento, diferente das Entradas/Saídas manuais do Caixa. Marcar como paga lança automaticamente uma Saída no Caixa; contas marcadas como recorrentes já criam a próxima ocorrência (mês seguinte) sozinhas.
- Estoque → "Importar por foto/PDF": lê uma ou mais fotos **ou PDFs** de nota fiscal (pode ser mais de uma nota junto) via IA, mostra uma tabela editável com os produtos identificados e cadastra em lote.
- Relações (antigo "Relatórios", só o nome mudou): gráfico de barras (Vendas x Custos x Lucro, por dia/semana/mês) e gráfico radar comparando o período atual com o anterior, sem biblioteca externa de gráficos.
- Início: cartões de tendência personalizáveis (Configurações → "Cartões do Início" escolhe até 3 entre 5 indicadores), sem mais gráfico — só valor grande e seta, com um leve brilho interno por métrica. Nova seção "Veículos no pátio", com ícone por tipo de carroceria pintado na cor cadastrada do veículo.
- Barra de rolagem 100% customizada (some a nativa do Windows, que não respeitava o arredondado dos blocos de vidro) na área principal e no menu lateral.
- Menu lateral reorganizado por fluxo de trabalho (atendimento/operação, financeiro, pós-venda/fiscal, RH por último); o bloco do operador (nome/engrenagem/Sair) virou um card de vidro separado do menu, em vez de emendado nele.
- Módulos "Relações" e "Lucratividade" unificados num só, com abas "Gráficos" e "Lucratividade".
- Enter agora avança pro próximo campo em qualquer formulário do app, em vez de tentar enviar — pensado pra quem trabalha só de teclado, sem mouse.
- Módulo Serviços ganha "Categoria de serviço" (Configurações → "Categorias de serviço"), pra agrupar por área do veículo (Pneus, Suspensão, Amortecedores, Freios, Alinhamento), mesmo padrão já usado em Categorias de produto e Categorias de caixa.
- Categorias de produto, categorias de serviço e um catálogo inicial de ~17 serviços já vêm semeados (baseados numa ficha de orçamento de referência do ramo), como ponto de partida pra loja nova — sem preços, e sem nenhuma peça/produto inventada (cadastro de peça exige dado fiscal real, isso continua manual).

### Corrigido
- Barra de rolagem nativa do Windows/Chromium aparecia duplicada por cima da barra customizada em alguns blocos, porque um CSS de reset ficava fora da camada certa do Tailwind.
- Ícone de câmera (emoji) do botão "Importar por foto" trocado por um ícone SVG minimalista, consistente com o resto do app.

## [0.1.3] - 2026-07-29

### Adicionado
- Módulo "Funcionários": cadastro leve (nome + cargo, sem login) selecionável como técnico (peça/serviço da OS) ou vendedor/atendente (OS toda), ampliado depois com dados de RH completos (documentos, CNH, endereço, contato, cargo/admissão, filiação, cônjuge e filhos). Todo operador (quem loga no sistema) ganha automaticamente um registro espelhado aqui.
- Caixa Diário: abas "Entradas" e "Saídas" para lançamentos manuais não convencionais (ex: aluguel, mercado, sucata), com categorias próprias configuráveis em Configurações.
- Cadastro de Cliente: tipo de pessoa física/jurídica, trocando os rótulos "Nome completo"/"CPF" para "Razão social"/"CNPJ".
- Módulo "Notas Fiscais": upload manual de arquivos XML de NFe/NFS-e, organizados por mês de competência, com vínculo opcional a uma Ordem de Serviço — prepara o caminho para quando a emissão fiscal automática for construída.
- Botão "voltar" das telas de lista com ícone de casinha (leva direto para o Início), diferenciado da seta usada nos formulários.
- Ícone da flor (favicon e ícone do instalador) redesenhado.
- Pré-visualização antes de emitir NFe/NFS-e ou baixar/imprimir a garantia, na aba Fechamento da Ordem de Serviço.
- Texto de garantia configurável em Configurações, usado pelos botões "Imprimir garantia"/"Baixar garantia".
- Categorias de produto: cadastro em Configurações, selecionável no cadastro de produto.
- Estoque → aba "Relatórios": estoque físico-financeiro, saldo por situação (positivo/negativo/zerado) e produtos sem movimentação.
- Estoque → aba "Contagem": inventário físico com ajuste automático de estoque quando há diferença.
- Módulo "Garantias": lista peças vendidas com prazo de garantia definido, calculando o vencimento a partir do fechamento da OS.
- Cadastro de Produto: campos de código de barras, marca, modelo, aplicação, C.E.S.T. e origem da mercadoria; margem % calcula o preço final automaticamente (e vice-versa); quantidade de estoque inicial no cadastro já gera o lançamento de entrada.
- Início (antigo "Painel de Controle"): cartões de tendência do mês (Vendas, Custos, Lucros) com mini-gráfico, seção "OS abertas" e um calendário do mês com feriados nacionais e aniversário de cliente.
- Campo de data de nascimento no cadastro de cliente, usado para marcar aniversário no calendário do Início.
- Tela de Login redesenhada com efeito de vidro fosco sobre um fundo floral.
- Logo desenhada à mão (wordmark "Sakura System" / "by Sakura Corp" em itálico serifado) aplicada ao menu lateral; a flor ficou só no ícone/favicon do app.
- Wordmark do menu lateral simplificado: removida a flor do logo do topo (ela continua só no ícone/favicon), texto "Sakura System" / "by Sakura Corp" aumentado para ocupar o espaço liberado.
- Caixa Diário agora mostra o cliente e o lucro de cada lançamento vindo de OS, além de um resumo por forma de recebimento (dinheiro, cartão, PIX etc.) — uma única linha por lançamento, sem repetir informação.
- Estrutura inicial do projeto: Electron + Vite + React + TypeScript + Tailwind CSS.
- Identidade visual Sakura System (paleta rosa/roxo) aplicada ao layout base e menu lateral.
- Cadastro de Clientes: criar, listar, excluir clientes e associar um veículo.
- Migration inicial do banco de dados (Supabase): tabelas `clientes` e `veiculos`.
- Cadastro de Peças/Produtos: criar, listar, excluir peças, com campos fiscais (NCM, CFOP, CST/CSOSN, alíquota de ICMS).
- Estoque: registro de entradas/saídas por peça, saldo atual calculado automaticamente e histórico de movimentações.
- Ordens de Serviço: cliente + veículo + peças usadas + serviços realizados, com baixa automática de estoque para peças e faturamento que gera lançamento no caixa.
- Caixa Diário: lançamentos manuais e automáticos (das OS faturadas), com totais de entradas/saídas/saldo por dia.
- Relatórios: comparativo de vendas diárias, semanais e mensais.
- Lucratividade: margem por peça/serviço e lucro do período (receita, custo e margem), com filtro de data.
- Painel de Controle: indicadores tipo velocímetro de faturamento (mês atual vs. anterior) e margem bruta do mês, além da fila de atendimento (ordens de serviço em aberto).

### Corrigido
- Migration de RLS (`0015_rls_exige_login.sql`) dava erro "política já existe" ao ser rodada mais de uma vez; agora é realmente segura de repetir.
- Mensagens de erro genéricas no cadastro de clientes agora mostram a causa real.
- `npm run lint` estava quebrado (faltava o arquivo de configuração do ESLint e os plugins de React); adicionado `eslint.config.js` com as regras básicas de hooks do React.
- Tela em branco ao rodar `npm run dev` com o `.env` copiado do exemplo: as variáveis do Supabase ficavam como texto vazio (não "ausentes"), e o app tentava conectar com um endereço vazio e travava antes de desenhar a tela.
- Migrations do Supabase (`supabase/migrations/*.sql`) agora podem ser rodadas de novo com segurança: as `create policy` passaram a ter um `drop policy if exists` antes, então rodar tudo de novo não dá mais erro de "política já existe".
- Texto digitado em campos de formulário ficava invisível (branco sobre fundo claro) quando o Windows estava em modo escuro.
- Logo e imagens quebradas no instalador de verdade (funcionava normal no `npm run dev`) por causa de caminho de arquivo absoluto, que não funciona quando o Electron carrega a tela via `file://`.

### Segurança
- Login obrigatório (Supabase Auth) em todas as tabelas de negócio via RLS — sem sessão autenticada, não é mais possível ler ou escrever dados pela API, nem com a chave pública.
