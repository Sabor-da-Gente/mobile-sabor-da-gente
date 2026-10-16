import type { SQLiteDatabase } from 'expo-sqlite';

import { type ItemCarrinho, ItemPizza, ItemProduto } from '@/models/ItemCarrinho';
import {
  Adicional,
  type AdicionalRow,
  Massa,
  type MassaRow,
  Sabor,
  type SaborPrecoRow,
  type SaborRow,
  Tamanho,
  type TamanhoRow,
} from '@/models/Pizza';
import { Produto, type ProdutoRow } from '@/models/Produto';
import {
  type CarrinhoRepository,
  type NovoItemCarrinho,
  QUANTIDADE_MAXIMA,
} from '@/repositories/CarrinhoRepository';

type ItemRow = {
  id: number;
  tipo: 'produto' | 'pizza';
  produto_id: number | null;
  tamanho_id: number | null;
  massa_id: number | null;
  quantidade: number;
  observacao: string | null;
};

type LigacaoRow = { item_id: number; ref_id: number };

const mesmoConjunto = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export class SqliteCarrinhoRepository implements CarrinhoRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listar(): Promise<ItemCarrinho[]> {
    // Lê sem filtrar `ativo`: um item que saiu do cardápio continua visível no carrinho.
    const [itens, produtos, tamanhos, massas, sabores, precos, adicionais, itemSabores, itemAdicionais] =
      await Promise.all([
        this.db.getAllAsync<ItemRow>(
          'SELECT id, tipo, produto_id, tamanho_id, massa_id, quantidade, observacao FROM carrinho_itens ORDER BY id',
        ),
        this.db.getAllAsync<ProdutoRow>(
          `SELECT id, categoria_id, nome, descricao, ingredientes, imagem_url, preco, destaque
             FROM produtos WHERE id IN (SELECT produto_id FROM carrinho_itens)`,
        ),
        this.db.getAllAsync<TamanhoRow>('SELECT id, nome, fatias, max_sabores, ordem FROM tamanhos'),
        this.db.getAllAsync<MassaRow>('SELECT id, nome, acrescimo FROM massas'),
        this.db.getAllAsync<SaborRow>(
          'SELECT id, nome, descricao, ingredientes, imagem_url, destaque FROM sabores',
        ),
        this.db.getAllAsync<SaborPrecoRow>('SELECT sabor_id, tamanho_id, preco FROM sabor_precos'),
        this.db.getAllAsync<AdicionalRow>('SELECT id, nome, preco FROM adicionais'),
        // rowid mantém a ordem em que os sabores foram escolhidos.
        this.db.getAllAsync<LigacaoRow>(
          'SELECT item_id, sabor_id AS ref_id FROM carrinho_item_sabores ORDER BY rowid',
        ),
        this.db.getAllAsync<LigacaoRow>(
          'SELECT item_id, adicional_id AS ref_id FROM carrinho_item_adicionais ORDER BY rowid',
        ),
      ]);

    const porId = <T extends { id: number }>(lista: T[]) => new Map(lista.map((x) => [x.id, x]));
    const produtoPorId = porId(produtos.map(Produto.fromRow));
    const tamanhoPorId = porId(tamanhos.map(Tamanho.fromRow));
    const massaPorId = porId(massas.map(Massa.fromRow));
    const saborPorId = porId(sabores.map((s) => Sabor.fromRow(s, precos)));
    const adicionalPorId = porId(adicionais.map(Adicional.fromRow));

    const resultado: ItemCarrinho[] = [];
    for (const row of itens) {
      try {
        if (row.tipo === 'produto') {
          const produto = produtoPorId.get(row.produto_id!);
          if (!produto) throw new Error(`produto ${row.produto_id} não existe`);
          resultado.push(new ItemProduto(row.id, row.quantidade, row.observacao, produto));
        } else {
          const tamanho = tamanhoPorId.get(row.tamanho_id!);
          const massa = massaPorId.get(row.massa_id!);
          if (!tamanho || !massa) throw new Error('tamanho ou massa não existe');
          const doItem = (ligacoes: LigacaoRow[]) =>
            ligacoes.filter((l) => l.item_id === row.id).map((l) => l.ref_id);
          resultado.push(
            new ItemPizza(
              row.id,
              row.quantidade,
              row.observacao,
              tamanho,
              massa,
              doItem(itemSabores).flatMap((id) => saborPorId.get(id) ?? []),
              doItem(itemAdicionais).flatMap((id) => adicionalPorId.get(id) ?? []),
            ),
          );
        }
      } catch (erro) {
        console.warn(`Item ${row.id} do carrinho ignorado:`, erro);
      }
    }
    return resultado;
  }

  async adicionar(novo: NovoItemCarrinho, quantidade = 1): Promise<void> {
    const observacao = novo.observacao?.trim() || null;

    await this.db.withTransactionAsync(async () => {
      const existente = await this.buscarIgual(novo, observacao);
      if (existente !== null) {
        await this.db.runAsync(
          'UPDATE carrinho_itens SET quantidade = MIN(?, quantidade + ?) WHERE id = ?',
          QUANTIDADE_MAXIMA,
          quantidade,
          existente,
        );
        return;
      }

      const qtd = Math.min(quantidade, QUANTIDADE_MAXIMA);
      if (novo.tipo === 'produto') {
        await this.db.runAsync(
          "INSERT INTO carrinho_itens (tipo, produto_id, quantidade, observacao) VALUES ('produto', ?, ?, ?)",
          novo.produtoId,
          qtd,
          observacao,
        );
        return;
      }

      const { lastInsertRowId: id } = await this.db.runAsync(
        `INSERT INTO carrinho_itens (tipo, tamanho_id, massa_id, quantidade, observacao)
         VALUES ('pizza', ?, ?, ?, ?)`,
        novo.tamanhoId,
        novo.massaId,
        qtd,
        observacao,
      );
      for (const saborId of novo.saborIds) {
        await this.db.runAsync(
          'INSERT INTO carrinho_item_sabores (item_id, sabor_id) VALUES (?, ?)',
          id,
          saborId,
        );
      }
      for (const adicionalId of novo.adicionalIds) {
        await this.db.runAsync(
          'INSERT INTO carrinho_item_adicionais (item_id, adicional_id) VALUES (?, ?)',
          id,
          adicionalId,
        );
      }
    });
  }

  /** Regra R3: mesmo produto, ou mesma pizza com os mesmos sabores, adicionais e observação. */
  private async buscarIgual(novo: NovoItemCarrinho, observacao: string | null): Promise<number | null> {
    if (novo.tipo === 'produto') {
      const row = await this.db.getFirstAsync<{ id: number }>(
        "SELECT id FROM carrinho_itens WHERE tipo = 'produto' AND produto_id = ? AND observacao IS ?",
        novo.produtoId,
        observacao,
      );
      return row?.id ?? null;
    }

    const candidatos = await this.db.getAllAsync<{ id: number }>(
      `SELECT id FROM carrinho_itens
        WHERE tipo = 'pizza' AND tamanho_id = ? AND massa_id = ? AND observacao IS ?`,
      novo.tamanhoId,
      novo.massaId,
      observacao,
    );
    for (const { id } of candidatos) {
      const sabores = await this.db.getAllAsync<{ ref_id: number }>(
        'SELECT sabor_id AS ref_id FROM carrinho_item_sabores WHERE item_id = ?',
        id,
      );
      const adicionais = await this.db.getAllAsync<{ ref_id: number }>(
        'SELECT adicional_id AS ref_id FROM carrinho_item_adicionais WHERE item_id = ?',
        id,
      );
      if (
        mesmoConjunto(sabores.map((s) => s.ref_id), novo.saborIds) &&
        mesmoConjunto(adicionais.map((a) => a.ref_id), novo.adicionalIds)
      ) {
        return id;
      }
    }
    return null;
  }

  async alterarQuantidade(id: number, quantidade: number): Promise<void> {
    if (quantidade <= 0) {
      await this.remover(id);
      return;
    }
    await this.db.runAsync(
      'UPDATE carrinho_itens SET quantidade = ? WHERE id = ?',
      Math.min(quantidade, QUANTIDADE_MAXIMA),
      id,
    );
  }

  async remover(id: number): Promise<void> {
    // Sabores e adicionais do item saem junto (ON DELETE CASCADE).
    await this.db.runAsync('DELETE FROM carrinho_itens WHERE id = ?', id);
  }

  async limpar(): Promise<void> {
    await this.db.runAsync('DELETE FROM carrinho_itens');
  }
}
