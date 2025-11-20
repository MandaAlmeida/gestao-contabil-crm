import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  type Firestore,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Cliente } from "@/types/crm";

const COLLECTION_NAME = "clientes";

export async function getClientes(): Promise<Cliente[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((cliente) => cliente.ativo !== false) as Cliente[];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Cliente;
}

export async function createCliente(cliente: Omit<Cliente, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...cliente,
    ativo: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateCliente(id: string, updates: Partial<Omit<Cliente, "id" | "createdAt">>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCliente(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

