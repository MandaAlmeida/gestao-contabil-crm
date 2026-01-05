import { useState, useEffect } from "react";
import * as financeiroService from "@/lib/firestore/financeiro";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Financeiro } from "@/types/crm";

export function useFinanceiro() {
  const [financeiros, setFinanceiros] = useState<Financeiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFinanceiros = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financeiroService.getFinanceiros();
      setFinanceiros(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar financeiro"));
      console.error("Erro ao carregar financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceiros();
  }, []);

  const createFinanceiro = async (financeiro: Omit<Financeiro, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await financeiroService.createFinanceiro(financeiro);
      await loadFinanceiros();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar financeiro"));
      throw err;
    }
  };

  const updateFinanceiro = async (id: string, updates: Partial<Omit<Financeiro, "id" | "createdAt">>) => {
    try {
      // Verificar se o status está sendo alterado para "Pago"
      if (updates.status === "Pago") {
        // Buscar e excluir notificações relacionadas ao pagamento
        await excluirNotificacoesItem(id, "pagamento");
      }

      await financeiroService.updateFinanceiro(id, updates);
      await loadFinanceiros();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar financeiro"));
      throw err;
    }
  };

  const deleteFinanceiro = async (id: string) => {
    try {
      // Excluir notificações relacionadas antes de excluir o financeiro
      await excluirNotificacoesItem(id, "pagamento");

      await financeiroService.deleteFinanceiro(id);
      await loadFinanceiros();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar financeiro"));
      throw err;
    }
  };

  return {
    financeiros,
    loading,
    error,
    createFinanceiro,
    updateFinanceiro,
    deleteFinanceiro,
    refresh: loadFinanceiros,
  };
}

