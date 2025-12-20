import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CustomAlert } from "@/components/CustomAlert";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <VisuallyHidden>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </VisuallyHidden>
          <CustomAlert variant={variant} title={title}>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {description}
              </div>
            </AlertDialogDescription>
          </CustomAlert>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook para facilitar o uso do ConfirmationDialog
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive" | "success" | "warning" | "info";
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const showConfirmation = React.useCallback((
    title: string,
    description: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive" | "success" | "warning" | "info";
      onCancel?: () => void;
    }
  ) => {
    setDialogState({
      open: true,
      title,
      description,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      variant: options?.variant,
      onConfirm,
      onCancel: options?.onCancel,
    });
  }, []);

  const hideConfirmation = React.useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false }));
  }, []);

  const ConfirmationDialogComponent = React.useMemo(() => (
    <ConfirmationDialog
      open={dialogState.open}
      onOpenChange={hideConfirmation}
      title={dialogState.title}
      description={dialogState.description}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
      onConfirm={dialogState.onConfirm}
      onCancel={dialogState.onCancel}
    />
  ), [dialogState, hideConfirmation]);

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationDialogComponent,
  };
}
