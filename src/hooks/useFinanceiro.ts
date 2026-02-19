import { useState, useEffect, useMemo, useCallback } from "react";
import * as financeiroService from "@/lib/firestore/financeiro";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import { normalizarFinanceiros } from "@/lib/financeiro";
import type { Financeiro } from "@/types/crm";

export function useFinanceiro() {
  const [financeirosRaw, setFinanceirosRaw] = useState<Financeiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // =============================
  // LOAD
  // =============================
  const loadFinanceiros = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await financeiroService.getFinanceiros();

      setFinanceirosRaw(data || []);
    } catch (err) {
      console.error("Erro ao carregar financeiro:", err);
      setError(err instanceof Error ? err : new Error("Erro ao carregar financeiro"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceiros();
  }, [loadFinanceiros]);

  // =============================
  // NORMALIZAÇÃO CENTRAL
  // =============================
  const financeiros = useMemo(
    () => normalizarFinanceiros(financeirosRaw),
    [financeirosRaw]
  );

  // =============================
  // CREATE
  // =============================
  const createFinanceiro = useCallback(
    async (
      financeiro: Omit<Financeiro, "id" | "createdAt" | "updatedAt">
    ) => {
      try {
        const id = await financeiroService.createFinanceiro(financeiro);

        await loadFinanceiros();

        return id;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro ao criar financeiro"));
        throw err;
      }
    },
    [loadFinanceiros]
  );

  // =============================
  // UPDATE
  // =============================
  const updateFinanceiro = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Financeiro, "id" | "createdAt">>
    ) => {
      try {
        if (updates.status === "Pago") {
          await excluirNotificacoesItem(id, "pagamento");
        }

        await financeiroService.updateFinanceiro(id, updates);

        await loadFinanceiros();
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro ao atualizar financeiro"));
        throw err;
      }
    },
    [loadFinanceiros]
  );

  // =============================
  // DELETE (OTIMISTA)
  // =============================
  const deleteFinanceiro = useCallback(
    async (id: string) => {
      try {
        // remove da UI primeiro (evita bug de voltar item)
        setFinanceirosRaw((prev) => prev.filter((f) => f.id !== id));

        await excluirNotificacoesItem(id, "pagamento");

        await financeiroService.deleteFinanceiro(id);

        // garante sincronização
        await loadFinanceiros();
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro ao deletar financeiro"));
        await loadFinanceiros();
        throw err;
      }
    },
    [loadFinanceiros]
  );

  // =============================
  // TOTAIS (CENTRALIZADO)
  // =============================
  const totais = useMemo(() => {
    return financeiros.reduce((acc, f) => {
      // Busca o pagamento referente ao mês de vencimento
      let pagoNoMes = false;
      if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
        // Considera o pagamento se a dataPagamento for no mesmo mês/ano da dataVencimento
        const vencimento = new Date(f.dataVencimento);
        const pagamento = f.historicoPagamentos.find(h => {
          if (!h.dataPagamento) return false;
          const pag = new Date(h.dataPagamento);
          return pag.getMonth() === vencimento.getMonth() && pag.getFullYear() === vencimento.getFullYear();
        });
        pagoNoMes = !!pagamento;
      }
      if (pagoNoMes) {
        acc.recebido += f.valorMensalidade || 0;
      } else {
        acc.aReceber += f.valorMensalidade || 0;
      }
      return acc;
    }, { recebido: 0, aReceber: 0 });
  }, [financeiros]);

  // =============================
  // VENCIDOS
  // =============================
  const vencidos = useMemo(() => {
    const hoje = new Date();

    return financeiros
      .filter((f) => {
        if (f.status === "Pago") return false;
        return new Date(f.dataVencimento) < hoje;
      })
      .reduce((acc, f) => acc + (f.valorMensalidade || 0), 0);
  }, [financeiros]);

  return {
    financeiros,            
    financeirosRaw,        
    loading,
    error,
    createFinanceiro,
    updateFinanceiro,
    deleteFinanceiro,
    refresh: loadFinanceiros,
    totais,
    vencidos,
  };
}
