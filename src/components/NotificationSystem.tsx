import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useRenovacao } from "@/hooks/useRenovacao";
import { useCertificados } from "@/hooks/useCertificados";
import { useSintegra } from "@/hooks/useSintegra";
import { normalizarFinanceiros } from "@/lib/financeiro";

interface Notification {
  id: string;
  type: "financeiro" | "renovacao" | "certificado" | "sintegra";
  title: string;
  message: string;
  daysUntil: number;
  date: string;
}

export function NotificationSystem() {
  const { toast } = useToast();
  const { financeiros: financeirosRaw } = useFinanceiro();
  const { renovacoes } = useRenovacao();
  const { certificados } = useCertificados();
  const { sintegras } = useSintegra();
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkNotifications = () => {
      const hoje = new Date();
      hoje.setHours(hoje.getHours() - 3); // Horário brasileiro
      hoje.setHours(0, 0, 0, 0);
      const newNotifications: Notification[] = [];

      // Verificar Financeiros
      const financeirosNormalizados = normalizarFinanceiros(financeirosRaw);
      financeirosNormalizados.forEach((financeiro) => {
        if (financeiro.status === "Recebido") return;

        const dataVencimento = new Date(financeiro.dataVencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
          (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diff === 7 || diff === 5 || diff === 3) {
          newNotifications.push({
            id: `financeiro-${financeiro.id}-${diff}`,
            type: "financeiro",
            title: "Vencimento de Mensalidade",
            message: `${financeiro.clienteNome} - Vence em ${diff} dia${diff > 1 ? "s" : ""}`,
            daysUntil: diff,
            date: financeiro.dataVencimento,
          });
        }
      });

      // Verificar Renovações
      renovacoes.forEach((renovacao) => {
        if (renovacao.status === "Renovado" || renovacao.status === "Cancelado") return;

        const dataRenovacao = new Date(renovacao.dataRenovacao);
        dataRenovacao.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
          (dataRenovacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diff === 7 || diff === 5 || diff === 3) {
          newNotifications.push({
            id: `renovacao-${renovacao.id}-${diff}`,
            type: "renovacao",
            title: "Vencimento de Renovação",
            message: `${renovacao.clienteNome} - Vence em ${diff} dia${diff > 1 ? "s" : ""}`,
            daysUntil: diff,
            date: renovacao.dataRenovacao,
          });
        }
      });

      // Verificar Certificados
      certificados.forEach((certificado) => {
        if (certificado.status === "Válido") return;

        const dataVencimento = new Date(certificado.dataVencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
          (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diff === 7 || diff === 5 || diff === 3) {
          newNotifications.push({
            id: `certificado-${certificado.id}-${diff}`,
            type: "certificado",
            title: "Vencimento de Certificado",
            message: `${certificado.clienteNome} - Vence em ${diff} dia${diff > 1 ? "s" : ""}`,
            daysUntil: diff,
            date: certificado.dataVencimento,
          });
        }
      });

      // Verificar Sintegra
      sintegras.forEach((sintegra) => {
        if (sintegra.status === "Concluído") return;

        const dataPrazo = new Date(sintegra.dataPrazo);
        dataPrazo.setHours(0, 0, 0, 0);
        const diff = Math.ceil(
          (dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diff === 7 || diff === 5 || diff === 3) {
          newNotifications.push({
            id: `sintegra-${sintegra.id}-${diff}`,
            type: "sintegra",
            title: "Vencimento de Sintegra",
            message: `${sintegra.clienteNome} - Vence em ${diff} dia${diff > 1 ? "s" : ""}`,
            daysUntil: diff,
            date: sintegra.dataPrazo,
          });
        }
      });

      // Exibir notificações que ainda não foram notificadas
      newNotifications.forEach((notification) => {
        if (!notifiedIds.has(notification.id)) {
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.daysUntil <= 3 ? "destructive" : "default",
            duration: 5000,
          });
          setNotifiedIds((prev) => new Set(prev).add(notification.id));
        }
      });

      // Limpar IDs antigos (notificações que já passaram)
      const currentNotificationIds = new Set(
        newNotifications.map((n) => n.id)
      );
      setNotifiedIds((prev) => {
        const filtered = new Set<string>();
        prev.forEach((id) => {
          if (currentNotificationIds.has(id)) {
            filtered.add(id);
          }
        });
        return filtered;
      });
    };

    // Verificar imediatamente
    checkNotifications();

    // Verificar a cada hora
    const interval = setInterval(checkNotifications, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [financeirosRaw, renovacoes, certificados, sintegras, toast]);

  return null;
}

