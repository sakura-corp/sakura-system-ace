# Deu problema no banco — e agora?

> ## Leia a primeira tabela e pare por aí
>
> Quase todo susto com banco de dados **não precisa de backup nenhum**. Antes de mexer em
> cópia de segurança, veja na tabela abaixo em qual caso você está — porque restaurar um
> backup por engano, num caso que não pedia, é um jeito de transformar um problema pequeno
> num problema grande.

## Em qual caso você está?

| O que aconteceu | O que fazer | Quanto demora | Perde alguma coisa? |
|---|---|---|---|
| **Apaguei uma OS / cliente / peça sem querer** | **Não use backup.** Use a tela de Auditoria (ícone ao lado da engrenagem). Ela guarda a linha inteira como estava antes de ser apagada | minutos | nada |
| **Alguém alterou um valor errado e quero saber o que era antes** | Auditoria também. Ela mostra "antes" e "depois" de cada alteração | minutos | nada |
| **O Supabase está fora do ar** | **Não faça nada.** É com eles, e volta sozinho. Confira em `status.supabase.com` | de minutos a horas | nada |
| **O sistema não abre / dá erro de coluna** | Não é caso de backup. Olhe a faixa amarela no topo do app (diz qual migration falta rodar) e a tela de Diagnóstico | minutos | nada |
| **Rodei um SQL errado no SQL Editor e estragou uma tabela** | Aí sim: **restaurar**, seção abaixo | 1 a 2 horas | o que entrou depois da última cópia (até 1 dia) |
| **O projeto do Supabase foi apagado** | **Restaurar** num projeto novo, e depois reapontar o computador da loja | 2 a 3 horas | até 1 dia |
| **Perdi o `chave-do-backup.txt`** | Não tem o que fazer com as cópias antigas — elas ficam ilegíveis pra sempre. Gere uma chave nova (Passo 1 do §9 do PROJETO_STATUS) e troque o secret; as cópias novas já saem com ela | 10 minutos | as cópias antigas |

> **A Auditoria resolve o caso mais comum, e é bom saber disso antes do aperto.** Ela registra
> criação, alteração e exclusão com a linha inteira, em 16 tabelas. Um "apaguei sem querer" se
> resolve lá, na hora, sem restaurar nada e sem perder o trabalho do dia.

## O que existe de cópia, e onde

Todo dia às 3 da manhã, um robô do GitHub tira uma cópia do banco de **cada empresa** e guarda
**nos dois lugares ao mesmo tempo**:

1. **Repositório privado** `caranovavidanova/ssace-backups` → aba **Releases** → uma release por
   empresa (ex: `backup-pneus-amigao`), com os arquivos anexados
2. **Cloudflare R2** → bucket `sakura-backups` → pasta com o nome da empresa

Ficam guardadas **as 30 cópias mais recentes + a primeira cópia de cada um dos últimos 12 meses**.
Os nomes são assim: `pneus-amigao-2026-09-18.age`.

**Dentro de cada arquivo tem:** o banco inteiro da loja, os logins, e os XMLs das notas fiscais
(que não ficam no banco e são os documentos que a lei manda guardar 5 anos).

**O arquivo é cifrado.** Só abre com o `chave-do-backup.txt`, que está no seu PC (`C:\age`) e no
seu Google Drive. Quem pegar o arquivo sem a chave não lê nada.

---

## Restaurar — parte 1: abrir o arquivo (você consegue sozinha)

**1. Baixe a cópia do dia que você quer.** No repositório privado: Releases → a release da
empresa → clique no arquivo com a data que você quer. Ele vai pra sua pasta de Downloads.

**2. Abra o PowerShell na pasta do age:** menu Iniciar → digite `powershell` → na janela preta:

```powershell
cd C:\age
```

**3. Abra o arquivo** (troque o nome pelo do arquivo que você baixou):

```powershell
.\age.exe -d -i chave-do-backup.txt -o backup.tar.gz "$env:USERPROFILE\Downloads\pneus-amigao-2026-09-18.age"
tar -xzf backup.tar.gz
```

Vai aparecer uma pasta com o nome da empresa dentro de `C:\age`, e dentro dela:

- `banco.sql` — o banco inteiro
- `notas/` — os XMLs das notas fiscais

Se chegou até aqui, **a cópia está boa** — e essa é a hora de respirar: o dado existe.

## Restaurar — parte 2: colocar de volta (aqui peça ajuda)

Esta parte mexe no banco de produção e não dá pra desfazer. **Faça numa sessão comigo** (ou com
quem estiver cuidando do sistema). O passo a passo abaixo está escrito pra quem for executar.

**Se for num projeto Supabase novo** (o caso de "o projeto foi apagado"):

1. Criar o projeto novo no Supabase, região São Paulo
2. **Não** rodar o `instalacao-completa.sql` — o `banco.sql` do backup já traz a estrutura junto
3. Em Settings → Database, desligar temporariamente o que impedir a carga, e rodar:

```bash
psql "<conexão do projeto NOVO>" -f banco.sql
```

4. **Um erro é esperado e pode ser ignorado:** `ERROR: schema "public" already exists`. O projeto
   novo já nasce com esse espaço criado; o resto do arquivo roda normalmente.
5. Conferir, antes de liberar pra loja:

```sql
select
  (select count(*) from clientes)        as clientes,
  (select count(*) from ordens_servico)  as ordens,
  (select count(*) from caixa_movimentos) as caixa,
  (select count(*) from pg_policies where schemaname = 'public') as regras_de_seguranca;
```

A última coluna é a que ninguém lembra de conferir: se ela vier **zero**, o banco voltou com os
dados certos e **sem as travas de segurança** — não libere pra loja assim.

6. Subir os XMLs da pasta `notas/` de volta pro bucket `notas-fiscais` do projeto novo (junto vão
   os `.valores.json` das NFS-e: o valor de cada nota da Giap, que a prefeitura não devolve)
7. **Em cada computador da loja**, reapontar a conexão: abrir o sistema → na tela de login, o link
   discreto de trocar a conexão → colar a URL e a chave `anon` do projeto novo

**Se for no mesmo projeto** (o caso de "rodei um SQL errado"): não restaure o arquivo inteiro por
cima. Quase sempre o certo é restaurar **só a tabela estragada**, extraindo a parte dela do
`banco.sql`. Restaurar tudo por cima apagaria também o que entrou de bom desde a última cópia.

---

## Quanto se perde, no pior caso

Até **um dia** de lançamentos — o que entrou entre a cópia da madrugada e a hora do problema.

Para a loja, um dia de OS e caixa é um dia de retrabalho, não uma tragédia: as OS do dia estão em
papel ou na cabeça de quem atendeu, e o caixa se refaz. Mas é bom saber o número **antes**, e não
descobrir no dia.

> Se um dia isso passar a ser inaceitável (loja grande, muitas lojas), o que resolve é o
> *point-in-time recovery* do Supabase — um add-on pago que permite voltar até o **segundo**. Não
> está contratado hoje, de propósito: custa bem mais que o backup diário e a operação atual não
> justifica.

## Conferir de vez em quando (5 minutos, uma vez por mês)

Backup que ninguém olha tem o costume de estar quebrado justo no dia em que precisa:

1. Abrir https://github.com/sakura-corp/sakura-system-ace/actions → **Backup do banco**
2. Ver se as últimas rodadas estão verdes
3. Uma vez por mês, baixar a cópia mais recente e fazer a **parte 1** acima (abrir o arquivo). Se
   abriu e o `banco.sql` tem conteúdo, está tudo certo — pode apagar o que baixou

Se uma rodada falhar, o GitHub manda e-mail pra você sozinho. **E-mail de falha de backup não é
spam** — é o único aviso que existe.
