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
      const now = new Date().toISOString(); // <-- GERA A DATA AQUI
      
      // Passa as datas para o service
      const id = await servicoService.createServico({
        ...servico,
        createdAt: now,
        updatedAt: now
      } as any); 

      // Vinculação automática na criação
      const financeiroSemServico = financeiros.find(f =>
        f.clienteId === servico.clienteId && !f.servicoId
      );

      if (financeiroSemServico) {
        await updateFinanceiro(financeiroSemServico.id, { 
          servicoId: id,
          valorServico: servico.valorMensalidade,
          updatedAt: now // <-- BLINDA A ATUALIZAÇÃO DO FINANCEIRO
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
      const now = new Date().toISOString();

      if (updates.status === "Pago") {
        await excluirNotificacoesItem(id, "servico");
      }

      // Injeta o updatedAt na atualização do serviço
      await servicoService.updateServico(id, {
        ...updates,
        updatedAt: now
      });
      
      // Sincroniza valor no financeiro se a mensalidade do serviço mudar
      if (updates.valorMensalidade !== undefined) {
        const financeiroVinculado = financeiros.find(f => f.servicoId === id);
        if (financeiroVinculado) {
          await updateFinanceiro(financeiroVinculado.id, { 
            valorServico: updates.valorMensalidade,
            updatedAt: now // <-- BLINDA A ATUALIZAÇÃO DO FINANCEIRO
          });
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
      const now = new Date().toISOString();

      // 1. Notificações
      await excluirNotificacoesItem(id, "servico");

      // 2. DESVINCULAR DO FINANCEIRO
      const financeiroVinculado = financeiros.find(f => f.servicoId === id);
      
      if (financeiroVinculado) {
        console.log(`🔗 Desvinculando serviço ${id} do financeiro ${financeiroVinculado.id}`);
        await updateFinanceiro(financeiroVinculado.id, { 
          servicoId: null,      
          valorServico: 0,      
          updatedAt: now // <-- BLINDA A ATUALIZAÇÃO DO FINANCEIRO
        });
      }

      // 3. Deletar (inativar) o serviço de fato
      // Se a sua função deleteServico faz um updateDoc para ativo: false,
      // garanta que lá dentro ela também está enviando o updatedAt!
      await servicoService.deleteServico(id);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (err) {
      console.error("Erro ao deletar serviço:", err);
      setError(err instanceof Error ? err : new Error("Erro ao deletar serviço"));
      throw err;
    } finally {
      await loadServicos();
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