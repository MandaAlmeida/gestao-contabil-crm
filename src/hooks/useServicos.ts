import { useState, useEffect } from "react";
import * as servicoService from "@/lib/firestore/servicos";
import { useFinanceiro } from "./useFinanceiro";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Servico } from "@/types/crm";

/**
 * Adiciona um mês a uma data no formato YYYY-MM-DD
 * Trabalha diretamente com strings para evitar problemas de timezone
 */
export const adicionarMes = (dataString: string): string => {
  if (!dataString) {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  }

  const partes = dataString.split("-");
  if (partes.length !== 3) {
    return dataString;
  }

  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const dia = parseInt(partes[2], 10);

  let novoAno = ano;
  let novoMes = mes + 1;

  if (novoMes > 12) {
    novoMes = 1;
    novoAno += 1;
  }

  // Garante que o dia não ultrapasse os dias do mês
  const ultimoDiaDoMes = new Date(novoAno, novoMes, 0).getDate();
  const novoDia = Math.min(dia, ultimoDiaDoMes);

  return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
    novoDia
  ).padStart(2, "0")}`;
};

/**
 * Remove um mês de uma data no formato YYYY-MM-DD
 * Trabalha diretamente com strings para evitar problemas de timezone
 */
export const removerMes = (dataString: string): string => {
  if (!dataString) {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  }

  const partes = dataString.split("-");
  if (partes.length !== 3) {
    return dataString;
  }

  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const dia = parseInt(partes[2], 10);

  let novoAno = ano;
  let novoMes = mes - 1;

  if (novoMes < 1) {
    novoMes = 12;
    novoAno -= 1;
  }

  // Garante que o dia não ultrapasse os dias do mês
  const ultimoDiaDoMes = new Date(novoAno, novoMes, 0).getDate();
  const novoDia = Math.min(dia, ultimoDiaDoMes);

  return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
    novoDia
  ).padStart(2, "0")}`;
};

export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { financeiros, updateFinanceiro } = useFinanceiro();

  const loadServicos = async () => {
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
  };

  useEffect(() => {
    loadServicos();
  }, []);

  const createServico = async (servico: Omit<Servico, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await servicoService.createServico(servico);

      // Verificar se existe registro financeiro para este cliente sem serviço vinculado
      const financeiroSemServico = financeiros.find(f =>
        f.clienteId === servico.clienteId && !f.servicoId
      );

      if (financeiroSemServico) {
        // Atualizar o registro financeiro com o ID do serviço recém-criado
        await updateFinanceiro(financeiroSemServico.id, { servicoId: id });
      } 

      await loadServicos();

      return id;
    } catch (err) {
      console.error("Erro em useServicos.createServico:", err);
      setError(err instanceof Error ? err : new Error("Erro ao criar serviço"));
      throw err;
    }
  };

  const updateServico = async (id: string, updates: Partial<Omit<Servico, "id" | "createdAt">>) => {
    try {
      // Verificar se o status está sendo alterado para "Recebido"
      if (updates.status === "Recebido") {
        // Buscar e excluir notificações relacionadas ao serviço
        await excluirNotificacoesItem(id, "servico");
      }

      await servicoService.updateServico(id, updates);
      await loadServicos();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar serviço"));
      throw err;
    }
  };

  const deleteServico = async (id: string) => {
    try {
      // Excluir notificações relacionadas antes de excluir o serviço
      await excluirNotificacoesItem(id, "servico");

      await servicoService.deleteServico(id);
      
      // Pequeno delay para garantir que o Firestore processou a atualização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await loadServicos();
    } catch (err) {
      console.error("Erro ao deletar serviço:", err);
      setError(err instanceof Error ? err : new Error("Erro ao deletar serviço"));
      throw err;
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

