# Relatório: tarefa #365, chefe backend

- **Tarefa**: #365, Clientes e veículos só pra quem tem o módulo (TR-04.1, lote 4)
- **Chefe**: backend
- **Data**: 2026-10-23
- **PR**: aberto a partir da branch `claude/peaceful-brahmagupta-dndu5s` (o link está na descrição do PR)
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe (eu)**: mapeei as leituras de `clientes`/`veiculos` (sem ajudante explorador: eu já
  estava com os arquivos abertos), escrevi as migrations `0068` e `0069`, o
  `testar-clientes-permissao.sql`, a matriz de RLS, a camada `src/lib`, os docs, e consertei os
  achados das duas revisões. Testei a janela num PostgREST 12 de verdade, baixado na sessão.
- **Ajudante das telas** (médio): Início, OS, Orçamentos, Contas a Receber, nota, garantia e ficha
  do veículo passaram a ler pela janela e pelas funções, com dois arquivos de teste novos.
- **Ajudante de segurança** (forte): 10 achados, nenhum bloqueante. Consertei o furo do teste de
  alteração (lição 74), o operador desligado e as validações do cadastro rápido. Ficaram como
  decisão da Sofia: a leitura OS por OS e o desempenho do `security_barrier`. Dois que vêm de
  antes viraram sugestão de tarefa: o bucket de XML de notas e o ponto cego da sonda de update.
- **Revisor final** (forte): achou o bloqueante que eu não tinha visto. Com uma migration só, a
  versão nova do programa quebrava num banco ainda sem a janela, e a versão velha quebrava num
  banco com a porta fechada. Virou `0068` (abre) + `0069` (fecha). Achou também o WhatsApp e o
  aviso de CPF da venda de balcão mentindo pra quem não tem Clientes; os dois foram consertados.

## Modelos usados
- Ler a issue e planejar, migration, funções, teste SQL: sessão mãe, forte, esforço médio. A issue
  pedia um ajudante forte pra migration; fiz na mãe porque o desenho e o mapa estavam aqui.
- Mapear as leituras: na mãe (a issue pedia o ajudante rápido).
- As telas: `ajudante-medio`, esforço padrão.
- Revisão das policies e da janela: `ajudante-forte`, esforço alto.
- Revisão final do diff: `ajudante-forte`, esforço alto.
- Nenhuma troca por falha de modelo.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (a sessão não tem acesso ao próprio contador).
- **Ajudantes**: 3, medidos pelo aviso de término: telas (médio) ~105 mil tokens; segurança (forte,
  alto) ~147 mil; revisão final (forte, alto) ~186 mil.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não sei se foi ligado (a coordenadora confere). Mostrei o texto na primeira mensagem.

## O que testei e VI reprovar
- **`testar-clientes-permissao.sql`**: 16 mutações, todas vermelhas (o banco sem mutação passa).
  Cada uma foi aplicada num banco descartável por cima da instalação completa:
  - leitura de clientes aberta;
  - leitura de veículos aberta;
  - alteração de clientes aberta;
  - alteração de veículos aberta;
  - view sem o `where`;
  - view sem o `revoke`;
  - telefone na janela;
  - janela só pra quem tem Clientes (trancar demais);
  - leitura só pra admin (trancar demais);
  - leitura sem o Consumidor;
  - nota sem a checagem de loja;
  - cadastro rápido sem a checagem de módulo;
  - anônimo podendo executar a função;
  - `ativo` ignorado;
  - nome em branco aceito;
  - carro no Consumidor aceito.
- **Telas**:
  - o Início não pede o cadastro sem Clientes;
  - a OS pede a lista pela janela sem Clientes;
  - a ficha pede pela janela e não diz "sem telefone";
  - o botão do WhatsApp do orçamento some sem Clientes;
  - a venda de balcão não diz "sem CPF" sem Clientes.

  Cada um foi quebrado de propósito: tirando o conserto, o teste novo reprovou.
- **PostgREST 12.2.3 local**:
  - o `join` antigo `cliente:clientes(nome)` devolve `null` pra quem só tem OS depois de fechar;
  - pela janela, o nome chega;
  - num banco só com a `0068`, o programa atual e o novo funcionam os dois.

## O que passou sem eu ter visto reprovar
- A matriz de RLS (800 células): as linhas novas eu vi reprovar enquanto não estavam declaradas,
  mas não fiz mutação na matriz.
- Contas a Receber e OS: esconder o WhatsApp sem Clientes não tem teste próprio (só o orçamento tem).
- As telas renderizadas (`contraste:telas`, `largura:telas`) foram rodadas pelo ajudante das telas,
  antes dos últimos consertos.

## O que ficou de fora
- **Garantia impressa**: hoje ela imprime CPF, telefone, endereço e ano. A issue manda perguntar
  antes de tirar do papel, então **não tirei**: ela lê pela função da OS e sai igual. A pergunta
  está no PR.
- **Busca por telefone e placa** na escolha do cliente: a caixa de escolha de hoje busca pelo nome,
  e continua assim. Mudar a caixa é tela de formulário, fora da lista de arquivos.
- **WhatsApp sem Clientes**: o botão some, porque pela decisão da Sofia o telefone não chega. Se ela
  quiser o botão de volta pra quem tem OS, dá pra buscar o telefone na hora pela função da OS.
- **KM do cadastro** sem Clientes: o aviso de KM da OS perde essa reserva. Só pesa no primeiro
  atendimento de um carro.
- **Arquivos fora da lista da issue**:
  - `src/lib/caixa.ts`, `contasReceber.ts`, `garantias.ts`, `notasFiscais.ts`, `ordensServico.ts`:
    o `join` embutido, sem o qual o nome sumiria;
  - `VendaBalcaoForm.tsx`: o aviso de CPF;
  - testes;
  - `supabase/testes-rls/sondas.sql`;
  - a migration `0069`.

  A Sofia revisa no PR.

## O que depende de alguém
- **Sofia**:
  - decidir as perguntas do PR: a garantia, a leitura OS por OS e o `security_barrier`;
  - aplicar **na ordem**: a `0068` pelo botão "Atualizar o banco" (ensaiar, depois aplicar), depois
    publicar e liberar a versão com este código, depois a `0069`, que declara
    `-- versao-minima-do-programa: 0.9.54` e espera os computadores;
  - se esta versão sair com outro número, ajustar essa linha.
- **Tiago ou quem testa**: o "depois de publicar" da issue.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: as regras de migration e de RLS (dropar o nome final, as duas
  metades do teste, quebrar de propósito) foram seguidas sem eu precisar procurar.
- **Onde eu errei ou tive que adivinhar**:
  - juntei abrir a janela e fechar a porta numa migration só. Isso quebraria as lojas numa das duas
    ordens de subir, e quem pegou foi a revisão final;
  - adivinhei o número da versão mínima (0.9.54).
- **O que faltou na skill**:
  - a regra "o programa novo lê por um objeto novo pra todo mundo → a migration que cria e a que
    fecha são separadas";
  - avisar que dá pra baixar o PostgREST na sessão da nuvem pra testar `join` embutido em view (o
    item 69 dizia que não dava).
- **Sugestão de ajuste (opcional)**: acrescentar essas duas linhas às "Regras duras" da skill
  `chefe-backend`.
