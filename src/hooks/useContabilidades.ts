import { useState, useEffect } from "react";
import * as contabilidadesService from "@/lib/firestore/contabilidades";
import type { Contabilidade } from "@/types/crm";

export function useContabilidades() {
  const [contabilidades, setContabilidades] = useState<Contabilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadContabilidades = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contabilidadesService.getContabilidades();
      setContabilidades(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar contabilidades"));
      console.error("Erro ao carregar contabilidades:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContabilidades();
  }, []);

  const createContabilidade = async (contabilidade: Omit<Contabilidade, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await contabilidadesService.createContabilidade(contabilidade);
      await loadContabilidades();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar contabilidade"));
      throw err;
    }
  };

  const updateContabilidade = async (id: string, updates: Partial<Omit<Contabilidade, "id" | "createdAt">>) => {
    try {
      await contabilidadesService.updateContabilidade(id, updates);
      await loadContabilidades();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar contabilidade"));
      throw err;
    }
  };

  const deleteContabilidade = async (id: string) => {
    try {
      await contabilidadesService.deleteContabilidade(id);
      await loadContabilidades();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar contabilidade"));
      throw err;
    }
  };

  return {
    contabilidades,
    loading,
    error,
    createContabilidade,
    updateContabilidade,
    deleteContabilidade,
    refresh: loadContabilidades,
  };
}

