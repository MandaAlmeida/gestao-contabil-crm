import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Certificado, Renovacao } from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

const adicionarAno = (data?: string) => {
  const baseDate = data ? new Date(data) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return new Date();
  }
  const novaData = new Date(baseDate);
  novaData.setFullYear(novaData.getFullYear() + 1);
  return novaData;
};

const removerAno = (data: string) => {
  const baseDate = data ? new Date(data) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return new Date();
  }
  const novaData = new Date(baseDate);
  novaData.setFullYear(novaData.getFullYear() - 1);
  return novaData;
};

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
    const isRenovacao = 'dataRenovacao' in item;

    if (value.startsWith("Parcelado")) {
      const parcelaMatch = value.match(/\((.+)\)/);
      const parcela = parcelaMatch ? (parcelaMatch[1] as "1 Vez" | "2 Vezes" | "3 Vezes") : "1 Vez";
      const novoStatus: Renovacao["status"] = "Parcelado";

      if (item.status === novoStatus && item.parcela === parcela) return;

      try {
        const updateData: Partial<Renovacao | Certificado> = {
          status: novoStatus,
          parcela: parcela,
        };

        if (isRenovacao) {
          const novaDataRenovacao = adicionarAno((item as Renovacao).dataRenovacao);
          (updateData as Partial<Renovacao>).dataRenovacao = novaDataRenovacao.toISOString().split("T")[0];
        }

        // Chama a função do componente pai (RenovacoesPage)
        await onUpdateStatus?.(item.id, updateData);

        const description = isRenovacao
          ? `Status alterado para "${novoStatus}" (${parcela}). Data renovação: ${(updateData as Partial<Renovacao>).dataRenovacao}.`
          : `Status alterado para "${novoStatus}" (${parcela}).`;

        toast({ title: "Status atualizado!", description });
        onStatusChange?.();
      } catch (error) {
        toast({ title: "Erro ao atualizar status", variant: "destructive" });
      }
    } else {
      const novoStatus = value as Renovacao["status"];
      if (item.status === novoStatus) return;

      try {
        const updateData: Partial<Renovacao | Certificado> = { status: novoStatus };
        if (novoStatus !== "Parcelado") {
          updateData.parcela = null;
        }

        if (isRenovacao) {
          const renovacaoItem = item as Renovacao;
          const statusAtualEhEspecial = renovacaoItem.status === "Parcelado" || renovacaoItem.status === "Renovado";
          const novoStatusEhEspecial = novoStatus === "Parcelado" || novoStatus === "Renovado";

          if (statusAtualEhEspecial && !novoStatusEhEspecial) {
            const dataRevertida = removerAno(renovacaoItem.dataRenovacao);
            (updateData as Partial<Renovacao>).dataRenovacao = dataRevertida.toISOString().split("T")[0];
          } else if (!statusAtualEhEspecial && novoStatusEhEspecial) {
            const novaDataRenovacao = adicionarAno(renovacaoItem.dataRenovacao);
            (updateData as Partial<Renovacao>).dataRenovacao = novaDataRenovacao.toISOString().split("T")[0];
          }
        }

        // Chama a função do componente pai (RenovacoesPage)
        await onUpdateStatus?.(item.id, updateData);

        toast({ title: "Status atualizado!", description: `Status alterado para "${novoStatus}".` });
        onStatusChange?.();
      } catch (error) {
        toast({ title: "Erro ao atualizar status", variant: "destructive" });
      }
    }
  };

  return (
    <Select value={getStatusValue(item)} onValueChange={(value) => handleStatusChange(item, value)}>
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