# Plano de implementação — App mobile com persistência local (SQLite)

**Projeto:** Sabor da Gente · **Disciplina:** PDM · **Repositório:** `sabor-da-gente-mobile`
**Escopo:** só o app do cliente, funcionando **sem internet e sem API**, com todos os dados em SQLite no celular.

---

## 1. Objetivo

Entregar um app de pedidos de pizzaria completo, em que o cliente:

1. vê o cardápio (pizzas, esfihas, bebidas, combos, sobremesas);
2. monta pizzas (tamanho, massa, 1 ou 2 sabores, adicionais);
3. usa um carrinho que **não se perde** ao fechar o app;
4. finaliza o pedido (dados, endereço, pagamento simulado);
5. acompanha o status do pedido (simulado);
6. consulta o histórico, os endereços salvos e os favoritos.

Tudo é gravado num banco **SQLite no aparelho** (`expo-sqlite`).

### Fora do escopo agora
- Comunicação com API/backend (fica para a integração com o DAW III).
- Login com senha. O app tem **um perfil local** por aparelho.
- Área administrativa (fica no painel web do DAW III).
- Cupons e pagamento real.

---

## 2. Decisões técnicas

| Assunto | Decisão | Motivo |
|---|---|---|
| Banco | `expo-sqlite` (API assíncrona) | Já vem no Expo Go, sem build nativo. |
| Abertura do banco | `<SQLiteProvider databaseName="sabor-da-gente.db" onInit={migrar}>` no `_layout.tsx` | O app só renderiza depois do banco pronto. Todas as telas usam `useSQLiteContext()`. |
| Versão do esquema | `PRAGMA user_version` (ver §5) | Atualiza o banco de quem já tem o app instalado sem apagar dados. Mesmo papel do Flyway no Spring. |
| Dinheiro | `INTEGER` em **centavos** | Igual à API. Evita erro de arredondamento. Formata só na tela. |
| Nomes | Mesmas tabelas e colunas do `schema.sql` da API | A integração futura fica só de mapeamento. |
| Acesso ao banco | Só pelos **repositórios** (§4); telas nunca escrevem SQL | Separa responsabilidades e permite trocar SQLite por API depois. |
| Parâmetros SQL | Sempre `?` em `runAsync`/`getAllAsync`. **Nunca** concatenar texto do usuário | `execAsync` não escapa valores (risco de SQL injection). |
| Transações | `withTransactionAsync` para gravar um pedido | Pedido, itens, sabores e histórico entram juntos ou nada entra. |
| Plataforma de teste | **Android/iOS com Expo Go** | No navegador, o `expo-sqlite` é *alpha* e exige configuração extra (§10). |

---

## 3. Estrutura de pastas

```
src/
├── app/                         # telas (Expo Router)
│   ├── _layout.tsx              # SQLiteProvider + providers
│   ├── (tabs)/
│   │   ├── index.tsx            # Home
│   │   ├── cardapio.tsx         # (move de app/cardapio.tsx)
│   │   ├── pedidos.tsx          # NOVO: histórico
│   │   └── perfil.tsx           # NOVO: perfil, endereços, favoritos
│   ├── categoria/[slug].tsx     # NOVO: substitui esfihas/bebidas/sobremesas/combos
│   ├── monte-sua-pizza.tsx      # substitui pizzas.tsx
│   ├── carrinho.tsx
│   ├── finalizar-pedido.tsx
│   ├── pedido/[id].tsx          # NOVO: acompanhamento + detalhes
│   ├── enderecos/index.tsx      # NOVO
│   └── enderecos/[id].tsx       # NOVO: criar/editar
├── database/
│   ├── migracoes.ts             # função migrar(db) com PRAGMA user_version
│   ├── schema.ts                # SQL da versão 1 (Apêndice A)
│   └── seed.ts                  # cardápio inicial (do seed.sql da API)
├── models/                      # classes de domínio (POO)
│   ├── Produto.ts  Sabor.ts  Tamanho.ts  Massa.ts  Adicional.ts
│   ├── ItemCarrinho.ts          # abstrata → ItemProduto, ItemPizza
│   ├── Pedido.ts  StatusPedido.ts  Endereco.ts  Perfil.ts
├── repositories/
│   ├── CardapioRepository.ts    # interface
│   ├── CarrinhoRepository.ts
│   ├── PedidoRepository.ts
│   ├── PerfilRepository.ts      # perfil + endereços
│   ├── FavoritoRepository.ts
│   └── sqlite/                  # implementações SQLite de cada interface
├── services/
│   ├── PrecoService.ts          # regras de preço (R1–R4)
│   └── StatusService.ts         # simulação do status (R6)
├── context/
│   └── CarrinhoContext.tsx      # passa a usar o CarrinhoRepository
└── utils/
    └── dinheiro.ts              # formatarPreco(centavos) — hoje repetida em 6 telas
```

---

## 4. Camadas e POO

```
Tela  ──►  Context / hook  ──►  Service (regras)  ──►  Repository (interface)
                                                         └── SqliteXxxRepository (hoje)
                                                         └── ApiXxxRepository    (futuro)
```

### Repositórios (interfaces)
```ts
interface CardapioRepository {
  listarCategorias(): Promise<Categoria[]>;
  listarProdutos(filtro?: { categoriaSlug?: string; destaque?: boolean }): Promise<Produto[]>;
  buscarOpcoesPizza(): Promise<OpcoesPizza>;   // tamanhos, massas, sabores com preços, adicionais
}

interface CarrinhoRepository {
  listar(): Promise<ItemCarrinho[]>;
  adicionar(item: NovoItemCarrinho): Promise<void>;   // junta com item igual (soma quantidade)
  alterarQuantidade(id: number, quantidade: number): Promise<void>;
  remover(id: number): Promise<void>;
  limpar(): Promise<void>;
}

interface PedidoRepository {
  criar(dados: NovoPedido): Promise<Pedido>;          // transação
  listar(): Promise<PedidoResumo[]>;
  buscar(id: number): Promise<Pedido | null>;
  registrarStatus(id: number, status: StatusPedido): Promise<void>;
  cancelar(id: number): Promise<void>;
}
```
`PerfilRepository` (perfil e endereços) e `FavoritoRepository` seguem o mesmo padrão.

### Classes de domínio (para a apresentação de POO)
| Classe | Destaque |
|---|---|
| `ItemCarrinho` (abstrata) | `precoUnitario()` e `subtotal()`; `descricao()` abstrata |
| `ItemProduto extends ItemCarrinho` | preço fixo do produto |
| `ItemPizza extends ItemCarrinho` | preço calculado por R1; valida R2 no construtor |
| `Pedido` | `calcularTotais()`, `podeCancelar()`, `proximoStatus()` |
| `SqliteXxxRepository implements XxxRepository` | polimorfismo: a tela não sabe de onde vêm os dados |

---

## 5. Banco local

### 5.1 Tabelas (versão 1)
SQL completo no **Apêndice A** (testado no SQLite 3.45).

| Grupo | Tabelas | Observação |
|---|---|---|
| Cardápio | `categorias`, `produtos`, `tamanhos`, `massas`, `sabores`, `sabor_precos`, `adicionais` | Só leitura no app; vem do seed |
| Cliente | `perfil` (1 linha), `enderecos`, `favoritos` | Sem senha |
| Carrinho | `carrinho_itens`, `carrinho_item_sabores`, `carrinho_item_adicionais` | Substitui o AsyncStorage |
| Pedidos | `pedidos`, `itens_pedido`, `itens_pedido_sabores`, `itens_pedido_adicionais`, `pedido_status_historico` | Guarda nomes e preços da época (snapshot) |

**Diferenças em relação ao banco da API:** sem `usuarios`, `cupons`, `configuracoes`; `pagamentos` vira as colunas `forma_pagamento` e `troco_para` em `pedidos`; o pedido guarda `cliente_nome` e `cliente_telefone` direto.

### 5.2 Migrações
```ts
// src/database/migracoes.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V1 } from './schema';
import { popularCardapio } from './seed';

const VERSAO_ATUAL = 1;

export async function migrar(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON;'); // vale por conexão: sempre rodar
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;
  if (versao >= VERSAO_ATUAL) return;

  if (versao === 0) {
    await db.execAsync(SCHEMA_V1);
    await popularCardapio(db);
    versao = 1;
  }
  // if (versao === 1) { await db.execAsync('ALTER TABLE ...'); versao = 2; }

  await db.execAsync(`PRAGMA user_version = ${versao}`);
}
```
Regra para a equipe: **nunca editar o `SCHEMA_V1` depois de publicado.** Mudança no banco = novo bloco `if (versao === N)`.

### 5.3 Seed
`popularCardapio` insere o mesmo cardápio do `seed.sql` da API (mesmos IDs e preços). Testado: os `INSERT`s da API rodam sem alteração no esquema local, exceto `configuracoes` e `cupons`, que não existem no app.

---

## 6. Regras de negócio no app

| # | Regra | Onde |
|---|---|---|
| R1 | Preço da pizza = **maior** preço entre os sabores no tamanho + `massa.acrescimo` + soma dos adicionais | `PrecoService` / `ItemPizza` |
| R2 | 1 ≤ sabores ≤ `tamanho.max_sabores`, sem repetir, todos com preço no tamanho | `ItemPizza` + tela |
| R3 | Item igual já no carrinho (mesmo produto, ou mesma pizza com mesmos sabores/adicionais/observação) → soma a quantidade | `CarrinhoRepository.adicionar` |
| R4 | `total = subtotal + taxa_entrega`; taxa = R$ 5,00 (constante) se entrega, 0 se retirada | `PrecoService` |
| R5 | Entrega exige endereço; dinheiro com troco exige `troco_para ≥ total` | `finalizar-pedido` + `CHECK` no banco |
| R6 | **Status simulado:** realizado → em_preparacao (+30 s) → saiu_para_entrega ou pronto_para_retirada (+60 s) → entregue (+60 s) | `StatusService` |
| R7 | Cliente só cancela enquanto `realizado` | `Pedido.podeCancelar()` |

### Como funciona a simulação de status (R6)
`StatusService.atualizar(pedido)` compara o tempo desde `criado_em` com os prazos acima e grava em `pedido_status_historico` as etapas que já deveriam ter acontecido. Ela é chamada ao abrir `pedido/[id]` e a cada 5 s enquanto a tela estiver aberta. Assim:
- o status avança mesmo com o app fechado (ao reabrir, ele "alcança" o tempo);
- cada etapa fica registrada com horário, como num sistema real.

Para a apresentação, dá para pôr um **botão "Avançar status (demo)"** na tela do pedido.

---

## 7. Telas

| Tela | Situação | O que muda |
|---|---|---|
| Home `(tabs)/index` | existe | Destaques vêm de `produtos.destaque` e `sabores.destaque`; cada categoria abre a própria tela (hoje todas vão para o cardápio) |
| Cardápio `(tabs)/cardapio` | existe | Lista `categorias` do banco; `tipo='pizza'` → monte sua pizza; senão → `categoria/[slug]` |
| `categoria/[slug]` | **nova** | Uma tela para esfihas, bebidas, combos e sobremesas (remove as 3 telas duplicadas) |
| `monte-sua-pizza` | substitui `pizzas` | Tamanho → massa → sabores (até `max_sabores`) → adicionais → observação; preço ao vivo (R1) |
| `carrinho` | existe | Lê do `CarrinhoRepository`; mostra sabores, adicionais e observação; subtotal, taxa e total |
| `finalizar-pedido` | existe | Nome e telefone vêm do perfil (pede na primeira vez); escolhe endereço salvo ou cria; troca **`window.confirm` por `Alert.alert`** (hoje trava no celular); grava com `PedidoRepository.criar` |
| `pedido/[id]` | **nova** | Linha do tempo do status (R6), itens, totais, botão cancelar (R7) |
| `(tabs)/pedidos` | **nova** | Histórico (mais recentes primeiro) |
| `(tabs)/perfil` | **nova** | Dados do perfil, atalho para endereços e favoritos |
| `enderecos` | **novas** | Listar, criar, editar, marcar principal, remover (lógico) |
| Explore `(tabs)/explore` | **remover** | Sobra do modelo do Expo |

---

## 8. Etapas de implementação

Cada etapa termina com o app rodando, `npx tsc --noEmit` e `npx expo lint` sem erros, e um PR revisado por outro integrante.

### Etapa 0 — Limpeza (½ dia)
- [x] Remover a aba Explore, o `reset-project` e as imagens `react-logo*`; ajustar a cor da splash
- [x] Criar `utils/dinheiro.ts` e trocar as 6 cópias de `formatarPreco`
- [x] Trocar `window.alert/confirm` por `Alert.alert` em `finalizar-pedido`
- [x] Declarar todas as telas no `Stack` com `headerShown: false` (hoje 4 telas mostram o cabeçalho padrão)

### Etapa 1 — Banco e cardápio (2–3 dias) · *base para todas as outras*
- [x] `npx expo install expo-sqlite`
- [x] `database/schema.ts`, `migracoes.ts`, `seed.ts`
- [x] `SQLiteProvider` no `_layout.tsx`
- [x] Models do cardápio + `CardapioRepository` (SQLite)
- [x] Cardápio, `categoria/[slug]` e Home lendo do banco
- **Pronto quando:** apagar as listas fixas das telas não muda nada na interface.

### Etapa 2 — Monte sua pizza + carrinho (3 dias)
- [x] `ItemCarrinho`/`ItemProduto`/`ItemPizza` + `PrecoService`
- [x] `CarrinhoRepository` (SQLite) com R3
- [x] `CarrinhoContext` passa a usar o repositório; **remover o AsyncStorage**
- [x] Tela `monte-sua-pizza` (tamanho, massa, sabores, adicionais, observação)
- [x] Carrinho mostrando detalhes e taxa
- **Pronto quando:** fechar e reabrir o app mantém o carrinho; pizza Grande Calabresa + Portuguesa + borda = R$ 56,00.

### Etapa 3 — Perfil e endereços (2 dias) · *pode andar junto com a 2*
- [x] `PerfilRepository` (perfil + endereços)
- [x] Aba Perfil e telas de endereços
- **Pronto quando:** endereço salvo aparece no checkout após reiniciar o app.

### Etapa 4 — Finalizar pedido (2 dias) · *depende de 2 e 3*
- [x] `PedidoRepository.criar` em **uma transação**: pedido + itens + sabores + adicionais (com snapshot) + 1º status + limpa carrinho
- [x] Revisão com `Alert.alert` → grava → abre `pedido/[id]`
- **Pronto quando:** um erro no meio (ex.: forçar exceção) não deixa pedido pela metade nem esvazia o carrinho.

### Etapa 5 — Acompanhamento e histórico (2 dias)
- [ ] `StatusService` (R6) + tela `pedido/[id]` com linha do tempo
- [x] Cancelamento (R7)
- [x] Aba Pedidos (histórico) — hoje em `/pedidos`, aberta pela Home e pelo Perfil
- **Pronto quando:** fazer um pedido, fechar o app 2 min e reabrir mostra "Entregue" com todos os horários.

### Etapa 6 — Favoritos e acabamento (1–2 dias)
- [ ] `FavoritoRepository` + coração em produtos e sabores + lista no Perfil
- [ ] Estados de carregamento e vazio em todas as listas
- [ ] Atualizar o README (escopo, como rodar, decisões)

### Divisão sugerida (4 pessoas)
| Pessoa | Etapas |
|---|---|
| A | 0 → 1 (base do banco; revisa os PRs de banco) |
| B | 2 (pizza + carrinho) |
| C | 3 → 6 (perfil, endereços, favoritos) |
| D | 4 → 5 (pedido, status, histórico) |

B, C e D podem começar as telas com dados fixos enquanto A termina a Etapa 1, desde que usem as **interfaces dos repositórios** combinadas no §4.

---

## 9. Roteiro de teste final (demonstração)

1. Instalar o app num aparelho limpo → cardápio aparece (seed carregado).
2. **Ligar o modo avião.**
3. Montar uma pizza Grande meio Calabresa, meio Portuguesa, com borda → R$ 56,00.
4. Adicionar 6 esfihas de carne → aparecem numa linha só com quantidade 6.
5. Fechar o app à força e reabrir → carrinho intacto.
6. Finalizar: cadastrar perfil e endereço, entrega, dinheiro com troco para R$ 100,00 → total R$ 85,00.
7. Tela do pedido mostra "Pedido realizado"; avançar o status até "Entregue".
8. Aba Pedidos mostra o pedido; abrir os detalhes → mesmos itens e valores.
9. Favoritar a Calabresa → aparece no Perfil após reiniciar.

---

## 10. Riscos e cuidados

| Risco | Cuidado |
|---|---|
| **Web:** `expo-sqlite` no navegador é *alpha* e exige configurar o Metro para WASM e os cabeçalhos `Cross-Origin-Embedder-Policy: credentialless` e `Cross-Origin-Opener-Policy: same-origin` | Testar e apresentar no **celular (Expo Go)**. Se o professor exigir web, reservar 1 dia para essa configuração. |
| `withExclusiveTransactionAsync` não funciona na web | Usar `withTransactionAsync`. |
| Chaves estrangeiras desligadas por padrão | `PRAGMA foreign_keys = ON` no início de `migrar` (todo app aberto). |
| Banco antigo no celular de quem já testou | Mudanças sempre por migração; em desenvolvimento, desinstalar o app zera o banco. |
| Telas fazendo SQL direto "só dessa vez" | Revisão de PR recusa SQL fora de `repositories/sqlite`. |
| Dados do AsyncStorage antigo | Descartar: o carrinho antigo não tem `produtoId`. Remover a chave `@sabor-da-gente:carrinho` na migração 1. |

---

## 11. Depois: integração com a API

Quando a API do DAW III existir:
1. Criar `repositories/api/` implementando as **mesmas interfaces** com `fetch` (contrato em `docs/api.md` da API).
2. Cardápio: a API vira a fonte e o SQLite vira **cópia offline** (atualizada ao abrir o app).
3. Pedidos: enviados pela API; o SQLite guarda a cópia local para o histórico.
4. Perfil vira login (`/auth`), com o token no `expo-secure-store`. Com a conta, nome, telefone e endereços passam a vir do servidor, e o cliente não precisa mais preenchê-los no aparelho.

Telas, models e services **não mudam**. Só muda qual repositório é usado.

---

## Apêndice A — `SCHEMA_V1` (SQL do banco local)

```sql
PRAGMA journal_mode = 'wal';
PRAGMA foreign_keys = ON;

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
```