# Visual novo, tarefa 15 (#990): Configurações, Auditoria e Diagnóstico

> Escrito em 16/11/2026. Nada publicado, nada de banco, nenhuma conta mudou. As fotos de antes e depois
> (escuro e claro, JPG) estão em `docs/referencia/visual-novo/andamento/16-configuracoes/` (`antes/` e `depois/`).
> Dados fiscais, Pix, juros e parcelas: **só aparência**. Nenhum valor, padrão ou texto gravado mudou.

## O que foi levado pro visual novo

| Tela | Peças usadas |
|---|---|
| Configurações (a página e os grupos) | `Botao`, `Selo`, `Modal` (com `rodape`), `avisar()`, `sakura-campo`, `sakura-rotulo` |
| Operadores e o formulário de operador | `Selo` (Ativo / Inativo / Administrador), `Botao`, `sakura-campo`, `AcoesDaLinha` (como estava) |
| Lojas e Depósitos | `Selo` (Ativa / Inativa), `Dica`, `Botao`, `sakura-campo` |
| Categorias (produto, serviço, caixa) | `Botao`, `Dica`, `sakura-campo` |
| Juros de parcelamento, Pix, Dados fiscais | `sakura-campo`, `sakura-rotulo`, `Botao`, `Selo` (só nos Dados fiscais) |
| Texto de garantia, WhatsApp, Cartões do Início | `sakura-campo`, `Botao` |
| Aparência, Atualizações, Computadores desta empresa | `Selo`, `Dica`, `sakura-tabela`, `Botao` |
| Auditoria e a janela de detalhe | `sakura-tabela`, `Selo`, `Botao`, `Modal` |
| Diagnóstico | `Botao`, `Selo` |

Peças locais novas (só desta tarefa, em `src/pages/configuracoes/pecas.tsx`, porque a tarefa não mexe em
`src/components/`): `SecaoDeConfiguracao` (o cartão que abre e fecha, no lugar da `SecaoRecolhivel`),
`TituloDeGrupo`, `MensagemDeErro` (a faixa de erro com ícone, regra 4), `AvisoDeSalvo`, `AvisoDeAtencao` e
`BotaoDeLista` (botão de ícone com `Dica`). A Auditoria e o Diagnóstico importam `MensagemDeErro` de lá.

## Onde cada coisa foi parar (nada sumiu)

- **Configurações ganhou cinco grupos** com título: *Pessoas e lojas* (Operadores, Lojas), *Dinheiro e nota fiscal*
  (**Juros, Pix e Dados fiscais**, que antes estavam espalhados entre as outras seções), *Cadastros de apoio*
  (Depósitos e as três categorias), *Textos e telas* (Texto de garantia, Mensagens de WhatsApp, Cartões do Início) e
  *Este computador e os outros* (Aparência, Atualizações, Computadores desta empresa). As 15 seções continuam, com os
  mesmos nomes e textos; só a ordem mudou.
- **Lojas e Depósitos**: os "comprimidos" com ✎ × ↺ 🗑 viraram uma lista de linhas. O que cada glifo fazia agora é um botão
  com ícone e a `Dica` (Editar, Inativar/Reativar, Excluir). A situação (Ativa/Inativa) deixou de ser só "cinza" e virou selo
  com palavra. O formulário de adicionar loja ganhou rótulos visíveis (Nome da loja, Cidade, UF); os exemplos foram pro
  placeholder ("Ex: Loja Centro"). Os rótulos "+ Nova loja", "+ Novo depósito", "+ Novo operador" e "+ Adicionar" não mudaram
  (as cenas do catálogo clicam neles pelo nome).
- **Categorias**: o "×" de cada categoria agora é o `BotaoDeLista` ("Excluir a categoria Pneus"); os campos sem nome
  (nome da categoria, tipo, texto de garantia) ganharam `aria-label`.
- **Operadores**: o "Ativo/Inativo" e o "Administrador (acesso total)" são selos; os módulos liberados continuam como etiquetas.
- **Atualizações deste computador**: os dois canais viraram dois cartões lado a lado, o escolhido com a borda laranja (o mesmo
  jeito da Aparência). O "Salvar" e o texto de "Sem internet…" continuam.
- **Janela "Senha temporária gerada"**: "Copiar" e "Já anotei" subiram pro rodapé da janela (o principal por último).
- **Auditoria**: a janela de detalhe tem um botão "Fechar" no rodapé (o "x" do canto continua); em "Editou", o "Antes" e o
  "Depois" ficam lado a lado.
- **Diagnóstico**: os três botões continuam (o laranja é "Copiar resumo"); o "✓ OK / ✕ Falhou" virou selo.

## Os três montes (seção 12 das regras)

**Já fez** (aparência e clareza, sem mudar costume):
- Configurações agrupada (acima): quem procura "Pix" ou "nota fiscal" acha os três assuntos de dinheiro juntos.
- Cada seção tem ícone e a setinha avisa se está aberta (`aria-expanded`, o leitor de tela também diz).
- Todo erro tem ícone e palavra; todo "salvo" tem visto; "Ativa/Inativa" e "OK/Falhou" têm palavra junto da cor (regra 4).
- **Dados fiscais**: dois selos à vista no topo da integração: *Token cadastrado* / *Sem token* e *Produção: a nota vale de
  verdade* / *Teste: não gera nota de verdade*. É o que o texto da seção já dizia, agora sem precisar ler o parágrafo.
  Os dois selos mostram o que está **gravado** (mudar o campo "Ambiente" sem salvar não muda o selo; a revisão pegou isso).
- **Diagnóstico**: no alto das checagens, "Tudo certo" ou "N checagens falharam", pra quem liga pedindo socorro ver o
  resultado antes de ler a lista.
- **Auditoria**: "Editou" passou de amarelo pra azul (amarelo é atenção, e editar é o dia a dia); criar é verde, excluir é vermelho.
- **Senha copiada**: "Copiar" na janela da senha temporária agora diz "Senha copiada" (antes não respondia nada). Se o
  computador não deixar copiar, a janela diz "Não consegui copiar… ela só aparece uma vez" e a senha continua na tela.
- Os campos sem nome ganharam nome pra leitor de tela; `aria-invalid` nos campos que a validação recusa.

**Sugere** (ela decide; recomendação do Claude):
1. **Trocar os `confirm()` do navegador** (Redefinir senha, Excluir loja, Excluir categoria, Tirar o Pix, Esquecer computador,
   mudar para o canal de teste) por uma janela do programa. Muda comportamento, então é tarefa à parte. Recomendo: sim.
2. **Abrir uma seção fecha as outras** (como um sanfonado). Hoje, com duas abertas, aparecem dois botões laranja ("Salvar"),
   contra a regra de um por tela. Mexe no costume (quem abre várias seções pra comparar), então não mudei. Recomendo: sim, e
   a seção aberta rola até o topo da tela.
3. **Um "Salvar" só pras Mensagens de WhatsApp**: hoje são cinco ("Salvar link" e um por modelo), todos secundários pra não
   ter cinco laranjas. Recomendo: um botão só, que salva os que mudaram. Mexe no que é gravado de uma vez: com ela.
4. **Subir as peças locais pra `src/components/`** e apagar a `SecaoRecolhivel` (agora sem uso; não mexi nela porque a tarefa
   não toca em `src/components/`): `MensagemDeErro`, `AvisoDeSalvo`, `BotaoDeLista` e `SecaoDeConfiguracao`. A tarefa 8
   (Clientes) criou a `AvisoDeErro` no `src/pages/clientes/`: é a mesma coisa, vale juntar na tarefa de limpeza.
5. **Pôr o Diagnóstico, o Pix, o WhatsApp e os Cartões do Início nas cenas do catálogo** (`site/ferramentas/cenas.mjs`, fora
   desta tarefa): hoje o `contraste:telas` e o `largura:telas` **não passam por elas**. As fotos desta tarefa saíram de um
   script avulso. Recomendo: sim, é um arquivo e cinco linhas.
6. A opção "Automático" do tema (seguir o Windows), já sugerida na tarefa do tema claro.
7. **Operadores em tabela** (nome, usuário, situação, módulos, ações), em vez de cartões. Fica mais compacto quando a empresa
   tem muita gente. Com 3 a 5 operadores o cartão lê melhor; deixei como estava.

**Virou tarefa** (defeito achado de passagem):
- Dois testes de `OrdensServicoPage.notaDoCliente.test.tsx` ("finalizada com uma nota…" e "…com duas notas…") **falham na
  `main` limpa** (commit `59d2263`, #1060): "Unable to find role="dialog" and name "Nota fiscal"". Não é desta tarefa
  (mexe na tela de Ordens e Notas); rodei na `main` sem os meus arquivos pra ter certeza.

## O que foi conferido

- **Revisão** (`/code-review` médio, 9 achados, todos conferidos no código): 6 corrigidos (selo de ambiente lia o formulário
  e não o gravado; falha ao copiar a senha só ia pro console; `<h3>` e `<p>` dentro de `<button>`: agora o botão fica dentro do
  `<h3>`; "Tudo certo" aparecia com lista de checagens vazia e durante o "Verificar de novo"; o quadradinho do ícone
  estava copiado três vezes; linhas em branco); 1 virou comentário (Auditoria e Diagnóstico importam `MensagemDeErro` da pasta
  de Configurações: é da mesma tarefa; subir pra `src/components/` é a sugestão 4); 2 ficam como estão: a `Dica` das
  Computadores continua sem tecla (era `title`, que também não abria no teclado; o selo "mais antiga" e a linha de resumo dizem a
  mesma coisa) e os campos fiscais continuam em 3 colunas (já eram; o `largura:telas` mede).
- `npm run typecheck`, `npm run lint` (0 erros; o aviso de `AuthContext.tsx` já existia), `npm run contraste`, `npm test`
  (os testes de Configurações, Diagnóstico e Atualizações passam **sem mudar uma linha**; ver o achado acima sobre os da OS).
- Contraste nas telas (`contraste:telas`) e largura (`largura:telas`, menu aberto e encolhido): resultado no PR.
- Fotos: `antes/` e `depois/` das nove cenas do catálogo (Configurações 47 a 52 e 55, Auditoria 53 e 54), mais as que o
  catálogo não tem (56 Diagnóstico, 57 Pix, 58 WhatsApp, 59 Cartões do Início, 60 Aparência e Atualizações, 61 Lojas,
  62 erro ao redefinir a senha). O banco de mentira do catálogo não simula a troca de senha: a foto 62 mostra a faixa de
  erro com o ícone, e a janela da senha temporária foi vista só nos testes.
