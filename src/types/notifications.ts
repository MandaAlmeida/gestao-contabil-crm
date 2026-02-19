import { NotificationType } from "@/components/NotificationPanel";

export interface PersistentNotification {
  id: string;
  userId: string;
  itemId: string;
  type: NotificationType;
  title: string;
  message: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
  clienteNome: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
deletedAt?: string;
viewed?: boolean;
viewedAt?: string;
uniqueKey: string;
}

export interface NotificationView {
  id: string;
  notificationId: string;
  userId: string;
  viewedAt: string;
  viewed?: boolean;

}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
  clienteNome: string;
}


export interface AppNotification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "certificado" | "financeiro" | "renovacao" | "sintegra";
  data: string;
  visto: boolean;
  entidadeId?: string;
}
