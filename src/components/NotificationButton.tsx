import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { NotificationType } from "./NotificationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationContext } from "@/contexts/NotificationContext";

interface NotificationButtonProps {
  onClick: () => void;
  className?: string;
  filterBy?: NotificationType[];
}

export function NotificationButton({
  onClick,
  className = "",
  filterBy = ["all"],
}: NotificationButtonProps) {


  const {
    notifications,
    unreadCount,
    hasUnread,
  } = useNotificationContext();

  // Aplica filtro por tipo igual ao painel
  const filteredNotifications =
    filterBy && filterBy.length && !filterBy.includes("all")
      ? notifications.filter((n) => filterBy.includes(n.type))
      : notifications;

  const count = filteredNotifications.length;
  const hasFilteredUnread = count > 0;

  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="default"
      className={`relative ${className}`}
    >
      <Bell
        className={`h-5 w-5 transition ${
          hasFilteredUnread ? "animate-pulse" : ""
        }`}
      />

      {count > 0 && (
        <Badge
          variant="destructive"
          className="
            absolute 
            -top-2 
            -right-2 
            h-6 
            min-w-[24px] 
            px-1 
            flex 
            items-center 
            justify-center 
            text-xs
            rounded-full
          "
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Button>
  );
}
