export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  data: string; // Data da tarefa
  horaInicio?: string;
  horaFim?: string;
  concluida: boolean;
  prioridade: "Baixa" | "Média" | "Alta";
  categoria?: string;
  clienteId?: string;
  clienteNome?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}
