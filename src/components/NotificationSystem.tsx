import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useRenovacao } from "@/hooks/useRenovacao";
import { useCertificados } from "@/hooks/useCertificados";
import { useSintegra } from "@/hooks/useSintegra";
import { useDespesas } from "@/hooks/useDespesas";
import { useServicos } from "@/hooks/useServicos";
import { useNotificationsData } from "@/hooks/useNotificationsData";
import { normalizarFinanceiros } from "@/lib/financeiro";

// Interface removida - usando as notificações persistentes diretamente

export function NotificationSystem() {
  const { toast } = useToast();
  const { notifications } = useNotificationsData("all");
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  // Hooks para manter compatibilidade (não são mais usados para cálculo)
  const { financeiros: financeirosRaw } = useFinanceiro();
  const { renovacoes } = useRenovacao();
  const { certificados } = useCertificados();
  const { sintegras } = useSintegra();
  const { despesas } = useDespesas();
  const { servicos } = useServicos();

  // Função para determinar a variante do toast baseada no tempo restante
  const getToastVariant = (daysRemaining: number) => {
    if (daysRemaining < 0) return "destructive"; // Já venceu - vermelho
    if (daysRemaining <= 1) return "destructive"; // Vence hoje/amanhã - vermelho
    if (daysRemaining <= 3) return "destructive"; // Vence em até 3 dias - vermelho
    if (daysRemaining <= 7) return "default"; // Vence em 4-7 dias - laranja/amarelo
    if (daysRemaining <= 15) return "default"; // Vence em 8-15 dias - amarelo
    return "default"; // Vence em mais de 15 dias - padrão
  };

  useEffect(() => {
    // Mostrar toast para notificações não visualizadas
    notifications.forEach((notification) => {
      if (!notifiedIds.has(notification.id)) {
        toast({
          title: notification.title,
          description: notification.message,
          variant: getToastVariant(notification.daysRemaining),
          duration: 6000,
        });
        setNotifiedIds((prev) => new Set(prev).add(notification.id));
      }
    });

    // Limpar IDs de notificações que não existem mais
    const currentNotificationIds = new Set(notifications.map((n) => n.id));
    setNotifiedIds((prev) => {
      const filtered = new Set<string>();
      prev.forEach((id) => {
        if (currentNotificationIds.has(id)) {
          filtered.add(id);
        }
      });
      return filtered;
    });
  }, [notifications, toast]);

  return null;
}

