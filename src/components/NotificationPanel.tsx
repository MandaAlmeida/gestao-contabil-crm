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
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useNotificationContext } from "@/contexts/NotificationContext";

export type NotificationType =
  | "all"
  | "certificado"
  | "pagamento"
  | "servico"
  | "renovacao"
  | "sintegra"
  | "despesa";

export interface NotificationItem {
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

export function NotificationPanel({
  isOpen,
  onToggle,
  filterBy = ["all"],
}: NotificationPanelProps) {
const {
  notifications,
  markAsViewed,
  markAllAsViewed,
  markingAsViewed,
} = useNotificationContext();

// Filtra notificações conforme o filtro da tela
const filteredNotifications =
  filterBy && filterBy.length && !filterBy.includes("all")
    ? notifications.filter((n) => filterBy.includes(n.type))
    : notifications;

  const navigate = useNavigate();

  const navigateToItem = (notification: NotificationItem) => {
    if (!notification?.id) return;

    // id formato: tipo-id-real
    const routeByType: Record<NotificationType, string> = {
      certificado: "/certificados",
      pagamento: "/financeiro",
      servico: "/servicos",
      renovacao: "/renovacao",
      sintegra: "/sintegra",
      despesa: "/despesas",
      all: "/dashboard",
    };

    const route = routeByType[notification.type] ?? "/dashboard";

    navigate(route);

    onToggle();
  };

  const getIcon = (type: NotificationType) => {
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

  const getPriorityColor = (priority: NotificationItem["priority"]) => {
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
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={onToggle} />
      )}

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

                {filteredNotifications.length > 0 && (
                  <Badge variant="secondary">{filteredNotifications.length}</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filteredNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsViewed(filterBy)}
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
              {filteredNotifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification: NotificationItem) => (
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
                                className={`text-xs ${getPriorityColor(
                                  notification.priority
                                )}`}
                              >
                                {notification.daysRemaining < 0
                                  ? "Vencido"
                                  : notification.daysRemaining === 0
                                  ? "Hoje"
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
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsViewed(notification.id);
                              }}
                              disabled={markingAsViewed.has(notification.id)}
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {markingAsViewed.has(notification.id) ? (
  <>
    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
    Marcando...
  </>
) : (
  <>
    <Eye className="h-3 w-3 mr-1" />
    Marcar como visto
  </>
)}
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
