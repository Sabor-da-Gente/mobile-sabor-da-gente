export const SCHEMA_V2 = `
-- Fila de requisições ao back end: o id (autoincremento) é a ordem de envio.
CREATE TABLE fila_sincronizacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT NOT NULL,
  operacao TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviando','erro')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT
);
CREATE INDEX idx_fila_usuario ON fila_sincronizacao(usuario_id, status, id);

-- Perfil: um por conta (antes era um único perfil por aparelho, com id = 1).
-- O perfil da v1 não tem dono; o da conta vem do Supabase ao entrar.
DROP TABLE perfil;
CREATE TABLE perfil (
  usuario_id TEXT PRIMARY KEY,
  nome TEXT NOT NULL, telefone TEXT NOT NULL DEFAULT '', email TEXT,
  sincronizado INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- Endereços: os da v1 ficam com usuario_id NULL e não aparecem para nenhuma conta.
ALTER TABLE enderecos ADD COLUMN usuario_id TEXT;
ALTER TABLE enderecos ADD COLUMN id_remoto INTEGER;
ALTER TABLE enderecos ADD COLUMN sincronizado INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_enderecos_usuario ON enderecos(usuario_id, ativo);
CREATE UNIQUE INDEX uq_enderecos_remoto ON enderecos(usuario_id, id_remoto) WHERE id_remoto IS NOT NULL;

-- Favoritos: únicos por conta. IFNULL porque o SQLite trata NULLs como diferentes no UNIQUE.
ALTER TABLE favoritos ADD COLUMN usuario_id TEXT;
DROP INDEX uq_fav_produto;
DROP INDEX uq_fav_sabor;
CREATE UNIQUE INDEX uq_fav_produto ON favoritos(IFNULL(usuario_id,''), produto_id) WHERE produto_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fav_sabor   ON favoritos(IFNULL(usuario_id,''), sabor_id)   WHERE sabor_id   IS NOT NULL;

-- Pedidos: recriados porque o SQLite não altera CHECK.
-- Saem os CHECKs de total e troco (quem calcula é o servidor, e o total estimado offline
-- pode mudar) e as chaves para o cardápio (o item é uma fotografia; pedidos vindos do
-- servidor podem citar produtos e sabores que não existem no SQLite).
CREATE TABLE pedidos_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id TEXT,
  id_remoto TEXT,
  numero INTEGER,
  chave_cliente TEXT UNIQUE,
  sincronizado INTEGER NOT NULL DEFAULT 0,
  cliente_nome TEXT NOT NULL, cliente_telefone TEXT NOT NULL,
  tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('entrega','retirada')),
  endereco_id INTEGER REFERENCES enderecos(id), endereco_entrega TEXT,
  status TEXT NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','em_preparo',
         'saiu_para_entrega','pronto_para_retirada','entregue','cancelado')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix','cartao','dinheiro')),
  troco_para INTEGER,
  observacao TEXT, motivo_cancelamento TEXT,
  subtotal INTEGER NOT NULL, desconto INTEGER NOT NULL DEFAULT 0,
  taxa_entrega INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK (tipo_entrega = 'retirada' OR endereco_entrega IS NOT NULL)
);
INSERT INTO pedidos_v2
  (id, cliente_nome, cliente_telefone, tipo_entrega, endereco_id, endereco_entrega, status,
   forma_pagamento, troco_para, observacao, subtotal, taxa_entrega, total, criado_em)
SELECT id, cliente_nome, cliente_telefone, tipo_entrega, endereco_id, endereco_entrega,
       CASE status WHEN 'realizado' THEN 'recebido' WHEN 'em_preparacao' THEN 'em_preparo' ELSE status END,
       forma_pagamento, troco_para, observacao, subtotal, taxa_entrega, total, criado_em
  FROM pedidos;

CREATE TABLE itens_pedido_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto','pizza')),
  produto_id INTEGER, tamanho_id INTEGER, massa_id INTEGER,
  descricao TEXT NOT NULL, quantidade INTEGER NOT NULL CHECK (quantidade >= 1),
  preco_unitario INTEGER NOT NULL, subtotal INTEGER NOT NULL, observacao TEXT,
  CHECK (subtotal = preco_unitario * quantidade)
);
INSERT INTO itens_pedido_v2
  (id, pedido_id, tipo, produto_id, tamanho_id, massa_id, descricao, quantidade,
   preco_unitario, subtotal, observacao)
SELECT id, pedido_id, tipo, produto_id, tamanho_id, massa_id, descricao, quantidade,
       preco_unitario, subtotal, observacao
  FROM itens_pedido;

-- O servidor devolve só os nomes dos sabores e adicionais: o id fica opcional.
-- A ordem de escolha continua sendo a do rowid (id).
CREATE TABLE itens_pedido_sabores_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES itens_pedido(id) ON DELETE CASCADE,
  sabor_id INTEGER, nome TEXT NOT NULL, preco INTEGER
);
INSERT INTO itens_pedido_sabores_v2 (item_id, sabor_id, nome, preco)
SELECT item_id, sabor_id, nome, preco FROM itens_pedido_sabores ORDER BY rowid;

CREATE TABLE itens_pedido_adicionais_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES itens_pedido(id) ON DELETE CASCADE,
  adicional_id INTEGER, nome TEXT NOT NULL, preco INTEGER
);
INSERT INTO itens_pedido_adicionais_v2 (item_id, adicional_id, nome, preco)
SELECT item_id, adicional_id, nome, preco FROM itens_pedido_adicionais ORDER BY rowid;

-- id_remoto evita gravar duas vezes o mesmo evento (pull + Realtime).
CREATE TABLE pedido_status_historico_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  id_remoto INTEGER UNIQUE,
  status TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
INSERT INTO pedido_status_historico_v2 (id, pedido_id, status, criado_em)
SELECT id, pedido_id,
       CASE status WHEN 'realizado' THEN 'recebido' WHEN 'em_preparacao' THEN 'em_preparo' ELSE status END,
       criado_em
  FROM pedido_status_historico;

DROP TABLE pedido_status_historico;
DROP TABLE itens_pedido_adicionais;
DROP TABLE itens_pedido_sabores;
DROP TABLE itens_pedido;
DROP TABLE pedidos;
ALTER TABLE pedidos_v2 RENAME TO pedidos;
ALTER TABLE itens_pedido_v2 RENAME TO itens_pedido;
ALTER TABLE itens_pedido_sabores_v2 RENAME TO itens_pedido_sabores;
ALTER TABLE itens_pedido_adicionais_v2 RENAME TO itens_pedido_adicionais;
ALTER TABLE pedido_status_historico_v2 RENAME TO pedido_status_historico;

CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id, criado_em);
CREATE UNIQUE INDEX uq_pedidos_remoto ON pedidos(id_remoto) WHERE id_remoto IS NOT NULL;
CREATE UNIQUE INDEX uq_pedidos_numero ON pedidos(numero) WHERE numero IS NOT NULL;
CREATE INDEX idx_itens_pedido ON itens_pedido(pedido_id);
CREATE INDEX idx_itens_sabores_item ON itens_pedido_sabores(item_id);
CREATE INDEX idx_itens_adicionais_item ON itens_pedido_adicionais(item_id);
CREATE INDEX idx_historico_pedido ON pedido_status_historico(pedido_id);
`;
