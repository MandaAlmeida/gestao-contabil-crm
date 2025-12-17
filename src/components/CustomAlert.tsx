import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  LucideIcon
} from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success: "border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning: "border-yellow-500/50 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
        info: "border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type AlertVariant = VariantProps<typeof alertVariants>["variant"];

interface IconMap {
  [key: string]: LucideIcon;
}

const variantIcons: IconMap = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

interface CustomAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const CustomAlert = React.forwardRef<HTMLDivElement, CustomAlertProps>(
  ({
    className,
    variant = "default",
    title,
    description,
    showIcon = true,
    dismissible = false,
    onDismiss,
    children,
    ...props
  }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    if (!isVisible) return null;

    const Icon = variantIcons[variant || "default"];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {showIcon && Icon && <Icon className="h-4 w-4" />}
        <div className="flex-1">
          {title && (
            <h5 className="mb-1 font-medium leading-none tracking-tight">
              {title}
            </h5>
          )}
          {description && (
            <div className="text-sm [&_p]:leading-relaxed">
              {description}
            </div>
          )}
          {children}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

CustomAlert.displayName = "CustomAlert";

// Hook para alertas temporários
export function useCustomAlert() {
  const [alerts, setAlerts] = React.useState<Array<{
    id: string;
    variant: AlertVariant;
    title?: string;
    description?: string;
    duration?: number;
  }>>([]);

  const showAlert = React.useCallback((
    variant: AlertVariant,
    title?: string,
    description?: string,
    duration = 5000
  ) => {
    const id = Math.random().toString(36).substring(7);
    const alert = { id, variant, title, description, duration };

    setAlerts(prev => [...prev, alert]);

    if (duration > 0) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const dismissAlert = React.useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    showAlert,
    dismissAlert,
    clearAll,
  };
}

// Componente para renderizar múltiplos alertas
interface AlertContainerProps {
  alerts: Array<{
    id: string;
    variant: AlertVariant;
    title?: string;
    description?: string;
  }>;
  onDismiss: (id: string) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  className?: string;
}

export function AlertContainer({
  alerts,
  onDismiss,
  position = "top-right",
  className
}: AlertContainerProps) {
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 transform -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2",
  };

  return (
    <div className={cn("fixed z-50 space-y-2", positionClasses[position], className)}>
      {alerts.map((alert) => (
        <CustomAlert
          key={alert.id}
          variant={alert.variant}
          title={alert.title}
          description={alert.description}
          dismissible
          onDismiss={() => onDismiss(alert.id)}
          className="min-w-[300px] max-w-[500px] shadow-lg"
        />
      ))}
    </div>
  );
}

// Alertas de atalho para casos comuns
export const Alert = {
  Success: (title?: string, description?: string) => ({ variant: "success" as const, title, description }),
  Error: (title?: string, description?: string) => ({ variant: "destructive" as const, title, description }),
  Warning: (title?: string, description?: string) => ({ variant: "warning" as const, title, description }),
  Info: (title?: string, description?: string) => ({ variant: "info" as const, title, description }),
  Default: (title?: string, description?: string) => ({ variant: "default" as const, title, description }),
};

export { CustomAlert };
export type { CustomAlertProps, AlertVariant };
