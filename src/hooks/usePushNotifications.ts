import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

// Tipo para o callback de notificação
export type NotificationCallback = (payload: MessagePayload) => void;

// Tipo para o status da permissão
export type NotificationPermission = "default" | "granted" | "denied";

interface UsePushNotificationsReturn {
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

/**
 * Hook para gerenciar notificações push com Firebase Cloud Messaging
 * 
 * @param onNotification - Callback opcional para lidar com notificações recebidas
 * @returns Objeto com estado e funções para gerenciar notificações push
 * 
 * @example
 * ```tsx
 * const { token, permission, requestPermission } = usePushNotifications((payload) => {
 *   console.log('Notificação recebida:', payload);
 * });
 * 
 * // Solicitar permissão ao usuário
 * await requestPermission();
 * 
 * // Salvar o token no backend para enviar notificações
 * if (token) {
 *   await saveTokenToBackend(token);
 * }
 * ```
 */
export function usePushNotifications(
  onNotification?: NotificationCallback
): UsePushNotificationsReturn {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar suporte a notificações
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Verificar se o navegador suporta notificações
        const hasNotificationAPI = "Notification" in window;
        const hasServiceWorker = "serviceWorker" in navigator;
        const hasMessaging = messaging !== null;

        setIsSupported(hasNotificationAPI && hasServiceWorker && hasMessaging);

        if (hasNotificationAPI) {
          setPermission(Notification.permission as NotificationPermission);
        }
      } catch (err) {
        console.error("[usePushNotifications] Erro ao verificar suporte:", err);
        setError("Notificações não são suportadas neste navegador");
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker não suportado");
      }

      // Registrar o Service Worker do Firebase Messaging
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );

      console.log("[usePushNotifications] Service Worker registrado:", registration);
      return registration;
    } catch (err) {
      console.error("[usePushNotifications] Erro ao registrar Service Worker:", err);
      throw err;
    }
  }, []);

  // Obter token FCM
  const getMessagingToken = useCallback(async () => {
    try {
      if (!messaging) {
        throw new Error("Firebase Messaging não está disponível");
      }

      // Registrar Service Worker antes de obter o token
      await registerServiceWorker();

      // Obter token do FCM
      // IMPORTANTE: Você precisa gerar uma chave VAPID no console do Firebase
      // Em: Project Settings > Cloud Messaging > Web Push certificates
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      
      if (!vapidKey) {
        console.warn(
          "[usePushNotifications] VITE_FIREBASE_VAPID_KEY não configurada. " +
          "Gere uma chave VAPID no Console do Firebase em: " +
          "Project Settings > Cloud Messaging > Web Push certificates"
        );
      }

      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (currentToken) {
        console.log("[usePushNotifications] Token FCM obtido:", currentToken);
        setToken(currentToken);
        setError(null);
        return currentToken;
      } else {
        console.warn("[usePushNotifications] Nenhum token disponível. Solicite permissão primeiro.");
        setError("Não foi possível obter o token");
        return null;
      }
    } catch (err) {
      console.error("[usePushNotifications] Erro ao obter token:", err);
      setError(err instanceof Error ? err.message : "Erro ao obter token");
      return null;
    }
  }, [registerServiceWorker]);

  // Solicitar permissão para notificações
  const requestPermission = useCallback(async () => {
    try {
      if (!isSupported) {
        toast({
          title: "Não Suportado",
          description: "Seu navegador não suporta notificações push",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      // Solicitar permissão do usuário
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);

      if (result === "granted") {
        console.log("[usePushNotifications] Permissão concedida");
        
        // Obter token FCM
        const fcmToken = await getMessagingToken();
        
        if (fcmToken) {
          toast({
            title: "Notificações Ativadas",
            description: "Você receberá notificações sobre atualizações importantes",
          });

          // IMPORTANTE: Aqui você deve salvar o token no backend
          // para poder enviar notificações para este dispositivo
          // Exemplo:
          // await saveTokenToBackend(fcmToken);
        }
      } else if (result === "denied") {
        toast({
          title: "Permissão Negada",
          description: "Você não receberá notificações. Altere nas configurações do navegador.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("[usePushNotifications] Erro ao solicitar permissão:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro ao solicitar permissão";
      setError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, getMessagingToken]);

  // Atualizar token (útil para renovação periódica)
  const refreshToken = useCallback(async () => {
    if (permission === "granted") {
      await getMessagingToken();
    }
  }, [permission, getMessagingToken]);

  // Listener para notificações em foreground
  useEffect(() => {
    if (!messaging || permission !== "granted") {
      return;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[usePushNotifications] Notificação recebida (foreground):", payload);

      // Chamar callback se fornecido
      if (onNotification) {
        onNotification(payload);
      }

      // Mostrar notificação visual
      const { notification } = payload;
      if (notification) {
        toast({
          title: notification.title || "Nova Notificação",
          description: notification.body,
        });

        // Mostrar notificação do navegador mesmo em foreground
        if (Notification.permission === "granted") {
          new Notification(notification.title || "Nova Notificação", {
            body: notification.body,
            icon: "/logo.png",
            badge: "/favicon.ico",
            tag: payload.data?.tag || "default",
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [messaging, permission, onNotification]);

  // Obter token automaticamente se a permissão já foi concedida
  useEffect(() => {
    if (permission === "granted" && !token && !isLoading) {
      getMessagingToken();
    }
  }, [permission, token, isLoading, getMessagingToken]);

  return {
    token,
    permission,
    isSupported,
    isLoading,
    error,
    requestPermission,
    refreshToken,
  };
}

