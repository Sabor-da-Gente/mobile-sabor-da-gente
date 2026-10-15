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
- AsyncStorage (persistência local)
- Git e GitHub

### Persistência local

O carrinho é salvo no dispositivo com o **AsyncStorage**, e continua lá depois de fechar e reabrir o app. Ele foi escolhido por ser simples, assíncrono, já integrado ao ecossistema Expo e suficiente para o volume de dados do carrinho. O acesso aos dados do cardápio passa por uma camada de serviço (`src/services`), preparada para receber a API do painel administrativo.

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
├── components/     componentes reutilizáveis (tela-categoria)
├── constants/      paleta de cores e tema
├── context/        CarrinhoContext (estado global e persistência)
├── data/           cardápio local
├── hooks/          hooks de dados (use-produtos)
├── services/       camada de acesso aos dados (cardapioService)
├── types/          tipos compartilhados (Categoria, Produto)
└── utils/          formatação de dinheiro e alertas
```

As telas não leem `src/data` diretamente: passam por `src/services`, que é o ponto onde a API será conectada.

---

## 🧩 Modelo de dados

**Categoria:** id, título, emoji, descrição, subtítulo, máximo de sabores e nome do item.

**Produto:** id, categoria, nome, descrição, emoji, preço em centavos e disponibilidade.

**Item do carrinho:** id, nome, sabores, preço unitário em centavos e quantidade.

Os preços são guardados em **centavos** (inteiros), por exemplo `4500` para R$ 45,00, o que evita erros de arredondamento.

---

## ✅ Funcionalidades implementadas

### 🏠 Tela inicial

- Identidade visual da pizzaria;
- Acesso ao cardápio;
- Categorias de produtos geradas a partir da lista do cardápio;
- Seção de produtos mais pedidos.

### 📋 Cardápio e categorias

Categorias: 🍕 Pizzas, 🥟 Esfihas, 🥤 Bebidas e 🍫 Sobremesas, todas na mesma tela reutilizável (`/categoria/[id]`).

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
- Resumo do pedido e confirmação.

---

## 🚧 Em desenvolvimento

- Salvar o pedido no dispositivo, com histórico, detalhe, edição e cancelamento;
- Validação de formato do telefone e do valor do troco;
- Integração com a API do painel administrativo;
- Tema claro e escuro;
- Cadastro, login e endereços salvos.

---

## 📸 Prints do app

*(adicionar prints da tela inicial, de uma categoria, do carrinho e da finalização do pedido)*

---

## 📄 Licença

Este projeto está sob a licença MIT.