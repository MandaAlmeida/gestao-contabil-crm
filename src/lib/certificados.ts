import { Certificado } from "@/types/crm";

const DIAS_ALERTA = 30;

export const calcularStatusCertificado = (
  item: Pick<Certificado, "dataVencimento">
): Certificado["status"] => {
  const hoje = new Date();
  hoje.setHours(hoje.getHours() - 3); // Horário brasileiro
  const vencimento = new Date(item.dataVencimento);

  if (Number.isNaN(vencimento.getTime())) {
    return "Vencido";
  }

  const diffEmMs = vencimento.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffEmMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return "Vencido";
  }

  if (diffDias <= DIAS_ALERTA) {
    return "A Vencer";
  }

  return "Válido";
};

export const normalizarCertificados = (lista: Certificado[]) => {
  // Status agora são manuais (iguais aos de Renovação), não calculamos automaticamente
  return lista;
};




