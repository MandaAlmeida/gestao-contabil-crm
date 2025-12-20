import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  X,
  AlertCircle,
  DollarSign,
  FileCheck,
  Calendar,
  RefreshCw,
  Wrench,
  Eye,
  EyeOff,
  CreditCard,
} from "lucide-react";
import { useNotificationsData } from "@/hooks/useNotificationsData";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

export type NotificationType = "all" | "certificado" | "pagamento" | "servico" | "renovacao" | "sintegra" | "despesa";


interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  daysRemaining: number;
  priority: "high" | "medium" | "low";
  clienteNome: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filterBy?: NotificationType[];
}

export function NotificationPanel({ isOpen, onToggle, filterBy = ["all"] }: NotificationPanelProps) {
  const { user } = useAuth();
  const { notifications, viewedNotifications } = useNotificationsData(filterBy);
  const navigate = useNavigate();

  // Salvar notificações vistas no Firebase quando são marcadas
  const saveViewedNotifications = async (notifications: Set<string>) => {
    if (!user) return;

    try {
      const docRef = doc(db, "userPreferences", user.uid);
      const now = Date.now();
      const viewedData: Record<string, number> = {};

      // Criar objeto com timestamps
      notifications.forEach(notificationId => {
        viewedData[notificationId] = now;
      });

      await setDoc(docRef, {
        viewedNotifications: viewedData,
        updatedAt: now
      }, { merge: true });

      // Também salvar no localStorage como backup
      localStorage.setItem("viewed-notifications", JSON.stringify([...notifications]));
    } catch (error) {
      console.error("Erro ao salvar notificações vistas:", error);
      // Fallback para localStorage
      localStorage.setItem("viewed-notifications", JSON.stringify([...notifications]));
    }
  };

  // Salvar quando notificações são marcadas como vistas
  const markAsViewed = (notificationId: string) => {
    // Atualizar localmente (o hook já faz isso)
    const updatedViewed = new Set([...viewedNotifications, notificationId]);
    saveViewedNotifications(updatedViewed);
  };

  const markAllAsViewed = () => {
    // Atualizar localmente (o hook já faz isso)
    const allIds = notifications.map(n => n.id);
    const updatedViewed = new Set([...viewedNotifications, ...allIds]);
    saveViewedNotifications(updatedViewed);
  };

  const navigateToItem = (notification: NotificationItem) => {
    // Extrair o ID real (tipo-id)
    const [, ...rest] = notification.id.split("-");
    const itemId = rest.join("-");
  
    // Mapa de rotas por tipo
    const routeByType: Record<NotificationType, string> = {
      certificado: "/certificados",
      pagamento: "/financeiro",
      servico: "/servicos",
      renovacao: "/renovacao",
      sintegra: "/sintegra",
      despesa: "/despesas",
      all: "/dashboard",
    };
  
    // Pega o primeiro tipo válido (ignorando "all")
    const typeToNavigate = notification.type;
  
    // Navega para a rota correspondente ou fallback
    navigate(routeByType[typeToNavigate ?? "all"]);
  
    // Fecha o painel de notificações
    onToggle();
  };
  
  

  const getIcon = (type: string) => {
    switch (type) {
      case "certificado":
        return <FileCheck className="h-4 w-4" />;
      case "pagamento":
        return <DollarSign className="h-4 w-4" />;
      case "servico":
        return <Wrench className="h-4 w-4" />;
      case "renovacao":
        return <RefreshCw className="h-4 w-4" />;
      case "sintegra":
        return <Calendar className="h-4 w-4" />;
      case "despesa":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <>
      {/* Backdrop para fechar ao clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={onToggle}
        />
      )}

      {/* Painel lateral */}
      {isOpen && (
        <div
          className="fixed inset-y-0 right-0 z-40 w-96 bg-background border-l shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Notificações</h2>
                {notifications.length > 0 && (
                  <Badge variant="secondary">{notifications.length}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsViewed}
                    className="text-xs"
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onToggle}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conteúdo */}
            <ScrollArea className="flex-1 p-4">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className="relative cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToItem(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {notification.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriorityColor(notification.priority)}`}
                              >
                                {notification.daysRemaining <= 0
                                  ? "Vencido"
                                  : `${notification.daysRemaining}d`}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {notification.clienteNome.toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsViewed(notification.id)}
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Marcar como visto
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}
