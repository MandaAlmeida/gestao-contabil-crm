import { useState, useEffect } from "react";
import * as despesasService from "@/lib/firestore/despesas";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Despesa } from "@/types/despesas";

export function useDespesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDespesas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await despesasService.getDespesas();
      setDespesas(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar despesas"));
      console.error("Erro ao carregar despesas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDespesas();
  }, []);

  const createDespesa = async (despesa: Omit<Despesa, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await despesasService.createDespesa(despesa);
      await loadDespesas();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar despesa"));
      throw err;
    }
  };

  const updateDespesa = async (id: string, updates: Partial<Omit<Despesa, "id" | "createdAt">>) => {
    try {
      // Verificar se a despesa está sendo marcada como paga
      if (updates.pago === true) {
        // Buscar e excluir notificações relacionadas à despesa
        await excluirNotificacoesItem(id, "despesa");
      }

      await despesasService.updateDespesa(id, updates);
      await loadDespesas();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar despesa"));
      throw err;
    }
  };

  const deleteDespesa = async (id: string) => {
    try {
      // Excluir notificações relacionadas antes de excluir a despesa
      await excluirNotificacoesItem(id, "despesa");

      await despesasService.deleteDespesa(id);
      await loadDespesas();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar despesa"));
      throw err;
    }
  };

  return {
    despesas,
    loading,
    error,
    createDespesa,
    updateDespesa,
    deleteDespesa,
    refresh: loadDespesas,
  };
}

