-- Financeiro do painel (#654): as tabelas do banco D1 "FINANCEIRO" (Cloudflare, nunca no GitHub).
-- Só a estrutura e as categorias iniciais: nenhum valor de dinheiro mora neste arquivo.
-- Quem aplica é a Sofia, na conta dela da Cloudflare (wrangler d1 migrations apply).

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL
);

INSERT OR IGNORE INTO categorias (id, nome, ordem) VALUES
  (1, 'Mensalidade de loja', 1),
  (2, 'Servidor', 2),
  (3, 'Claude', 3),
  (4, 'Contabilidade', 4),
  (5, 'Imposto', 5),
  (6, 'Outros', 6);

CREATE TABLE IF NOT EXISTS lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Dia de calendário "AAAA-MM-DD".
  data TEXT NOT NULL CHECK (length(data) = 10 AND data GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  -- Sempre em centavos inteiros e positivos; o tipo diz se entrou ou saiu.
  valor_centavos INTEGER NOT NULL CHECK (typeof(valor_centavos) = 'integer' AND valor_centavos > 0),
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  descricao TEXT NOT NULL DEFAULT '',
  -- Login do GitHub de quem lançou.
  lancado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT
);

CREATE INDEX IF NOT EXISTS lancamentos_por_data ON lancamentos (data);
