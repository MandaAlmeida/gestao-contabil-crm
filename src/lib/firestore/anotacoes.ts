import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query as firestoreQuery,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Anotacao {
  id?: string;
  titulo: string;
  conteudo: string;
  cor: string;
  corTexto: string;
  tamanhoTexto: number;
  criadoEm: Date | Timestamp;
  atualizadoEm?: Date | Timestamp;
  usuarioId?: string;
}

const colRef = collection(db, "anotacoes");

export async function criarAnotacao(anotacao: Omit<Anotacao, "id" | "criadoEm" | "atualizadoEm">, usuarioId?: string) {
  const now = new Date();
  const docRef = await addDoc(colRef, {
    ...anotacao,
    usuarioId: usuarioId || null,
    criadoEm: now,
    atualizadoEm: now,
  });
  return docRef.id;
}

export async function listarAnotacoes(usuarioId?: string): Promise<Anotacao[]> {
  let q: any = colRef;
  if (usuarioId) {
    q = firestoreQuery(colRef, where("usuarioId", "==", usuarioId));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data ? d.data() : {};
    return { id: d.id, ...(typeof data === "object" && data !== null ? data : {}) };
  }) as Anotacao[];
}

export async function atualizarAnotacao(id: string, data: Partial<Anotacao>) {
  const ref = doc(db, "anotacoes", id);
  await updateDoc(ref, { ...data, atualizadoEm: new Date() });
}

export async function deletarAnotacao(id: string) {
  const ref = doc(db, "anotacoes", id);
  await deleteDoc(ref);
}
