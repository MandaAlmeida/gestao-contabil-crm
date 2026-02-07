import { Financeiro } from "@/types/crm";

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

const mesmoMesEAno = (dataA: Date, dataB: Date) =>
  dataA.getFullYear() === dataB.getFullYear() && dataA.getMonth() === dataB.getMonth();

export const calcularStatusFinanceiro = (
  item: Pick<Financeiro, "status" | "dataPagamento" | "dataVencimento" | "historicoPagamentos">
): Financeiro["status"] => {
  const hoje = startOfDay(new Date());
  const vencimento = parseDate(item.dataVencimento);
  
  // Verifica se o vencimento atual já foi pago (está no histórico)
  if (item.historicoPagamentos && item.historicoPagamentos.length > 0) {
    const pagamentoDoVencimentoAtual = item.historicoPagamentos.find(
      p => p.dataVencimento === item.dataVencimento
    );
    
    if (pagamentoDoVencimentoAtual) {
      return "Pago";
    }
  }
  
  // Compatibilidade com dataPagamento antiga
  if (item.dataPagamento) {
    return "Pago";
  }

  // Sem pagamento para este vencimento
  if (vencimento < hoje) {
    return "Vencido";
  }

  return "Pendente";
};

export const normalizarFinanceiros = (lista: Financeiro[]) => {
  let houveAlteracao = false;
  const hoje = startOfDay(new Date());

  const normalizados = lista.map((item) => {
    // Migração: Se tem dataPagamento antiga mas não tem histórico, criar histórico
    let historicoPagamentos = item.historicoPagamentos || [];
    let dataPagamento = item.dataPagamento ?? null;
    
    if (dataPagamento && !historicoPagamentos.some(p => p.dataVencimento === item.dataVencimento)) {
      const dataPagamentoDate = startOfDay(new Date(dataPagamento));
      if (mesmoMesEAno(dataPagamentoDate, hoje)) {
        // Adiciona ao histórico apenas se for do mês atual
        const vencimento = parseDate(item.dataVencimento);
        const emDia = dataPagamentoDate <= vencimento;
        
        historicoPagamentos = [
          ...historicoPagamentos,
          {
            id: `${item.id}-${item.dataVencimento}`,
            dataVencimento: item.dataVencimento,
            dataPagamento: dataPagamento,
            emDia,
            meioPagamento: item.meioPagamento || "Pix"
          }
        ];
        dataPagamento = null; // Limpa o campo antigo
        houveAlteracao = true;
      }
    }
    
    // Calcula o status baseado no histórico
    const statusCalculado = calcularStatusFinanceiro({
      status: item.status,
      dataPagamento,
      dataVencimento: item.dataVencimento,
      historicoPagamentos,
    });
    
    // Verifica se o último pagamento foi no mês atual
    let statusFinal = statusCalculado;
    
    if (historicoPagamentos.length > 0) {
      // Pega o pagamento mais recente 
      const ultimoPagamento = historicoPagamentos.reduce((ultimo, atual) => {
        const dataUltimo = new Date(ultimo.dataVencimento);
        const dataAtual = new Date(atual.dataVencimento);
        return dataAtual > dataUltimo ? atual : ultimo;
      });
      
      const dataPagamentoUltimo = startOfDay(new Date(ultimoPagamento.dataVencimento));
      
      // Se a data de PAGAMENTO do último pagamento foi no mês/ano atual, status = Pago
      // Se não, recalcula baseado no vencimento
      if (mesmoMesEAno(dataPagamentoUltimo, hoje)) {
        statusFinal = "Pago";
      } else {
        const vencimento = parseDate(item.dataVencimento);
        statusFinal = vencimento < hoje ? "Vencido" : "Pendente";
        houveAlteracao = true;
      }
    }

    if (statusCalculado !== item.status || dataPagamento !== item.dataPagamento || historicoPagamentos !== item.historicoPagamentos) {
      houveAlteracao = true;
      return {
        ...item,
        dataPagamento,
        historicoPagamentos,
        status: statusFinal,
      };
    }

    return item;
  });

  return houveAlteracao ? normalizados : lista;
};

