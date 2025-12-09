import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationPromptProps {
  /** Mostrar prompt automaticamente após um delay (em ms). Default: não mostrar automaticamente */
  autoShowDelay?: number;
  /** Callback quando o token for obtido com sucesso */
  onTokenReceived?: (token: string) => void;
}

/**
 * Componente para solicitar permissão de notificações push ao usuário
 * Pode ser mostrado automaticamente ou manualmente
 */
export function PushNotificationPrompt({ 
  autoShowDelay,
  onTokenReceived 
}: PushNotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { 
    token, 
    permission, 
    isSupported, 
    isLoading, 
    requestPermission 
  } = usePushNotifications();

  // Callback quando o token é recebido
  useEffect(() => {
    if (token && onTokenReceived) {
      onTokenReceived(token);
    }
  }, [token, onTokenReceived]);

  // Mostrar prompt automaticamente após o delay
  useEffect(() => {
    if (autoShowDelay && isSupported && permission === "default" && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, autoShowDelay);

      return () => clearTimeout(timer);
    }
  }, [autoShowDelay, isSupported, permission, dismissed]);

  // Verificar se já foi dispensado anteriormente (localStorage)
  useEffect(() => {
    const isDismissed = localStorage.getItem("notification-prompt-dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    await requestPermission();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  // Não mostrar se não for suportado, já foi concedido ou negado
  if (!isSupported || permission !== "default" || !showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ativar Notificações</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Receba atualizações importantes sobre seus clientes, vencimentos e tarefas
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDismiss}
          >
            <BellOff className="mr-2 h-4 w-4" />
            Agora Não
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleRequestPermission}
            disabled={isLoading}
          >
            <Bell className="mr-2 h-4 w-4" />
            {isLoading ? "Aguarde..." : "Ativar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Versão inline do componente para usar em configurações
 */
export function PushNotificationSettings() {
  const { 
    permission, 
    isSupported, 
    isLoading, 
    requestPermission,
    token 
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Notificações push não são suportadas neste navegador</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {permission === "granted" ? (
            <Bell className="h-4 w-4 text-green-600" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Notificações Push</p>
            <p className="text-xs text-muted-foreground">
              {permission === "granted" && "Ativadas"}
              {permission === "denied" && "Bloqueadas - Altere nas configurações do navegador"}
              {permission === "default" && "Desativadas"}
            </p>
          </div>
        </div>
        {permission === "default" && (
          <Button
            size="sm"
            onClick={requestPermission}
            disabled={isLoading}
          >
            {isLoading ? "Aguarde..." : "Ativar"}
          </Button>
        )}
      </div>
      {token && (
        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded break-all">
          Token: {token.substring(0, 40)}...
        </p>
      )}
    </div>
  );
}

