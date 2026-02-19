import { useEffect } from "react";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PersistentNotification } from "@/types/notifications";
import { NotificationType } from "@/components/NotificationPanel";

const STORAGE_LAST_RUN = "notifications-last-run";

/* ======================================================
   CONFIG GLOBAL
====================================================== */

const NOTIFY_DAYS = [30, 15, 7, 3, 1, 0];

function shouldNotify(days: number) {
  // Notifica se estiver vencido (dias < 0) ou se estiver nos dias definidos, ou se já passou de 30 dias do vencimento
  return days < 0 || NOTIFY_DAYS.includes(days) || days < -30;
}

function getPriority(days: number): "high" | "medium" | "low" {
  if (days < 0) return "high";
  if (days <= 7) return "high";
  if (days <= 15) return "medium";
  return "low";
}

function calcDays(dateString: string) {
  const hojeUTC = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const hoje = new Date(
    hojeUTC.getFullYear(),
    hojeUTC.getMonth(),
    hojeUTC.getDate()
  );

  const data = new Date(dateString + "T00:00:00.000-03:00");
  data.setHours(0, 0, 0, 0);

  return Math.ceil(
    (data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/* ======================================================
   HOOK
====================================================== */

export function useAutomaticNotifications({
  user,
  certificados = [],
  financeiros = [],
  servicos = [],
  renovacoes = [],
  sintegras = [],
  despesas = [],
}: any) {
  /* ======================================================
     SAVE OR UPDATE
  ====================================================== */

  const saveOrUpdateNotification = async (
    notification: Omit<PersistentNotification, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const ref = collection(db, "notifications");

      const snapshot = await getDocs(ref);

      const existing = snapshot.docs.find((docItem) => {
        const data = docItem.data() as PersistentNotification;
        return (
          data.userId === notification.userId &&
          data.itemId === notification.itemId &&
          data.type === notification.type
        );
      });

      if (existing) {
        const existingData = existing.data() as PersistentNotification;
        // Se o novo daysRemaining for menor (mais urgente), atualiza a notificação
        const menorDays = Math.min(existingData.daysRemaining, notification.daysRemaining);
        await setDoc(doc(db, "notifications", existing.id), {
          ...existingData,
          ...notification,
          daysRemaining: menorDays,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const id = crypto.randomUUID();
      console.log("[NOTIF] Criando nova notificação:", id);
      await setDoc(doc(db, "notifications", id), {
        id,
        ...notification,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[NOTIF][ERRO ao salvar notificação no Firestore]', error);
    }
  };

  /* ======================================================
     CLEANUP OLD
  ====================================================== */

  const cleanupOldNotifications = async () => {
    const ref = collection(db, "notifications");
    const snapshot = await getDocs(ref);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletions: Promise<any>[] = [];

    snapshot.docs.forEach((docItem) => {
      const data = docItem.data() as PersistentNotification;

      if (data.createdAt && new Date(data.createdAt) < thirtyDaysAgo) {
        deletions.push(deleteDoc(doc(db, "notifications", docItem.id)));
      }
    });

    await Promise.all(deletions);
  };

  /* ======================================================
     PROCESS GENERIC
  ====================================================== */

  const processItems = async <T>({
    items,
    getDate,
    getId,
    getTitle,
    getMessage,
    getCliente,
    type,
    isValid,
  }: {
    items: T[];
    getDate: (item: T) => string;
    getId: (item: T) => string;
    getTitle: (days: number) => string;
    getMessage: (item: T, days: number) => string;
    getCliente: (item: T) => string;
    type: NotificationType;
    isValid?: (item: T) => boolean;
  }) => {
    for (const item of items) {
      // Se o item não for válido (ex: ativo: false), apaga todas as notificações desse item/tipo/usuário
      if (isValid && !isValid(item)) {
        const ref = collection(db, "notifications");
        const snapshot = await getDocs(ref);
        const toDelete = snapshot.docs.filter((docItem) => {
          const data = docItem.data() as PersistentNotification;
          return (
            data.userId === user.uid &&
            data.itemId === `${type}-${getId(item)}` &&
            data.type === type
          );
        });
        for (const notif of toDelete) {
          await deleteDoc(doc(db, "notifications", notif.id));
          // Remove todas as visualizações relacionadas
          const viewsRef = collection(db, "notificationViews");
          const viewsSnap = await getDocs(viewsRef);
          const viewsToDelete = viewsSnap.docs.filter((docItem) => {
            const data = docItem.data();
            return (
              data.userId === user.uid &&
              data.notificationId === notif.id
            );
          });
          for (const viewDoc of viewsToDelete) {
            await deleteDoc(doc(db, "notificationViews", viewDoc.id));
          }
        }
        continue;
      }

      const days = calcDays(getDate(item));
      if (!shouldNotify(days)) continue;

      const data = {
        userId: user.uid,
        itemId: `${type}-${getId(item)}`,
        type,
        title: getTitle(days),
        message: getMessage(item, days),
        daysRemaining: days,
        priority: getPriority(days),
        clienteNome: getCliente(item),
        uniqueKey: `${user.uid}-${type}-${getId(item)}}-${type}`,
      };
      await saveOrUpdateNotification(data);
    }
  };

  /* ======================================================
     GENERATE ALL
  ====================================================== */

  const generateNotifications = async () => {

    if (!user) {
      console.log("[NOTIF] Usuário não está logado, não gera notificações.");
      return;
    }

    await processItems({
      items: certificados,
      type: "certificado",
      getId: (c: any) => c.id,
      getDate: (c: any) => c.dataVencimento,
      getCliente: (c: any) => c.clienteNome,
      isValid: (c: any) => c.ativo,
      getTitle: (d) => (d < 0 ? "Certificado Vencido" : "Certificado a Vencer"),
      getMessage: (c: any, d) =>
        `${c.clienteNome} — ${
          d < 0 ? `Vencido há ${Math.abs(d)} dias` : `Vence em ${d} dias`
        }`,
    });

    await processItems({
      items: financeiros,
      type: "pagamento",
      getId: (f: any) => f.id,
      getDate: (f: any) => f.dataVencimento,
      getCliente: (f: any) => f.clienteNome,
      isValid: (f: any) => f.ativo && f.status !== "Recebido",
      getTitle: (d) => (d < 0 ? "Pagamento Vencido" : "Pagamento a Vencer"),
      getMessage: (f: any, d) =>
        `R$ ${f.valorMensalidade?.toFixed?.(2) ?? f.valor} — ${
          d < 0 ? `Vencido há ${Math.abs(d)} dias` : `Vence em ${d} dias`
        }`,
    });

    await processItems({
      items: servicos,
      type: "servico",
      getId: (s: any) => s.id,
      getDate: (s: any) => s.dataVencimento,
      getCliente: (s: any) => s.clienteNome,
      isValid: (s: any) => s.ativo,
      getTitle: (d) => (d < 0 ? "Serviço Vencido" : "Serviço a Vencer"),
      getMessage: (s: any, d) =>
        `R$ ${s.valorMensalidade?.toFixed?.(2) ?? s.valor} — ${
          d < 0 ? `Vencido há ${Math.abs(d)} dias` : `Vence em ${d} dias`
        }`,
    });

    await processItems({
      items: renovacoes,
      type: "renovacao",
      getId: (r: any) => r.id,
      getDate: (r: any) => r.dataRenovacao,
      getCliente: (r: any) => r.clienteNome,
      isValid: (r: any) =>
        r.ativo &&
        ["Pendente", "Avisado", "Em Negociação"].includes(r.status),
      getTitle: (d) => (d < 0 ? "Renovação Atrasada" : "Renovação Pendente"),
      getMessage: (r: any, d) =>
        `${r.clienteNome} — ${
          d < 0 ? `Atrasada há ${Math.abs(d)} dias` : `Em ${d} dias`
        }`,
    });

    await processItems({
      items: sintegras,
      type: "sintegra",
      getId: (s: any) => s.id,
      getDate: (s: any) => s.dataPrazo,
      getCliente: (s: any) => s.clienteNome,
      isValid: (s: any) => s.ativo && s.status === "Pendente",
      getTitle: (d) => (d < 0 ? "Sintegra Vencida" : "Sintegra Pendente"),
      getMessage: (s: any, d) =>
        `${s.clienteNome} — ${
          d < 0 ? `Vencida há ${Math.abs(d)} dias` : `Prazo em ${d} dias`
        }`,
    });

    await processItems({
      items: despesas,
      type: "despesa",
      getId: (d: any) => d.id,
      getDate: (d: any) => d.data,
      getCliente: (d: any) => d.contabilidade || "Sem contabilidade",
      isValid: (d: any) => d.ativo && !d.pago,
      getTitle: (d) => (d < 0 ? "Despesa Vencida" : "Despesa a Vencer"),
      getMessage: (desp: any, d) =>
        `R$ ${desp.valor?.toFixed?.(2) ?? desp.valor} — ${
          d < 0 ? `Vencida há ${Math.abs(d)} dias` : `Vence em ${d} dias`
        }`,
    });


    await cleanupOldNotifications();
  };

  /* ======================================================
     DAILY EXECUTION
  ====================================================== */

  useEffect(() => {

    if (!user) return;
    // Só executa se todos os dados estiverem carregados e não vazios
    const allLoaded = [certificados, financeiros, servicos, renovacoes, sintegras, despesas].every(arr => Array.isArray(arr));
    if (!allLoaded) return;

    const todayKey = new Date().toDateString();
    const lastRun = localStorage.getItem(STORAGE_LAST_RUN);

    // if (lastRun === todayKey) return;

    localStorage.setItem(STORAGE_LAST_RUN, todayKey);

    generateNotifications();
  }, [
    user,
    certificados,
    financeiros,
    servicos,
    renovacoes,
    sintegras,
    despesas,
  ]);
}
