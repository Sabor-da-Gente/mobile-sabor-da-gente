export type PerfilRow = { nome: string; telefone: string; email: string | null };

/** Dados do cliente; um perfil por aparelho, sem senha. */
export type Perfil = { nome: string; telefone: string; email: string | null };

export type EnderecoRow = {
  id: number;
  apelido: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
  referencia: string | null;
  principal: number;
};

export type DadosEndereco = {
  apelido: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string | null;
  referencia: string | null;
};

export class Endereco {
  constructor(
    readonly id: number,
    readonly dados: DadosEndereco,
    readonly principal: boolean,
  ) {}

  /** "Casa", ou a rua quando não há apelido. */
  get titulo(): string {
    return this.dados.apelido || `${this.dados.logradouro}, ${this.dados.numero}`;
  }

  /** Texto completo para a entrega: "Rua A, 10 - Apto 2 - Centro, João Pessoa/PB (Ref.: ...)". */
  resumo(): string {
    const d = this.dados;
    const complemento = d.complemento ? ` - ${d.complemento}` : '';
    const referencia = d.referencia ? ` (Ref.: ${d.referencia})` : '';
    return `${d.logradouro}, ${d.numero}${complemento} - ${d.bairro}, ${d.cidade}/${d.uf}${referencia}`;
  }

  static fromRow(row: EnderecoRow): Endereco {
    const { id, principal, ...dados } = row;
    return new Endereco(id, dados, principal === 1);
  }
}
