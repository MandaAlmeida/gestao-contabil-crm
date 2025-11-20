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
import type { Despesa } from "@/types/despesas";

const COLLECTION_NAME = "despesas";

export async function getDespesas(): Promise<Despesa[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("data", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((despesa) => despesa.ativo !== false) as Despesa[];
}

export async function getDespesa(id: string): Promise<Despesa | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Despesa;
}

export async function createDespesa(despesa: Omit<Despesa, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...despesa,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateDespesa(id: string, updates: Partial<Omit<Despesa, "id" | "createdAt">>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDespesa(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

