# Matriz de RLS

`npm run test:rls`

Prova, a cada rodada, que **cada papel enxerga e mexe exatamente no que o
`expectativas.csv` declara — e em nada além disso**.

## Por que isto existe

A RLS do Postgres é a única defesa real deste sistema: a permissão por módulo
ainda é checada, em boa parte, só na interface do app (`docs/licoes.md`, item 1;
RH, Contas e Caixa já são checados no banco). E ela
falha em **silêncio** — policy faltando não dá erro, filtra a zero linhas, e do
lado do app isso é indistinguível de "deu certo". Foi assim que o botão
"excluir loja" passou meses sem fazer nada (item 15 da mesma seção).

Até aqui, cada migration era conferida à mão, uma vez, pela sessão que a
escreveu — e sessão nova não tem memória da anterior. Isto tira a conferência
do "alguém lembrar".

## Os quatro arquivos, e qual deles se revisa

| Arquivo | O que é |
|---|---|
| **`expectativas.csv`** | **A parte que se revisa.** Quantas linhas cada papel lê, insere, altera e apaga em cada tabela. |
| **`lacunas-de-proposito.csv`** | As tabelas que, de propósito, não têm policy pra algum comando. Entrar nesta lista é dizer por escrito "é assim mesmo". |
| `cenario.sql` | O cenário fixo: duas lojas da mesma empresa, cinco papéis, dado de negócio nas duas. |
| `sondas.sql` | A menor inserção válida de cada tabela — o "consigo escrever aqui?" de cada papel. |
| `matriz.sql` | O motor: roda as sondas (hoje 760) e anota o resultado. |
| `rodar.mjs` | Monta o banco descartável, compara com o esperado, imprime o que não bateu. |

## Como ler o `expectativas.csv`

Cada número é *quantas linhas aquele papel consegue mexer*. Os padrões se
repetem e se leem sozinhos:

```
2,1,1,0,0   tabela DA LOJA: o dono vê as duas, quem é da loja A vê a dele,
            órfão e deslogado não veem nada
2,2,2,2,0   tabela COMPARTILHADA: qualquer um logado mexe em tudo
2,1,0,0,0   tabela DA LOJA que também exige a permissão do módulo — o
            balconista só-Caixa cai fora (é o caso de `funcionarios`)
1,1,0,0,0   só admin
0,0,0,0,0   ninguém, nem o dono: só o banco escreve ali
```

## As views entram na matriz, e são o caso mais importante

Uma view como `funcionarios_publico` existe justamente pra abrir uma janela
numa tabela fechada — então ela roda com os direitos do dono e **não reage a
RLS nenhuma**. O que a limita é o `where` escrito dentro dela e o `grant` de
quem pode chamá-la, e as duas coisas são fáceis de perder numa migration
futura sem nada avisar.

Foi medido: tirando só o `revoke` da migration 0056, a matriz acusa **11
células** — inclusive `sem_login` conseguindo *inserir* na tabela base por
dentro da view. Por isso a view é sondada nos quatro comandos, como qualquer
tabela, e `permission denied` nela conta como zero (nela, o `grant` É a
tranca; numa tabela continua sendo banco montado errado).

## Quando ficar vermelho

A saída mostra, célula por célula, o que era esperado e o que aconteceu. Duas
leituras possíveis, **nesta ordem**:

1. **A mudança era intencional?** Atualize o `expectativas.csv`. Esse diff *é*
   a revisão de segurança do PR: quem revisar vê, em números, quem passou a
   poder mexer em quê.
2. **Não era?** É um furo de RLS. O conserto é na policy.

> Atualizar o `expectativas.csv` "pra ficar verde" é o único jeito de este
> teste não valer nada.

## Onde roda

- **No CI**: sozinho, num job com Postgres de serviço. É o lugar de sempre.
- **Num Linux com Postgres**: `service postgresql start`, depois
  `sudo -u postgres psql -c "alter user postgres password 'postgres'"`, depois
  `npm run test:rls`. O endereço sai de `SAKURA_RLS_URL` se precisar de outro.
- **No Windows**: **não roda, e não precisa.** Depende de Postgres e do `psql`
  instalados. O comando do dia a dia continua sendo `npm test`.

O runner cria um banco descartável (`sakura_rls_<pid>`) e o apaga no fim —
nunca encosta em banco existente. Nada aqui deve ser rodado no Supabase de
verdade: `cenario.sql` começa apagando tudo.

## Quando uma migration mexer em policy

O teste cobra sozinho:

- tabela nova com RLS sem sonda → reprova pedindo a sonda;
- tabela nova sem linha no `expectativas.csv` → reprova pedindo as quatro
  linhas;
- comando sem policy nenhuma → reprova, a menos que a lacuna esteja declarada;
- lacuna declarada que já foi tapada → reprova pedindo pra tirar a linha.
