# 🍕 Sabor da Gente

Aplicativo mobile de uma pizzaria desenvolvido em **React Native + Expo + TypeScript** como projeto da disciplina de **Programação para Dispositivos Móveis (PDM)**.

O objetivo do projeto é desenvolver uma aplicação completa para pedidos de uma pizzaria, permitindo que clientes consultem o cardápio, montem seus pedidos, realizem a compra e acompanhem o pedido. A parte administrativa é desenvolvida na disciplina de Desenvolvimento de Aplicações Web 3 (DAW3), e as duas partes serão conectadas.

---

## 🎯 Objetivo do projeto

Desenvolver um sistema de pizzaria com:

- 📱 Aplicativo mobile para clientes;
- 🍕 Cardápio digital;
- 🛒 Carrinho de compras;
- 📦 Sistema de pedidos;
- 👤 Cadastro e gerenciamento de clientes;
- 💳 Formas de pagamento;
- 📍 Endereços de entrega;
- 👨‍💼 Área administrativa (projeto web de DAW3);
- 🗄️ Persistência de dados.

---

## 🛠️ Tecnologias

- React Native
- Expo e Expo Router
- TypeScript
- SQLite no aparelho (`expo-sqlite`)
- AsyncStorage (carrinho, até a Etapa 2)
- Git e GitHub

### Persistência local

O app funciona **sem internet**. O cardápio e os pedidos ficam num banco **SQLite** no próprio celular (`sabor-da-gente.db`):

- Na primeira abertura, o app cria as tabelas e carrega o cardápio inicial (`src/database/schema.ts` e `seed.ts`).
- A versão do banco é controlada por `PRAGMA user_version` (`src/database/migracoes.ts`). Uma mudança no banco vira uma nova migração; nunca se edita uma versão já publicada.
- Um pedido é gravado numa **transação**: o pedido, os itens e o primeiro status entram juntos, ou nada é gravado.

O carrinho ainda usa o **AsyncStorage**. Ele passa para o SQLite na Etapa 2 (ver `plano.md`).

As telas nunca escrevem SQL: elas usam os **repositórios** (`src/repositories`). Hoje a implementação é a SQLite; quando a API do painel administrativo (DAW3) existir, basta criar uma implementação nova com as mesmas interfaces e trocá-la em `src/hooks/use-repositorios.ts`.

---

## ▶️ Como executar

Pré-requisitos: Node.js instalado e o app **Expo Go** no celular Android (ou um emulador Android).

```bash
git clone https://github.com/Sabor-da-Gente/mobile-sabor-da-gente.git
cd mobile-sabor-da-gente
npm install
npx expo start
```

Escaneie o QR code com o Expo Go, com o celular na mesma rede Wi-Fi do computador.

**Enviar pedidos para a API (opcional).** Sem configuração, os pedidos ficam só no celular. Para também enviá-los à API do painel, crie um arquivo `.env.local` na raiz (ele não vai para o Git) com o endereço dela e reinicie o `npx expo start`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.10:8080
```

Use o IP do computador onde a API está rodando. Ele muda de rede para rede, por isso não fica no código.

**Navegador.** Também roda com `npx expo start --web`, mas o SQLite na web ainda está em fase *alpha* no Expo. Para testar e apresentar, use o celular.

---

## 🗂️ Estrutura do projeto

```text
src/
├── app/            rotas (Expo Router)
│   ├── (tabs)/     tela inicial
│   ├── categoria/  rota dinâmica /categoria/[id]
│   ├── cardapio.tsx
│   ├── carrinho.tsx
│   └── finalizar-pedido.tsx
├── components/     componentes reutilizáveis (tela-categoria, estados de tela)
├── constants/      paleta de cores e tema
├── context/        CarrinhoContext (estado global do carrinho)
├── database/       esquema, cardápio inicial e migrações do SQLite
├── hooks/          hooks de dados (use-produtos, use-repositorios)
├── models/         classes do cardápio (Categoria, Produto, Sabor, Tamanho...)
├── repositories/   interfaces de acesso aos dados
│   └── sqlite/     implementação com SQLite
├── services/       regras e conversões usadas pelas telas (cardápio, pedido)
├── types/          tipos compartilhados (Categoria, Produto, Pedido)
└── utils/          dinheiro, alertas e rotas
```

Caminho dos dados: **tela → hook → service → repositório → SQLite**.

---

## 🧩 Modelo de dados

O esquema completo está em `src/database/schema.ts`. Ele usa os mesmos nomes de tabelas e colunas do banco da API, para facilitar a integração.

| Grupo | Tabelas |
|---|---|
| Cardápio | `categorias`, `produtos`, `tamanhos`, `massas`, `sabores`, `sabor_precos`, `adicionais` |
| Pedidos | `pedidos`, `itens_pedido`, `pedido_status_historico` |
| Próximas etapas | `perfil`, `enderecos`, `favoritos`, `carrinho_itens` e as tabelas de sabores e adicionais dos itens |

O pedido guarda os nomes e os preços dos itens **no momento da compra**, para o histórico não mudar se o cardápio mudar.

Os preços são guardados em **centavos** (inteiros), por exemplo `4500` para R$ 45,00, o que evita erros de arredondamento.

---

## ✅ Funcionalidades implementadas

### 🏠 Tela inicial

- Identidade visual da pizzaria;
- Acesso ao cardápio;
- Categorias e produtos em destaque lidos do banco.

### 📋 Cardápio e categorias

Categorias: 🍕 Pizzas, 🥟 Esfihas, 🥤 Bebidas, 🎁 Combos e 🍫 Sobremesas, todas na mesma tela reutilizável (`/categoria/[id]`). Os dados vêm do banco.

- Busca por nome ou descrição, sem diferenciar acentos;
- Ordenação por menor preço;
- Indicador de carregamento, mensagem de erro com nova tentativa e aviso quando nada é encontrado;
- Confirmação ao adicionar um item, com atalho para o carrinho.

### 🍕 Pizzas

- Seleção de 1 a 2 sabores;
- Preço calculado pelo sabor de maior valor.

| Sabores | Preço |
|---|---:|
| Calabresa | R$ 45,00 |
| Frango com Catupiry | R$ 45,00 |
| Portuguesa | R$ 48,00 |
| Calabresa + Frango | R$ 45,00 |
| Calabresa + Portuguesa | R$ 48,00 |
| Frango + Portuguesa | R$ 48,00 |

### 🛒 Carrinho

- Adicionar, alterar quantidade e remover itens;
- Total do pedido;
- Limpar carrinho com confirmação;
- Persistência local: os itens continuam após fechar e reabrir o app.

### 📦 Finalização do pedido

- Dados do cliente, tipo de recebimento (entrega ou retirada) e forma de pagamento;
- Validação do troco (precisa cobrir o total);
- Resumo do pedido e confirmação;
- Pedido salvo no SQLite do celular e, se configurado, enviado à API.

---

## 🚧 Em desenvolvimento

As etapas estão detalhadas em `plano.md`.

- Monte sua pizza com tamanho, massa e adicionais, e carrinho no SQLite (Etapa 2);
- Perfil e endereços salvos (Etapa 3);
- Taxa de entrega no total do pedido (Etapa 4);
- Acompanhamento do status, histórico e cancelamento de pedidos (Etapa 5);
- Favoritos (Etapa 6);
- Validação do formato do telefone;
- Integração completa com a API do painel administrativo;
- Tema claro e escuro;

---

## 📸 Prints do app

*(adicionar prints da tela inicial, de uma categoria, do carrinho e da finalização do pedido)*

---

## 📄 Licença

Este projeto está sob a licença MIT.