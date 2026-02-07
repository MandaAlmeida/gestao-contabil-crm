import type { Sintegra } from "@/types/crm";

const parseDate = (dateStr: string): Date => {
  const date = new Date(dateStr + "T00:00:00");
  date.setHours(0, 0, 0, 0);
  return date;
};

const mesmoMesEAno = (data1: Date, data2: Date): boolean => {
  return (
    data1.getMonth() === data2.getMonth() &&
    data1.getFullYear() === data2.getFullYear()
  );
};

export function calcularStatusSintegra(sintegra: {
  status: Sintegra["status"];
  dataPagamento?: string | null;
  dataPrazo: string;
  historicoAtividades?: Array<{
    id: string;
    dataPrazo: string;
    dataConclusao: string;
    noPrazo: boolean;
  }>;
}): Sintegra["status"] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataPrazo = parseDate(sintegra.dataPrazo);
  
  // Se tem histórico de atividades, verifica a última
  if (sintegra.historicoAtividades && sintegra.historicoAtividades.length > 0) {
    // Pega a atividade mais recente por data de conclusão
    const ultimaAtividade = sintegra.historicoAtividades.reduce((ultima, atual) => {
      const dataUltima = parseDate(ultima.dataPrazo);
      const dataAtual = parseDate(atual.dataPrazo);
      return dataAtual > dataUltima ? atual : ultima;
    });
    
    const dataConclusaoUltimaAtividade = parseDate(ultimaAtividade.dataPrazo);
    
    // Se a data de CONCLUSÃO da última atividade está no mês atual, mantém como Concluído
    if (mesmoMesEAno(dataConclusaoUltimaAtividade, hoje)) {
      return "Concluído";
    }
  }
  
  // Lógica padrão baseada na data de prazo
  if (dataPrazo < hoje) {
    return "Vencido";
  }
  
  return "Pendente";
}

export function normalizarSintegras(sintegras: Sintegra[]): Sintegra[] {
  return sintegras.map((sintegra) => {
    const statusCalculado = calcularStatusSintegra({
      status: sintegra.status,
      dataPagamento: sintegra.dataPagamento,
      dataPrazo: sintegra.dataPrazo,
      historicoAtividades: sintegra.historicoAtividades,
    });
    
    const statusFinal =
      sintegra.status === "Concluído" ? statusCalculado : sintegra.status;
    
    return {
      ...sintegra,
      status: statusFinal,
    };
  });
}
