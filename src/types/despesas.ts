export interface Despesa {
  id: string;
  descricao: string;
  contabilidade?: string | null;
  valor: number;
  data: string;
  fixo: boolean;
  pago: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NovaDespesa = Omit<Despesa, "id" | "createdAt" | "updatedAt">;

export type AtualizacaoDespesa = Partial<Omit<Despesa, "id" | "createdAt" | "updatedAt">>;



