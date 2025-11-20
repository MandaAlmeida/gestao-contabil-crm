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
import type { Renovacao } from "@/types/crm";

const COLLECTION_NAME = "renovacao";

export async function getRenovacoes(): Promise<Renovacao[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("dataRenovacao", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((renovacao) => renovacao.ativo !== false) as Renovacao[];
}

export async function getRenovacao(id: string): Promise<Renovacao | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Renovacao;
}

export async function createRenovacao(renovacao: Omit<Renovacao, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...renovacao,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateRenovacao(id: string, updates: Partial<Omit<Renovacao, "id" | "createdAt">>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRenovacao(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

