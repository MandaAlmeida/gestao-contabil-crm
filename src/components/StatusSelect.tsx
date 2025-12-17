import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Certificado, Renovacao } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";
import { updateRenovacao } from "@/lib/firestore/renovacao";

interface StatusSelectProps {
  item: Renovacao | Certificado;
  onUpdateStatus?: (id: string, updates: Partial<Renovacao | Certificado>) => Promise<void>;
  onStatusChange?: () => void;
  statusOptions: { value: string; label: string }[];
}



export function StatusSelect({ item, onUpdateStatus, onStatusChange, statusOptions }: StatusSelectProps) {
  const { toast } = useToast();


  const getStatusValue = (item: Renovacao | Certificado): string => {
    if (item.status === "Parcelado") {
      return `Parcelado (${item.parcela || "1 Vez"})`;
    }
    return item.status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Pendente": "bg-destructive/10 text-destructive",
      "Avisado": "bg-warning/10 text-warning",
      "Em Negociação": "bg-orange-500/10 text-orange-500",
      "Parcelado": "bg-blue-500/10 text-blue-500",
      "Renovado": "bg-success/10 text-success",
      "Cancelado": "bg-muted text-muted-foreground",
    };
    return colors[status] || "bg-muted/50 text-muted-foreground";
  };

  const handleStatusChange = async (item: Renovacao | Certificado, value: string) => {
    // Se o valor contém "Parcelado", extrair a parcela
    if (value.startsWith("Parcelado")) {
      const parcelaMatch = value.match(/\((.+)\)/);
      const parcela = parcelaMatch
        ? (parcelaMatch[1] as "1 Vez" | "2 Vezes" | "3 Vezes")
        : "1 Vez";

      const novoStatus: Renovacao["status"] = "Parcelado";

      // Se o status e parcela não mudaram, não faz nada
      if (item.status === novoStatus && item.parcela === parcela) return;

      try {
        await updateRenovacao(item.id, {
          status: novoStatus,
          parcela: parcela,
        });
        toast({
          title: "Status atualizado!",
          description: `Status alterado para "${novoStatus}" (${parcela}).`,
        });
        onStatusChange?.();
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        toast({
          title: "Erro ao atualizar status",
          description:
            error instanceof Error
              ? error.message
              : "Ocorreu um erro ao atualizar o status.",
          variant: "destructive",
        });
      }
    } else {
      const novoStatus = value as Renovacao["status"];

      // Se o status não mudou, não faz nada
      if (item.status === novoStatus) return;

      try {
        const updateData: Partial<Renovacao> = {
          status: novoStatus,
        };

        // Se mudar para outro status que não seja Parcelado, remover parcela
        if (novoStatus !== "Parcelado") {
          updateData.parcela = null;
        }

        await onUpdateStatus?.(item.id, updateData);
        toast({
          title: "Status atualizado!",
          description: `Status alterado para "${novoStatus}".`,
        });
        onStatusChange?.();
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        toast({
          title: "Erro ao atualizar status",
          description:
            error instanceof Error
              ? error.message
              : "Ocorreu um erro ao atualizar o status.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Select
      value={getStatusValue(item)}
      onValueChange={(value) => handleStatusChange(item, value)}
    >
      <SelectTrigger className={`w-48 ${getStatusColor(item.status)}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
