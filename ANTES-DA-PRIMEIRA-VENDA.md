# Antes da primeira venda — contrato e papéis (LGPD)

> ## ⚠️ Isto não é aconselhamento jurídico
>
> Este arquivo existe para você **saber que a pergunta existe**, não para responder por um
> advogado. Antes de assinar qualquer coisa com uma loja de terceiro, mostre este texto (ou o
> contrato que sair dele) **para um advogado ou para a sua contabilidade**. É uma conversa de
> uma hora, e é bem mais barata antes da venda do que depois de um problema.

> **Atualização de 05/10/2026**: a Sakura Corp tem CNPJ desde 02/10, e o contrato com as lojas
> sai em nome da empresa. Onde este texto diz "você", leia **a Sakura Corp**: é a empresa que
> assina como operadora. As contas dos serviços (Supabase, Anthropic, Focus NFe) foram abertas no
> seu nome, antes da empresa existir: vale perguntar ao advogado se elas precisam passar pra
> empresa.

## Por que isso aparece agora

A decisão de 28/08/2026 foi: **tudo na sua conta** — Supabase, Anthropic e Focus NFe. O dono da
loja não cria conta em serviço nenhum e nunca vê que eles existem. Isso é o certo para o produto
(é o que justifica a mensalidade e o que te permite dar suporte de verdade), e tem uma
consequência que já estava escrita no `PROJETO_STATUS.md`: **o dado dos clientes daquela loja
fica sob a sua responsabilidade**.

Enquanto o sistema roda só na borracharia do seu pai, isso é combinado de família. Na primeira
loja de terceiro, passa a ser contrato.

## As duas palavras que resolvem 90% da conversa

- **Controladora** é quem decide sobre o dado. Nome, telefone e placa do cliente da loja são
  dados que **a loja** coletou, para o negócio **dela** — então **a loja é a controladora**.
- **Operadora** é quem trata o dado *por conta* da controladora, seguindo instrução dela. Como o
  banco de dados, a cópia de segurança e a leitura de nota por IA ficam nas suas contas, **você é
  a operadora**.

Isso não é formalidade: é o que define **quem responde pelo quê** se um dia houver um incidente
(vazamento, dado apagado por engano, cliente exigindo que os dados dele sejam apagados). Sem
estar escrito, a discussão acontece na hora pior possível.

## O que o contrato precisa ter

Um contrato de prestação de serviço normal (o que você entrega, quanto custa, por quanto tempo,
como se cancela) **mais uma cláusula de tratamento de dados** com estes seis pontos:

1. **Quem é controlador e quem é operador** — a loja é controladora; você é operadora, e trata o
   dado apenas para fazer o sistema funcionar e dar suporte.
2. **Para que o dado pode ser usado** — operar o sistema, corrigir defeito e dar suporte. E o que
   você **não** vai fazer: usar o cadastro de clientes da loja para outra finalidade, vender ou
   ceder esse dado, ou usá-lo para treinar nada.
3. **Quem pode ver** — você (suporte) e os serviços que o sistema usa por baixo (hoje: Supabase
   para guardar o dado; Anthropic só quando alguém usa "Importar por foto"; Focus NFe só o que
   vai na nota fiscal). Vale listar com nome, porque um dia essa lista muda e a loja tem que ser
   avisada.
4. **Segurança** — o que já existe hoje: cada empresa em um banco separado, login por operador
   com permissão por módulo, trilha de auditoria de quem mexeu em quê, e cópia de segurança
   automática. Não prometa mais do que o sistema faz.
5. **O que acontece se houver incidente** — você avisa a loja **sem demora** (a loja é quem
   responde perante o cliente dela e perante a ANPD), contando o que aconteceu e o que foi feito.
6. **O que acontece quando o contrato acaba** — e é o ponto que mais gera briga se ficar em
   aberto. Escreva três coisas: (a) a loja recebe uma **cópia dos dados dela** em formato que dá
   para usar; (b) você **apaga** o que sobrou; (c) **em quantos dias** cada uma dessas coisas
   acontece (30 dias é um prazo comum e realista).

## O registro de operações de tratamento

É uma tabela, não um documento jurídico — só precisa existir e estar razoavelmente em dia. Serve
para você conseguir responder, sem pesquisar, "que dado eu tenho, de quem, para quê e por quanto
tempo". Um rascunho do que já é verdade hoje:

| Que dado | De quem | Para quê | Onde fica | Por quanto tempo |
|---|---|---|---|---|
| Nome, telefone, CPF/CNPJ, endereço, veículo | Clientes da loja | Emitir OS, cobrar, emitir nota | Supabase (banco daquela empresa) | Enquanto a loja for cliente + prazo fiscal |
| Ficha de funcionário (documentos, família) | Funcionários da loja | Cadastro de RH e comissão | Supabase (banco daquela empresa) | Enquanto a loja for cliente |
| XML das notas fiscais | Clientes da loja | Obrigação fiscal | Supabase Storage | 5 anos (exigência da lei) |
| Foto/PDF de nota de compra | Fornecedor da loja | Ler os produtos e cadastrar | Enviado à Anthropic na hora da leitura, não guardado | Não é guardado pelo sistema |
| Login e permissões dos operadores | Funcionários da loja | Entrar no sistema | Supabase Auth | Enquanto a loja for cliente |

**Duas coisas que valem saber ao preencher isso de verdade:** a ficha de funcionário guarda mais
dado do que o sistema usa (RG, CNH, tipo sanguíneo, dados do cônjuge e dos filhos) — reduzir essa
lista é um item já mapeado no guia de melhorias (`TR-12.3`), e dado que não existe não vaza. E a
cópia de segurança do banco só existe no plano pago do Supabase, o que já é a decisão tomada:
**Pro desde a primeira venda**.

## O que fazer com este arquivo

1. Levar para um advogado ou para a sua contabilidade e pedir um **contrato de prestação de
   serviço com cláusula de tratamento de dados**, usando os seis pontos acima como lista do que
   precisa estar lá.
2. Assinar com a **primeira** loja de terceiro — não com a do seu pai, e não depois da terceira.
3. Manter a tabela acima em dia quando algo mudar (serviço novo por baixo, campo novo que guarda
   dado de pessoa).
