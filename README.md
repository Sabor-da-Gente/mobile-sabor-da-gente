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

## 📌 Escopo

Esta versão é o **app do cliente funcionando sem internet**: tudo fica num banco SQLite no próprio celular, com **um perfil por aparelho**.

**Fica para depois**, junto com a API do painel administrativo (DAW3):

- login e cadastro com senha (hoje o perfil é local, sem senha);
- cardápio e status do pedido vindos do servidor (hoje o cardápio vem do banco local e o status é simulado);
- área administrativa (é o projeto web de DAW3);
- pagamento real e cupons.

---

## 🛠️ Tecnologias

- React Native
- Expo e Expo Router
- TypeScript
- SQLite no aparelho (`expo-sqlite`)
- Git e GitHub

---

## 🧠 Decisões técnicas

| Assunto | Decisão | Por quê |
|---|---|---|
| Onde ficam os dados | **SQLite no celular** (`expo-sqlite`, arquivo `sabor-da-gente.db`): cardápio, carrinho, perfil, endereços, favoritos e pedidos | O app funciona offline e já vem no Expo Go, sem build nativo |
| Criação e evolução do banco | Na primeira abertura, cria as tabelas e carrega o cardápio (`src/database`). Versões controladas por `PRAGMA user_version`; cada mudança é uma **nova migração** | Quem já tem o app instalado recebe as mudanças sem perder dados |
| Acesso aos dados | As telas nunca escrevem SQL: usam **repositórios** (interfaces em `src/repositories`, implementação em `sqlite/`) | Quando a API existir, basta criar outra implementação e trocá-la em `src/hooks/use-repositorios.ts` |
| SQL seguro | Valores sempre por parâmetro (`?`), nunca concatenando texto digitado | Evita SQL injection |
| Dinheiro | Em **centavos** (inteiros): `4500` = R$ 45,00 | Sem erros de arredondamento |
| Gravar um pedido | Pedido, itens, sabores, adicionais, primeiro status e limpeza do carrinho numa **transação** | Ou entra tudo, ou nada muda |
| Histórico | O pedido copia nomes e preços da época | O histórico não muda se o cardápio mudar |
| Regras de negócio | Preço da pizza, taxa e validações no `PrecoService`; status no `StatusService` | Ficam num lugar só, fora das telas |
| Status do pedido | Simulado pelo tempo (30 s, 60 s, 60 s), gravando o horário de cada etapa | Dá para demonstrar o acompanhamento sem servidor |
| Nomes dos status | O app usa os combinados com o admin (`recebido`, `em_preparo`...); o banco segue o plano (`realizado`, `em_preparacao`...). O repositório traduz | Os dois lados ainda vão escolher um padrão único |

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

**Antes de abrir um PR**, rode a checagem de tipos e o lint:

```bash
npx tsc --noEmit
npx expo lint
```

**Zerar os dados do app:** desinstale o Expo Go (ou limpe os dados dele) e abra o projeto de novo. O banco é recriado com o cardápio inicial.

O roteiro usado na apresentação está no `plano.md` (§9).

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
├── components/     componentes reutilizáveis (tela-categoria, linha-do-tempo, botao-favorito...)
├── constants/      paleta de cores e tema
├── context/        CarrinhoContext e FavoritosContext (estado compartilhado entre telas)
├── database/       esquema, cardápio inicial e migrações do SQLite
├── hooks/          hooks de dados (use-produtos, use-repositorios)
├── models/         classes do cardápio e do carrinho (Produto, Sabor, ItemPizza...)
├── repositories/   interfaces de acesso aos dados
│   └── sqlite/     implementação com SQLite
├── services/       regras de negócio (PrecoService, StatusService) e serviços usados pelas telas
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
| Cliente | `perfil` (uma linha por aparelho), `enderecos`, `favoritos` |
| Carrinho | `carrinho_itens`, `carrinho_item_sabores`, `carrinho_item_adicionais` |
| Pedidos | `pedidos`, `itens_pedido`, `itens_pedido_sabores`, `itens_pedido_adicionais`, `pedido_status_historico` |

O pedido guarda os nomes e os preços dos itens **no momento da compra**, e todos os valores são em **centavos** (veja as decisões técnicas acima).

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

### ❤️ Favoritos

- Coração (♡/♥) nos produtos de cada categoria e nos sabores do "Monte sua pizza";
- Lista de favoritos no Perfil, guardada no celular;
- Tocar num produto favorito abre a categoria dele; tocar num sabor abre o "Monte sua pizza" com ele já escolhido.

### ⏱️ Acompanhamento do pedido

- Linha do tempo no detalhe do pedido, com o horário de cada etapa: Recebido → Em preparo → Saiu para entrega (ou Pronto para retirada) → Entregue;
- **Status simulado**, sem servidor: Em preparo 30 s depois do pedido, a etapa seguinte 60 s depois e Entregue mais 60 s depois;
- O status "alcança" o tempo mesmo com o app fechado: ao reabrir, as etapas que já deveriam ter acontecido aparecem com o horário certo;
- Com a tela do pedido aberta, atualiza sozinho a cada 5 segundos;
- Botão **"Avançar status (demo)"** para a apresentação;
- Cancelar só enquanto o pedido está "Recebido".

### 📦 Finalização do pedido

- Nome e telefone já vêm do perfil; no primeiro pedido eles são salvos automaticamente;
- Entrega em um endereço salvo (o principal vem escolhido) ou cadastro de um novo sem sair do pedido;
- Tipo de recebimento (entrega ou retirada) e forma de pagamento;
- Taxa de entrega somada ao total quando o pedido é para entrega;
- Pedido, itens, sabores, adicionais, primeiro status e limpeza do carrinho gravados numa **transação só**: se algo falhar, nenhum pedido fica pela metade e o carrinho continua igual;
- Depois de confirmar, abre direto o detalhe do pedido;
- Validação do troco (precisa cobrir o total);
- Resumo do pedido e confirmação;
- Pedido salvo no SQLite do celular e, se configurado, enviado à API.

---

## 🚧 Em desenvolvimento

As etapas estão detalhadas em `plano.md`.

As Etapas 0 a 6 do plano estão concluídas. Próximos passos:

- Integração com a API do painel administrativo, incluindo login e cadastro (`plano.md`, §11);
- Um padrão único de nomes de status entre o app e o admin;
- Tema claro e escuro.

---

## 📸 Prints do app

*(adicionar prints da tela inicial, de uma categoria, do carrinho e da finalização do pedido)*

---

## 📄 Licença

Este projeto está sob a licença MIT.