import { useState, useEffect } from "react";
import * as sintegraService from "@/lib/firestore/sintegra";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import type { Sintegra } from "@/types/crm";
import { normalizarSintegras } from "@/lib/sintegra";

export function useSintegra() {
  const [sintegrasRaw, setSintegrasRaw] = useState<Sintegra[]>([]);
  const [sintegras, setSintegras] = useState<Sintegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSintegras = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sintegraService.getSintegras();
      setSintegrasRaw(data);
      const normalizados = normalizarSintegras(data);
      setSintegras(normalizados);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar sintegra"));
      console.error("Erro ao carregar sintegra:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSintegras();
  }, []);

  const createSintegra = async (sintegra: Omit<Sintegra, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await sintegraService.createSintegra(sintegra);
      await loadSintegras();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar sintegra"));
      throw err;
    }
  };

  const updateSintegra = async (id: string, updates: Partial<Omit<Sintegra, "id" | "createdAt">>) => {
    try {
      // Verificar se o status está sendo alterado para "Concluído"
      if (updates.status === "Concluído") {
        // Buscar e excluir notificações relacionadas à sintegra
        await excluirNotificacoesItem(id, "sintegra");
      }

      await sintegraService.updateSintegra(id, updates);
      await loadSintegras();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar sintegra"));
      throw err;
    }
  };

  const deleteSintegra = async (id: string) => {
    try {
      // Excluir notificações relacionadas antes de excluir a sintegra
      await excluirNotificacoesItem(id, "sintegra");

      await sintegraService.deleteSintegra(id);
      await loadSintegras();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar sintegra"));
      throw err;
    }
  };

  return {
    sintegras,
    sintegrasRaw,
    loading,
    error,
    createSintegra,
    updateSintegra,
    deleteSintegra,
    refresh: loadSintegras,
    refreshSintegras: loadSintegras,
  };
}

