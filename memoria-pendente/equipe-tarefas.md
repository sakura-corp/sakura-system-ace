# Memória pendente: as 3 primeiras tarefas do programa (sessão filha "equipe-tarefas", 16/10/2026)

## O que foi feito
- `docs/rascunhos/leva-0-programa.md`: os rascunhos das três tarefas do programa das lojas pra
  `leva-0` (etapa 4 da #474), prontos pra colar como corpo de issue: #455 (6 h), #459 (4 h) e a 1ª
  parte da #457 (12 h, em 2 PRs). No topo: a ordem, os conflitos de arquivo e 4 perguntas pra Sofia.
- Nenhuma issue foi criada, editada ou comentada. Nada de banco, workflow ou configuração.

## Decisões (com a alternativa descartada)
1. **#459 sem migration**: o link de avaliação vai **dentro do texto da mensagem**, que cada loja já
   edita; o botão só aparece quando o texto tem `https://`. *Descartado*: coluna nova por loja (a
   issue sugeria; precisaria de migration, pesado pra aquecimento) e guardar o link como "mensagem
   falsa" em `configuracoes_whatsapp` (mistura configuração com texto). Conferido: a coluna `chave`
   das tabelas de WhatsApp (migration 0052) é texto livre, então chave nova de modelo não pede
   migration.
2. **#455 conta só ordens faturadas, da loja aberta** (OS e venda de balcão, sem o Consumidor).
   *Descartado*: somar todas as lojas (mostraria valor de outra loja). Total gasto só com a
   permissão de Relações (`relatorios`), como a issue pedia.
3. **#457 parte 1 = só clientes, só CSV, repetido sempre pulado, sem desfazer, só administrador.**
   *Descartado pra esta parte*: veículos (dobra o tamanho), Excel (não há biblioteca de planilha no
   `package.json`, e dependência nova é decisão dela), "atualizar quem já existe" e "desfazer o lote"
   (precisam de coluna nova, ou seja, migration; vão pra parte seguinte, com a Sofia aplicando).
   Assim a importação só acrescenta e não estraga cadastro existente.
4. **#457 em 2 PRs** (funções puras primeiro, tela depois), pra caber na revisão dela.
5. **#457 depende da #455 aprovada** (as duas mexem em `ClientesPage.tsx`). #455 e #459 andam juntas
   e batem só em `src/schemas/whatsapp.ts` (conflito pequeno, resolvido por quem entrar depois).

## Achados de passagem (conferidos no código)
- A trava `ck_clientes_cnpj_juridica` (migration 0060) recusa pessoa jurídica com documento que não
  tem 14 caracteres. O rascunho da #457 já desvia disso (14 → jurídica, resto → física com aviso).
- `placa` não é única no banco: achar repetido é no código.
- A auditoria (0053) grava uma linha por cliente inserido: importar 2.000 = 2.000 linhas de auditoria.
- `totalOrdem()` (`src/types/os.ts`) soma com `reduce` solto, não com `somar()`. Não virou tarefa
  (é a conta já usada na lista de OS); o rascunho da #455 manda somar as ordens com `somar()`.

## O que NÃO foi provado
- Nada foi rodado: é texto. Os caminhos de arquivo e nomes de função citados foram conferidos com
  Grep/leitura na `main` de 16/10 (`v0.9.51`), mas as estimativas de horas são palpite.
- Não conferi se a coluna de ações da lista de OS cabe mais um botão em 1366 px; o rascunho da #459
  manda a pessoa medir com `npm run largura:telas` e dá a saída se não couber.
- `docs/supabase-de-teste.md` é citado nos três "Pronto quando", mas é escrito por outra sessão
  filha: conferir que o nome final do arquivo bate antes de virar issue.

## O que depende da Sofia
1. Os textos padrão das duas mensagens novas (propostas nos rascunhos 1 e 2).
2. "X meses" padrão da #455 = 6?
3. #459: o link dentro do texto (sem migration) serve?
4. #457: a importação vai pras lojas sem o "desfazer" ou só junto com a parte seguinte (recomendo
   só junto)? E a parte 1 vira issue nova ligada à #457 (recomendo) ou troca o texto da #457?
5. Revisar os rascunhos e criar/atualizar as issues com a etiqueta `leva-0`.
6. Fora das tarefas: pegar o link de avaliação da Pneus Amigão no Google, quando a versão chegar lá.
