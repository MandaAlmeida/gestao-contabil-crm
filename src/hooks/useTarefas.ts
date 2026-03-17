import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tarefa } from "@/types/tarefas";
import { useAuth } from "@/contexts/AuthContext";

export const useTarefas = () => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTarefas([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "tarefas"),
      where("ativo", "==", true),
      orderBy("data", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tarefasData: Tarefa[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            titulo: data.titulo || "",
            descricao: data.descricao || "",
            data: data.data || "",
            horaInicio: data.horaInicio,
            horaFim: data.horaFim,
            concluida: data.concluida || false,
            prioridade: data.prioridade || "Média",
            categoria: data.categoria,
            clienteId: data.clienteId,
            clienteNome: data.clienteNome,
            ativo: data.ativo ?? true,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        });
        setTarefas(tarefasData);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar tarefas:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addTarefa = async (tarefa: Omit<Tarefa, "id">) => {
    try {
      const now = new Date().toISOString();
      
      await addDoc(collection(db, "tarefas"), {
        ...tarefa,
        createdAt: now,  // Adiciona o campo obrigatório pelas Rules
      updatedAt: now
      });
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      throw error;
    }
  };

  const updateTarefa = async (id: string, tarefa: Partial<Tarefa>) => {
    try {
      const tarefaRef = doc(db, "tarefas", id);
      await updateDoc(tarefaRef, {
        ...tarefa,
        updatedAt: Timestamp.now().toDate().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      throw error;
    }
  };

  const deleteTarefa = async (id: string) => {
    try {
      const tarefaRef = doc(db, "tarefas", id);
      await updateDoc(tarefaRef, {
        ativo: false,
        updatedAt: Timestamp.now().toDate().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao deletar tarefa:", error);
      throw error;
    }
  };

  const toggleConcluida = async (id: string, concluida: boolean) => {
    try {
      await updateTarefa(id, { concluida });
    } catch (error) {
      console.error("Erro ao marcar tarefa como concluída:", error);
      throw error;
    }
  };

  return {
    tarefas,
    loading,
    addTarefa,
    updateTarefa,
    deleteTarefa,
    toggleConcluida,
  };
};
