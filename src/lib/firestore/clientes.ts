import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  writeBatch,
  type Firestore,
} from "@/lib/localDb";
import { db } from "../firebase";
import type { Cliente } from "@/types/crm";

const COLLECTION_NAME = "clientes";

// Coleções que guardam cópias de nome/CNPJ do cliente e precisam ser
// mantidas em sincronia quando esses dados são editados.
const COLECOES_COM_DADOS_DO_CLIENTE = [
  "servicos",
  "certificados",
  "financeiro",
  "renovacao",
  "sintegra",
] as const;

async function propagarDadosClienteParaRelacionados(
  clienteId: string,
  nome: string,
  cnpj?: string
): Promise<void> {
  for (const nomeColecao of COLECOES_COM_DADOS_DO_CLIENTE) {
    const snapshot = await getDocs(
      query(collection(db, nomeColecao), where("clienteId", "==", clienteId))
    );
    if (snapshot.empty) continue;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      const dados: Record<string, unknown> = { clienteNome: nome };
      // Sintegra não guarda clienteCNPJ; só atualiza se o campo já existir no doc.
      if (cnpj !== undefined && "clienteCNPJ" in docSnap.data()) {
        dados.clienteCNPJ = cnpj;
      }
      batch.update(doc(db, nomeColecao, docSnap.id), dados);
    });
    await batch.commit();
  }
}

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

  const precisaPropagar = updates.nome !== undefined || updates.cnpj !== undefined;
  const clienteAtual = precisaPropagar ? await getCliente(id) : null;

  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  if (precisaPropagar) {
    const nome = updates.nome ?? clienteAtual?.nome ?? "";
    const cnpj = updates.cnpj ?? clienteAtual?.cnpj;
    await propagarDadosClienteParaRelacionados(id, nome, cnpj);
  }
}

export async function deleteCliente(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}

