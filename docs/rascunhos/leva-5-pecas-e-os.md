# Rascunho: a #366 e a #367 reescritas no modelo (27/10/2026)

> Rascunho pra Sofia aprovar. Depois do "pode criar", o texto de cada bloco vai pra issue, sai a
> etiqueta `guia`, entra a `chefe:backend`, e este arquivo é apagado. As decisões vêm da #782.

Etiquetas das duas: `leva-5`, `chefe:backend` (tira a `guia`).

---

## #366 — Peças e estoque só pra quem tem o módulo (TR-04.1, lote 5)

```markdown
Chefe: backend
Ajudantes: frontend (OS, balcão, pedido de compra, Caixa e Início lendo pelas janelas novas), seguranca (revisar as policies, a janela e a função de custo), tester (conferir o Pronto quando)
Estimativa: 16 h
Depende de: #706, #787
Sessões filhas: não
Prioridade: 6

## Pra que serve
Hoje quem não tem o módulo Estoque não vê a tela, mas lê pela API o catálogo inteiro de peças, **com o custo**, e todas as movimentações, com a chave que está no computador. Esta tarefa fecha `pecas`, `estoque_movimentos` e `contagens_estoque` no banco, sem parar a OS, o balcão, o pedido de compra nem o lucro do Caixa.

## Decisões já tomadas (Sofia, 22/10 e 27/10, #782)
- **Quem vê tudo da peça**: quem tem **Estoque**, **Relações** ou é **admin** (o lucro e a comissão das Relações dependem do custo).
- **A janela estreita**: quem monta OS, venda de balcão ou pedido de compra **sem Estoque** vê da peça só **descrição, código, preço de venda e saldo**. O **custo nunca** sai por ela.
- **O Caixa e o Início não leem o custo da peça.** Hoje o "Lucro do dia" (`DiarioSection`) e o "Lucros mês" (`PainelPage`) somam o custo peça por peça (`mapaCustoPecas`). Passam a receber **o custo total de cada lançamento/OS, já calculado no banco**, por uma função estreita. O lucro tem que dar o mesmo número de antes, centavo por centavo.
- **Movimentações e contagens**: só com Estoque. A baixa da OS e do balcão e a entrada pelo pedido de compra continuam funcionando pra quem tem esses módulos (são gravadas pelas funções do banco que já existem).
- Feita pela equipe; **a Sofia aplica as migrations** (seção 0 do `PROJETO_STATUS.md`).

## O que fazer
1. Mapear cada leitura de `pecas`, `estoque_movimentos` e `contagens_estoque` (lista "Arquivos") e o que cada tela usa.
2. **Migration A (abrir a janela)**, no padrão da `0068` e de `docs/banco.md`: a view `pecas_janela` (descrição, código, preço de venda, saldo; com `where` de loja e `revoke`), a função que devolve o custo total por lançamento/OS pro Caixa e o Início (`security definer` estreita, `select` em volta de `operador_tem_permissao()`), idempotente, `schema_versao`, `VERSAO_ESQUEMA_ESPERADA`, `npm run gerar-instalacao`.
3. As telas passam a ler pela janela e pela função (OS, balcão, pedido de compra, Caixa, Início).
4. **Migration B (fechar a porta)**, separada da A (`docs/licoes.md`, item 1, lição do lote 4): quatro policies por tabela com `operador_tem_permissao()` dentro de `select`, e `-- versao-minima-do-programa:` a versão que já lê pelas janelas.
5. `supabase/scripts/testar-pecas-permissao.sql` com as duas metades (o que é recusado e o que ainda passa), terminando em `TODAS AS CHECAGENS PASSARAM`, e a matriz de RLS atualizada.
6. Medir o tempo das consultas antes e depois (`explain analyze`) e pôr no PR.
7. Atualizar o item 1 de `docs/licoes.md` e a tabela de `docs/banco.md`.

## Arquivos
- `supabase/migrations/<próximo número livre>_pecas_janela.sql` (nova)
- `supabase/migrations/<o seguinte>_pecas_so_com_permissao.sql` (nova)
- `supabase/scripts/testar-pecas-permissao.sql` (novo)
- `supabase/testes-rls/expectativas.csv` (e `lacunas-de-proposito.csv`, se precisar)
- `supabase/instalacao/` (gerado pelo `npm run gerar-instalacao`)
- `src/schemas/versaoEsquema.ts`, `src/schemas/metricasCaixa.ts`, `src/schemas/painelInicio.ts`
- `src/lib/pecas.ts`, `src/lib/estoque.ts`, `src/lib/contagens.ts`
- `src/pages/painel/PainelPage.tsx`, `src/pages/caixa/CaixaPage.tsx`, `src/pages/caixa/DiarioSection.tsx`
- `src/pages/ordens-servico/OrdensServicoPage.tsx`, `OrcamentosPage.tsx`, `VendaBalcaoForm.tsx`, `ItemOSRow.tsx`, `pecaAvulsaCadastro.ts`, `EmitirNotaFiscalModal.tsx`
- `src/pages/fornecedores/FornecedoresPage.tsx`, `ImportarNotaFiscalXmlModal.tsx`
- `docs/banco.md`, `docs/licoes.md`
- `docs/relatorios/<data>-tarefa-366-backend.md` (novo)

Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Mapear as leituras de peças e estoque | ajudante explorador | rápido | só lê |
| Migrations A e B, função de custo e teste SQL | ajudante | forte | RLS, banco e dinheiro (o lucro) |
| As telas lendo pelas janelas | ajudante (frontend) | médio | plano já pronto |
| Revisão das policies, da janela e da função | ajudante (seguranca) | forte | segurança |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] Sem Estoque, a API devolve zero linhas de `pecas`, `estoque_movimentos` e `contagens_estoque` fora da janela (teste visto reprovar).
- [ ] Pela janela, só descrição, código, preço de venda e saldo; **nunca o custo** (teste visto reprovar).
- [ ] O lucro do Caixa e do Início dá o mesmo valor de antes, pra quem tem Caixa sem Estoque nem Relações (teste visto reprovar com a função errada).
- [ ] A baixa de estoque da OS e do balcão e a entrada do pedido de compra continuam funcionando sem o módulo Estoque.
- [ ] `testar-pecas-permissao.sql` e a matriz de RLS passam; tempos no PR; telas olhadas renderizadas; `typecheck`, `lint`, `test:fusos` e o CI verdes.

**No PC de quem fez** (no Supabase de teste, com as migrations aplicadas pela Sofia):
- [ ] Entrar com um login de teste que tem OS e Caixa, mas não Estoque nem Relações.
- [ ] Abrir uma OS, escolher uma peça: aparecem descrição, código, preço e saldo. Fechar a OS: a peça sai do estoque (conferir depois com um login que tem Estoque).
- [ ] No Caixa, o "Lucro do dia" mostra o mesmo valor que aparece pro login de admin.
- [ ] O menu Estoque não aparece pra esse login.

**Depois de publicar** (a Sofia confere no dia de teste do fim de semana):
- [ ] Rodar as duas migrations pelo botão "Atualizar o banco" (ensaiar, depois aplicar), na ordem.
- [ ] Na Pneus Amigão: abrir uma OS com peça e fechar; o lucro do dia no Caixa bate com o de antes.

## Não fazer
- Não fechar `ordens_servico` junto: é a #367.
- Não mudar como a baixa de estoque ou o lucro são calculados. Só quem pode ler.
- Não aplicar migration em banco nenhum: quem aplica é a Sofia.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

---

## #367 — Ordens de Serviço só pra quem tem o módulo (TR-04.1, lote 6)

```markdown
Chefe: backend
Ajudantes: frontend (Início, Caixa, Garantias, Comissões e Notas lendo pelas janelas), seguranca (revisar as policies e as janelas), tester (conferir o Pronto quando)
Estimativa: 20 h
Depende de: #366
Sessões filhas: não
Prioridade: 7

## Pra que serve
Hoje quem não tem o módulo Ordens de Serviço não vê a tela, mas lê pela API todas as OS (cliente, valores e itens). Esta tarefa fecha `ordens_servico` e `ordens_servico_itens` no banco. É a tabela mais "atravessada" do sistema: fechar sem janela **zera o lucro do Caixa em silêncio** (`docs/licoes.md`, itens 1 e 69).

## Decisões já tomadas (Sofia, 27/10, #782)
- **Início sem o módulo OS**: mostra só o que é do módulo da pessoa (caixa, contas). **Somem** "OS abertas" e "Veículos no pátio". Segue `MODULOS_DO_CARTAO` (`src/schemas/painelInicio.ts`).
- **Cada módulo vê só o que a tela dele já mostra hoje, nada a mais**:
  - **Caixa**: valor e custo total de cada OS (a mesma função de custo da #366), pra o lucro do dia não zerar.
  - **Garantias**: os itens e as datas.
  - **Comissões** (Relações): os valores de cada pessoa.
  - **Notas Fiscais**: o número da OS e o cliente.
  - **Contas a Receber** e a **ficha do veículo**: o que já mostram hoje (mapear no passo 1; se precisar de mais que número, data, valor e cliente, parar e perguntar).
- Feita pela equipe; **a Sofia aplica as migrations**.

## O que fazer
1. Mapear cada leitura de `ordens_servico` e `ordens_servico_itens` (lista "Arquivos") e o que cada tela usa.
2. **Migration A (abrir as janelas)**: uma view ou função estreita por módulo (Caixa, Garantias, Comissões, Notas), no padrão da `0061`, `0062` e `0068`. A pergunta "este lançamento é de uma OS?" vai numa função, e não num `exists` dentro da policy (`docs/licoes.md`, item 75: o `exists` deixou a lista do Caixa 45% mais lenta). `select` em volta das funções, índices. Idempotente, `schema_versao`, `VERSAO_ESQUEMA_ESPERADA`, `npm run gerar-instalacao`.
3. As telas passam a ler pelas janelas; o Início esconde os cartões de OS pra quem não tem o módulo.
4. **Migration B (fechar a porta)**, separada da A: as policies com `operador_tem_permissao()` e `-- versao-minima-do-programa:` a versão que já lê pelas janelas.
5. `supabase/scripts/testar-os-permissao.sql` com as duas metades e perfis de verdade (só Caixa, só Garantias, só Relações, só Notas), terminando em `TODAS AS CHECAGENS PASSARAM`, e a matriz de RLS atualizada.
6. Medir o tempo antes e depois e pôr no PR (a lista do Caixa não pode ficar mais lenta).
7. Atualizar o item 1 de `docs/licoes.md` e a tabela de `docs/banco.md`.

## Arquivos
- `supabase/migrations/<próximo número livre>_os_janelas.sql` (nova)
- `supabase/migrations/<o seguinte>_os_so_com_permissao.sql` (nova)
- `supabase/scripts/testar-os-permissao.sql` (novo)
- `supabase/testes-rls/expectativas.csv` (e `lacunas-de-proposito.csv`, se precisar)
- `supabase/instalacao/` (gerado)
- `src/schemas/versaoEsquema.ts`, `src/schemas/painelInicio.ts`, `src/schemas/metricasCaixa.ts`, `src/schemas/comissoes.ts`
- `src/lib/ordensServico.ts`, `src/lib/caixa.ts`, `src/lib/garantias.ts`, `src/lib/veiculos.ts`, `src/lib/clientesSumidos.ts`
- `src/pages/painel/PainelPage.tsx`, `src/pages/caixa/CaixaPage.tsx`, `src/pages/caixa/DiarioSection.tsx`, `src/pages/caixa/CategorizarSemCategoria.tsx`
- `src/pages/garantias/GarantiasPage.tsx`, `src/pages/relatorios/RelatoriosPage.tsx`, `src/pages/funcionarios/ComissoesSection.tsx`, `src/pages/notas-fiscais/ArquivosSection.tsx`
- `src/pages/contas-receber/ContasReceberPage.tsx`, `src/pages/veiculos/FichaVeiculoPage.tsx`
- `docs/banco.md`, `docs/licoes.md`
- `docs/relatorios/<data>-tarefa-367-backend.md` (novo)

Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Mapear as leituras de OS | ajudante explorador | rápido | só lê |
| Migrations A e B e teste SQL | ajudante | forte | RLS, banco e dinheiro (o lucro) |
| As telas lendo pelas janelas | ajudante (frontend) | médio | plano já pronto |
| Revisão das policies e das janelas | ajudante (seguranca) | forte | segurança |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] Sem o módulo OS, a API devolve zero linhas de `ordens_servico` e `ordens_servico_itens` fora das janelas (teste visto reprovar).
- [ ] Cada janela entrega só o combinado (Caixa: valor e custo total; Garantias: itens e datas; Comissões: valores por pessoa; Notas: número e cliente), testado com um perfil por módulo (visto reprovar).
- [ ] O lucro do Caixa, as Relações, as Comissões, as Garantias e as Notas dão os mesmos números de antes.
- [ ] O Início sem OS não mostra "OS abertas" nem "Veículos no pátio".
- [ ] `testar-os-permissao.sql` e a matriz de RLS passam; tempos no PR (o Caixa não ficou mais lento); telas olhadas renderizadas; `typecheck`, `lint`, `test:fusos` e o CI verdes.

**No PC de quem fez** (no Supabase de teste, com as migrations aplicadas pela Sofia):
- [ ] Com um login que tem só Caixa: o Início não mostra OS abertas nem pátio, e o "Lucro do dia" é igual ao do admin.
- [ ] Com um login que tem só Garantias: a lista de garantias mostra os itens e as datas, como antes.
- [ ] Com um login que tem só Notas Fiscais: as notas mostram o número da OS e o cliente.
- [ ] Com um login que tem OS: tudo funciona como antes (abrir, fechar, imprimir).

**Depois de publicar** (a Sofia confere no dia de teste do fim de semana):
- [ ] Rodar as duas migrations pelo botão "Atualizar o banco" (ensaiar, depois aplicar), na ordem.
- [ ] Na Pneus Amigão: o lucro do dia no Caixa e as comissões do mês batem com os de antes.

## Não fazer
- Não mudar nenhuma conta de dinheiro. Só quem pode ler.
- Não mexer no contador de número das OS (gatilho da `0037`).
- Não aplicar migration em banco nenhum: quem aplica é a Sofia.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```
