import { useState, useEffect } from "react";
import {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from "@/lib/firestore/usuarios";
import type { Usuario } from "@/types/usuario";
import { useAuth } from "@/contexts/AuthContext";

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Só carregar usuários se o usuário estiver autenticado
    if (user) {
      loadUsuarios();
    } else {
      setLoading(false);
      setUsuarios([]);
    }
  }, [user]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Erro ao carregar usuários")
      );
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const create = async (
    usuario: Omit<Usuario, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      setError(null);
      const now = new Date().toISOString();
      const id = await createUsuario({
        ...usuario,
        createdAt: now,
        updatedAt: now,
      });
      await loadUsuarios();
      return id;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Erro ao criar usuário");
      setError(error);
      throw error;
    }
  };

  const update = async (
    id: string,
    usuario: Partial<Omit<Usuario, "id" | "createdAt" | "updatedAt">>
  ) => {
    try {
      setError(null);
      await updateUsuario(id, usuario);
      await loadUsuarios();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Erro ao atualizar usuário");
      setError(error);
      throw error;
    }
  };

  const remove = async (id: string) => {
    try {
      setError(null);
      await deleteUsuario(id);
      await loadUsuarios();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Erro ao deletar usuário");
      setError(error);
      throw error;
    }
  };

  return {
    usuarios,
    loading,
    error,
    create,
    update,
    delete: remove,
    refresh: loadUsuarios,
  };
}
