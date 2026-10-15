# Rascunho: a Sala da Sakura com o que se aprendeu construindo a Bibi

> **Rascunho pra Sofia revisar (15/10/2026).** Não virou issue ainda. A Bibi continua pessoal e
> **não aparece na Sala**: daqui só entra o que se aprendeu fazendo ela. A Sala é o escritório
> virtual da Sakura (#467 com dados de exemplo, #468 ao vivo). Quando ela aprovar, o que for
> aceito entra nas issues #467 e #468 e no `docs/painel.md`, e este arquivo é apagado.

## O que muda na #467 (acréscimos; nada do que já está escrito sai)

1. **Cada bonequinho é um ponto de luz, e o estado é o jeito de brilhar** (a "bolinha" da Bibi):
   | Estado | Como aparece |
   |---|---|
   | trabalhando | brilho que pulsa devagar |
   | precisa de você | brilho parado, com anel em volta e o "!" |
   | com erro | brilho vermelho parado, com o "×" |
   | dormindo | quase apagado, com o "zZ" |
   | livre | brilho fraco e parado |
   Pessoa continua com a foto redonda; o brilho vai em volta. Robô do Claude e robô da casa são
   a esfera com um símbolo diferente. **Só SVG e CSS**; com `prefers-reduced-motion` o pulso
   vira um anel fixo mais forte (o estado nunca depende só de animação).
2. **Modo TV** (o "quadro solto em outro monitor"): `/sala?tv` mostra só a sala, grande, sem
   barra lateral, pra deixar num segundo monitor. Mesma informação, o texto das legendas maior.
3. **O topo diz a hora da última atualização** ("atualizado agora há pouco"), com a regra de tempo
   da tarefa. Na #468 isso vira o estado da conexão (abaixo).
4. **Tempo sem pegadinha**: o "dormindo" (3 dias) e o "há quanto tempo" contam **tempo corrido a
   partir do "agora" recebido por parâmetro**; nunca dia de calendário, nunca `toISOString`.
5. **Link só do que é nosso**: o cartão do bonequinho só abre endereço `https://github.com/sakura-corp/`
   (aba nova, `rel="noopener noreferrer"`); qualquer outro vira texto sem link.
6. **Foto da tela no PR**: nos dois temas e a 375 px (Playwright, dados de exemplo), anexada ao PR.
7. **Estimativa**: de 6 h pra **8 h** (o pulso e o modo TV).

## O que muda na #468 (ao vivo)

- **Estado da conexão sempre visível**: "ao vivo", "reconectando…", "desatualizado há N min". O
  painel nunca mostra dado velho como se fosse de agora.
- **Só dado de verdade**: o que o GitHub ainda não informa aparece como "sem informação" (e não
  como "livre"), dizendo do que depende.

## O que a Bibi ensinou e **não** entra agora

- **A aparência** (vidro, malva, fundo escuro): o `docs/painel.md` decidiu calmo e claro. **Só
  muda se ela escolher por foto** (ver "Pra decidir").
- **Nota de produtividade por pessoa**: não. A equipe é de sócios em entrada; ranking de pessoa
  vira vigilância e pesa na conversa do vínculo (`EQUIPE.md`, privado). Se um dia houver número,
  é da **leva**, nunca da pessoa.
- **Conversa com IA, receitas, roteador**: o painel não usa IA.

## Ideia pra depois, com tarefa própria quando chegar a vez

**"A leva no tempo"** (a linha do tempo com raias da Bibi): uma raia por pessoa e por robô, das
atividades reais do dia (commit, PR, rodada), com filtro Dia / Semana. **Depende da #468**, porque
precisa do histórico de verdade; com dado de mentira não diria nada.

## Pra decidir

1. **Os acréscimos 1 a 7 da #467**: entram todos? Eu cortaria o 6 (foto) se for pesado pro
   aquecimento deles.
2. **Visual da Sala**: (A) o do painel, claro e calmo, ou (B) o da Bibi (escuro, vidro, malva) só
   na Sala? Decide por foto: eu monto as duas com dados de exemplo antes de mexer em issue.
3. **A #351 está com o Gustavo**; as mudanças dela (se houver) vão como comentário, não reescrita.
