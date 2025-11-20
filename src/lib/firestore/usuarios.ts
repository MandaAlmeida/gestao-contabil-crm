import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteField,
  query,
  orderBy,
  where,
  type Firestore,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Usuario } from "@/types/usuario";

const COLLECTION_NAME = "usuarios";

export async function getUsuarios(): Promise<Usuario[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("nome", "asc"));
    const querySnapshot = await getDocs(q);
    const usuarios = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Usuario[];
    return usuarios.filter((usuario) => usuario.ativo !== false);
  } catch (error: any) {
    // Se orderBy falhar (índice não criado), tentar sem orderBy
    if (
      error.code === "failed-precondition" ||
      error.message?.includes("index")
    ) {
      console.warn("Índice não encontrado, buscando sem ordenação:", error);
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const usuarios = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Usuario[];
      return usuarios
        .filter((usuario) => usuario.ativo !== false)
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }
    throw error;
  }
}

export async function getUsuario(id: string): Promise<Usuario | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as Usuario;
}

export async function getUsuarioByEmail(
  email: string
): Promise<Usuario | null> {
  try {
    // Tentar buscar todos os usuários e filtrar localmente para evitar problemas de índice
    const allUsuarios = await getUsuarios();
    const usuario = allUsuarios.find((u) => u.email === email);
    return usuario || null;
  } catch (error: any) {
    // Se for erro de permissão, pode ser que o usuário não esteja autenticado ainda
    if (error.code === "permission-denied") {
      console.warn(
        "Permissão negada ao buscar usuário por email. Usuário pode não estar autenticado."
      );
      return null;
    }
    console.error("Erro ao buscar usuário por email:", error);
    // Em caso de erro, retornar null (usuário não existe)
    return null;
  }
}

export async function createUsuario(
  usuario: Omit<Usuario, "id">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), usuario);
  return docRef.id;
}

export async function createUsuarioIfNotExists(
  email: string,
  nome: string
): Promise<string> {
  try {
    const existing = await getUsuarioByEmail(email);
    if (existing) {
      return existing.id;
    }

    const now = new Date().toISOString();
    const novoUsuario = {
      nome: nome.trim(),
      email: email.trim(),
      ativo: true,
      createdAt: now,
      updatedAt: now,
    };

    // Validar dados antes de criar
    if (!novoUsuario.nome || !novoUsuario.email) {
      throw new Error("Nome e email são obrigatórios");
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), novoUsuario);
    console.log("Usuário criado com sucesso:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    // Se for erro de permissão, pode ser que o usuário não esteja autenticado ainda
    if (error.code === "permission-denied") {
      console.warn(
        "Permissão negada ao criar usuário. Verifique se o usuário está autenticado e se o email corresponde ao usuário autenticado."
      );
      throw new Error(
        "Permissão negada. Verifique se você está autenticado e se o email corresponde ao seu usuário."
      );
    }
    console.error("Erro ao criar usuário:", {
      error,
      code: error.code,
      message: error.message,
      email,
      nome,
    });
    throw error;
  }
}

export async function updateUsuario(
  id: string,
  usuario: Partial<Omit<Usuario, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);

  // Filtrar campos undefined, null e strings vazias para evitar erros no Firestore
  const dadosAtualizacao: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  // Adicionar apenas campos definidos (não undefined, não null)
  // Usar Object.entries para garantir que estamos verificando os valores corretamente
  for (const [key, value] of Object.entries(usuario)) {
    // Incluir apenas se o valor não for undefined
    if (value !== undefined) {
      if (key === "telefone" && (value === null || value === "")) {
        // Para telefone vazio, usar deleteField para remover o campo do documento
        dadosAtualizacao[key] = deleteField();
      } else if (value !== null && value !== "") {
        // Para outros campos, não incluir null ou string vazia
        dadosAtualizacao[key] = value;
      }
    }
  }

  await updateDoc(docRef, dadosAtualizacao);
}

export async function deleteUsuario(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ativo: false,
    updatedAt: new Date().toISOString(),
  });
}
