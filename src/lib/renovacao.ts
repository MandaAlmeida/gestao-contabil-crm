import { Renovacao } from "@/types/crm";

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const parseDate = (dateString: string) => {
  // Converte string ISO (YYYY-MM-DD) para data no timezone local
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// NOVO: Verifica apenas o ano para as renovações
const mesmoAno = (dataA: Date, dataB: Date) =>
  dataA.getFullYear() === dataB.getFullYear();

export const calcularStatusRenovacao = (
  item: Pick<Renovacao, "status" | "dataRenovacao" | "historicoPagamentos">
): Renovacao["status"] => {
  // Verifica se a renovação atual já foi concluída (está no histórico)
  if (item.historicoPagamentos && item.historicoPagamentos.length > 0) {
    const renovacaoDoAnoAtual = item.historicoPagamentos.find(
      p => new Date(p.dataVencimento).getFullYear() < new Date(item.dataRenovacao).getFullYear()
    );
    
    if (renovacaoDoAnoAtual) {
      // Se estiver parcelado, mantém parcelado, senão Renovado
      return item.status?.includes("Parcelado") ? item.status : "Renovado";
    }
  }

  // Se o item não está no histórico, mas tem um desses status de negociação, nós preservamos ele
  const statusPreservados: Renovacao["status"][] = [
    "Pendente", 
    "Avisado", 
    "Em Negociação", 
    "Cancelado"
  ];
  
  if (statusPreservados.includes(item.status)) {
    return item.status;
  }

  return "Pendente";
};

export const normalizarRenovacoes = (lista: Renovacao[]) => {
  let houveAlteracao = false;
  const hoje = startOfDay(new Date());
  const anoAtual = hoje.getFullYear();

  const normalizados = lista.map((item) => {
    const historicoPagamentos = item.historicoPagamentos || [];

    
    // 1. Calcula o status base
    const statusCalculado = calcularStatusRenovacao({
      status: item.status,
      dataRenovacao: item.dataRenovacao,
      historicoPagamentos,
    });
    
    let statusFinal = statusCalculado;
    
    // 2. INTELIGÊNCIA VISUAL DE VIRADA DE ANO
    if (statusFinal === "Renovado" || statusFinal?.includes("Parcelado")) {
      const dataVencimentoItem = parseDate(item.dataRenovacao);
      const anoVencimentoItem = dataVencimentoItem.getFullYear();

      console.log(dataVencimentoItem, anoVencimentoItem)
      
      let ultimoAnoHistorico = -1;
      
      if (historicoPagamentos.length > 0) {
        // Pega o pagamento mais recente 
        const ultimoPagamento = [...historicoPagamentos].reduce((ultimo, atual) => {
          const dataUltimo = new Date(ultimo.dataVencimento);
          const dataAtual = new Date(atual.dataVencimento);
          return dataAtual > dataUltimo ? atual : ultimo;
        });
        
        ultimoAnoHistorico = parseDate(ultimoPagamento.dataVencimento).getFullYear();
      }
      
      // REGRA: Se o vencimento é deste ano (ou já passou) 
      // E o último histórico pago foi num ano ANTERIOR a este vencimento...
      if (anoVencimentoItem <= anoAtual && ultimoAnoHistorico < anoVencimentoItem) {
        statusFinal = "Pendente";
      }
    }

    if (statusFinal !== item.status || historicoPagamentos !== item.historicoPagamentos) {
      houveAlteracao = true;
      return {
        ...item,
        historicoPagamentos,
        status: statusFinal,
      };
    }

    return item;
  });

  return houveAlteracao ? normalizados : lista;
};