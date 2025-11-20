import { useState, useEffect } from "react";
import * as sintegraService from "@/lib/firestore/sintegra";
import type { Sintegra } from "@/types/crm";

export function useSintegra() {
  const [sintegras, setSintegras] = useState<Sintegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSintegras = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sintegraService.getSintegras();
      setSintegras(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar sintegra"));
      console.error("Erro ao carregar sintegra:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSintegras();
  }, []);

  const createSintegra = async (sintegra: Omit<Sintegra, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await sintegraService.createSintegra(sintegra);
      await loadSintegras();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar sintegra"));
      throw err;
    }
  };

  const updateSintegra = async (id: string, updates: Partial<Omit<Sintegra, "id" | "createdAt">>) => {
    try {
      await sintegraService.updateSintegra(id, updates);
      await loadSintegras();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar sintegra"));
      throw err;
    }
  };

  const deleteSintegra = async (id: string) => {
    try {
      await sintegraService.deleteSintegra(id);
      await loadSintegras();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar sintegra"));
      throw err;
    }
  };

  return {
    sintegras,
    loading,
    error,
    createSintegra,
    updateSintegra,
    deleteSintegra,
    refresh: loadSintegras,
  };
}

