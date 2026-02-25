import { useState, useEffect, useCallback } from "react";
import * as servicoService from "@/lib/firestore/servicos";
import { useFinanceiro } from "./useFinanceiro";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Servico } from "@/types/crm";

/* ... manter funções adicionarMes e removerMes ... */

export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Importamos o financeiros e a função de update do seu hook financeiro
  const { financeiros, updateFinanceiro, refresh: refreshFinanceiros } = useFinanceiro();

  const loadServicos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await servicoService.getServicos();
      setServicos(data);
    } catch (err) {
      console.error("🔄 useServicos: Erro ao carregar serviços:", err);
      setError(err instanceof Error ? err : new Error("Erro ao carregar serviços"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServicos();
  }, [loadServicos]);

  const createServico = async (servico: Omit<Servico, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await servicoService.createServico(servico);

      // Vinculação automática na criação
      const financeiroSemServico = financeiros.find(f =>
        f.clienteId === servico.clienteId && !f.servicoId
      );

      if (financeiroSemServico) {
        await updateFinanceiro(financeiroSemServico.id, { 
          servicoId: id,
          valorServico: servico.valorMensalidade // Opcional: sincroniza o valor
        });
      }

      await loadServicos();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar serviço"));
      throw err;
    }
  };

  const updateServico = async (id: string, updates: Partial<Omit<Servico, "id" | "createdAt">>) => {
    try {
      if (updates.status === "Pago") {
        await excluirNotificacoesItem(id, "servico");
      }

      await servicoService.updateServico(id, updates);
      
      // Sincroniza valor no financeiro se a mensalidade do serviço mudar
      if (updates.valorMensalidade !== undefined) {
        const financeiroVinculado = financeiros.find(f => f.servicoId === id);
        if (financeiroVinculado) {
          await updateFinanceiro(financeiroVinculado.id, { valorServico: updates.valorMensalidade });
        }
      }

      await loadServicos();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar serviço"));
      throw err;
    }
  };

  const deleteServico = async (id: string) => {
    try {
      // 1. Notificações
      await excluirNotificacoesItem(id, "servico");

      // 2. DESVINCULAR DO FINANCEIRO (A lógica solicitada)
      // Procuramos no array de financeiros quem possui este servicoId
      const financeiroVinculado = financeiros.find(f => f.servicoId === id);
      
      if (financeiroVinculado) {
        console.log(`🔗 Desvinculando serviço ${id} do financeiro ${financeiroVinculado.id}`);
        await updateFinanceiro(financeiroVinculado.id, { 
          servicoId: null,      // Remove o ID do vínculo
          valorServico: 0       // Zera o valor do serviço no financeiro
        });
      }

      // 3. Deletar o serviço de fato
      await servicoService.deleteServico(id);
      
      // Pequeno delay para o Firestore
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (err) {
      console.error("Erro ao deletar serviço:", err);
      setError(err instanceof Error ? err : new Error("Erro ao deletar serviço"));
      throw err;
    } finally {
      await loadServicos();
      // Garantir que a lista financeira da tela também atualize se houver desvinculação
      if (refreshFinanceiros) await refreshFinanceiros();
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