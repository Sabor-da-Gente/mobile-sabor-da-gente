# Roteiro de testes manuais — Offline First

Roteiro para validar o funcionamento offline do aplicativo (P2 de PDM): alterações gravadas primeiro no SQLite, fila de sincronização em ordem e envio ao Supabase quando a conexão volta.

## Pré-requisitos

- Aplicativo rodando (`npx expo start`) em um aparelho ou emulador, com uma conta de teste já criada.
- Painel Web aberto (repositório `sabor--da-gente-web`, `npm run dev`) com um usuário administrador, para conferir os pedidos recebidos.
- Pelo menos dois produtos ativos no cardápio.
- Para simular a falta de internet, **desligue o Wi-Fi e os dados móveis do aparelho** (ou use o modo avião) depois que o app já estiver carregado. Evite recarregar o app enquanto estiver offline, pois o Expo Go perde a conexão com o Metro.
- Faixa de aviso offline e tela **Pendências** (acessível pelo perfil) mostram o estado da fila durante os testes.

## Como usar este roteiro

Para cada cenário, siga os passos e compare com o **Resultado esperado**. Marque `[x]` em **Passou** ou anote o problema em **Observações**. Ao final, preencha o registro da execução.

---

## Cenário 1 — Modo avião: pedido, endereço, perfil e cancelamento

**Objetivo:** confirmar que as principais ações funcionam sem internet e ficam guardadas na fila.

**Passos**
1. Com o app logado e online, abra o cardápio para carregar os dados e depois ative o modo avião.
2. Em **Perfil**, edite o nome e salve.
3. Em **Endereços**, crie um endereço novo.
4. Adicione um produto ao carrinho e finalize um pedido.
5. Abra o pedido recém-criado em **Meus pedidos** e cancele-o.
6. Abra a tela **Pendências**.

**Resultado esperado**
- Cada ação é concluída sem mensagem de erro de rede.
- A faixa de aviso offline aparece, com a quantidade de alterações aguardando sincronização.
- O pedido aparece na lista com status de aguardando envio e total estimado, e o carrinho fica vazio.
- Se o pedido ainda não tinha sido enviado, o cancelamento remove a operação pendente da fila em vez de enfileirar um cancelamento.
- Ao desativar o modo avião, a fila é enviada sozinha e a faixa some.

- [x] Passou  — Observações:

---

## Cenário 2 — Endereço criado offline usado em pedido offline (troca de id)

**Objetivo:** garantir que o endereço seja sincronizado antes do pedido e que o id local seja trocado pelo id do servidor.

**Passos**
1. Offline, crie um endereço novo.
2. Ainda offline, finalize um pedido de entrega usando esse endereço.
3. Abra **Pendências** e confira a ordem dos itens.
4. Reative a conexão e aguarde a sincronização.
5. Confira o pedido no painel Web.

**Resultado esperado**
- Na fila, o endereço aparece antes do pedido.
- Após a sincronização, o pedido chega ao servidor com o endereço correto, sem erro de chave estrangeira.
- No app, o pedido passa a mostrar o número real e o total calculado pelo banco.

- [x] Passou  — Observações:

---

## Cenário 3 — Rede cai no meio do envio (idempotência)

**Objetivo:** garantir que reenviar um pedido cuja resposta não chegou não cria pedido duplicado (idempotência por `chave_cliente`, ver `Sabor-da-Gente/api-sabor-da-gente#3`).

**Passos**
1. Online, adicione um produto ao carrinho e toque em finalizar o pedido.
2. Imediatamente após o toque, desligue o Wi-Fi/dados (ou ative o modo avião).
3. Reative a conexão e aguarde a fila tentar de novo.
4. Confira o painel Web e a lista de pedidos do app.
5. Repita o teste algumas vezes, variando o instante em que a conexão é cortada, pois a janela é curta.

**Resultado esperado**
- Existe **apenas um** pedido no painel e no app, independentemente de quantas vezes o envio foi repetido.
- Não aparece pedido duplicado nem erro de conta/chave.

- [ ] Passou  — Observações: pendente: validar a idempotência no Supabase (migration da api#3)

---

## Cenário 4 — Fechar e reabrir o app com a fila cheia

**Objetivo:** confirmar que a fila sobrevive ao fechamento do app.

**Passos**
1. Offline, faça duas alterações (por exemplo, editar o perfil e criar um pedido).
2. Feche completamente o app (remova-o dos aplicativos recentes).
3. Reabra o app ainda offline.
4. Confira a faixa de aviso e a tela **Pendências**.
5. Reative a conexão.

**Resultado esperado**
- Ao reabrir, a sessão continua ativa e as alterações pendentes continuam listadas, com a mesma contagem.
- O app abre sem travar e mostra os dados locais.
- Com a conexão de volta, a fila é enviada sem intervenção.

- [x] Passou  — Observações:

---

## Cenário 5 — Dois pedidos offline chegam ao painel na ordem certa

**Objetivo:** confirmar que a fila respeita a ordem de criação (FIFO).

**Passos**
1. Offline, finalize o pedido **A** e, em seguida, o pedido **B**, com produtos diferentes para identificá-los.
2. Reative a conexão e aguarde a sincronização.
3. Observe a lista de pedidos do painel Web.

**Resultado esperado**
- O pedido A recebe número menor (ou aparece antes) que o pedido B.
- Os dois chegam uma única vez, com os itens e totais corretos.

- [x] Passou  — Observações:

---

## Cenário 6 — Produto desativado no painel com o pedido na fila

**Objetivo:** verificar que um erro de regra de negócio fica visível e não bloqueia o restante da fila.

**Passos**
1. Offline, finalize um pedido com o produto **X**.
2. Ainda offline, faça outra alteração qualquer (por exemplo, editar o perfil).
3. No painel Web, desative o produto X.
4. Reative a conexão no aparelho e aguarde a sincronização.
5. Abra **Pendências**.

**Resultado esperado**
- O pedido com o produto desativado aparece com status de erro e a mensagem do servidor.
- A alteração seguinte (perfil) é enviada normalmente, ou seja, a fila continua.
- O item com erro pode ser reenviado ou descartado pela tela **Pendências**.

- [x] Passou  — Observações:

---

## Cenário 7 — Atualização do SQLite da v1 para a v2

**Objetivo:** garantir que um aparelho com o banco local antigo atualiza sem perder dados.

**Passos**
1. Com tudo commitado ou guardado, rode no Git Bash a versão do P1 (merge `a9a5e09`):
   `git checkout a9a5e09` e `npx expo start`.
2. No app, entre na conta, favorite um produto e coloque itens no carrinho.
3. Volte para a branch de teste (`git checkout <branch>`) e rode `npx expo start` novamente **sem limpar os dados do app**.
4. Abra o app, o carrinho, os favoritos e a tela **Pendências**.

**Resultado esperado**
- O app abre sem erro de migração.
- Carrinho e favoritos continuam disponíveis.
- A tabela da fila existe e funciona (é possível gerar uma pendência offline).

- [x] Passou  — Observações:

---

## Cenário 8 — Logout com pendências

**Objetivo:** validar o fluxo de sair da conta com alterações não enviadas (issue #31).

**Passos**
1. Offline, edite o perfil ou crie um pedido.
2. Em **Perfil**, toque em **Sair da conta**.
3. Teste **Cancelar**, **Sincronizar agora** (ainda offline) e **Sair e descartar**.
4. Entre com outra conta.
5. Deslogado e sem internet, tente entrar.

**Resultado esperado**
- Aparecem as três opções com a quantidade de pendências.
- Cancelar mantém a sessão; sincronizar sem internet avisa que ainda há pendências e não sai.
- Sair e descartar encerra a sessão, limpa a fila e desfaz os dados locais pendentes.
- A outra conta não vê nada da anterior.
- O login sem internet mostra "Sem internet. Entrar ou cadastrar exige conexão."

- [x] Passou  — Observações:

---

## Cenário 9 — Verificações estáticas

**Passos**
```bash
npx tsc --noEmit
npx expo lint
```

**Resultado esperado**
- Os dois comandos terminam sem erros.

- [x] Passou  — Observações:

---

## Registro da execução

| Item | Valor |
|---|---|
| Data | |
| Branch / commit | |
| Aparelho e sistema | |
| Quem executou | |

| Cenário | Resultado | Observações |
|---|---|---|
| 1. Modo avião | | |
| 2. Troca de id do endereço | | |
| 3. Idempotência | | |
| 4. Fechar e reabrir | | |
| 5. Ordem no painel | | |
| 6. Produto desativado | | |
| 7. SQLite v1 → v2 | | |
| 8. Logout com pendências | | |
| 9. tsc e lint | | |
