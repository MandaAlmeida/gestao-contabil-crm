import { useState, useEffect } from "react";
import * as clientesService from "@/lib/firestore/clientes";
import type { Cliente } from "@/types/crm";

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientesService.getClientes();
      setClientes(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar clientes"));
      console.error("Erro ao carregar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const createCliente = async (cliente: Omit<Cliente, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await clientesService.createCliente(cliente);
      await loadClientes();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar cliente"));
      throw err;
    }
  };

  const updateCliente = async (id: string, updates: Partial<Omit<Cliente, "id" | "createdAt">>) => {
    try {
      await clientesService.updateCliente(id, updates);
      await loadClientes();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar cliente"));
      throw err;
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      await clientesService.deleteCliente(id);
      await loadClientes();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar cliente"));
      throw err;
    }
  };

  return {
    clientes,
    loading,
    error,
    createCliente,
    updateCliente,
    deleteCliente,
    refresh: loadClientes,
  };
}

