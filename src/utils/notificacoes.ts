import { NotificationType } from "@/components/NotificationPanel";

/**
 * Exclui notificações relacionadas a um item específico
 *
 * Usado quando:
 * - Item é pago/marcado como concluído
 * - Item é excluído permanentemente
 *
 * @param itemId - ID do item (serviço, financeiro, certificado, etc.)
 * @param itemType - Tipo da notificação ('servico', 'pagamento', 'certificado', 'renovacao', 'despesa')
 *
 * @example
 * // Quando serviço é pago
 * await excluirNotificacoesItem(servicoId, "servico");
 *
 * // Quando certificado é excluído
 * await excluirNotificacoesItem(certificadoId, "certificado");
 */
export async function excluirNotificacoesItem(itemId: string, itemType: NotificationType): Promise<void> {
  try {
    // Importar dinamicamente para evitar dependência circular
    const { collection, query, where, getDocs, deleteDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const { getAuth } = await import("firebase/auth");

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.warn("⚠️ Usuário não autenticado, abortando exclusão de notificações");
      return;
    }

    // Para renovacao, certificados, etc, o padrão do itemId é `${type}-${id}`
    const itemIdPattern = ["renovacao", "certificado", "pagamento", "servico", "sintegra", "despesa"].includes(itemType)
      ? `${itemType}-${itemId}`
      : itemId;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("itemId", "==", itemIdPattern),
      where("type", "==", itemType)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.size > 0) {
      const deletePromises = querySnapshot.docs.map(doc => {
        return deleteDoc(doc.ref);
      });

      await Promise.all(deletePromises);
      
      // Também excluir as visualizações relacionadas a essas notificações
      const notificationIds = querySnapshot.docs.map(doc => doc.id);
      
      for (const notificationId of notificationIds) {
        const viewsQuery = query(
          collection(db, "notificationViews"),
          where("notificationId", "==", notificationId)
        );
        const viewsSnapshot = await getDocs(viewsQuery);
        const viewDeletePromises = viewsSnapshot.docs.map(viewDoc => deleteDoc(viewDoc.ref));
        await Promise.all(viewDeletePromises);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao excluir notificações de ${itemType} ${itemId}:`, error);
    // Não relançar o erro para não bloquear a exclusão do item
    // A exclusão de notificações é secundária à exclusão do item
  }
}