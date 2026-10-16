/**
 * Mesmos nomes de tabelas e colunas do banco da API, com valores em centavos.
 *
 * ⚠️ Não edite depois de publicado: mudanças entram como nova versão em migracoes.ts.
 */
export const SCHEMA_V1 = `
-- Cardápio (somente leitura no app; carregado pelo seed)
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pizza','produtos')), icone TEXT,
  ordem INTEGER NOT NULL DEFAULT 0, ativa INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE produtos (
  id INTEGER PRIMARY KEY, categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nome TEXT NOT NULL, descricao TEXT, ingredientes TEXT, imagem_url TEXT,
  preco INTEGER NOT NULL CHECK (preco >= 0), destaque INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE tamanhos (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE, fatias INTEGER NOT NULL,
  max_sabores INTEGER NOT NULL DEFAULT 1, ordem INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE massas (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE, acrescimo INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE sabores (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE, descricao TEXT, ingredientes TEXT,
  imagem_url TEXT, destaque INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE sabor_precos (
  sabor_id INTEGER NOT NULL REFERENCES sabores(id),
  tamanho_id INTEGER NOT NULL REFERENCES tamanhos(id),
  preco INTEGER NOT NULL CHECK (preco >= 0),
  PRIMARY KEY (sabor_id, tamanho_id)
);
CREATE TABLE adicionais (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE, preco INTEGER NOT NULL CHECK (preco >= 0),
  ativo INTEGER NOT NULL DEFAULT 1
);

-- Cliente (um por aparelho)
CREATE TABLE perfil (
  id INTEGER PRIMARY KEY CHECK (id = 1), nome TEXT NOT NULL, telefone TEXT NOT NULL,
  email TEXT, atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE enderecos (
  id INTEGER PRIMARY KEY AUTOINCREMENT, apelido TEXT, logradouro TEXT NOT NULL, numero TEXT NOT NULL,
  complemento TEXT, bairro TEXT NOT NULL, cidade TEXT NOT NULL, uf TEXT NOT NULL DEFAULT 'PB',
  cep TEXT, referencia TEXT, principal INTEGER NOT NULL DEFAULT 0, ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE favoritos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER REFERENCES produtos(id), sabor_id INTEGER REFERENCES sabores(id),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK ((produto_id IS NULL) <> (sabor_id IS NULL))
);
CREATE UNIQUE INDEX uq_fav_produto ON favoritos(produto_id) WHERE produto_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fav_sabor   ON favoritos(sabor_id)   WHERE sabor_id   IS NOT NULL;

-- Carrinho (substitui o AsyncStorage)
CREATE TABLE carrinho_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto','pizza')),
  produto_id INTEGER REFERENCES produtos(id),
  tamanho_id INTEGER REFERENCES tamanhos(id),
  massa_id INTEGER REFERENCES massas(id),
  quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 50),
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK ((tipo = 'produto' AND produto_id IS NOT NULL AND tamanho_id IS NULL AND massa_id IS NULL)
      OR (tipo = 'pizza' AND produto_id IS NULL AND tamanho_id IS NOT NULL AND massa_id IS NOT NULL))
);
CREATE TABLE carrinho_item_sabores (
  item_id INTEGER NOT NULL REFERENCES carrinho_itens(id) ON DELETE CASCADE,
  sabor_id INTEGER NOT NULL REFERENCES sabores(id),
  PRIMARY KEY (item_id, sabor_id)
);
CREATE TABLE carrinho_item_adicionais (
  item_id INTEGER NOT NULL REFERENCES carrinho_itens(id) ON DELETE CASCADE,
  adicional_id INTEGER NOT NULL REFERENCES adicionais(id),
  PRIMARY KEY (item_id, adicional_id)
);

-- Pedidos (histórico do aparelho, com snapshot de nomes e preços)
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nome TEXT NOT NULL, cliente_telefone TEXT NOT NULL,
  tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('entrega','retirada')),
  endereco_id INTEGER REFERENCES enderecos(id), endereco_entrega TEXT,
  status TEXT NOT NULL DEFAULT 'realizado' CHECK (status IN ('realizado','em_preparacao',
         'saiu_para_entrega','pronto_para_retirada','entregue','cancelado')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix','cartao','dinheiro')),
  troco_para INTEGER,
  observacao TEXT,
  subtotal INTEGER NOT NULL, taxa_entrega INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK (tipo_entrega = 'retirada' OR endereco_entrega IS NOT NULL),
  CHECK (total = subtotal + taxa_entrega),
  CHECK (troco_para IS NULL OR (forma_pagamento = 'dinheiro' AND troco_para >= total))
);
CREATE TABLE itens_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto','pizza')),
  produto_id INTEGER REFERENCES produtos(id), tamanho_id INTEGER REFERENCES tamanhos(id),
  massa_id INTEGER REFERENCES massas(id),
  descricao TEXT NOT NULL, quantidade INTEGER NOT NULL CHECK (quantidade >= 1),
  preco_unitario INTEGER NOT NULL, subtotal INTEGER NOT NULL, observacao TEXT,
  CHECK (subtotal = preco_unitario * quantidade)
);
CREATE TABLE itens_pedido_sabores (
  item_id INTEGER NOT NULL REFERENCES itens_pedido(id) ON DELETE CASCADE,
  sabor_id INTEGER NOT NULL REFERENCES sabores(id), nome TEXT NOT NULL, preco INTEGER NOT NULL,
  PRIMARY KEY (item_id, sabor_id)
);
CREATE TABLE itens_pedido_adicionais (
  item_id INTEGER NOT NULL REFERENCES itens_pedido(id) ON DELETE CASCADE,
  adicional_id INTEGER NOT NULL REFERENCES adicionais(id), nome TEXT NOT NULL, preco INTEGER NOT NULL,
  PRIMARY KEY (item_id, adicional_id)
);
CREATE TABLE pedido_status_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_historico_pedido ON pedido_status_historico(pedido_id);
`;
