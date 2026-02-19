import React, { createContext, useContext } from "react";
import { useNotifications } from "@/hooks/useNotificacoesAutomaticas";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationType } from "@/components/NotificationPanel";

const NotificationContext = createContext<any>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Sempre chama o hook, mas retorna valor padrão se não houver user
  const notificationsState = useNotifications(user ? user.uid : "");

  return (
    <NotificationContext.Provider value={notificationsState}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
