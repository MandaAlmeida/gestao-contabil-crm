import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useNotificationsData } from "@/hooks/useNotificationsData";

interface NotificationButtonProps {
  onClick: () => void;
  className?: string;
  filterBy?: "all" | "certificados" | "financeiro" | "servicos" | "renovacoes" | "sintegra" | "despesas" | "geral";
}

export function NotificationButton({ onClick, className = "", filterBy = "all" }: NotificationButtonProps) {
  const { notificationCount } = useNotificationsData(filterBy);

  return (
<Button
        onClick={onClick}
        size="icon"
        className={`relative ${className}`}
        variant="default"
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs"
          >
            {notificationCount > 99 ? '99+' : notificationCount}
          </Badge>
        )}
      </Button>
  );
}
