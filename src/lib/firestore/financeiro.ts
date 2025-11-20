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
import type { Financeiro } from "@/types/crm";

const COLLECTION_NAME = "financeiro";

export async function getFinanceiros(): Promise<Financeiro[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("dataVencimento", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((financeiro) => financeiro.ativo !== false) as Financeiro[];
}

export async function getFinanceiro(id: string): Promise<Financeiro | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Financeiro;
}

export async function createFinanceiro(
  financeiro: Omit<Financeiro, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...financeiro,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateFinanceiro(
  id: string,
  updates: Partial<Omit<Financeiro, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteFinanceiro(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

