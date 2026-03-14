import { useState, useEffect, useMemo } from "react";
import * as renovacaoService from "@/lib/firestore/renovacao";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Renovacao } from "@/types/crm";
import { normalizarRenovacoes } from "@/lib/renovacao";

export function useRenovacao() {
  const [renovacoesRaw, setRenovacoesRaw] = useState<Renovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRenovacoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await renovacaoService.getRenovacoes();
      setRenovacoesRaw(data);
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

  const renovacoes = useMemo(
    () => normalizarRenovacoes(renovacoesRaw),
    [renovacoesRaw]
  );

  // === NOVO: FILTRO DO MÊS ATUAL ===
  const vencemNesteMes = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const pendentesDoMes = renovacoes.filter(r => {
      // Ignora os que já estão pagos ou cancelados
      if (r.status === "Renovado" || r.status === "Cancelado") return false;

      if (!r.dataRenovacao) return false;
      const [ano, mes] = r.dataRenovacao.split("-").map(Number);
      
      // Retorna true se a data de renovação cai exatamente no mês/ano atual
      return ano === anoAtual && (mes - 1) === mesAtual;
    });

    const total = pendentesDoMes.reduce((acc, curr) => acc + curr.valorRenovacao, 0);

    return {
      quantidade: pendentesDoMes.length,
      total: total,
    };
  }, [renovacoes]);
  // ==================================

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
      if (updates.status === "Renovado") {
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
      await excluirNotificacoesItem(id, "renovacao");
      await renovacaoService.deleteRenovacao(id);
      await loadRenovacoes();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar renovação"));
      throw err;
    }
  };

  // === NOVO: RESUMO DO MÊS ATUAL (Pendentes e Pagas) ===
  const resumoMesAtual = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let pendentesQtd = 0;
    let pendentesValor = 0;
    let pagasQtd = 0;
    let pagasValor = 0;

    renovacoes.forEach((r) => {
      // 1. Verifica as PENDENTES (olha para a data base atual do item)
      if (
        r.dataRenovacao &&
        r.status !== "Renovado" &&
        !r.status?.includes("Parcelado") &&
        r.status !== "Cancelado"
      ) {
        const [ano, mes] = r.dataRenovacao.split("-").map(Number);
        if (ano === anoAtual && mes - 1 === mesAtual) {
          pendentesQtd++;
          pendentesValor += r.valorRenovacao;
        }
      }

      // 2. Verifica as PAGAS (olha para o histórico, pois a data principal já avançou pro ano que vem)
      if (r.historicoPagamentos && r.historicoPagamentos.length > 0) {
        const foiPagoNesteMes = r.historicoPagamentos.some((h) => {
          if (!h.dataVencimento) return false;
          const [anoH, mesH] = h.dataVencimento.split("-").map(Number);
          return anoH === anoAtual && mesH - 1 === mesAtual;
        });

        if (foiPagoNesteMes) {
          pagasQtd++;
          pagasValor += r.valorRenovacao;
        }
      }
    });

    return {
      pendentesQtd,
      pendentesValor,
      pagasQtd,
      pagasValor,
    };
  }, [renovacoes]);

  return {
    renovacoes,
    vencemNesteMes, // <-- Não esqueça de exportar ele aqui!
    loading,
    error,
    resumoMesAtual,
    createRenovacao,
    updateRenovacao,
    deleteRenovacao,
    refresh: loadRenovacoes,
  };
}