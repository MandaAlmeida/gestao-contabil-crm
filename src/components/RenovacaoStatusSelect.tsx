import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Renovacao } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";
import { updateRenovacao } from "@/lib/firestore/renovacao";

const adicionarAno = (data?: string) => {
  const baseDate = data ? new Date(data) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return new Date();
  }
  const novaData = new Date(baseDate);
  novaData.setFullYear(novaData.getFullYear() + 1);
  return novaData;
};

const STATUS_OPTIONS = [
  { value: "Pendente", label: "Pendente" },
  { value: "Avisado", label: "Avisado" },
  { value: "Em Negociação", label: "Em Negociação" },
  { value: "Parcelado (1 Vez)", label: "Parcelado (1 Vez)" },
  { value: "Parcelado (2 Vezes)", label: "Parcelado (2 Vezes)" },
  { value: "Parcelado (3 Vezes)", label: "Parcelado (3 Vezes)" },
  { value: "Renovado", label: "Renovado" },
  { value: "Cancelado", label: "Cancelado" },
];

interface RenovacaoStatusSelectProps {
  item: Renovacao;
  onUpdateStatus?: (id: string, updates: Partial<Renovacao>) => Promise<void>;
  onStatusChange?: () => void;
}



export function RenovacaoStatusSelect({ item, onUpdateStatus, onStatusChange }: RenovacaoStatusSelectProps) {
  const { toast } = useToast();


  const getStatusValue = (item: Renovacao): string => {
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

  const handleStatusChange = async (item: Renovacao, value: string) => {
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
        // Quando muda para Parcelado, adicionar 1 ano à dataRenovacao
        const novaDataRenovacao = adicionarAno(item.dataRenovacao);
        const dataRenovacaoISO = novaDataRenovacao.toISOString().split("T")[0];

        await updateRenovacao(item.id, {
          status: novoStatus,
          parcela: parcela,
          dataRenovacao: dataRenovacaoISO,
        });
        toast({
          title: "Status atualizado!",
          description: `Status alterado para "${novoStatus}" (${parcela}). Data renovação: ${dataRenovacaoISO}.`,
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

        // Quando muda para Renovado, adicionar 1 ano à dataRenovacao
        if (novoStatus === "Renovado") {
          const novaDataRenovacao = adicionarAno(item.dataRenovacao);
          updateData.dataRenovacao = novaDataRenovacao.toISOString().split("T")[0];
        }

        await onUpdateStatus?.(item.id, updateData);

        const description = novoStatus === "Renovado"
          ? `Status alterado para "${novoStatus}". Data renovação: ${updateData.dataRenovacao}.`
          : `Status alterado para "${novoStatus}".`;

        toast({
          title: "Status atualizado!",
          description,
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
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
