
import { getDocs, updateDoc, doc, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { deleteCliente } from "./clientes";

export async function deleteClienteWithRelations(clienteId: string) {
  // Desativa cliente
  await deleteCliente(clienteId);

  // Desativa financeiro
  const financeiros = await getDocs(query(collection(db, "financeiro"), where("clienteId", "==", clienteId)));
  for (const docSnap of financeiros.docs) {
    await updateDoc(doc(db, "financeiro", docSnap.id), { ativo: false, updatedAt: new Date().toISOString() });
  }

  // Desativa renovacao
  const renovacoes = await getDocs(query(collection(db, "renovacao"), where("clienteId", "==", clienteId)));
  for (const docSnap of renovacoes.docs) {
    await updateDoc(doc(db, "renovacao", docSnap.id), { ativo: false, updatedAt: new Date().toISOString() });
  }

  // Desativa despesas
  const despesas = await getDocs(query(collection(db, "despesas"), where("clienteId", "==", clienteId)));
  for (const docSnap of despesas.docs) {
    await updateDoc(doc(db, "despesas", docSnap.id), { ativo: false, updatedAt: new Date().toISOString() });
  }

  // Desativa servicos
  const servicos = await getDocs(query(collection(db, "servicos"), where("clienteId", "==", clienteId)));
  for (const docSnap of servicos.docs) {
    await updateDoc(doc(db, "servicos", docSnap.id), { ativo: false, updatedAt: new Date().toISOString() });
  }

      // Desativa sintegra
  const sintegras = await getDocs(query(collection(db, "sintegra"), where("clienteId", "==", clienteId)));
  for (const docSnap of sintegras.docs) {
    await updateDoc(doc(db, "sintegra", docSnap.id), { ativo: false, updatedAt: new Date().toISOString() });
  }

  // Desativa usuarios
  const usuarios = await getDocs(query(collection(db, "usuarios"), where("clienteId", "==", clienteId)));
  for (const docSnap of usuarios.docs) {
    await updateDoc(doc(db, "usuarios", docSnap.id), { ativo: false, updatedAt: new Date().toISOString() });
  }


}
