import type { DadosEndereco, Endereco, Perfil } from '@/models/Perfil';

/** Perfil do cliente e endereços salvos no aparelho. */
export interface PerfilRepository {
  buscarPerfil(): Promise<Perfil | null>;
  salvarPerfil(perfil: Perfil): Promise<void>;

  /** Só os ativos, com o principal primeiro. */
  listarEnderecos(): Promise<Endereco[]>;
  buscarEndereco(id: number): Promise<Endereco | null>;
  /** Cria (sem `id`) ou atualiza. O primeiro endereço vira o principal. */
  salvarEndereco(dados: DadosEndereco, id?: number): Promise<number>;
  marcarPrincipal(id: number): Promise<void>;
  /** Remoção lógica: pedidos antigos continuam apontando para ele. */
  removerEndereco(id: number): Promise<void>;
}
