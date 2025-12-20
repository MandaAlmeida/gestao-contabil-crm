export interface PersistentNotification {
  id: string;
  userId: string;
  itemId: string;
  type: "certificado" | "pagamento" | "servico" | "renovacao" | "sintegra" | "despesa";
  title: string;
  message: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
  clienteNome: string;
  isViewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationData {
  id: string;
  type: "certificado" | "pagamento" | "servico" | "renovacao" | "sintegra" | "despesa";
  title: string;
  message: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
  clienteNome: string;
}
