import {
  collection,
  doc,
  getDocs,
  getDoc, // <-- NOVO IMPORT AQUI
  addDoc,
  updateDoc,
  query,
  orderBy,
} from "@/lib/localDb";
import { db } from "../firebase";
import type { Servico } from "@/types/crm";

const COLLECTION_NAME = "servicos";

export async function getServicos(): Promise<Servico[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("dataVencimento", "desc")
  );
  const querySnapshot = await getDocs(q);
  const todosServicos = querySnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as Servico)
  );
  
  const servicosAtivos = todosServicos.filter((servico) => servico.ativo !== false);
  
  return servicosAtivos;
}

export async function getServico(id: string): Promise<Servico | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Servico;
}

export async function createServico(
  servico: Omit<Servico, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    const now = new Date().toISOString();
    const dataToSave = {
      ...servico,
      ativo: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error("Erro em firestore.createServico:", error);
    throw error;
  }
}

// ==========================================================
// FUNÇÃO DE "CURA": Preenche campos faltando em cadastros antigos
// ==========================================================
async function prepararUpdateSeguro(docRef: any, updates: any) {
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as Servico;
    return {
      // Força a inclusão de campos obrigatórios que podem estar em branco no banco:
      clienteCNPJ: data.clienteCNPJ || "",
      descricao: data.descricao || "",
      observacoes: data.observacoes || "",
      meioPagamento: data.meioPagamento || "Pix",
      ativo: data.ativo ?? true,
      
      // Aplica as novas alterações por cima de tudo:
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }
  
  return {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateServico(
  id: string,
  updates: Partial<Omit<Servico, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  
  // Usa a função de cura antes de atualizar
  const updatesSeguros = await prepararUpdateSeguro(docRef, updates);
  await updateDoc(docRef, updatesSeguros);
}

export async function deleteServico(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Usa a função de cura até mesmo na hora de deletar!
    const updatesSeguros = await prepararUpdateSeguro(docRef, { ativo: false });
    await updateDoc(docRef, updatesSeguros);
  } catch (error) {
    console.error(`🔥 Firestore: Erro ao deletar serviço ${id}:`, error);
    throw error;
  }
}