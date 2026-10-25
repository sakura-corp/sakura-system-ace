# Serviços padrão com faixa de preço (base do pré-cadastro)

Esta lista é a base de um pré-cadastro melhor de serviços para a empresa nova, no lugar da lista
curta da migration `0030_categorias_e_servicos_padrao.sql` (que não tem preço). **O preço aqui é só
sugestão**: a loja muda tudo na instalação. É a tarefa #786. A migration é outra tarefa.

Levantado em **25/10/2026**, em páginas públicas da internet (tabelas de licitação, matérias, guias
de preço, site de rede de oficinas). As melhores são duas licitações de prefeituras do interior de SP
(Saltinho e Paranapanema), marcadas com **SP**. Só entrou preço de página que foi aberta de verdade. Onde não
achamos preço confiável, a faixa diz **sem fonte**. Do interior de SP só achamos pneu e alinhamento:
ver as observações. Preço de loja que usa o sistema **não** foi usado.

Valem para todas as tabelas:
- Preço de **mão de obra**, carro de passeio comum. Quando a fonte inclui a peça, está escrito.
- "Fonte nacional" quer dizer que a página não é de SP. Quando é de SP, está escrito.
- Ano da fonte entre parênteses. "Sem data" quer dizer que a página não mostra a data.
- "Já existe (0030)": o nome já está cadastrado na migration 0030. Não cadastrar duas vezes.

## 1. Borracharia (pneus)

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Conserto de pneu furado (macarrão ou remendo) | R$ 27 a R$ 52 | [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024), [TJCE, mapa de preços](https://portal.tjce.jus.br/uploads/2024/08/4MapadePrecosGerenciamentodaFrota_34_2024.pdf) (2024), [Prefeitura de Paranapanema, edital do pregão 16/2024](https://www.paranapanema.sp.gov.br/portal/editais/0/1/3689/vencedores) (2024) | Por pneu, carro leve, sem câmara. **SP:** Saltinho (preço registrado de uma borracharia local) R$ 29,99. TJCE (Ceará, cotação): R$ 27 a R$ 36. Paranapanema (SP, valor de referência do edital, não é preço fechado): R$ 51,66 para carro. Utilitário no TJCE: R$ 76 a R$ 110 |
| Conserto de pneu com manchão (com câmara) | R$ 35 | [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024) | **SP.** Por pneu, veículo leve. Um só preço registrado, de uma borracharia local |
| Vulcanização simples | R$ 70 | [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024) | **SP.** Por pneu, veículo leve. Um só preço registrado. Serviço extra, não estava no plano |
| Montagem de Pneu | R$ 25 | [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024) | **SP.** O preço é de "montagem e desmontagem" juntas, por pneu, veículo leve (R$ 24,99, um auto center local). Já existe (0030) |
| Desmontagem de pneu | R$ 25 (junto com a montagem) | [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024) | **SP.** Mesma linha da montagem: a fonte não separa os dois |
| Rodízio de Pneus | sem fonte | | Já existe (0030). Em Saltinho (SP, 2024) o rodízio só aparece dentro de um pacote com alinhamento e balanceamento das 4 rodas (R$ 94,99), sem preço próprio |
| Troca de válvula do pneu | R$ 15 (serviço) | [TCE-SE, pesquisa de preço](https://tce.se.gov.br/transparencia/Lists/Licitacoes/Attachments/1042/4.%20RELAT%C3%93RIO%20DE%20PESQUISA%20DE%20PRE%C3%87O%20-%2027.03.2025.pdf) (2025), [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024) | **SP:** "troca de bicos" em veículo leve, R$ 15 de mão de obra (Saltinho). TCE-SE (Sergipe, nacional): a válvula em si (peça) custa R$ 4 a R$ 10 |
| Calibragem com nitrogênio | R$ 10 a R$ 20 | [Canaltech](https://canaltech.com.br/carros/vale-a-pena-calibrar-o-pneu-com-nitrogenio-veja-pros-e-contras/) (sem data) | Por pneu. Fonte nacional. Outra matéria, mais antiga (cerca de 2019), diz o mesmo valor |
| Troca de estepe ou de roda | sem fonte | | |

## 2. Alinhamento e balanceamento

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Alinhamento Dianteiro | R$ 60 a R$ 150 | [TCE-SE](https://tce.se.gov.br/transparencia/Lists/Licitacoes/Attachments/1042/4.%20RELAT%C3%93RIO%20DE%20PESQUISA%20DE%20PRE%C3%87O%20-%2027.03.2025.pdf) (2025), [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Por veículo. TCE-SE (Sergipe) achou R$ 60 a R$ 70 em 3 cotações. oficina.app: R$ 80 a R$ 150. [Webmotors](https://www.webmotors.com.br/servicos-automotivos/alinhamento-e-balanceamento) (sem data) fala em R$ 80 a R$ 200. Fonte nacional. **SP:** em Saltinho (2024) o pacote de alinhamento, balanceamento e rodízio das 4 rodas, automóvel, ficou em R$ 94,99; caminhonete e van, R$ 124,99. Já existe (0030) |
| Alinhamento Traseiro (alinhamento das 4 rodas ou 3D) | R$ 120 a R$ 250 | [Doutor Multas](https://doutormultas.com.br/quanto-custa-um-alinhamento-e-balanceamento/) (2026) | Alinhamento total, 4 rodas. O 3D costuma ser um pouco mais caro. Fonte nacional, blog. Já existe (0030) |
| Balanceamento (por roda) | R$ 12 a R$ 40 | [TCE-SE](https://tce.se.gov.br/transparencia/Lists/Licitacoes/Attachments/1042/4.%20RELAT%C3%93RIO%20DE%20PESQUISA%20DE%20PRE%C3%87O%20-%2027.03.2025.pdf) (2025), [Doutor Multas](https://doutormultas.com.br/quanto-custa-um-alinhamento-e-balanceamento/) (2026) | Por roda. TCE-SE: R$ 12 a R$ 20 (licitação, Sergipe). Doutor Multas: R$ 15 a R$ 40. Fonte nacional. Já existe (0030) |
| Cambagem e caster (correção, por lado) | R$ 50 a R$ 95 | [Prefeitura de Saltinho, atas de registro de preços](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0) (2024), [Procon Goiás](https://goias.gov.br/procon/procon-goias-divulga-pesquisa-de-precos-de-itens-para-manutencao-preventiva-do-veiculo/) (2018) | **SP:** "cambagem completa" em automóvel, R$ 94,99 por veículo (Saltinho); caminhonete e van, R$ 131,88 (outra empresa). Procon Goiás: R$ 50 a R$ 82 só de cambagem, **fonte muito antiga (2018), nacional**. A fonte não fala em "por lado". Junta os 4 já existentes (0030): Cambagem Dianteira Direita e Esquerda, Caster Dianteiro Direito e Esquerdo |
| Desempeno de roda de ferro | sem fonte | | |
| Desempeno de roda de liga leve | sem fonte | | |

## 3. Suspensão e amortecedores

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Troca de amortecedores (par, dianteiro ou traseiro) | R$ 200 a R$ 450 | [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Por par, peça à parte. A fonte não separa dianteiro de traseiro. Fonte nacional |
| Troca de bandeja (balança) | sem fonte | | |
| Troca de pivô | sem fonte | | |
| Troca de terminal de direção | sem fonte | | |
| Troca de bieleta | sem fonte | | |
| Troca de coxim ou kit batente | R$ 150 a R$ 600 | [Guia do Auto](https://guiadoauto.com.br/barulho-metalico-na-suspensao-como-resolver) (2026) | A matéria fala em "buchas e coxins", valor em oficinas, e não deixa claro se inclui a peça. Fonte nacional |
| Troca da suspensão dianteira completa | R$ 400 a R$ 2.000 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026) | Só mão de obra (média R$ 900). Faixa larga, depende do carro. Fonte nacional |
| Revisão de suspensão | sem fonte | | |

## 4. Freios

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Troca de pastilha de freio (por eixo) | R$ 80 a R$ 300 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026), [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Dianteira, só mão de obra. Acheio: R$ 80 a R$ 300. oficina.app: R$ 120 a R$ 250. Com peça, [Webmotors](https://www.webmotors.com.br/servicos-automotivos/troca-de-pastilha-de-freio) (sem data) fala em R$ 150 a R$ 400 e [Porto Seguro](https://www.portoseguro.com.br/centro-automotivo/pastilha-de-freio) em "a partir de R$ 179,90" por eixo. Fonte nacional |
| Troca de disco e pastilha | R$ 200 a R$ 800 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026) | Nas 4 rodas, só mão de obra (média R$ 400). [Webmotors](https://www.webmotors.com.br/servicos-automotivos/troca-de-disco-de-freio) (sem data): R$ 200 a R$ 600 de mão de obra só do disco. Fonte nacional |
| Retífica de Disco de Freio | sem fonte | | Já existe (0030) |
| Troca de lona ou sapata e tambor | sem fonte | | |
| Sangria de Freio (troca de fluido) | R$ 120 a R$ 250 | [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Fluido à parte. [Autocidade](https://autocidade.com/guia/quanto-custa-revisao) (2026) fala em R$ 90 a R$ 170, mas com o fluido. Fonte nacional. Já existe (0030) |
| Higienização de Freio | sem fonte | | Já existe (0030) |

## 5. Troca de óleo e filtros

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Troca de óleo do motor (só a mão de obra) | R$ 50 a R$ 120 | [Guia do Auto](https://guiadoauto.com.br/valor-troca-de-oleo-mao-de-obra) (2026) | Carro popular. **Valor de uma oficina de Louveira (SP), maio de 2026**, citado pela matéria. Carro com acesso difícil (protetor de cárter): R$ 120 a R$ 220. [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026, nacional): R$ 40 a R$ 150 |
| Troca de filtro de óleo | sem fonte | | A mão de obra costuma vir junto com a troca de óleo |
| Troca de filtro de ar | R$ 65 a R$ 180 | [Autocidade](https://autocidade.com/guia/quanto-custa-revisao) (2026) | **Inclui a peça.** Oficina independente. Fonte nacional |
| Troca de filtro de combustível | R$ 100 a R$ 250 | [Autocidade](https://autocidade.com/guia/quanto-custa-revisao) (2026) | **Inclui a peça.** Oficina independente. Fonte nacional |
| Troca de filtro de cabine (ar-condicionado) | R$ 80 a R$ 220 | [Autocidade](https://autocidade.com/guia/quanto-custa-revisao) (2026) | **Inclui a peça.** Oficina independente. Fonte nacional |
| Troca de óleo de câmbio | R$ 800 a R$ 2.500 | [Vrum](https://www.vrum.com.br/aceleradas/2026/07/7463165-por-que-a-troca-do-oleo-do-cambio-automatico-e-um-servico-tao-caro.html) (2026) | Só câmbio **automático**, com máquina e **com o fluido** (inclui material). Para câmbio manual não achamos preço (a matéria diz que em geral nem precisa trocar). Fonte nacional |

## 6. Elétrica e bateria

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Teste de bateria e alternador | sem fonte | | |
| Troca de bateria (instalação) | R$ 40 a R$ 150 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026), [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Só o serviço, bateria à parte. Acheio: R$ 40 a R$ 150. oficina.app: R$ 60 a R$ 120. Fonte nacional |
| Troca de lâmpada | sem fonte | | |
| Troca de velas (jogo) | R$ 80 a R$ 200 | [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Velas à parte. Fonte nacional |
| Diagnóstico com scanner | R$ 80 a R$ 300 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026), [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Acheio: R$ 80 a R$ 300 (média R$ 150). oficina.app: R$ 100 a R$ 250. Fonte nacional |

## 7. Ar-condicionado

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Higienização do ar-condicionado | R$ 99,90 a R$ 130 | [Porto Seguro](https://www.portoseguro.com.br/centro-automotivo/higienizacao-ar-condicionado) (visto em 2026), [Vrum](https://www.vrum.com.br/noticias/vale-a-pena-instalar-ar-condicionado-em-carro-usado/) (2019) | Com ozônio. Porto Seguro: "a partir de R$ 99,90", filtro não incluso, rede de oficinas (empresa de SP, preço de rede). Vrum: média de R$ 130, **fonte antiga (2019)**. Fonte nacional |
| Recarga de gás do ar-condicionado | R$ 150 a R$ 500 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026), [Vrum](https://www.vrum.com.br/noticias/vale-a-pena-instalar-ar-condicionado-em-carro-usado/) (2019) | Acheio: R$ 150 a R$ 500 (média R$ 280). Vrum: média R$ 150, e até R$ 500 se houver vazamento (**2019**). Fonte nacional |

## 8. Outros

| Serviço (como a loja escreve) | Faixa típica | Fonte | Observação |
|---|---|---|---|
| Troca de correia dentada (mão de obra) | R$ 300 a R$ 1.200 | [Acheio Profissional](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026) (2026), [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Acheio (correia e tensor, só mão de obra): R$ 300 a R$ 1.200. oficina.app: R$ 400 a R$ 900, kit à parte. Varia muito por motor. Fonte nacional |
| Troca do líquido de arrefecimento | sem fonte | | |
| Limpeza de bicos injetores | R$ 150 a R$ 400 | [Webmotors](https://www.webmotors.com.br/servicos-automotivos/limpeza-de-bico-injetor) (sem data), [Autocidade](https://autocidade.com/guia/quanto-custa-revisao) (2026) | Webmotors: R$ 150 a R$ 300. Autocidade: R$ 170 a R$ 400. Podem incluir produto de limpeza. Fonte nacional |
| Troca de palhetas | sem fonte | | |
| Troca de escapamento | sem fonte | | |
| Revisão preventiva básica (inspeção e fluidos) | R$ 200 a R$ 450 | [oficina.app](https://oficina.app/tabela-de-precos-para-oficina-mecanica/) (2026) | Serviço extra, não estava no plano. Só mão de obra. [Webmotors](https://www.webmotors.com.br/servicos-automotivos/check-up-para-carros) (sem data) fala em R$ 100 a R$ 500 de check-up. Fonte nacional |

### Genéricos que continuam (sem preço)

Já existem na 0030 e continuam como estão, sem pesquisar: **Serviço técnico – Suspensão**,
**Serviço técnico – Amortecedores**, **Serviço técnico – Freios**, **Serviço técnico – Outros**.
Também continua o **Eixo Traseiro Completo** (já existe na 0030), que não entrou na pesquisa.

## Fontes consultadas

Todas abertas em 25/10/2026.

**Públicas (licitação e órgão do governo)**
- **SP** [Prefeitura de Saltinho, extrato das atas de registro de preços, pregão eletrônico 07/2024 (Diário Oficial de 18/03/2024)](https://www.dioe.com.br/exibe_do.php?i=NDcyMzQ0): preços registrados por empresas locais, só mão de obra, sem peça. Pneu (conserto, manchão, vulcanização, montagem, bico), alinhamento e cambagem.
- **SP** [Prefeitura de Paranapanema, pregão presencial 16/2024](https://www.paranapanema.sp.gov.br/portal/editais/0/1/3689/vencedores): só valor de referência do edital (estimativa, não é preço fechado). Conserto de pneu de carro.
- [TJCE, mapa de preços de gerenciamento da frota (2024)](https://portal.tjce.jus.br/uploads/2024/08/4MapadePrecosGerenciamentodaFrota_34_2024.pdf): conserto de pneu. Ceará.
- [TCE-SE, relatório de pesquisa de preço (27/03/2025)](https://tce.se.gov.br/transparencia/Lists/Licitacoes/Attachments/1042/4.%20RELAT%C3%93RIO%20DE%20PESQUISA%20DE%20PRE%C3%87O%20-%2027.03.2025.pdf): alinhamento, balanceamento, válvula. Sergipe. Pneu de utilitário (265/70 R16).
- [Procon Goiás, pesquisa de manutenção preventiva (2018)](https://goias.gov.br/procon/procon-goias-divulga-pesquisa-de-precos-de-itens-para-manutencao-preventiva-do-veiculo/): cambagem. Muito antiga.

**Sites e matérias (todas nacionais, salvo a observação)**
- [Vrum, troca do óleo do câmbio automático (07/2026)](https://www.vrum.com.br/aceleradas/2026/07/7463165-por-que-a-troca-do-oleo-do-cambio-automatico-e-um-servico-tao-caro.html)
- [Guia do Auto, valor da troca de óleo (23/10/2026)](https://guiadoauto.com.br/valor-troca-de-oleo-mao-de-obra): cita oficina de Louveira (SP).
- [Guia do Auto, barulho metálico na suspensão (09/10/2026)](https://guiadoauto.com.br/barulho-metalico-na-suspensao-como-resolver)
- [Acheio Profissional, tabela de mão de obra mecânica (2026)](https://acheioprofissional.com.br/blog/tabela-mao-de-obra-mecanica-2026): só mão de obra, mínimo, médio e máximo.
- [oficina.app, tabela de preços e mão de obra (03/07/2026)](https://oficina.app/tabela-de-precos-para-oficina-mecanica/): tabela de exemplo de uma empresa de programa para oficina.
- [Autocidade, quanto custa a revisão (junho de 2026, preços de março de 2026)](https://autocidade.com/guia/quanto-custa-revisao): muitos itens com peça.
- [Doutor Multas, quanto custa alinhamento e balanceamento (atualizado em 05/09/2026)](https://doutormultas.com.br/quanto-custa-um-alinhamento-e-balanceamento/)
- [Webmotors, serviços automotivos (sem data)](https://www.webmotors.com.br/servicos-automotivos/alinhamento-e-balanceamento): páginas de alinhamento, pastilha, disco, bicos e check-up.
- [Porto Seguro, centro automotivo (visto em 2026)](https://www.portoseguro.com.br/centro-automotivo/pastilha-de-freio): preço "a partir de", rede de oficinas.
- [Vrum, ar-condicionado em carro usado (02/11/2019)](https://www.vrum.com.br/noticias/vale-a-pena-instalar-ar-condicionado-em-carro-usado/): antiga.
- [Canaltech, calibragem com nitrogênio (sem data)](https://canaltech.com.br/carros/vale-a-pena-calibrar-o-pneu-com-nitrogenio-veja-pros-e-contras/)

Duas fontes foram abertas mas ficaram só de conferência: a matéria de março de 2026 do
[Vrum](https://www.vrum.com.br/aceleradas/2026/03/7380623-seu-carro-esta-fazendo-barulho-veja-quanto-custa-ignorar-o-problema.html)
(pastilha e correia, mas com peça) e a mesma página do Guia do Auto sobre amortecedor, que só traz preço com peça.

## Pra quem escrever a migration

- **Decidido pela Sofia (25/10/2026): os serviços entram sem preço**, igual à 0030 hoje
  (`preco_padrao` vazio). A faixa deste arquivo é só referência pra loja consultar ao preencher.
- **Não renomear** os nomes que já existem na 0030 (a tabela marca cada um). Cadastrar só os que
  faltam, e não duplicar.
- **Os "sem fonte"** entram do mesmo jeito: sem preço também, então não muda nada pra eles.
- **Categorias**: as tabelas daqui (borracharia, óleo e filtros, elétrica, ar-condicionado…) não
  batem com as categorias de serviço da 0030 (Pneus, Suspensão, Amortecedores, Freios, Alinhamento,
  Outros Serviços). Criar categoria nova ou encaixar nas que existem é decisão da tarefa da migration.
- Do interior de SP só há preço de pneu e alinhamento (Saltinho e Paranapanema, 2024) e a troca de
  óleo de Louveira. Antes de usar estas faixas pra conversar com cliente, vale conferir com uma ou
  duas lojas parceiras.
