export interface Contabilidade {
  id: string;
  nome: string;
  cnpj?: string;
  email: string;
  cidade?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string;
  contato: string;
  contabilidade: string;
  responsavel: string;
  observacoes: string;
  isFiscal?: boolean; // <-- Adicionado
  isGerencial?: boolean; // <-- Adicionado
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricoPagamento {
  id: string; // ID único para permitir edição/exclusão
  dataVencimento: string;
  dataPagamento: string;
  emDia: boolean; // true se pagou antes/no vencimento, false se atrasado
  meioPagamento?: "Pix" | "Boleto";
}

export interface HistoricoAtividade {
  id: string; // ID único para permitir edição/exclusão
  dataPrazo: string; // Data de prazo original
  dataConclusao: string; // Data que foi concluído
  noPrazo: boolean; // true se concluiu antes/no prazo, false se atrasado
}

export interface Financeiro {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  dataVencimento: string;
  valorMensalidade: number;
  status: "Pago" | "Pendente" | "Vencido";
  historicoPagamentos?: HistoricoPagamento[];
  dataPagamento?: string | null; // Mantido para compatibilidade temporária
  meioPagamento?: "Pix" | "Boleto";
  servicoId?: string | null; // Link para serviço se for cobrança de serviço
  observacoes: string;
  valorServico?: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  // Adicione isso tanto na interface Servico quanto na interface Financeiro:
  nfe?: boolean;
  nfeDatas?: string;
  nfce?: boolean;
  nfceDatas?: string;
}

export interface HistoricoRenovacao {
  id: string;
  dataRenovacao: string;
  vencimentoAnterior: string;
  novoVencimento: string;
}

export interface Certificado {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  tipoCertificado: "A1" | "A3";
  dataVencimento: string;
  status: "Pendente" | "Avisado" | "Vencido" | "Renovado";
  observacoes: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  historicoRenovacoes?: HistoricoRenovacao[]; // <-- Nova propriedade adicionada aqui
}

export type StatusRenovacao =
  | "Pendente"
  | "Avisado"
  | "Em Negociação"
  | "Parcelado"
  | "Renovado"
  | "Cancelado";

export interface Renovacao {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  dataRenovacao: string;
  dataPagamento?: string | null; // Adicionado para controle do ciclo atual (igual ao financeiro)
  valorRenovacao: number;
  status: StatusRenovacao;
  parcela?: "1 Vez" | "2 Vezes" | "3 Vezes" | null;
  historicoPagamentos?: HistoricoPagamento[];
  observacoes: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sintegra {
  id: string;
  clienteId: string;
  clienteNome: string;
  dataPrazo: string;
  acesso: string;
  status: "Concluído" | "Pendente" | "Vencido";
  observacoes: string;
  dataPagamento?: string | null; // Mantido para compatibilidade
  historicoAtividades?: HistoricoAtividade[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Servico {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  responsavel: string;
  descricao: string;
  dataVencimento: string;
  valorMensalidade: number;
  status: "Pago" | "Pendente" | "Vencido";
  dataPagamento?: string | null;
  historicoPagamentos?: HistoricoPagamento[];
  meioPagamento: "Pix" | "Boleto";
  observacoes: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  // Adicione isso tanto na interface Servico quanto na interface Financeiro:
  nfe?: boolean;
  nfeDatas?: string;
  nfce?: boolean;
  nfceDatas?: string;
}
