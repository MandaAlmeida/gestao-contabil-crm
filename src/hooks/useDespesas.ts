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

  // Verificar despesas fixas pagas que devem voltar para pendente
  useEffect(() => {
    if (despesas.length > 0) {
      checkAndResetFixedExpenses();
    }
  }, [despesas]);

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

  // Verificar despesas fixas pagas que devem voltar para pendente
  const checkAndResetFixedExpenses = async () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const despesasParaResetar = despesas.filter(despesa => {
      if (!despesa.fixo || !despesa.pago || !despesa.data) return false;

      const dataVencimento = new Date(despesa.data);
      const mesVencimento = dataVencimento.getMonth();
      const anoVencimento = dataVencimento.getFullYear();

      // Se a data de vencimento chegou ou passou, deve voltar para pendente
      return (anoVencimento < anoAtual) ||
             (anoVencimento === anoAtual && mesVencimento <= mesAtual);
    });

    if (despesasParaResetar.length > 0) {
      for (const despesa of despesasParaResetar) {
        try {
          await updateDespesa(despesa.id, {
            pago: false,
            dataPagamento: null
          });
        } catch (error) {
          console.error(`Erro ao resetar despesa ${despesa.id}:`, error);
        }
      }

      // Recarregar despesas após resetar
      await loadDespesas();
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

