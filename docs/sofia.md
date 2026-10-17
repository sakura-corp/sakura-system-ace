# Como trabalhar com a Sofia (a antiga seção 1 do índice)

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md`, que guarda só as regras que valem
> em toda conversa com ela (seção 1 de lá). Este arquivo tem o resto, e é aberto quando o assunto
> pede: **mensagem pra outra pessoa, configuração ou passo a passo longo, documento oficial,
> mudança de aparência, conversa de planejamento, tarefa pra equipe, faxina da memória.**
> Saiu do índice em 17/10/2026 (A1 do plano de memória), pra ele caber em 15 KB.
>
> **Preferência nova** sobre *como* ela quer que eu trabalhe vem pra cá, na seção certa. Se ela
> valer em toda conversa, ganha também uma linha curta na seção 1 do índice.

## Quem ela é

- Nome: **Sofia** (conta do GitHub `caranovavidanova`). E-mail: caranovavidanova@gmail.com.
  **Nunca presumir o nome dela por outra fonte**: em 29/09 uma sessão chamou ela de "Carol" por
  engano, porque esse nome apareceu no plano que ela mandou.
- Sem experiência prévia em programação. Explicar decisões técnicas em linguagem simples, sem
  assumir conhecimento de jargão. **Sempre em português** (16/10): numa sessão longa eu escorreguei
  pro inglês, e ela pediu pra voltar. Tudo o que ela lê (respostas, avisos, PR) é em português.
- **A borracharia é do pai dela**: ela constrói o sistema, mas quem opera no dia a dia é o pai (e
  os funcionários da loja dele). A primeira versão "de verdade" só foi pra lá quando ela achou que
  estava pronta (ver a decisão sobre nota fiscal na seção 8).

## Onde ela trabalha

- Pelo **app do Claude no desktop** (PC Windows), com o **celular como controle remoto**; quase não
  abre o VS Code nem o PowerShell (corrigido em 14/10). As sessões do SSACE rodam **na nuvem**,
  então eu não alcanço a máquina dela: o que precisa do PC (testar o programa, mexer nos arquivos
  dela) vai numa sessão **no PC** (`docs/jeito-de-trabalhar.md`). Plano dela hoje: **Pro** (até o
  Claude Team).
- **Instalador Windows**: ela baixa e instala primeiro na **própria máquina dela** (não a da
  borracharia) pra testar antes de levar pra loja. Não assumir que já está testando em produção.
- **Pelo celular, com links diretos** (16/10): quando ela está fora (no trabalho), quer ser guiada
  pelo celular com **o link exato de cada passo e o mínimo de cliques**, um passo por vez, esperando
  o "mesclei". Mesclar o PR dela pelo app do GitHub é "Ignorar regras e combinar por squash" (ela é
  a autora, então não pode se aprovar), depois "Excluir branch". **O botão pode vir em "rebase"**
  (17/10: deu "This branch can't be rebased"): avisar pra escolher **"Squash and merge" na setinha
  ▾** e conferir que o botão de confirmar termina em "(squash)".

## Decidir e planejar

- Antes de decisões estruturais (arquitetura, bibliotecas, modelagem de dados), **apresentar
  opções + recomendação e esperar confirmação**. Construir em **etapas pequenas e testáveis**,
  mostrando funcionando antes de avançar.
- **"Estou pensando em fazer X com você no fim de semana" é PLANO, não autorização** (28/08, do
  jeito ruim): ela disse "to pensando em pegar firme esse fim de semana com você pra fazer um site",
  eu alinhei três decisões por perguntas e construí o site inteiro na mesma sessão. A resposta
  dela: *"na verdade nem precisava ter feito site ainda"*. **Regra**: quando ela descrever intenção
  futura ("estou pensando em", "semana que vem", "quando der"), alinhar e **perguntar se é pra
  começar agora**. Responder as perguntas de alinhamento dela não é o mesmo que ela mandar
  executar. Vale pra coisa grande e nova (um site, um módulo); bug e ajuste pequeno que ela relatou
  continuam sendo pra fazer na hora.
- **Conversa de alinhamento: ela revisa antes de eu documentar** (27/09): juntar no fim o que foi
  decidido, o que está aberto e o que vou anotar, e ela confirma antes. O que ela mandar "deixar na
  gaveta" é anotado como adiado, não como decidido.
- **A organização atual dos módulos no menu e das abas dentro de cada tela é provisória**: ela vai
  repensar. Não tratar a posição de nenhum módulo como definitiva nem resistir a reorganizar.
- **Mudança de aparência se decide por imagem, não por número** (12/09): mostrar a mesma tela em
  duas ou três versões e deixar ela escolher (foi assim com a borda dos campos e com ícone ×
  palavra nas ações das listas). Em 03/10 as fotos foram numa página privada (Artifact), com o
  jeito de responder escrito no topo ("janela: sólida", "lista: B"), e ela respondeu em duas
  palavras.
- **Tarefas pra equipe saem já planejadas** (30/09): o papel da equipe é programar e ajustar; o
  planejamento é dela comigo. Cada tarefa diz o que fazer, em quais arquivos, com o que, o "Pronto
  quando" e o que não fazer. Ela revisa o rascunho antes de virar issue.
- **Defeito achado de passagem vira tarefa no GitHub na hora** (04/10), no formato da #425 ("o que
  acontece", "por quê", "o que fazer", "Pronto quando"), mesmo que o conserto venha depois. O
  **cartão de "tarefa sugerida"** do app é só um atalho pra abrir outra sessão: não entra na
  memória e eu não vejo os de outras sessões.

## Passo a passo e configuração

- **Serviço externo pago** (Anthropic, Focus NFe): ela cria a própria conta e chave e cola no
  lugar certo, pagando o próprio uso; eu não preciso ter acesso a nada disso. Ela pede ajuda passo
  a passo com prints (seção 9).
- **Print de tela de configuração** com "qual desses?" ou "assim?": ela já está no meio do passo a
  passo que eu dei. Conferir o print com atenção antes de responder: às vezes tem um detalhe (nome
  errado, campo a mais) que muda o resultado (foi o print que mostrou o cofre criado com o nome
  errado).
- **Configuração longa, com várias telas ou senhas** (30/09): **um item por vez**, com uma tabela
  "campo → o que colocar" pra cada tela, esperando ela dizer "salvei" antes do próximo (assim foram
  as 9 senhas no Bitwarden).
- **Quando ela disser "calma, não entendi"** (05/10): parar e explicar, em poucas linhas, o
  objetivo e a corrente de passos (o que destrava o quê e por que o próximo vem antes) antes do
  próximo clique. Foi o que destravou o certificado da empresa: "o número do pedido só existe
  depois do pedido".
- **Documento ou tela oficial que não tem volta** (contrato, Receita, banco, certificado; 02/10):
  ela manda o PDF ou o print **antes** de cada botão de assinar ou enviar, eu confiro e explico em
  português simples, e só então ela clica (assim foi a abertura inteira do CNPJ, num dia, sem
  erro). Os dados pessoais desses documentos (nome civil, CPF, RG, endereço) **nunca** vão pra
  memória, nem pra privada.
- **O que levar ou fazer num órgão** (Poupatempo, cartório, certificadora, banco; 08/10): conferir
  na página oficial antes de responder. Eu disse que o Poupatempo dava lá o formulário do nome
  social, e não dá: foi a busca dela no Google que mostrou, a tempo.

## Mensagem que ela vai mandar pra outra pessoa

Contabilidade, suporte da Focus NFe, cliente, qualquer texto que sai da nossa conversa pro mundo:
- **Curta e informal**, do jeito que uma pessoa fala, sem recapitular o contexto técnico. Se um
  print ou e-mail já explica o problema, é ele que carrega a parte técnica, e a mensagem fica só:
  *"preciso de ajuda com isso / o print explica / vocês fazem pra mim? / preciso receber X de
  volta"*. Ela rejeitou uma primeira versão longa e formal ("quero mais humano, mais simples, sem
  precisar desse contexto todo").
- **Curta, mas completa** (05/10: "planeja bem a pergunta pra não ter que perguntar mais"): tudo o
  que falta saber numa mensagem só, numerada, dizendo o caminho que ela já tentou, pra quem responde
  não mandar o mesmo de novo.
- Atendimento de WhatsApp que responde genérico costuma ser robô: pedir uma pessoa.
- **Pra quem já conhece ela** (o contador da loja, 12/10): começar relembrando quem ela é, em tom de
  lembrete; e pergunta sobre o que a pessoa precisa vai no tom de **"como seria o ideal pra você"**,
  pensando no que fica bom pros dois lados (o contador e o dono da loja).

## A sessão e a memória

- **Uma sessão por assunto** (14/10): acabou o assunto, fecha com o "Onde parou"; passou de uns 30
  a 40% de contexto, fecha e abre outra. Sessão de "continuação" não precisa: a memória faz a
  ponte. Ela às vezes estica sem querer, então **eu aviso** quando chegar lá.
- **O que se repete vira proposta de skill, e o método é revisto todo mês** (14/10): quando algo se
  repetir umas 3 vezes, eu proponho a skill, e **ela aprova antes**. Skill que falhou é consertada
  na hora. Uma vez por mês, a revisão do método (R1 de `docs/jeito-de-trabalhar.md`). **Ferramenta
  nova vista em vídeo** (ela acompanha muitos no Instagram) passa pelo mesmo filtro do produto:
  **isso tira trabalho de verdade?**
- **Faxina da memória** (30/09): ela quer a memória enxuta e clara: **apagar o que não acrescenta**
  (história de "como foi feito", "nesta sessão", status que envelheceu) e **esclarecer** o que ficou
  ambíguo ou contraditório. O que é decisão ou lição fica; o texto antigo continua no histórico do
  Git.
- **Repositório privado na sessão** (30/09): a trava de segurança da sessão recusa adicionar o
  `caranovavidanova/sakura-corp` sem autorização explícita. Pedir com todas as letras ("posso
  adicionar o sakura-corp com permissão de escrita?"); escolher uma opção num menu não conta.
- **O índice carrega sozinho em toda sessão nova** (`CLAUDE.md` importa `AGENTS.md` e
  `PROJETO_STATUS.md`): ela não precisa colar nem anexar nada. Basta abrir uma sessão apontando pro
  `sakura-corp/sakura-system-ace` (era `caranovavidanova/sakura-system-ace` até 29/09; o endereço
  antigo redireciona).
