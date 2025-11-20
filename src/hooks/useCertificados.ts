import { useState, useEffect } from "react";
import * as certificadosService from "@/lib/firestore/certificados";
import type { Certificado } from "@/types/crm";

export function useCertificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCertificados = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await certificadosService.getCertificados();
      setCertificados(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar certificados"));
      console.error("Erro ao carregar certificados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificados();
  }, []);

  const createCertificado = async (certificado: Omit<Certificado, "id" | "createdAt" | "updatedAt">) => {
    try {
      const id = await certificadosService.createCertificado(certificado);
      await loadCertificados();
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao criar certificado"));
      throw err;
    }
  };

  const updateCertificado = async (id: string, updates: Partial<Omit<Certificado, "id" | "createdAt">>) => {
    try {
      await certificadosService.updateCertificado(id, updates);
      await loadCertificados();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao atualizar certificado"));
      throw err;
    }
  };

  const deleteCertificado = async (id: string) => {
    try {
      await certificadosService.deleteCertificado(id);
      await loadCertificados();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao deletar certificado"));
      throw err;
    }
  };

  return {
    certificados,
    loading,
    error,
    createCertificado,
    updateCertificado,
    deleteCertificado,
    refresh: loadCertificados,
  };
}

