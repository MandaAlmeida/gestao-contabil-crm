import { NotificationType } from "@/components/NotificationPanel";

export interface PersistentNotification {
  id: string;
  userId: string;
  itemId: string;
  pureItemId: string; // ID puro do item (sem prefixo)
  type: NotificationType;
  title: string;
  message: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
  clienteId: string;
  clienteNome: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationView {
  id: string;
  notificationId: string;
  userId: string;
  viewedAt: string;
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
