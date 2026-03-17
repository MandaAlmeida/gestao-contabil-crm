import { getDocs, getDoc, updateDoc, deleteDoc, doc, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { deleteCliente } from "./clientes";

export async function deleteClienteWithRelations(clienteId: string) {
  const now = new Date().toISOString();

  // 1. Pega o nome do cliente ANTES de desativar (para podermos achar as notificações dele)
  const clienteRef = doc(db, "clientes", clienteId);
  const clienteSnap = await getDoc(clienteRef);
  const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : null;

  // Desativa cliente
  await deleteCliente(clienteId);

  // Desativa financeiro
  const financeiros = await getDocs(query(collection(db, "financeiro"), where("clienteId", "==", clienteId)));
  for (const docSnap of financeiros.docs) {
    await updateDoc(doc(db, "financeiro", docSnap.id), { ativo: false, updatedAt: now });
  }

  // Desativa renovacao
  const renovacoes = await getDocs(query(collection(db, "renovacao"), where("clienteId", "==", clienteId)));
  for (const docSnap of renovacoes.docs) {
    await updateDoc(doc(db, "renovacao", docSnap.id), { ativo: false, updatedAt: now });
  }

  // Desativa despesas
  const despesas = await getDocs(query(collection(db, "despesas"), where("clienteId", "==", clienteId)));
  for (const docSnap of despesas.docs) {
    await updateDoc(doc(db, "despesas", docSnap.id), { ativo: false, updatedAt: now });
  }

  // Desativa servicos
  const servicos = await getDocs(query(collection(db, "servicos"), where("clienteId", "==", clienteId)));
  for (const docSnap of servicos.docs) {
    await updateDoc(doc(db, "servicos", docSnap.id), { ativo: false, updatedAt: now });
  }

  // Desativa sintegra
  const sintegras = await getDocs(query(collection(db, "sintegra"), where("clienteId", "==", clienteId)));
  for (const docSnap of sintegras.docs) {
    await updateDoc(doc(db, "sintegra", docSnap.id), { ativo: false, updatedAt: now });
  }

  // Desativa usuarios
  const usuarios = await getDocs(query(collection(db, "usuarios"), where("clienteId", "==", clienteId)));
  for (const docSnap of usuarios.docs) {
    await updateDoc(doc(db, "usuarios", docSnap.id), { ativo: false, updatedAt: now });
  }

  // Desativa tarefas vinculadas ao cliente
  const tarefas = await getDocs(query(collection(db, "tarefas"), where("clienteId", "==", clienteId)));
  for (const docSnap of tarefas.docs) {
    await updateDoc(doc(db, "tarefas", docSnap.id), { ativo: false, updatedAt: now });
  }

  // DELETA NOTIFICAÇÕES vinculadas ao nome do cliente
  if (clienteNome) {
    const notificacoes = await getDocs(query(collection(db, "notifications"), where("clienteNome", "==", clienteNome)));
    for (const docSnap of notificacoes.docs) {
      try {
        // Usamos deleteDoc porque notificações devem sumir, e não ficar "inativas"
        await deleteDoc(doc(db, "notifications", docSnap.id));
      } catch (e) {
        // Se cair aqui, é porque a notificação pertence a outro usuário e o Firebase bloqueou.
        // Silenciamos o erro para não travar a exclusão do cliente (o hook do outro usuário vai apagar a notificação dele sozinho quando ele logar).
        console.warn("Ignorando exclusão de notificação de outro usuário.");
      }
    }
  }
}