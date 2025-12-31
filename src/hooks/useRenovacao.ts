import { useState, useEffect } from "react";
import * as renovacaoService from "@/lib/firestore/renovacao";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Renovacao } from "@/types/crm";

export function useRenovacao() {
  const [renovacoes, setRenovacoes] = useState<Renovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRenovacoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await renovacaoService.getRenovacoes();
      setRenovacoes(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar renovações"));
      console.error("Erro ao carregar renovações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRenovacoes();
  }, []);

  const createRenovacao = async (renovacao: Omit<Renovacao, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await renovacaoService.createRenovacao(renovacao);
      await loadRenovacoes();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar renovação"));
      throw err;
    }
  };

  const updateRenovacao = async (id: string, updates: Partial<Omit<Renovacao, "id" | "createdAt">>) => {
    try {
      // Verificar se o status está sendo alterado para "Renovado"
      if (updates.status === "Renovado") {
        // Buscar e excluir notificações relacionadas à renovação
        await excluirNotificacoesItem(id, "renovacao");
      }

      await renovacaoService.updateRenovacao(id, updates);
      await loadRenovacoes();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar renovação"));
      throw err;
    }
  };

  const deleteRenovacao = async (id: string) => {
    try {
      // Excluir notificações relacionadas antes de excluir a renovação
      await excluirNotificacoesItem(id, "renovacao");

      await renovacaoService.deleteRenovacao(id);
      await loadRenovacoes();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar renovação"));
      throw err;
    }
  };

  return {
    renovacoes,
    loading,
    error,
    createRenovacao,
    updateRenovacao,
    deleteRenovacao,
    refresh: loadRenovacoes,
  };
}

