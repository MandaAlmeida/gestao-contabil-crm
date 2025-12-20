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
  isViewed: boolean;
  createdAt: string;
  updatedAt: string;
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
