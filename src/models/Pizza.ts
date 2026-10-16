/** Todos os valores em centavos. */

export type TamanhoRow = { id: number; nome: string; fatias: number; max_sabores: number; ordem: number };
export type MassaRow = { id: number; nome: string; acrescimo: number };
export type AdicionalRow = { id: number; nome: string; preco: number };
export type SaborRow = {
  id: number;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  imagem_url: string | null;
  destaque: number;
};
export type SaborPrecoRow = { sabor_id: number; tamanho_id: number; preco: number };

export class Tamanho {
  constructor(
    readonly id: number,
    readonly nome: string,
    readonly fatias: number,
    readonly maxSabores: number,
    readonly ordem: number,
  ) {}

  static fromRow(row: TamanhoRow): Tamanho {
    return new Tamanho(row.id, row.nome, row.fatias, row.max_sabores, row.ordem);
  }
}

export class Massa {
  constructor(
    readonly id: number,
    readonly nome: string,
    readonly acrescimo: number,
  ) {}

  static fromRow(row: MassaRow): Massa {
    return new Massa(row.id, row.nome, row.acrescimo);
  }
}

export class Adicional {
  constructor(
    readonly id: number,
    readonly nome: string,
    readonly preco: number,
  ) {}

  static fromRow(row: AdicionalRow): Adicional {
    return new Adicional(row.id, row.nome, row.preco);
  }
}

export class Sabor {
  constructor(
    readonly id: number,
    readonly nome: string,
    readonly descricao: string,
    readonly ingredientes: string | null,
    readonly imagemUrl: string | null,
    readonly destaque: boolean,
    /** tamanhoId → preço */
    private readonly precos: ReadonlyMap<number, number>,
  ) {}

  /** `undefined` se o sabor não é vendido nesse tamanho. */
  precoNoTamanho(tamanhoId: number): number | undefined {
    return this.precos.get(tamanhoId);
  }

  disponivelNo(tamanhoId: number): boolean {
    return this.precos.has(tamanhoId);
  }

  get menorPreco(): number | undefined {
    const valores = [...this.precos.values()];
    return valores.length > 0 ? Math.min(...valores) : undefined;
  }

  static fromRow(row: SaborRow, precos: SaborPrecoRow[]): Sabor {
    const mapa = new Map<number, number>();
    for (const p of precos) {
      if (p.sabor_id === row.id) mapa.set(p.tamanho_id, p.preco);
    }
    return new Sabor(
      row.id,
      row.nome,
      row.descricao ?? '',
      row.ingredientes,
      row.imagem_url,
      row.destaque === 1,
      mapa,
    );
  }
}

export type OpcoesPizza = {
  tamanhos: Tamanho[];
  massas: Massa[];
  sabores: Sabor[];
  adicionais: Adicional[];
};
