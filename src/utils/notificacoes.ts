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
    const { collection, query, where, getDocs, deleteDoc, or } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const { getAuth } = await import("firebase/auth");

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    // Criamos os dois padrões possíveis para garantir que encontre
    const patternComPrefixo = `${itemType}-${itemId}`;
    
    // Usamos o operador 'or' para buscar das duas formas (com e sem prefixo)
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("type", "==", itemType),
      // Busca tanto 'renovacao-ID' quanto apenas 'ID'
      where("itemId", "in", [itemId, patternComPrefixo]) 
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Deletar notificações
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Deletar visualizações (NotificationViews)
      for (const doc of querySnapshot.docs) {
        const viewsQuery = query(
          collection(db, "notificationViews"),
          where("notificationId", "==", doc.id)
        );
        const viewsSnapshot = await getDocs(viewsQuery);
        await Promise.all(viewsSnapshot.docs.map(v => deleteDoc(v.ref)));
      }
      console.log(`✅ Notificações de ${itemType} removidas com sucesso.`);
    }
  } catch (error) {
    console.error("❌ Erro ao excluir notificações:", error);
  }
}