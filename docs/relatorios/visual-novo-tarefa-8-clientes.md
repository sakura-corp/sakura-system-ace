# Visual novo, tarefa 8 (#990): Clientes, a ficha do veículo e Garantias

> Escrito em 16/11/2026. Nada publicado, nada de banco, nenhuma conta mudou. As fotos de antes e depois
> (escuro e claro, JPG) estão em `docs/referencia/visual-novo/andamento/9-clientes/`
> (`antes-…` e `depois-…`; os `-fim-` são o pé da ficha, rolada até o fim).

## O que foi levado pro visual novo

| Tela | Peças usadas |
|---|---|
| Lista de Clientes (e "só os que sumiram") | `Botao`, `sakura-campo`, `sakura-tabela`, `Dica`, `AcoesDaLinha` (como estava), `BotaoWhatsapp` |
| Janela "Ver veículos" | `Modal`, `LinkPlaca`, `Botao` |
| Cadastro de cliente e veículos | `sakura-campo`, `sakura-rotulo`, `Botao`, faixa de erro com ícone |
| Ficha do cliente | `CartaoNumero`, `Valor`, `Selo`, `LinkPlaca`, `Botao`, `Dica`, `sakura-tabela` |
| Ficha do veículo | `CartaoNumero`, `Valor`, `Selo`, `Botao`, `sakura-tabela` |
| Garantias | `Selo`, `LinkPlaca`, `sakura-tabela`, abas com a aba ativa em laranja |

Peças locais novas (só desta tarefa, em `src/pages/clientes/`): `AvisoDeErro` (a faixa de erro com ícone, regra 4) e
`SeloDoStatusDaOrdem` (o status da OS como `Selo`).

## Onde cada coisa foi parar (nada sumiu)

- **Lista de Clientes**: a busca subiu pra cima e o filtro "Só os clientes que sumiram… sem vir há mais de N meses" ficou
  na mesma linha dela, em vez de num cartão de largura inteira em cima da busca. Todos os campos e textos continuam.
  Os rótulos "+ Novo cliente" e "Ver veículos" não mudaram (as cenas do catálogo clicam neles pelo nome).
- **Ordenar por Nome / Cidade/UF**: continua clicando no título da coluna; o aviso do mouse agora é a `Dica`.
- **"chamado em dd/mm"** (clientes que sumiram): o aviso de que "o sistema só sabe que a conversa foi aberta" agora é a `Dica`
  (aparece também no teclado), em vez do balãozinho do navegador.
- **Janela "Ver veículos"**: a linha inteira era um botão; agora a placa é a `LinkPlaca` (abre a ficha) e há um botão
  "Ver ficha" ao lado (antes "Ver ficha →"). O carro sem placa continua aparecendo pela marca e pelo modelo.
- **Ficha do veículo**: o cartão "Dono atual" subiu pro cabeçalho ("Dono atual: [nome] · telefone ?"), com o mesmo "?" que o
  explicava. Os outros três cartões viraram `CartaoNumero`.
- **Ficha do cliente**: os três cartões viraram `CartaoNumero`; o aviso "R$ … atrasado" é um selo vermelho com ícone.
- **Garantias**: as três abas e o texto "Vencida (n)" não mudaram; as abas agora são uma lista de abas de verdade
  (leitor de tela) e a ativa tem o traço laranja.

## Os três montes (seção 12 das regras)

**Já fez** (aparência e clareza, sem mudar costume):
- O que o balcão pergunta primeiro vem primeiro: a busca de cliente antes do filtro raro; o dono do carro no topo da ficha do veículo.
- Todo aviso tem ícone e palavra junto da cor: status de OS, "Atrasada", "Pendente", "Dentro do prazo", "Vencida", erros de tela e de campo, KM suspeito.
- Valores em dinheiro alinhados à direita e em coluna, nas tabelas das fichas.
- "Total", "Valor" e a placa lidos do mesmo jeito em toda tabela; "Abrir" e "Abrir OS" viraram o botão pequeno da peça.
- Texto de dica de mouse virou `Dica` (acende também no teclado).

**Sugere** (com a recomendação; ela decide):
1. **A placa na tabela "O que comprou" da ficha do cliente** é só texto: a OS traz a placa, não o id do carro. Recomendação: ligar à placa do carro do próprio cliente (já está na ficha) pra virar `LinkPlaca`. Fica de fora porque mexe no que o teste de hoje cobre; é pequena.
2. **Garantias: o cliente não abre a ficha dele**, porque a janela do banco (`ordens_servico_garantias`) só traz o nome. Recomendação: incluir `cliente_id` (migration + `lib/garantias.ts`), pra o nome virar `LinkCliente`. É banco: não fiz.
3. **Garantias: ordem da lista.** Hoje é a que vence mais tarde primeiro, então quem está pra vencer fica no fim. Recomendação: na aba "Dentro do prazo", a que vence mais cedo primeiro. É costume da loja: não mudei.
4. **Fichas: listas compridas.** "O que comprou", "Como pagou" e o histórico do carro crescem sem limite (cliente com 28 OS = 28 linhas, duas vezes). Recomendação: mostrar as 6 mais recentes e um "Ver todas". Não apliquei porque a lista é o assunto da ficha (regra "quando rolar não serve") e muda o que se vê de primeira.
5. **"Como pagou"** repete a lista de OS quase igual à de "O que comprou". Recomendação: juntar numa coluna ("Forma") da outra tabela. Mexe em organização que a Sofia conhece: pedir antes.
6. **Ficha do veículo e do cliente: "faturada" é verde sempre.** A lista de OS (tarefa 7) sabe se falta nota e mostra "Faturada, falta NFS-e" em amarelo e "Finalizada" em verde. As fichas só leem o status. Recomendação: depois que a tarefa 7 entrar, ligar as fichas ao `SeloDaOrdem` dela.
7. **Peças compartilhadas (`src/components/`, não mexi):**
   - `LinkCliente`: o nome do cliente aparece dentro de uma caixa com borda, como um botão; ficaria melhor como link (sem caixa), igual a uma peça nova.
   - `Combobox` (a Marca no cadastro do veículo): fica com 36 px de altura e fundo diferente dos campos de 44 px ao lado. Vale uma versão `sakura-campo`.
   - `CartaoNumero`: o texto embaixo do número não quebra linha (o bloco não encolhe); a ficha do veículo precisou de `max-w-[17rem]` pra frase do KM não sair do cartão. Vale a peça quebrar linha sozinha.
   - `AcoesDaLinha` (lista de Clientes) ainda é a antiga: "Ver veículos" e o lápis ficam na linha, "Excluir" no menu. A tarefa 7 já renovou essa peça; vale a lista de Clientes ganhar o visual dela quando a 7 entrar (e dizer qual é o "próximo passo" da linha: hoje é "Ver veículos").
8. **O "+" dentro do texto** ("+ Novo cliente", "+ Adicionar veículo"): o `Botao` tem ícone próprio (`Plus`). Não troquei: as cenas (`site/ferramentas/cenas.mjs`) clicam pelo texto exato. Se a Sofia quiser o ícone, a cena muda junto.

**Virou tarefa**: nenhum defeito achado de passagem pedindo issue. Uma observação de teste: o teste da ficha do cliente
procurava "R$ 0,00" na tela inteira; desde a tarefa 5 o número do cartão "Total comprado" passa por R$ 0,00 no primeiro
quadro da contagem. O teste agora olha só o cartão "Deve" (que é o que ele queria provar). Está dito no PR.

## O que foi conferido

- `npm run typecheck`, `lint` (0 erros), `test` (182 arquivos, 2.216 testes), `contraste`, `contraste:telas` (dois temas) e `largura:telas` (menu aberto e encolhido): verdes.
- Testes novos: `GarantiasPage.test.tsx` (6, visto reprovar ao trocar o selo de "Vencida"), `VeiculosDoClienteModal.test.tsx` (4) e três conferências de selo na ficha do cliente.
- Nenhuma linha de conta mudou (`src/schemas/`, `src/lib/` intactos).
- Não testado num Windows de verdade (a sessão não abre o Electron).
