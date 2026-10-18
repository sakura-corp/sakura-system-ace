# Relatório: tarefa #569, chefe frontend

- **Tarefa**: #569, a sala "Bibi" do Escritório de exemplo vira "Próximos projetos"
- **Chefe**: frontend
- **Data**: 2026-10-18
- **PR**: ver o PR que fecha a #569

## O que cada agente fez
- Nenhum. A sessão mãe fez tudo: trocou o texto e os dados, tirou as fotos e revisou o diff.

## Modelos usados
- Ler a issue e planejar: forte (a sessão mãe).
- Trocar o texto e os dados: a issue pedia um ajudante rápido; fiz na mãe (forte), porque eram 9 linhas e chamar um ajudante custaria mais do que a troca.
- Fotos da tela (1280 e 375): a issue pedia um ajudante médio; fiz na mãe, com Playwright.
- Revisão final do diff: forte (a mãe, que já roda no forte).

## Sessões filhas
- Nenhuma (a issue diz `Sessões filhas: não`).

## O que testei e VI reprovar
- O teste "toda equipe do exemplo tem pelo menos um agente, e todo agente é de uma equipe que existe" (`painel/src/logica/escritorio.test.ts`): deixei de propósito o agente `a8` na equipe `bibi` e ele reprovou; voltei pra `proximos` e passou. Ele prova que nenhum agente ficou numa sala que não existe e que a sala nova tem agente.

## O que passou sem eu ter visto reprovar
- No painel: `npx tsc -b` e `npx vitest run` (30 arquivos, 490 testes).
- Na raiz: `npm run typecheck` e `npm run lint` (0 erros; 1 aviso que já existia em `src/contexts/AuthContext.tsx`).
- Busca por "bibi" (sem diferenciar maiúscula) em `painel/`, `docs/painel.md` e `docs/referencia/escritorio-de-agentes.md`: só sobram as duas linhas do "visual B, o da Bibi" no `docs/painel.md` (o título da seção do visual e o registro de 15/10), que a issue manda manter.
- `/escritorio` renderizado (Playwright, `/api/*` respondido no script): em 1280 e em 375 não aparece "Bibi", aparece "Próximos projetos", e não há rolagem lateral (largura da página igual à da janela).

Fotos em `docs/relatorios/fotos/tarefa-569/`:
- `escritorio-1280.jpg`: o desenho e a lista, com a sala "Próximos projetos".
- `escritorio-1280-sala-aberta.jpg`: a sala aberta (líder Projeto-modelo, os 2 agentes, GitHub e Docs, a skill projeto-modelo).
- `escritorio-375.jpg`: a lista do celular. Na foto de página inteira, a barra fixa de baixo aparece no meio da imagem; é efeito da captura.

## O que ficou de fora
- Nada da issue. A cor, o número de salas e os números de exemplo continuam iguais.

## O que depende de alguém
- A Sofia: depois de publicar, conferir no endereço público do painel que o Escritório mostra "Próximos projetos" e não "Bibi".

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a issue já trazia os nomes, os arquivos e o "pronto quando", então foi direto; o teste de equipes do exemplo serviu pra provar a troca.
- **Onde eu errei ou tive que adivinhar**: escolhi o nome do agente `a8` ("Pesquisa de nicho") e o título da tarefa `t4` ("Esqueleto do próximo projeto"); a issue dava só o "fazendo". Não chamei os ajudantes da tabela (troca pequena demais pra pagar o custo de um ajudante).
- **O que faltou na skill**: o script de fotos do painel ainda não está no repositório (a #545 e a #546 já sugeriram); escrevi de novo no scratchpad.
- **Sugestão de ajuste (opcional)**: no `ritual-de-tarefa`, dizer que a mãe pode fazer ela mesma uma etapa de ajudante quando a troca for de poucas linhas, anotando no relatório.
