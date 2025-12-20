import { useState, useEffect, useMemo } from "react";
import { useCertificados } from "@/hooks/useCertificados";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useRenovacao } from "@/hooks/useRenovacao";
import { useSintegra } from "@/hooks/useSintegra";
import { useServicos } from "@/hooks/useServicos";
import { useDespesas } from "@/hooks/useDespesas";
import { useAuth } from "@/contexts/AuthContext";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PersistentNotification, NotificationData } from "@/types/notifications";

export function useNotificationsData(filterBy: "all" | "certificados" | "financeiro" | "servicos" | "renovacoes" | "sintegra" | "despesas" | "geral" = "all"): {
  notifications: NotificationData[];
  notificationCount: number;
  viewedNotifications: Set<string>;
  markAsViewed: (notificationId: string) => Promise<void>;
  markAllAsViewed: () => Promise<void>;
  loading: boolean;
} {
  const { user } = useAuth();
  const { certificados } = useCertificados();
  const { financeiros } = useFinanceiro();
  const { renovacoes } = useRenovacao();
  const { sintegras } = useSintegra();
  const { servicos } = useServicos();
  const { despesas } = useDespesas();

  const [persistentNotifications, setPersistentNotifications] = useState<PersistentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para limpar notificações antigas (>30 dias)
  const cleanupOldNotifications = async () => {
    if (!user) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("createdAt", "<", thirtyDaysAgo.toISOString())
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);

      if (querySnapshot.docs.length > 0) {
        console.log(`Limpadas ${querySnapshot.docs.length} notificações antigas`);
      }
    } catch (error) {
      console.error("Erro ao limpar notificações antigas:", error);
    }
  };

  // Função para limpar notificações de despesas que não atendem mais aos critérios
  const cleanupIrrelevantExpenseNotifications = async () => {
    if (!user) return;

    try {
      // Buscar todas as notificações de despesas do usuário
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("type", "==", "despesa")
      );

      const querySnapshot = await getDocs(q);
      const hoje = new Date();
      hoje.setHours(hoje.getHours() - 3, 0, 0, 0); // Horário brasileiro

      const deletePromises: Promise<void>[] = [];

      for (const docSnap of querySnapshot.docs) {
        const notification = docSnap.data() as PersistentNotification;
        const itemId = notification.itemId.replace('despesa-', '');

        // Verificar se a despesa ainda existe e atende aos critérios
        const despesa = despesas.find(d => d.id === itemId);

        if (!despesa) {
          // Despesa foi deletada, remover notificação
          deletePromises.push(deleteDoc(docSnap.ref));
        } else {
          // Verificar se ainda atende aos critérios de notificação
          const dataDespesa = new Date(despesa.data);
          dataDespesa.setHours(0, 0, 0, 0);
          const diasDiferenca = Math.ceil((dataDespesa.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

          const shouldNotify = diasDiferenca < 0 || [3, 7, 15, 30].includes(diasDiferenca);

          if (!shouldNotify || despesa.pago || !despesa.ativo) {
            // Não atende mais aos critérios, remover notificação
            deletePromises.push(deleteDoc(docSnap.ref));
          }
        }
      }

      await Promise.all(deletePromises);

      if (deletePromises.length > 0) {
        console.log(`Limpadas ${deletePromises.length} notificações de despesas irrelevantes`);
      }
    } catch (error) {
      console.error("Erro ao limpar notificações irrelevantes de despesas:", error);
    }
  };

  // Função para salvar notificação persistente (ou atualizar se já existir)
  const saveOrUpdateNotification = async (notificationData: Omit<PersistentNotification, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      // Verificar se já existe uma notificação para este item
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("itemId", "==", notificationData.itemId)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Já existe notificação para este item, atualizar
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data() as PersistentNotification;

        // Sempre atualizar se os dados mudaram ou se é um item vencido
        const shouldUpdate = notificationData.daysRemaining !== existingData.daysRemaining ||
                           notificationData.daysRemaining < 0 ||
                           notificationData.title !== existingData.title ||
                           notificationData.message !== existingData.message ||
                           notificationData.priority !== existingData.priority;

        if (shouldUpdate) {
          await updateDoc(existingDoc.ref, {
            ...notificationData,
            isViewed: notificationData.daysRemaining < existingData.daysRemaining ? false : existingData.isViewed,
            updatedAt: new Date().toISOString()
          });
          console.log(`Notificação atualizada para item ${notificationData.itemId}: ${existingData.daysRemaining} -> ${notificationData.daysRemaining} dias`);
        }
      } else {
        // Criar nova notificação
        const newNotification: Omit<PersistentNotification, 'id'> = {
          ...notificationData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await addDoc(collection(db, "notifications"), newNotification);
        console.log(`Nova notificação criada para item ${notificationData.itemId}`);
      }
    } catch (error) {
      console.error("Erro ao salvar notificação:", error);
    }
  };

  // Carregar notificações persistentes
  const loadPersistentNotifications = async () => {
    if (!user) {
      setPersistentNotifications([]);
      setLoading(false);
      return;
    }

    try {
      // Primeiro limpar notificações antigas
      await cleanupOldNotifications();

      // Carregar notificações do usuário
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
      const notifications: PersistentNotification[] = [];

      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as PersistentNotification);
      });

      setPersistentNotifications(notifications);
    } catch (error) {
      console.error("Erro ao carregar notificações persistentes:", error);
      setPersistentNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar notificações duplicadas
  const cleanupDuplicateNotifications = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
      const notificationsByItemId = new Map<string, any[]>();

      // Agrupar notificações por itemId
      querySnapshot.docs.forEach(doc => {
        const notification = doc.data() as PersistentNotification;
        if (!notificationsByItemId.has(notification.itemId)) {
          notificationsByItemId.set(notification.itemId, []);
        }
        notificationsByItemId.get(notification.itemId)!.push({ id: doc.id, ref: doc.ref, ...notification });
      });

      const deletePromises: Promise<void>[] = [];

      // Para cada itemId que tem múltiplas notificações, manter apenas a mais recente
      notificationsByItemId.forEach(notifications => {
        if (notifications.length > 1) {
          // Ordenar por updatedAt (mais recente primeiro)
          notifications.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          // Deletar todas exceto a primeira (mais recente)
          for (let i = 1; i < notifications.length; i++) {
            deletePromises.push(deleteDoc(notifications[i].ref));
          }
        }
      });

      await Promise.all(deletePromises);

      if (deletePromises.length > 0) {
        console.log(`Removidas ${deletePromises.length} notificações duplicadas`);
      }
    } catch (error) {
      console.error("Erro ao limpar notificações duplicadas:", error);
    }
  };

  // Função para limpar todas as notificações de despesas (para debug/reset)
  const clearAllExpenseNotifications = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("type", "==", "despesa")
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);
      console.log(`Removidas ${deletePromises.length} notificações de despesas`);

      // Recarregar notificações
      await loadPersistentNotifications();
    } catch (error) {
      console.error("Erro ao limpar notificações de despesas:", error);
    }
  };

  // Gerar notificações baseadas nos dados atuais e salvar persistente
  const generateAndSaveNotifications = async () => {
    if (!user || loading) return;

    // Data atual no horário brasileiro (UTC-3)
    const hoje = new Date();
    hoje.setHours(hoje.getHours() - 3); // Ajusta para horário brasileiro
    hoje.setHours(0, 0, 0, 0);

    const notificationPromises: Promise<void>[] = [];

    // Certificados vencendo
    certificados.forEach((cert) => {
      if (!cert.ativo) return;

      const dataVenc = new Date(cert.dataVencimento);
      dataVenc.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Sempre notificar certificados vencidos ou próximos do vencimento
      if (diasRestantes < 0 || [3, 7, 15, 30].includes(diasRestantes)) {
        const notificationData = {
          userId: user.uid,
          itemId: `cert-${cert.id}`,
          type: "certificado" as const,
          title: diasRestantes < 0 ? "Certificado Vencido" : "Certificado a Vencer",
          message: `Cliente: ${cert.clienteNome} - ${diasRestantes < 0 ? `Vencido há ${Math.abs(diasRestantes)} dias` : `Vence em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}`,
          daysRemaining: diasRestantes,
          priority: (diasRestantes < 0 ? "high" : diasRestantes <= 7 ? "high" : "medium") as "high" | "medium",
          clienteNome: cert.clienteNome,
          isViewed: false
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Pagamentos vencendo/vencidos
    financeiros.forEach((pag) => {
      if (!pag.ativo || pag.status === "Recebido") return;

      const dataVenc = new Date(pag.dataVencimento);
      dataVenc.setHours(0, 0, 0, 0);
      const diasDiferenca = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Sempre notificar pagamentos vencidos ou próximos do vencimento
      if (diasDiferenca < 0 || [3, 7, 15, 30].includes(diasDiferenca)) {
        const notificationData = {
          userId: user.uid,
          itemId: `fin-${pag.id}`,
          type: "pagamento" as const,
          title: diasDiferenca < 0 ? "Pagamento Vencido" : "Pagamento a Vencer",
          message: `R$ ${pag.valorMensalidade.toFixed(2)} - ${diasDiferenca < 0 ? `Vencido há ${Math.abs(diasDiferenca)} dias` : `Vence em ${diasDiferenca} dias`}`,
          daysRemaining: diasDiferenca,
          priority: (diasDiferenca < 0 ? "high" : diasDiferenca <= 7 ? "high" : "medium") as "high" | "medium",
          clienteNome: pag.clienteNome,
          isViewed: false
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Serviços vencendo/vencidos
    servicos.forEach((serv) => {
      if (!serv.ativo || serv.status === "Recebido") return;

      const dataVenc = new Date(serv.dataVencimento);
      dataVenc.setHours(0, 0, 0, 0);
      const diasDiferenca = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Sempre notificar serviços vencidos ou próximos do vencimento
      if (diasDiferenca < 0 || [3, 7, 15, 30].includes(diasDiferenca)) {
        const notificationData = {
          userId: user.uid,
          itemId: `serv-${serv.id}`,
          type: "servico" as const,
          title: diasDiferenca < 0 ? "Serviço Vencido" : "Serviço a Vencer",
          message: `R$ ${serv.valorMensalidade.toFixed(2)} - ${diasDiferenca < 0 ? `Vencido há ${Math.abs(diasDiferenca)} dias` : `Vence em ${diasDiferenca} dias`}`,
          daysRemaining: diasDiferenca,
          priority: (diasDiferenca < 0 ? "high" : diasDiferenca <= 7 ? "high" : "medium") as "high" | "medium",
          clienteNome: serv.clienteNome,
          isViewed: false
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Renovações pendentes
    renovacoes.forEach((ren) => {
      if (!ren.ativo || !["Pendente", "Avisado", "Em Negociação"].includes(ren.status)) return;

      const dataRen = new Date(ren.dataRenovacao);
      dataRen.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((dataRen.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Sempre notificar renovações pendentes, especialmente quando já passaram da data
      if (diasRestantes <= 0 || [3, 7, 15, 30].includes(diasRestantes)) {
        const notificationData = {
          userId: user.uid,
          itemId: `ren-${ren.id}`,
          type: "renovacao" as const,
          title: diasRestantes < 0 ? "Renovação Atrasada" : "Renovação Pendente",
          message: `${diasRestantes === 0 ? 'Hoje' : diasRestantes === 1 ? 'Amanhã' : diasRestantes < 0 ? `Atrasada há ${Math.abs(diasRestantes)} dias` : `Em ${diasRestantes} dias`} - Status: ${ren.status}`,
          daysRemaining: diasRestantes,
          priority: (diasRestantes < 0 ? "high" : diasRestantes <= 7 ? "high" : "medium") as "high" | "medium",
          clienteNome: ren.clienteNome,
          isViewed: false
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Sintegra pendente
    sintegras.forEach((sin) => {
      if (!sin.ativo || sin.status !== "Pendente") return;

      const dataPrazo = new Date(sin.dataPrazo);
      dataPrazo.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Sempre notificar sintegra vencida ou próxima do prazo
      if (diasRestantes <= 0 || [3, 7, 15, 30].includes(diasRestantes)) {
        const notificationData = {
          userId: user.uid,
          itemId: `sin-${sin.id}`,
          type: "sintegra" as const,
          title: diasRestantes < 0 ? "Sintegra Vencida" : "Sintegra Pendente",
          message: `Cliente: ${sin.clienteNome} - ${diasRestantes < 0 ? `Vencida há ${Math.abs(diasRestantes)} dias` : `Prazo em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}`,
          daysRemaining: diasRestantes,
          priority: (diasRestantes < 0 ? "high" : diasRestantes <= 7 ? "high" : "medium") as "high" | "medium",
          clienteNome: sin.clienteNome,
          isViewed: false
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Despesas não pagas
    despesas.forEach((despesa) => {
      if (!despesa.ativo || despesa.pago) return;

      const dataDespesa = new Date(despesa.data);
      dataDespesa.setHours(0, 0, 0, 0);
      const diasDiferenca = Math.ceil((dataDespesa.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Sempre notificar despesas vencidas ou próximas do vencimento
      if (diasDiferenca < 0 || [3, 7, 15, 30].includes(diasDiferenca)) {
        const notificationData = {
          userId: user.uid,
          itemId: `despesa-${despesa.id}`,
          type: "despesa" as const,
          title: diasDiferenca < 0 ? "Despesa Vencida" : "Despesa a Vencer",
          message: `R$ ${despesa.valor.toFixed(2)} - ${despesa.descricao} - ${diasDiferenca < 0 ? `Vencida há ${Math.abs(diasDiferenca)} dias` : `Vence em ${diasDiferenca} dias`}`,
          daysRemaining: diasDiferenca,
          priority: (diasDiferenca < 0 ? "high" : diasDiferenca <= 7 ? "high" : "medium") as "high" | "medium",
          clienteNome: despesa.contabilidade || "Sem contabilidade",
          isViewed: false
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Aguardar todas as notificações serem salvas/atualizadas
    await Promise.all(notificationPromises);

    // Limpar notificações duplicadas
    await cleanupDuplicateNotifications();

    // Limpar notificações de despesas que não atendem mais aos critérios
    await cleanupIrrelevantExpenseNotifications();

    // Recarregar notificações após salvar
    await loadPersistentNotifications();
  };

  // Carregar notificações na inicialização
  useEffect(() => {
    loadPersistentNotifications();
  }, [user]);

  // Gerar notificações quando os dados mudarem
  useEffect(() => {
    if (!loading && user) {
      generateAndSaveNotifications();
    }
  }, [certificados, financeiros, renovacoes, sintegras, servicos, despesas, loading, user]);

  // Filtrar e ordenar notificações para o painel (apenas 3 e 7 dias)
  const notifications = useMemo(() => {
    let filtered = persistentNotifications.filter(notification =>
      !notification.isViewed &&
      (notification.daysRemaining === 3 || notification.daysRemaining === 7 || notification.daysRemaining < 0)
    );

    if (filterBy !== "all") {
      filtered = filtered.filter((notification) => {
        switch (filterBy) {
          case "certificados":
            return notification.type === "certificado";
          case "financeiro":
            return notification.type === "pagamento";
          case "servicos":
            return notification.type === "servico";
          case "renovacoes":
            return notification.type === "renovacao";
          case "sintegra":
            return notification.type === "sintegra";
          case "despesas":
            return notification.type === "despesa";
          case "geral":
            // Tudo exceto financeiro (pagamentos e serviços)
            return notification.type !== "pagamento" && notification.type !== "servico";
          default:
            return true;
        }
      });
    }

    // Ordenar por prioridade (high primeiro) e depois por dias restantes
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysRemaining - b.daysRemaining;
    });

    return filtered.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      daysRemaining: notification.daysRemaining,
      priority: notification.priority,
      clienteNome: notification.clienteNome,
    }));
  }, [persistentNotifications, filterBy]);

  // Calcular contador para o botão (todas as notificações não visualizadas)
  const notificationCount = useMemo(() => {
    return persistentNotifications.filter(notification => !notification.isViewed).length;
  }, [persistentNotifications]);

  const markAsViewed = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, {
        isViewed: true,
        updatedAt: new Date().toISOString()
      });

      // Atualizar estado local
      setPersistentNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isViewed: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Erro ao marcar notificação como vista:", error);
    }
  };

  const markAllAsViewed = async () => {
    try {
      const updatePromises = notifications.map(notification =>
        updateDoc(doc(db, "notifications", notification.id), {
          isViewed: true,
          updatedAt: new Date().toISOString()
        })
      );

      await Promise.all(updatePromises);

      // Atualizar estado local
      setPersistentNotifications(prev =>
        prev.map(notification =>
          notifications.some(n => n.id === notification.id)
            ? { ...notification, isViewed: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como vistas:", error);
    }
  };

  return {
    notifications,
    notificationCount,
    viewedNotifications: new Set(persistentNotifications.filter(n => n.isViewed).map(n => n.id)),
    markAsViewed,
    markAllAsViewed,
    loading
  };
}

