import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Servico } from "@/types/crm";

const COLLECTION_NAME = "servicos";

export async function getServicos(): Promise<Servico[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("dataVencimento", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Servico)
    )
    .filter((servico) => servico.ativo !== false);
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
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...servico,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateServico(
  id: string,
  updates: Partial<Omit<Servico, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteServico(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}
