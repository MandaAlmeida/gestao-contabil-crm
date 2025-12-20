import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Certificado, Renovacao } from "@/types/crm";
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
    // Verificar se é um item de Renovacao (possui dataRenovacao)
    const isRenovacao = 'dataRenovacao' in item;

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
        const updateData: Partial<Renovacao | Certificado> = {
          status: novoStatus,
          parcela: parcela,
        };

        // Para Renovacao, quando muda para Parcelado, adicionar 1 ano à dataRenovacao
        if (isRenovacao) {
          const novaDataRenovacao = adicionarAno((item as Renovacao).dataRenovacao);
          (updateData as Partial<Renovacao>).dataRenovacao = novaDataRenovacao.toISOString().split("T")[0];
        }

        if (isRenovacao) {
          await updateRenovacao(item.id, updateData as Partial<Renovacao>);
        } else {
          // Para Certificado, seria necessário implementar updateCertificado, mas por enquanto apenas Renovacao
          throw new Error("Funcionalidade não implementada para Certificado");
        }

        const description = isRenovacao
          ? `Status alterado para "${novoStatus}" (${parcela}). Data renovação: ${(updateData as Partial<Renovacao>).dataRenovacao}.`
          : `Status alterado para "${novoStatus}" (${parcela}).`;

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
    } else {
      const novoStatus = value as Renovacao["status"];

      // Se o status não mudou, não faz nada
      if (item.status === novoStatus) return;

      try {
        const updateData: Partial<Renovacao | Certificado> = {
          status: novoStatus,
        };

        // Se mudar para outro status que não seja Parcelado, remover parcela
        if (novoStatus !== "Parcelado") {
          updateData.parcela = null;
        }

        // Para Renovacao, lógica de manipulação de data
        if (isRenovacao) {
          const renovacaoItem = item as Renovacao;
          const statusAtualEhEspecial = renovacaoItem.status === "Parcelado" || renovacaoItem.status === "Renovado";
          const novoStatusEhEspecial = novoStatus === "Parcelado" || novoStatus === "Renovado";

          if (statusAtualEhEspecial && !novoStatusEhEspecial) {
            // Mudando de status especial para status normal: remover 1 ano
            const dataRevertida = removerAno(renovacaoItem.dataRenovacao);
            (updateData as Partial<Renovacao>).dataRenovacao = dataRevertida.toISOString().split("T")[0];
          } else if (!statusAtualEhEspecial && novoStatusEhEspecial) {
            // Mudando de status normal para status especial: adicionar 1 ano
            const novaDataRenovacao = adicionarAno(renovacaoItem.dataRenovacao);
            (updateData as Partial<Renovacao>).dataRenovacao = novaDataRenovacao.toISOString().split("T")[0];
          }
          // Se ambos são especiais ou ambos são normais, manter a data
        }

        await onUpdateStatus?.(item.id, updateData);

        let description = `Status alterado para "${novoStatus}".`;

        if (isRenovacao) {
          const renovacaoUpdate = updateData as Partial<Renovacao>;
          if (renovacaoUpdate.dataRenovacao) {
            const statusAtualEhEspecial = item.status === "Parcelado" || item.status === "Renovado";
            const novoStatusEhEspecial = novoStatus === "Parcelado" || novoStatus === "Renovado";

            if (statusAtualEhEspecial && !novoStatusEhEspecial) {
              description = `Status alterado para "${novoStatus}". Data renovação revertida: ${renovacaoUpdate.dataRenovacao}.`;
            } else if (novoStatusEhEspecial) {
              description = `Status alterado para "${novoStatus}". Data renovação: ${renovacaoUpdate.dataRenovacao}.`;
            }
          }
        }

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
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
