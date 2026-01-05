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
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PersistentNotification, NotificationData, NotificationView } from "@/types/notifications";
import { NotificationType } from "@/components/NotificationPanel";

export function useNotificationsData(filterBy: NotificationType[] = ["all"]): {
  notifications: NotificationData[];
  notificationCount: number;
  markAsViewed: (notificationId: string) => Promise<void>;
  markAllAsViewed: () => Promise<void>;
  loading: boolean;
  markingAsViewed: Set<string>;
} {
  const { user } = useAuth();
  const { certificados } = useCertificados();
  const { financeiros } = useFinanceiro();
  const { renovacoes } = useRenovacao();
  const { sintegras } = useSintegra();
  const { servicos } = useServicos();
  const { despesas } = useDespesas();

  const [persistentNotifications, setPersistentNotifications] = useState<PersistentNotification[]>([]);
  const [userViews, setUserViews] = useState<Set<string>>(new Set()); // IDs das notificações visualizadas pelo usuário atual
  const [loading, setLoading] = useState(true);
  const [markingAsViewed, setMarkingAsViewed] = useState<Set<string>>(new Set()); // IDs sendo marcados como vistos

  // Função auxiliar para parsear data ISO (YYYY-MM-DD) para data no timezone local
  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Função para carregar visualizações do usuário atual
  const loadUserViews = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "notificationViews"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const viewedIds = new Set<string>();
      querySnapshot.forEach((doc) => {
        const view = doc.data() as NotificationView;
        viewedIds.add(view.notificationId);
      });
      setUserViews(viewedIds);
    } catch (error) {
      console.error("Erro ao carregar visualizações do usuário:", error);
    }
  };

  // Função para limpar notificações antigas (>30 dias)
  const cleanupOldNotifications = async () => {
    if (!user) return;

    try {
      // Buscar todas as notificações do usuário primeiro
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletePromises: Promise<void>[] = [];

      // Filtrar no cliente notificações antigas e de itens inexistentes
      querySnapshot.docs.forEach((doc) => {
        const notification = doc.data() as PersistentNotification;
        
        // Verificar se notificação é antiga
        if (notification.createdAt < thirtyDaysAgo.toISOString()) {
          deletePromises.push(deleteDoc(doc.ref));
        }
      });


      await Promise.all(deletePromises);
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
          const dataDespesa = parseDate(despesa.data);
          const diasDiferenca = Math.ceil((dataDespesa.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

          const shouldNotify = diasDiferenca < 0 || [1, 3, 7, 15, 30].includes(diasDiferenca);

          if (!shouldNotify || despesa.pago || !despesa.ativo) {
            // Não atende mais aos critérios, remover notificação
            deletePromises.push(deleteDoc(docSnap.ref));
          }
        }
      }

      await Promise.all(deletePromises);

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
        // Já existe notificação para este item, sempre atualizar
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data() as PersistentNotification;

        // Verificar se a data mudou para desmarcar como vista
        const daysChanged = notificationData.daysRemaining !== existingData.daysRemaining;

        await updateDoc(existingDoc.ref, {
          ...notificationData,
          updatedAt: new Date().toISOString()
        });

        // Se a data mudou, remover visualização para que apareça novamente como não vista
        if (daysChanged) {
          const viewQuery = query(
            collection(db, "notificationViews"),
            where("userId", "==", user.uid),
            where("notificationId", "==", existingData.id)
          );
          const viewSnapshot = await getDocs(viewQuery);
          if (!viewSnapshot.empty) {
            await deleteDoc(viewSnapshot.docs[0].ref);
            // Atualizar estado local removendo da lista de visualizadas
            setUserViews(prev => {
              const newSet = new Set(prev);
              newSet.delete(existingData.id);
              return newSet;
            });
          }
        }
      } else {
        // Criar nova notificação
        const newNotification: Omit<PersistentNotification, 'id'> = {
          ...notificationData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "notifications"), newNotification);
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

      // Recarregar notificações
      await loadPersistentNotifications();
    } catch (error) {
      console.error("Erro ao limpar notificações de despesas:", error);
    }
  };

  // Gerar notificações baseadas nos dados atuais e salvar persistente
  const generateAndSaveNotifications = async () => {
    if (!user || loading) return;

    // Calcular "hoje" no fuso horário local
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    
    // Função auxiliar para verificar se uma data é hoje
    const isHoje = (data: Date): boolean => {
      const mesmaData = data.getFullYear() === hoje.getFullYear() &&
             data.getMonth() === hoje.getMonth() &&
             data.getDate() === hoje.getDate();
      
      
      return mesmaData;
    };

    const notificationPromises: Promise<void>[] = [];

    // Certificados vencendo
    certificados.forEach((cert) => {
      if (!cert.ativo) return;

      const dataVenc = parseDate(cert.dataVencimento);
      const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const vendeHoje = isHoje(dataVenc);
      
      // Sempre notificar certificados vencidos ou próximos do vencimento
      if (diasRestantes < 0 || vendeHoje || [1, 3, 7, 15, 30].includes(diasRestantes)) {
        const notificationData = {
          userId: user.uid,
          itemId: `cert-${cert.id}`,
          pureItemId: cert.id,
          type: "certificado" as NotificationType,
          title: diasRestantes < 0 ? "Certificado Vencido" : vendeHoje ? "Certificado Vence Hoje" : "Certificado a Vencer",
          message: `Cliente: ${cert.clienteNome} - ${diasRestantes < 0 ? `Vencido há ${Math.abs(diasRestantes)} dias` : vendeHoje ? 'Vence hoje' : `Vence em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}`,
          daysRemaining: vendeHoje ? 0 : diasRestantes,
          priority: (diasRestantes < 0 ? "high" : diasRestantes <= 7 ? "high" : "medium") as "high" | "medium",
          clienteId: cert.clienteId,
          clienteNome: cert.clienteNome
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Pagamentos vencendo/vencidos
    financeiros.forEach((pag) => {
      if (!pag.ativo || pag.status === "Pago") return;

      const dataVenc = parseDate(pag.dataVencimento);
      const diasDiferenca = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const vendeHoje = isHoje(dataVenc);

      // Sempre notificar pagamentos vencidos ou próximos do vencimento
      if (diasDiferenca < 0 || vendeHoje || [1, 3].includes(diasDiferenca)) {
        const notificationData = {
          userId: user.uid,
          itemId: `fin-${pag.id}`,
          pureItemId: pag.id,
          type: "pagamento" as NotificationType,
          title: diasDiferenca < 0 ? "Pagamento Vencido" : vendeHoje ? "Pagamento Vence Hoje" : "Pagamento a Vencer",
          message: `R$ ${pag.valorMensalidade.toFixed(2)} - ${diasDiferenca < 0 ? `Vencido há ${Math.abs(diasDiferenca)} dias` : vendeHoje ? 'Vence hoje' : `Vence em ${diasDiferenca} dias`}`,
          daysRemaining: vendeHoje ? 0 : diasDiferenca,
          priority: (diasDiferenca < 0 ? "high" : diasDiferenca <= 7 ? "high" : "medium") as "high" | "medium",
          clienteId: pag.clienteId,
          clienteNome: pag.clienteNome
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Serviços vencendo/vencidos
    servicos.forEach((serv) => {
      if (!serv.ativo) return;

      const dataVenc = parseDate(serv.dataVencimento);
      const diasDiferenca = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const vendeHoje = isHoje(dataVenc);

      // Sempre notificar serviços vencidos ou próximos do vencimento
      if (diasDiferenca < 0 || vendeHoje || [1, 3].includes(diasDiferenca)) {
        const notificationData = {
          userId: user.uid,
          itemId: `serv-${serv.id}`,
          pureItemId: serv.id,
          type: "servico" as NotificationType,
          title: diasDiferenca < 0 ? "Serviço Vencido" : vendeHoje ? "Serviço Vence Hoje" : "Serviço a Vencer",
          message: `R$ ${serv.valorMensalidade.toFixed(2)} - ${diasDiferenca < 0 ? `Vencido há ${Math.abs(diasDiferenca)} dias` : vendeHoje ? 'Vence hoje' : `Vence em ${diasDiferenca} dias`}`,
          daysRemaining: vendeHoje ? 0 : diasDiferenca,
          priority: (diasDiferenca < 0 ? "high" : diasDiferenca <= 7 ? "high" : "medium") as "high" | "medium",
          clienteId: serv.clienteId,
          clienteNome: serv.clienteNome
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Renovações pendentes
    renovacoes.forEach((ren) => {
      if (!ren.ativo || !["Pendente", "Avisado", "Em Negociação"].includes(ren.status)) return;

     const dataRen = parseDate(ren.dataRenovacao);

      // Comparar apenas dias (diferença em dias inteiros)
      const diffMs = dataRen.getTime() - hoje.getTime();
      const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24)); // Usar round em vez de ceil

      // Sempre notificar renovações pendentes, especialmente quando já passaram da data
      if (diasRestantes <= 0 || [1, 3, 7, 15, 30].includes(diasRestantes)) {
        const notificationData = {
          userId: user.uid,
          itemId: `ren-${ren.id}`,
          pureItemId: ren.id,
          type: "renovacao" as NotificationType,
          title: diasRestantes < 0 ? "Renovação Atrasada" : "Renovação Pendente",
          message: `${diasRestantes === 0 ? 'Hoje' : diasRestantes === 1 ? 'Amanhã' : diasRestantes < 0 ? `Atrasada há ${Math.abs(diasRestantes)} dias` : `Em ${diasRestantes} dias`} - Status: ${ren.status}`,
          daysRemaining: diasRestantes,
          priority: (diasRestantes < 0 ? "high" : diasRestantes <= 7 ? "high" : "medium") as "high" | "medium",
          clienteId: ren.clienteId,
          clienteNome: ren.clienteNome
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Sintegra pendente
    sintegras.forEach((sin) => {
      if (!sin.ativo || sin.status !== "Pendente") return;

      const dataPrazo = parseDate(sin.dataPrazo);
      const diasRestantes = Math.ceil((dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const vendeHoje = isHoje(dataPrazo);

      // Sempre notificar sintegra vencida ou próxima do prazo (15, 7, 3 e 1 dias)
      if (diasRestantes < 0 || vendeHoje || [1, 3, 7, 15].includes(diasRestantes)) {
        const notificationData = {
          userId: user.uid,
          itemId: `sin-${sin.id}`,
          pureItemId: sin.id,
          type: "sintegra" as NotificationType,
          title: diasRestantes < 0 ? "Sintegra Vencida" : vendeHoje ? "Sintegra Vence Hoje" : "Sintegra Pendente",
          message: `Cliente: ${sin.clienteNome} - ${diasRestantes < 0 ? `Vencida há ${Math.abs(diasRestantes)} dias` : vendeHoje ? 'Vence hoje' : `Prazo em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}`,
          daysRemaining: vendeHoje ? 0 : diasRestantes,
          priority: (diasRestantes < 0 ? "high" : diasRestantes <= 7 ? "high" : "medium") as "high" | "medium",
          clienteId: sin.clienteId,
          clienteNome: sin.clienteNome
        };

        notificationPromises.push(saveOrUpdateNotification(notificationData));
      }
    });

    // Despesas não pagas
    despesas.forEach((despesa) => {
      if (!despesa.ativo || despesa.pago) return;

      const dataDespesa = parseDate(despesa.data);
      const diasDiferenca = Math.ceil((dataDespesa.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const vendeHoje = isHoje(dataDespesa);

      // Sempre notificar despesas vencidas ou próximas do vencimento
      if (diasDiferenca < 0 || vendeHoje || [1, 3].includes(diasDiferenca)) {
        const notificationData = {
          userId: user.uid,
          itemId: `despesa-${despesa.id}`,
          pureItemId: despesa.id,
          type: "despesa" as NotificationType,
          title: diasDiferenca < 0 ? "Despesa Vencida" : vendeHoje ? "Despesa Vence Hoje" : "Despesa a Vencer",
          message: `R$ ${despesa.valor.toFixed(2)} - ${despesa.descricao} - ${diasDiferenca < 0 ? `Vencida há ${Math.abs(diasDiferenca)} dias` : vendeHoje ? 'Vence hoje' : `Vence em ${diasDiferenca} dias`}`,
          daysRemaining: vendeHoje ? 0 : diasDiferenca,
          priority: (diasDiferenca < 0 ? "high" : diasDiferenca <= 7 ? "high" : "medium") as "high" | "medium",
          clienteId: "", // Despesas não têm cliente específico
          clienteNome: despesa.contabilidade || "Sem contabilidade"
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

  // Carregar notificações e visualizações do usuário na inicialização
  useEffect(() => {
    if (!user) {
      setPersistentNotifications([]);
      setLoading(false);
      return;
    }

    // Carregar visualizações
    loadUserViews();

    // Limpar notificações antigas primeiro
    cleanupOldNotifications();

    // Configurar listener em tempo real para notificações
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifications: PersistentNotification[] = [];
      
      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as PersistentNotification);
      });

      setPersistentNotifications(notifications);
      setLoading(false);
    }, (error) => {
      console.error("❌ Erro no listener de notificações:", error);
      setPersistentNotifications([]);
      setLoading(false);
    });

    // Cleanup: remover listener quando o componente desmontar ou o usuário mudar
    return () => {
      unsubscribe();
    };
  }, [user]);

  // Gerar notificações quando os dados mudarem
  useEffect(() => {
    if (!loading && user) {
      generateAndSaveNotifications();
    }
  }, [certificados, financeiros, renovacoes, sintegras, servicos, despesas, loading, user]);

  // Filtrar e ordenar notificações para o painel (0, 1, 3, 7, 15, 30 dias e vencidas)
  const notifications = useMemo(() => {
    let filtered = persistentNotifications.filter(notification =>
      !userViews.has(notification.id) && // Usar visualizações do usuário atual
      (notification.daysRemaining === 0 || notification.daysRemaining === 1 ||
       notification.daysRemaining === 3 || notification.daysRemaining === 7 ||
       notification.daysRemaining === 15 || notification.daysRemaining === 30 ||
       notification.daysRemaining < 0)
    );

    filtered = filtered.filter((notification) => {
      // Regra especial: "all" = tudo
      if (filterBy.includes("all")) {
        return true;
      }

      // Filtro normal: aceita múltiplos tipos
      return filterBy.some(type => notification.type.includes(type));
    });
    

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
  }, [persistentNotifications, filterBy, userViews]);

  // Calcular contador para o botão (notificações filtradas não visualizadas)
  const notificationCount = useMemo(() => {
    let filtered = persistentNotifications.filter(notification =>
      !userViews.has(notification.id) && // Usar visualizações do usuário atual
      (notification.daysRemaining === 0 || notification.daysRemaining === 1 ||
       notification.daysRemaining === 3 || notification.daysRemaining === 7 ||
       notification.daysRemaining === 15 || notification.daysRemaining === 30 ||
       notification.daysRemaining < 0)
    );

    // Aplicar o mesmo filtro do painel
    filtered = filtered.filter((notification) => {
      // Regra especial: "all" = tudo
      if (filterBy.includes("all")) {
        return true;
      }

      // Filtro normal: aceita múltiplos tipos
      return filterBy.some(type => notification.type.includes(type));
    });

    return filtered.length;
  }, [persistentNotifications, filterBy, userViews]);

  const markAsViewed = async (notificationId: string) => {
    if (!user) return;

    // Adicionar ao estado de "marcando como visto"
    setMarkingAsViewed(prev => new Set([...prev, notificationId]));

    try {
      // Verificar se já existe uma visualização para este usuário e notificação
      const q = query(
        collection(db, "notificationViews"),
        where("userId", "==", user.uid),
        where("notificationId", "==", notificationId)
      );
      const existingViews = await getDocs(q);

      if (existingViews.empty) {
        // Criar nova visualização
        await addDoc(collection(db, "notificationViews"), {
          userId: user.uid,
          notificationId: notificationId,
          viewedAt: new Date().toISOString()
        });

        // Atualizar estado local
        setUserViews(prev => new Set([...prev, notificationId]));
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como vista:", error);
    } finally {
      // Remover do estado de "marcando como visto"
      setMarkingAsViewed(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsViewed = async () => {
    if (!user || notifications.length === 0) return;

    try {
      const notificationIds = notifications.map(n => n.id);
      const createPromises: Promise<void>[] = [];

      // Verificar quais notificações ainda não foram visualizadas por este usuário
      const q = query(
        collection(db, "notificationViews"),
        where("userId", "==", user.uid)
      );
      const existingViews = await getDocs(q);
      const alreadyViewed = new Set(existingViews.docs.map(doc => doc.data().notificationId));

      // Criar visualizações apenas para notificações não visualizadas ainda
      for (const notificationId of notificationIds) {
        if (!alreadyViewed.has(notificationId)) {
          createPromises.push(
            addDoc(collection(db, "notificationViews"), {
              userId: user.uid,
              notificationId: notificationId,
              viewedAt: new Date().toISOString()
            }).then(() => undefined) // Converter Promise<DocumentReference> para Promise<void>
          );
        }
      }

      if (createPromises.length > 0) {
        await Promise.all(createPromises);

        // Atualizar estado local
        setUserViews(prev => new Set([...prev, ...notificationIds]));
      }
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como vistas:", error);
    }
  };

  return {
    notifications,
    notificationCount,
    markAsViewed,
    markAllAsViewed,
    loading,
    markingAsViewed
  };
}

