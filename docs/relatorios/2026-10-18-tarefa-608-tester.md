# Relatório: tarefa #608 (etapa 1), chefe tester

- **Tarefa**: #608, second brain no Obsidian; esta sessão fez **só a etapa 1** (o caderno da Sofia)
- **Chefe**: tester
- **Data**: 2026-10-18
- **PR**: o desta branch (`claude/lucid-ritchie-2cnqeh`)

## O que cada agente fez
- sessão mãe: tudo (o caderno, a limpeza do público, o guia no PC). Nenhum ajudante: a busca das
  referências foi um `grep` de uma linha, e a etapa foi guiada ao vivo com ela.

## Modelos usados
- Etapa 1: forte, esforço médio, na própria sessão mãe. Sem troca.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (sem canal documentado).
- **Ajudantes**: nenhum.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei. Ela colou o texto junto com outra frase, então ele não ligou; e a etapa
  para a cada passo pra esperar ela, o que torna o `/goal` pouco útil aqui.

## O que testei e VI reprovar
- **O envio do PC pro GitHub reprovou de verdade**: `push declined due to email privacy
  restrictions` (o e-mail do Git era o Gmail, e a conta bloqueia envio que exponha o e-mail).
  Trocado pelo e-mail de fachada do GitHub, passou (commit `ab36440`, autor no `noreply`).
- **Ida e volta do caderno**: nota gravada pelo Claude na nuvem apareceu no Obsidian
  (`Pulled 1 file from remote`); ela apagou no Obsidian e o apagar chegou no GitHub.
- `grep` por `sofia.md` no público (fora do histórico e dos relatórios): nada.

## O que passou sem eu ter visto reprovar
- O texto novo da seção 1 e das skills (só texto; o CI confere o tamanho do índice).

## O que ficou de fora
- **O e-mail dela no botão "Tenho interesse" do `site/index.html`**: é o contato público de
  propósito (decisão dela, 18/10); trocar por um e-mail da empresa é outra tarefa.
- **`supabase/testes-rls/cenario.sql`** cita "seção 1" por um erro antigo; fora da tarefa (ela
  decidiu deixar).
- **O galho de rascunho `claude/lucid-ritchie-2cnqeh` no `segundo-cerebro`**: a sessão não tem
  permissão de apagar galho; inofensivo, ela apaga pelo site se quiser.
- **Obsidian no celular**: não instalado. A própria página do plugin Git avisa que no celular ele é
  instável e lento; fica só no PC, como já estava decidido.

## O que depende de alguém
- A Sofia: conferir, depois de mesclar, que uma sessão nova abre o caderno sozinha (o "Pronto
  quando depois de publicar"). A linha da seção 0 e a exceção `Second brain: não precisa` são da
  etapa 2.

## Onde parou
Terminei a etapa 1. Próximas: a etapa 2 (o mecanismo) e a 3 (o primeiro dia da equipe), uma
sessão cada.

## Como eu agi
- **O que a skill me ajudou a fazer**: o cabeçalho da issue estava completo, e o roteiro "um passo
  por vez, com print" funcionou bem pra parte do PC.
- **Onde eu errei ou tive que adivinhar**: mandei pôr o Gmail no `git config` (deveria ser o
  e-mail de fachada do GitHub desde o começo); disse "Plugins da comunidade", e no português é
  "Plugins não oficiais"; achei que dava pra criar o repositório pela sessão, e não dá.
- **O que faltou na skill**: o ritual manda criar `claude/tarefa-N-<curto>`, mas a sessão na nuvem
  já vem presa a uma branch própria; usei a da sessão.
- **Sugestão de ajuste (opcional)**: no ritual, "se a sessão já vier com uma branch designada, usar
  ela".

## O roteiro que deu certo (base da etapa 3, Windows)

Anotado ao vivo, com os nomes exatos que apareceram na tela (Obsidian 1.14.4 em português,
plugin Git v2.42.0).

1. **Criar o repositório** (a pessoa, não o Claude: a ligação do Claude com o GitHub não tem
   permissão pra criar repositório na conta pessoal; deu `403 Resource not accessible by
   integration`). Em https://github.com/new: nome `segundo-cerebro`, **Private**, marcar **Add a
   README file**, **Create repository**.
2. **Ligar na sessão**: o Claude adiciona com `add_repo` (`<usuário>/segundo-cerebro`, escrita).
   Não precisou de nenhum clique da pessoa: leu e gravou de primeira.
3. **Instalar o Git**: https://git-scm.com/downloads/win → "Click here to download" → abrir →
   **Sim** → **Next** em tudo sem mudar nada → **Install** → **Finish**. (Se "View Release Notes"
   ficar marcado, abre uma aba no navegador; é só fechar.)
4. **Instalar o Obsidian**: https://obsidian.md/download → Windows → abrir → **Sim**. Ele instala e
   abre sozinho, com "Início rápido", "Criar um novo cofre", "Abrir pasta como um cofre" e
   "Conectar ao Obsidian Sync". Não clicar ainda.
5. **Trazer o caderno pro PC**: menu Iniciar → `Git Bash` → colar (botão direito → Paste)
   `git clone https://github.com/<usuário>/segundo-cerebro.git` → Enter. Fica em
   `C:\Users\<usuário do Windows>\segundo-cerebro`. (Na Sofia não pediu login porque o PC já
   estava conectado ao GitHub; se pedir: "Sign in with your browser" → "Authorize git-ecosystem".)
6. **O nome no Git**, na mesma janela, uma linha por vez:
   `git config --global user.name "<Nome>"` e
   `git config --global user.email "<número>+<usuário>@users.noreply.github.com"`.
   **Nunca o e-mail de verdade**: se a conta bloqueia expor o e-mail (o padrão), o envio é
   recusado com `push declined due to email privacy restrictions`. O e-mail de fachada está em
   https://github.com/settings/emails ("Keep my email addresses private"). Certo = nenhuma resposta.
7. **Abrir no Obsidian**: **Abrir** (em "Abrir pasta como um cofre") → Este Computador → C: →
   Usuários → `<usuário do Windows>` → `segundo-cerebro` → **Selecionar pasta**. Aparecem os
   arquivos do caderno na coluna da esquerda. O ícone vermelho riscado no canto de baixo é o
   Obsidian Sync (pago, não usamos): ignorar.
8. **Plugin Git**: engrenagem ⚙️ (canto de baixo à esquerda) → **Plugins não oficiais** (é esse o
   nome no português, não "da comunidade") → em **Modo restrito**, se o botão disser "Desligar",
   clicar (se disser "Ligar", já está liberado) → **Procurar** → buscar `Git` → o **Git, por
   Vinzent** (antigo "Obsidian Git") → **Instalar** → **Ativar**. Fica em "Plugins instalados"
   com o interruptor roxo, e no rodapé do Obsidian aparece `✓ main`.
9. **Não mandar a pasta do Obsidian**: no Git Bash, `cd ~/segundo-cerebro`, depois
   `echo ".obsidian/" > .gitignore`. (Na Sofia, sem isso o primeiro envio levou 255 KB do próprio
   plugin; e ela muda toda hora, até ao trocar de aba.) Melhor fazer **antes** do passo 10.
10. **Puxar e enviar sozinho**: engrenagem → Plugins não oficiais → **Git**. As opções estão em
    inglês e em páginas: **Automatic** → `Auto commit-and-sync interval (minutes)` = `10` e
    `Auto pull interval (minutes)` = `10`; setinha `<` → **Sync** → ligar **Pull on startup**
    (os dois "on commit-and-sync" já vêm ligados).
11. **Testar ida e volta**: o Claude grava uma nota na nuvem; no Obsidian, **Ctrl + P** →
    `Git: Pull` → aparece "Pulled 1 file from remote" e a nota. Apagar a nota → **Ctrl + P** →
    `Git: Commit-and-sync` → o Claude confere no GitHub que sumiu.
12. **Celular**: não instalar o Obsidian; no celular, quem lê o caderno é o Claude.
