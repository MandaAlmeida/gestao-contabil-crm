import { useState, useEffect } from "react";
import * as servicoService from "@/lib/firestore/servicos";
import type { Servico } from "@/types/crm";
import { calcularStatusServico } from "@/lib/servicos";

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

  const loadServicos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await servicoService.getServicos();
      setServicos(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar serviços"));
      console.error("Erro ao carregar serviços:", err);
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
      await loadServicos();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar serviço"));
      throw err;
    }
  };

  const updateServico = async (id: string, updates: Partial<Omit<Servico, "id" | "createdAt">>) => {
    try {
      await servicoService.updateServico(id, updates);
      await loadServicos();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar serviço"));
      throw err;
    }
  };

  const deleteServico = async (id: string) => {
    try {
      await servicoService.deleteServico(id);
      await loadServicos();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar serviço"));
      throw err;
    }
  };

  const togglePagamento = async (
    item: Servico,
    onSuccess?: (message: string, description?: string) => void,
    onError?: (message: string) => void
  ) => {
    if (item.status === "Recebido") {
      // Quando remove o pagamento, sempre volta exatamente 1 mês da data atual
      // (já que o pagamento avançou 1 mês quando foi registrado)
      const vencimentoAnterior = removerMes(item.dataVencimento);

      // Calcula o status baseado na nova data de vencimento, sem considerar o status antigo
      const statusAjustado = calcularStatusServico({
        status: "A Vencer", // Força recalcular baseado apenas na data
        dataPagamento: null,
        dataVencimento: vencimentoAnterior,
      });

      try {
        await updateServico(item.id, {
          dataPagamento: null,
          meioPagamento: "Pix", // Reset para valor padrão
          dataVencimento: vencimentoAnterior,
          status: statusAjustado,
        });

        if (onSuccess) {
          onSuccess(
            "Pagamento removido.",
            statusAjustado === "A Vencer"
              ? `${item.clienteNome} voltou a ficar pendente.`
              : `${item.clienteNome} foi marcado como vencido.`
          );
        }
      } catch (error) {
        if (onError) {
          onError("Erro ao remover pagamento");
        }
        throw error;
      }
      return { shouldOpenModal: false };
    }

    return { shouldOpenModal: true };
  };

  const confirmarPagamento = async (
    item: Servico,
    data: {
      dataPagamento: string;
      meioPagamento: "Pix" | "Boleto";
    },
    onSuccess?: (message: string, description?: string) => void,
    onError?: (message: string) => void
  ) => {
    const novoVencimento = adicionarMes(item.dataVencimento);

    try {
      await updateServico(item.id, {
        dataPagamento: data.dataPagamento,
        dataVencimento: novoVencimento,
        status: "Recebido",
        meioPagamento: data.meioPagamento,
      });
      
      if (onSuccess) {
        onSuccess(
          "Pagamento registrado!",
          `${item.clienteNome} foi marcado como pago.`
        );
      }
    } catch (error) {
      if (onError) {
        onError("Erro ao registrar pagamento");
      }
      throw error;
    }
  };

  return {
    servicos,
    loading,
    error,
    createServico,
    updateServico,
    deleteServico,
    togglePagamento,
    confirmarPagamento,
    refresh: loadServicos,
  };
}

