# Relatório: tarefa #608, etapa 1 (o caderno da Sofia)

> Rascunho em andamento: completado no fim da sessão.

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
   `git config --global user.name "<Nome>"` e `git config --global user.email "<e-mail do GitHub>"`.
   Certo = nenhuma resposta.
7. **Abrir no Obsidian**: **Abrir** (em "Abrir pasta como um cofre") → Este Computador → C: →
   Usuários → `<usuário do Windows>` → `segundo-cerebro` → **Selecionar pasta**. Aparecem os
   arquivos do caderno na coluna da esquerda. O ícone vermelho riscado no canto de baixo é o
   Obsidian Sync (pago, não usamos): ignorar.
8. **Plugin Git**: engrenagem ⚙️ (canto de baixo à esquerda) → **Plugins não oficiais** (é esse o
   nome no português, não "da comunidade") → em **Modo restrito**, se o botão disser "Desligar",
   clicar (se disser "Ligar", já está liberado) → **Procurar** → buscar `Git` → o **Git, por
   Vinzent** (antigo "Obsidian Git") → **Instalar** → **Ativar**. Fica em "Plugins instalados"
   com o interruptor roxo, e no rodapé do Obsidian aparece `✓ main`.
