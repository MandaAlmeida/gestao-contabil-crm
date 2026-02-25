import { useState, useEffect, useMemo, useCallback } from "react";
import * as financeiroService from "@/lib/firestore/financeiro";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import { normalizarFinanceiros } from "@/lib/financeiro";
import type { Financeiro } from "@/types/crm";

/* =========================
   UTIL — DATAS LOCAL
========================= */
// Função para evitar o bug de fuso horário na conversão de strings "YYYY-MM-DD"
function ajustarDataLocal(dataString: string | undefined): Date {
  if (!dataString) return new Date();
  if (dataString.includes("T")) return new Date(dataString);
  
  const [ano, mes, dia] = dataString.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0);
}

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
      if (!f.dataVencimento) return acc;

      let pagoNaMensalidadeAtual = false;
      const vencimentoAtual = ajustarDataLocal(f.dataVencimento);
      
      // 1. Busca no histórico se a parcela DESTE vencimento foi paga
      if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
        const pagamento = f.historicoPagamentos.find(h => {
          if (!h.dataPagamento) return false;
          
          // O segredo aqui é comparar o VENCIMENTO do histórico com o VENCIMENTO atual
          const vencimentoHistorico = ajustarDataLocal(h.dataVencimento || f.dataVencimento);
          
          return (
            vencimentoHistorico.getMonth() === vencimentoAtual.getMonth() && 
            vencimentoHistorico.getFullYear() === vencimentoAtual.getFullYear()
          );
        });
        
        pagoNaMensalidadeAtual = !!pagamento;
      }
      
      // 2. Fallback: Se não tem no histórico, mas o status principal diz que tá Pago
      if (!pagoNaMensalidadeAtual && f.status === "Pago") {
        pagoNaMensalidadeAtual = true;
      }

      // Soma a mensalidade e o serviço (para bater com o Dashboard)
      const valorTotal = (f.valorMensalidade || 0) + (Number(f.valorServico) || 0);
      
      if (pagoNaMensalidadeAtual) {
        acc.recebido += valorTotal;
      } else {
        acc.aReceber += valorTotal;
      }
      
      return acc;
    }, { recebido: 0, aReceber: 0 });
  }, [financeiros]);

  // =============================
  // VENCIDOS
  // =============================
  const vencidos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar as horas de "hoje" para comparar apenas os dias

    return financeiros
      .filter((f) => {
        if (f.status === "Pago") return false;
        if (!f.dataVencimento) return false;

        const vencimento = ajustarDataLocal(f.dataVencimento);
        vencimento.setHours(0, 0, 0, 0);

        return vencimento < hoje;
      })
      .reduce((acc, f) => acc + (f.valorMensalidade || 0) + (Number(f.valorServico) || 0), 0);
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