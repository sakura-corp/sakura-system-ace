# Continuar o painel (rascunho de passagem, 16/10/2026)

**Onde parou**: a Sofia assumiu a #351 do Gustavo (ele foi avisado num comentário na issue; não havia branch nem PR dele).
A tela da leva, com dados de exemplo, está **escrita, com testes e `npm run build` passando**, na branch
`claude/quirky-cori-fgfcor` (pasta `painel/`). **Falta**:
1. Olhar a tela renderizada (Playwright), claro e escuro, em 375 px e em tela grande, e anexar as fotos ao PR (pedido da #351).
2. Ver o teste do contador **falhar** de propósito (quebrar uma conta) e voltar.
3. Conferir contraste das cores (todas já vêm das tabelas do `docs/painel.md`) e o foco do teclado.
4. Abrir o PR com `Closes #351` (a Sofia mescla, pela regra da seção 0 ela é quem decide) e atualizar "Andamento" do `docs/painel.md`.

**Depois, na ordem**: #467 (a Sala, visual B, referência em `docs/referencia/sala-duas-versoes.html`) → #352 (Cloudflare, já ligada) →
#353 (login: depende da Sofia criar os 2 GitHub Apps) → #354 → #355 → #468.

**A ideia nova da Sofia (NÃO é pedido pra começar, só alinhar antes)**: uma "fábrica virtual de agentes", como o vídeo "My AI Office"
(escritórios por equipe, um "cérebro" no meio, quadro de tarefas, "precisa de você"), onde ela cria os agentes e eles usam as
skills que a gente define, gastando os tokens das assinaturas da equipe. A Sala (#467/#468) já é a base visual. Cuidados a
conversar: o painel não tem servidor próprio e só enxerga o GitHub; lançar sessões de verdade exige outra peça (as ferramentas
de sessão do Claude Code, ou um serviço rodando fora do painel), e é preciso conferir as regras de uso das assinaturas antes.
Levar à Sofia: opções + recomendação, esperar confirmação.
