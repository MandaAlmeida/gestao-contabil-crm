
import { NotificationView, PersistentNotification } from "@/types/notifications";
import { useEffect, useMemo, useState } from "react";
import { NotificationType } from "@/components/NotificationPanel";
import { collection, getDocs, query, where, orderBy, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useNotifications(
  userId: string,
  filterBy: NotificationType[] = ["all"]
) {
  const [notifications, setNotifications] = useState<PersistentNotification[]>([]);
  const [views, setViews] = useState<NotificationView[]>([]);


useEffect(() => {
    if (!userId) return;
    async function fetchViews() {
      try {
        const q = query(
          collection(db, "notificationViews"),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);
        // CORREÇÃO AQUI: Garante que o ID do documento é repassado
        const viewsArr = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id 
        }) as NotificationView);
        setViews(viewsArr);
      } catch (err) {
        console.error("Erro ao buscar visualizações do Firestore:", err);
      }
    }
    fetchViews();
  }, [userId]);

  const [markingAsViewed, setMarkingAsViewed] = useState<Set<string>>(new Set());

  async function fetchNotifications() {
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      const snapshot = await getDocs(q);
      // CORREÇÃO AQUI: Garante que a notificação sempre terá um ID válido
      const notifs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id
      }) as PersistentNotification);
      setNotifications(notifs);
    } catch (err) {
      console.error("Erro ao buscar notificações do Firestore:", err);
    }
  }

  /* =========================
     LOAD STORAGE
  ========================= */

  // Carrega notificações do Firestore
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId]);

  /* =========================
     SAVE STORAGE
  ========================= */
  // Remover uso do localStorage para notificações

    /* =========================
     UNREAD CALC
  ========================= */
  const viewedSet = useMemo(
    () => new Set(views.map(v => v.notificationId)),
    [views]
  );

  /* =========================
     FILTER
  ========================= */
  // Notificações filtradas e não vistas (para sumir do painel ao marcar como visto)
  const filteredNotifications = useMemo(() => {
    if (filterBy.includes("all")) {
      return notifications.filter(n => !viewedSet.has(n.id));
    }
    return notifications.filter(n =>
      filterBy.includes(n.type as NotificationType) && !viewedSet.has(n.id)
    );
  }, [notifications, filterBy, viewedSet]);

  // Unread deve considerar todas as notificações não vistas, não só as filtradas
  const unread = useMemo(
    () => notifications.filter(n => !viewedSet.has(n.id)),
    [notifications, viewedSet]
  );

  const unreadCount = unread.length;
  const hasUnread = unreadCount > 0;

  /* =========================
     ACTIONS
  ========================= */

  const addNotification = (notification: PersistentNotification) => {
    setNotifications(prev => [notification, ...prev]);
  };

const markAsViewed = async (notificationId: string) => {
  // TRAVA DE SEGURANÇA: Se não tiver ID válido, interrompe
  if (!notificationId) {
    console.error("Tentativa de marcar notificação sem ID válido como vista.");
    return;
  }

  if (viewedSet.has(notificationId)) return;

  setMarkingAsViewed(prev => new Set(prev).add(notificationId));

  try {
    const view: NotificationView = {
      id: crypto.randomUUID(),
      notificationId,
      userId,
      viewedAt: new Date().toISOString(),
    };

    // Salva visualização no Firestore
    await setDoc(doc(collection(db, "notificationViews"), view.id), view);
    setViews(prev => [...prev, view]);
    
    // Remover notificação do estado local imediatamente
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  } finally {
    setMarkingAsViewed(prev => {
      const copy = new Set(prev);
      copy.delete(notificationId);
      return copy;
    });
  }
};

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setViews(prev => prev.filter(v => v.notificationId !== id));
  };

  const removeNotificationItem = async (userId: string, clientName: string, type: string) => {
    setNotifications(prev => prev.filter(n => !(n.userId === userId && n.type === type && n.clienteNome === clientName)));
  };


  // Marca como visto apenas as notificações não vistas do usuário e do(s) type(s) filtrados
  const markAllAsViewed = async (filterBy: NotificationType[] = ["all"]) => {
    let idsToMark: string[] = [];
    if (filterBy.includes("all")) {
      // Marca apenas as não vistas do usuário
      idsToMark = notifications.filter(n => !viewedSet.has(n.id)).map(n => n.id);
    } else {
      // Marca apenas as não vistas do(s) type(s) filtrados
      idsToMark = notifications.filter(n => filterBy.includes(n.type as NotificationType) && !viewedSet.has(n.id)).map(n => n.id);
    }
    for (const notificationId of idsToMark) {
      await markAsViewed(notificationId);
    }
  };

  return {
    notifications: filteredNotifications,
    unread,
    unreadCount,
    hasUnread,

    addNotification,
    markAsViewed,
    markAllAsViewed,
    markingAsViewed,
    removeNotification,
    removeNotificationItem,
    fetchNotifications,
  };
}
