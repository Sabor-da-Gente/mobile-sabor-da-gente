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
- Git e GitHub

### Persistência local

O app funciona **sem internet**. O cardápio, o carrinho, o perfil, os endereços e os pedidos ficam num banco **SQLite** no próprio celular (`sabor-da-gente.db`):

- Na primeira abertura, o app cria as tabelas e carrega o cardápio inicial (`src/database/schema.ts` e `seed.ts`).
- A versão do banco é controlada por `PRAGMA user_version` (`src/database/migracoes.ts`). Uma mudança no banco vira uma nova migração; nunca se edita uma versão já publicada.
- Um pedido é gravado numa **transação**: o pedido, os itens e o primeiro status entram juntos, ou nada é gravado.

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
│   ├── (tabs)/     abas Início e Perfil
│   ├── categoria/  rota dinâmica /categoria/[id]
│   ├── cardapio.tsx
│   ├── monte-sua-pizza.tsx
│   ├── carrinho.tsx
│   ├── finalizar-pedido.tsx
│   ├── pedidos.tsx
│   ├── pedido/     detalhe do pedido /pedido/[id]
│   └── enderecos/  lista e cadastro/edição de endereços
├── components/     componentes reutilizáveis (tela-categoria, estados de tela)
├── constants/      paleta de cores e tema
├── context/        CarrinhoContext (estado global do carrinho)
├── database/       esquema, cardápio inicial e migrações do SQLite
├── hooks/          hooks de dados (use-produtos, use-repositorios)
├── models/         classes do cardápio e do carrinho (Produto, Sabor, ItemPizza...)
├── repositories/   interfaces de acesso aos dados
│   └── sqlite/     implementação com SQLite
├── services/       regras de preço (PrecoService) e conversões usadas pelas telas
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
| Cliente | `perfil` (uma linha por aparelho), `enderecos` |
| Carrinho | `carrinho_itens`, `carrinho_item_sabores`, `carrinho_item_adicionais` |
| Pedidos | `pedidos`, `itens_pedido`, `pedido_status_historico` |
| Próximas etapas | `favoritos`, `itens_pedido_sabores`, `itens_pedido_adicionais` |

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

### 🍕 Monte sua pizza

Tela própria (`/monte-sua-pizza`): tamanho → massa → sabores → adicionais → observação, com o preço atualizado a cada escolha.

- **Preço** = maior preço entre os sabores no tamanho + acréscimo da massa + adicionais;
- Até 2 sabores (o limite vem do tamanho), sem repetir;
- Ao trocar o tamanho, os sabores escolhidos que cabem nele são mantidos.

| Exemplo (Grande) | Preço |
|---|---:|
| Calabresa | R$ 45,00 |
| Calabresa + Portuguesa | R$ 48,00 |
| Calabresa + Portuguesa + borda de catupiry | R$ 56,00 |

### 🛒 Carrinho

- Adicionar, alterar quantidade e remover itens;
- Item igual ao que já está no carrinho soma na mesma linha (ex.: 6 esfihas de carne = 1 linha com quantidade 6);
- Detalhes de cada pizza: sabores, massa, adicionais e observação;
- Subtotal, taxa de entrega (R$ 5,00, só para entrega) e total;
- Limpar carrinho com confirmação;
- Salvo no SQLite: os itens continuam após fechar e reabrir o app.

### 👤 Perfil e endereços

- Aba **Perfil**: nome, telefone (com DDD) e e-mail opcional, salvos só no celular, sem senha;
- **Endereços**: cadastrar, editar, remover e escolher o principal. O primeiro cadastrado já vira o principal; se o principal for removido, outro assume;
- Validação de telefone, CEP (opcional) e UF.

### 📦 Finalização do pedido

- Nome e telefone já vêm do perfil; no primeiro pedido eles são salvos automaticamente;
- Entrega em um endereço salvo (o principal vem escolhido) ou cadastro de um novo sem sair do pedido;
- Tipo de recebimento (entrega ou retirada) e forma de pagamento;
- Taxa de entrega somada ao total quando o pedido é para entrega;
- Validação do troco (precisa cobrir o total);
- Resumo do pedido e confirmação;
- Pedido salvo no SQLite do celular e, se configurado, enviado à API.

---

## 🚧 Em desenvolvimento

As etapas estão detalhadas em `plano.md`.

- Pedido com sabores e adicionais em tabelas próprias, em vez de texto no item (Etapa 4);
- Acompanhamento do status do pedido (Etapa 5);
- Favoritos (Etapa 6);
- Login e cadastro, junto com a integração com a API do painel;
- Integração completa com a API do painel administrativo;
- Tema claro e escuro;

---

## 📸 Prints do app

*(adicionar prints da tela inicial, de uma categoria, do carrinho e da finalização do pedido)*

---

## 📄 Licença

Este projeto está sob a licença MIT.