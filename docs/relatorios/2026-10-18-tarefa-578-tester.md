# Relatório: tarefa #578, chefe tester

- **Tarefa**: #578, Memória: três skills de fora, adaptadas (entrevista, teste primeiro, diagnóstico)
- **Chefe**: tester
- **Data**: 2026-10-18
- **PR**: ver a descrição do PR que fecha a #578

## O que cada agente fez
- **Sessão mãe**: leu a issue e as originais, planejou a adaptação, pôs a linha nos três chefes e as linhas S13 a S15 na tabela, corrigiu dois trechos do ajudante, montou os ensaios e aplicou a revisão.
- **Ajudante escritor (médio)**: escreveu as três skills a partir do plano.
- **Oito ajudantes de ensaio (rápido, sem a memória do projeto)**: cada um leu **só** uma versão da skill (boa ou quebrada, com nome neutro de arquivo: `e1` a `e4`, `t1`, `t2`, `d1`, `d2`) e respondeu a um pedido de exemplo, sem ferramenta nenhuma.
- **Ajudante revisor (forte, esforço alto)**: revisão final do diff. Nenhum "precisa consertar"; oito sugestões, sete aplicadas (ver "Como eu agi").

## Modelos usados
- Ler, planejar e juntar: forte (a própria sessão), esforço médio.
- Escrever as três skills: médio (`ajudante-medio`), esforço do agente.
- Ensaios: rápido (`ajudante-rapido`). Escolhi o rápido de propósito: ele **não lê a memória do projeto**, então o resultado depende só da skill (o médio leria o "teste só prova o que se viu reprovar" no índice e estragaria o ensaio).
- Revisão final: forte (`ajudante-forte`), esforço alto. Nenhuma troca por falha.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (via arquivo, medido antes do relatório e do PR): 32 respostas; entrada 66, cache criado 143.339, cache lido 4.435.472, saída 25.016.
- **Ajudantes** (via arquivo): escritor (médio) cache criado 90.225, lido 151.980, saída 7.734; revisor (forte, alto) cache criado 64.507, lido 823.906, saída 5.448; os oito de ensaio (rápido), cada um perto de 60 mil de cache criado e lido somados por volta de 115 mil, saída de 6 a 240.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei.

## Checklist do "Pronto quando"
- ✅ **Cabeçalho válido, origem e licença, `description` que só dispara com pedido**: `yaml.safe_load` passa nas três; cada uma traz logo abaixo do título o repositório, a licença MIT, o autor e o commit `49dd158`; as três dizem "Use SÓ quando…" e "Não use…". O Claude Code listou as três assim que os arquivos foram criados.
- ✅ **Ensaio de cada uma, com cópia quebrada** (detalhe abaixo): a `teste-primeiro` manda ver o teste reprovar antes do código; a `diagnostico` acha a causa antes do conserto. A `entrevista` faz perguntas antes de planejar, **mas** a cópia quebrada também fez (ver "passou sem eu ter visto reprovar").
- ✅ **Nada de fora instalado nem baixado pro repositório**: a leitura foi num clone **fora** do repositório (`/home/user/mattpocock/skills`); cada pasta nova tem só o `SKILL.md`; nenhum `openai.yaml`, `hitl-loop`, `tests.md` ou `mocking.md`.
- ✅ `typecheck` verde; `lint` sem erro (1 aviso antigo em `src/contexts/AuthContext.tsx`, que já existia). ⏳ O CI, no PR.
- ⏳ **Depois de publicar** (a Sofia): digitar `/` numa sessão nova e ver as três.

## O que testei e VI reprovar
- **`diagnostico`**: tirei as fases 1 e 2 (o laço e reproduzir). Com a skill inteira, a ordem foi: montar o laço vermelho → reproduzir e encolher → hipóteses → teste de regressão → conserto. Na cópia quebrada, o ajudante pulou direto pra **hipóteses** sem reproduzir nada, e ele mesmo disse "o arquivo pula o laço, ficou como lacuna". Então é a fase 1 que segura.
- **`teste-primeiro`**: tirei o ciclo, o "só vale o teste que eu vi reprovar" e o "motivo certo". Com a skill inteira: um teste por vez, reprova **pelo sintoma** (não por import), o mínimo de código, e no fim quebra o código de propósito e confere com `git diff`. Na cópia quebrada: os três testes de uma vez, o vermelho aceito foi **o arquivo que não existe** (motivo errado), e nenhuma quebra de propósito. A ordem "teste antes" continuou (o nome da skill puxa), mas o que a issue pede ("ver o teste reprovar antes do código", e pelo motivo certo) só apareceu com a skill inteira.
- **`entrevista`**, na parte que é dela: tirei tudo menos "o que entregar" e renomeei pra `planejar`. As perguntas saíram **sem recomendação** e sem "sim aceita". Com a skill inteira (também renomeada pra `planejar`, pra o nome não ajudar), saíram 5 perguntas numeradas, cada uma com a recomendação e "sim aceita". Então a recomendação e as rodadas vêm da skill.

## O que passou sem eu ter visto reprovar
- **A `entrevista` perguntar antes de planejar**: nas duas cópias quebradas (sem as seções 1, 2, 3 e 5; e só com a seção 7), o ajudante **também** perguntou antes de planejar. Num pedido vago, o modelo já pergunta sozinho. A skill garante o formato (rodadas, recomendação, "sim"), não o "perguntar primeiro". Ensaiar com um pedido mais fechado (que o modelo planejaria direto) ficou de fora.
- O "não agir antes de confirmar o entendimento" (fim da entrevista), o "tapar segredo" e a limpeza dos `[DEBUG-`: estão escritos, mas os ensaios só olharam a primeira resposta.

## O que ficou de fora
- A `retro` e as personas do `agency-agents` (a issue manda não trazer).
- A tabela "Etapas e modelos" e o cabeçalho divergem: o cabeçalho diz `Ajudantes: nenhum`, a tabela pede ajudante médio e revisor forte. Segui a tabela.

## O que depende de alguém
- **Sofia**: o "depois de publicar" acima, e revisar o texto das três (estão como RASCUNHO).

## Defeitos abertos
- #580: o cabeçalho da skill `gerar-modulo` é YAML inválido (dois-pontos na `description`), achado ao validar todas as skills.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o "só vale o teste que eu vi reprovar" me fez montar a segunda cópia quebrada da `entrevista`, e foi ela que mostrou que o "perguntar primeiro" não vinha da skill.
- **Onde eu errei ou tive que adivinhar**: o primeiro jeito de quebrar a `entrevista` deixava o nome "entrevista", que já puxa perguntas; precisei renomear as duas versões pra comparar de verdade. Da revisão, não apliquei a sugestão de pôr `model:` na `teste-primeiro`: ela é usada no meio do trabalho de um ajudante médio e deve herdar o modelo dele; a `diagnostico` fica com o forte porque achar causa de defeito difícil é trabalho de categoria forte.
- **O que faltou na skill**: o chefe tester ainda não diz como ensaiar uma skill (a sugestão da #568 continua valendo). Faltou também: **use o ajudante rápido** no ensaio, porque ele não lê a memória do projeto, e **dê nome neutro** às cópias.
- **Sugestão de ajuste (opcional)**: no chefe tester, "skill nova: `yaml.safe_load` no cabeçalho; ensaio com o ajudante rápido, lendo só a skill, numa cópia boa e numa quebrada, ambas com nome neutro".
