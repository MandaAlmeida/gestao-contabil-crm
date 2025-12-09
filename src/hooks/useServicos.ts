import { useState, useEffect } from "react";
import * as servicoService from "@/lib/firestore/servicos";
import type { Servico } from "@/types/crm";

export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadServicos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await servicoService.getServicos();
      setServicos(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar serviços"));
      console.error("Erro ao carregar serviços:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServicos();
  }, []);

  const createServico = async (servico: Omit<Servico, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await servicoService.createServico(servico);
      await loadServicos();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar serviço"));
      throw err;
    }
  };

  const updateServico = async (id: string, updates: Partial<Omit<Servico, "id" | "createdAt">>) => {
    try {
      await servicoService.updateServico(id, updates);
      await loadServicos();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar serviço"));
      throw err;
    }
  };

  const deleteServico = async (id: string) => {
    try {
      await servicoService.deleteServico(id);
      await loadServicos();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar serviço"));
      throw err;
    }
  };

  return {
    servicos,
    loading,
    error,
    createServico,
    updateServico,
    deleteServico,
    refresh: loadServicos,
  };
}

