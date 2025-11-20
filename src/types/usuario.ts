export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  // Preferências de notificação
  notificacoesEmail?: boolean;
  notificacoesPush?: boolean;
  notificacoesRenovacoes?: boolean;
  notificacoesPagamentos?: boolean;
  notificacoesClientes?: boolean;
}
