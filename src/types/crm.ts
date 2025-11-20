export interface Contabilidade {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Financeiro {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  dataVencimento: string;
  valorMensalidade: number;
  status: "Recebido" | "A Vencer" | "Vencido";
  dataPagamento?: string | null;
  meioPagamento: "Pix" | "Boleto";
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certificado {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  tipoCertificado: "A1" | "A3";
  dataVencimento: string;
  status: "Válido" | "A Vencer" | "Vencido";
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Renovacao {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCNPJ: string;
  dataRenovacao: string;
  valorRenovacao: number;
  status: "Em Negociação" | "Renovado" | "Cancelado";
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sintegra {
  id: string;
  clienteId: string;
  clienteNome: string;
  dataPrazo: string;
  acesso: string;
  status: "Pendente" | "Em Andamento" | "Concluído";
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}
