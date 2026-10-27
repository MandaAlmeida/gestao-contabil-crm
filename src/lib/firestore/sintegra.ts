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
import type { Sintegra } from "@/types/crm";

const COLLECTION_NAME = "sintegra";

export async function getSintegras(): Promise<Sintegra[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("dataPrazo", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((sintegra) => sintegra.ativo !== false) as Sintegra[];
}

export async function getSintegra(id: string): Promise<Sintegra | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Sintegra;
}

export async function createSintegra(sintegra: Omit<Sintegra, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...sintegra,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateSintegra(id: string, updates: Partial<Omit<Sintegra, "id" | "createdAt">>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSintegra(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

