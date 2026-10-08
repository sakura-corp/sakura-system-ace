# Sakura System — AutoCenter Edition

Sistema de gestão para autocenters e borracharias, parte da linha Sakura System.

## Stack

- **Electron** — empacota a interface como app desktop (Windows)
- **React + Vite + TypeScript** — interface do usuário
- **Tailwind CSS** — estilização com a paleta visual Sakura System
- **Supabase** — banco de dados em nuvem (Postgres) e autenticação

## Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Supabase:
   ```bash
   cp .env.example .env
   ```
3. Num projeto Supabase novo, cole no SQL Editor o arquivo único `supabase/instalacao/instalacao-completa.sql` (todas as migrations, geradas por `npm run gerar-instalacao`). O passo a passo completo está em `supabase/instalacao/INSTALAR-LOJA-NOVA.md`.
4. Inicie o app em modo desenvolvimento (abre a janela do Electron com hot reload):
   ```bash
   npm run dev
   ```

## Build de produção

```bash
npm run electron:build
```

Gera o instalador do Windows em `release/`.

## Status

Em uso real numa loja, com NFC-e e NFS-e em produção. As versões publicadas estão nas [releases do `ssace-versoes`](https://github.com/sakura-corp/ssace-versoes/releases) (até a 0.9.50, nas [deste repositório](https://github.com/sakura-corp/sakura-system-ace/releases)), e o que cada uma trouxe, em `docs/modulos.md` ("Empacotamento e versões"). O `CHANGELOG.md` parou na 0.9.2.

A memória do projeto (decisões, estado de cada módulo, pendências) começa no `PROJETO_STATUS.md`. Quem entra na equipe começa pela seção 0 dele e pelo `docs/painel.md`.
