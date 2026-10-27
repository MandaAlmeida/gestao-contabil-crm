import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from "@/lib/localDb";
import { db } from "../firebase";
import type { Contabilidade } from "@/types/crm";

const COLLECTION_NAME = "contabilidades";

export async function getContabilidades(): Promise<Contabilidade[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("nome", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((contabilidade) => contabilidade.ativo !== false) as Contabilidade[];
}

export async function getContabilidade(id: string): Promise<Contabilidade | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Contabilidade;
}

export async function createContabilidade(
  contabilidade: Omit<Contabilidade, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...contabilidade,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateContabilidade(
  id: string,
  updates: Partial<Omit<Contabilidade, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteContabilidade(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

