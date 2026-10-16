import type { Adicional, Massa, Sabor, Tamanho } from '@/models/Pizza';
import type { Produto } from '@/models/Produto';
import { precoPizza, problemaNosSabores } from '@/services/PrecoService';

export type TipoItem = 'produto' | 'pizza';

/** Item do carrinho. Valores em centavos. */
export abstract class ItemCarrinho {
  abstract readonly tipo: TipoItem;

  constructor(
    readonly id: number,
    readonly quantidade: number,
    readonly observacao: string | null,
  ) {}

  abstract get nome(): string;

  abstract precoUnitario(): number;

  get sabores(): string[] {
    return [];
  }

  /** Escolhas além dos sabores (massa, adicionais...). */
  extras(): string[] {
    return [];
  }

  subtotal(): number {
    return this.precoUnitario() * this.quantidade;
  }

  /** Uma linha com tudo: "Pizza Grande (Calabresa e Portuguesa) · Massa Fina · + Bacon". */
  descricao(): string {
    const titulo = this.sabores.length > 0 ? `${this.nome} (${this.sabores.join(' e ')})` : this.nome;
    return [titulo, ...this.extras(), ...(this.observacao ? [`Obs.: ${this.observacao}`] : [])].join(' · ');
  }
}

export class ItemProduto extends ItemCarrinho {
  readonly tipo = 'produto';

  constructor(id: number, quantidade: number, observacao: string | null, readonly produto: Produto) {
    super(id, quantidade, observacao);
  }

  get nome(): string {
    return this.produto.nome;
  }

  precoUnitario(): number {
    return this.produto.preco;
  }
}

export class ItemPizza extends ItemCarrinho {
  readonly tipo = 'pizza';

  constructor(
    id: number,
    quantidade: number,
    observacao: string | null,
    readonly tamanho: Tamanho,
    readonly massa: Massa,
    readonly saboresEscolhidos: Sabor[],
    readonly adicionais: Adicional[],
  ) {
    super(id, quantidade, observacao);
    const problema = problemaNosSabores(tamanho, saboresEscolhidos);
    if (problema) throw new Error(problema);
  }

  get nome(): string {
    return `Pizza ${this.tamanho.nome}`;
  }

  get sabores(): string[] {
    return this.saboresEscolhidos.map((s) => s.nome);
  }

  extras(): string[] {
    return [`Massa ${this.massa.nome}`, ...this.adicionais.map((a) => `+ ${a.nome}`)];
  }

  precoUnitario(): number {
    return precoPizza(this.tamanho, this.massa, this.saboresEscolhidos, this.adicionais);
  }
}
