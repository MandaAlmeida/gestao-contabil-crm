import { Financeiro, Servico } from "@/types/crm";
import { Despesa } from "@/types/despesas";

export type PeriodoFiltro = "dia" | "semana" | "mes" | "customizado";

export interface PeriodoCustomizado {
  dataInicio: Date;
  dataFim: Date;
}

export interface DadosGrafico {
  data: string;
  entrada: number;
  saida: number;
}

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
  d.setDate(diff);
  return startOfDay(d);
};

const endOfWeek = (date: Date): Date => {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
};

const startOfMonth = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfDay(d);
};

const endOfMonth = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return endOfDay(d);
};

export const calcularPeriodo = (
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): { inicio: Date; fim: Date } => {
  const hoje = new Date();

  switch (periodo) {
    case "dia":
      return {
        inicio: startOfDay(hoje),
        fim: endOfDay(hoje),
      };
    case "semana":
      return {
        inicio: startOfWeek(hoje),
        fim: endOfWeek(hoje),
      };
    case "mes":
      return {
        inicio: startOfMonth(hoje),
        fim: endOfMonth(hoje),
      };
    case "customizado":
      if (periodoCustomizado) {
        return {
          inicio: startOfDay(periodoCustomizado.dataInicio),
          fim: endOfDay(periodoCustomizado.dataFim),
        };
      }
      return {
        inicio: startOfMonth(hoje),
        fim: endOfMonth(hoje),
      };
    default:
      return {
        inicio: startOfMonth(hoje),
        fim: endOfMonth(hoje),
      };
  }
};

export const calcularTotalEntrada = (
  financeiros: Financeiro[],
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): number => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);
  
  console.log('========================================');
  console.log('DEBUG calcularTotalEntrada');
  console.log('Período:', inicio.toISOString(), 'até', fim.toISOString());
  console.log('Total de financeiros:', financeiros.length);
  
  // Análise detalhada
  const porStatus = financeiros.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('Por status:', porStatus);

  const entradasFinanceiras = financeiros
    .filter((f) => {
      // Só conta se foi efetivamente pago - filtra antes de processar
      if (f.status !== "Pago") return false;
      
      console.log('\n--- Analisando:', f.clienteNome);
      console.log('  Status:', f.status);
      console.log('  Valor Mensalidade:', f.valorMensalidade);
      console.log('  Valor Serviço:', f.valorServico);
      console.log('  Data Vencimento:', f.dataVencimento);
      console.log('  Data Pagamento:', f.dataPagamento);
      console.log('  Histórico:', f.historicoPagamentos?.length || 0, 'pagamentos');
      
      // Pega o ÚLTIMO pagamento do histórico (mais recente)
      // Ordena por data de pagamento decrescente e pega o primeiro
      const ultimoPagamento = f.historicoPagamentos && f.historicoPagamentos.length > 0
        ? [...f.historicoPagamentos].sort((a, b) => 
            new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
          )[0]
        : null;
      
      let dataPagamento: Date;
      
      if (ultimoPagamento && ultimoPagamento.dataPagamento) {
        // Usa data do último pagamento do histórico (PRIORIDADE)
        dataPagamento = new Date(ultimoPagamento.dataPagamento);
        console.log('  ✓ Data do último pagamento (histórico):', dataPagamento.toISOString());
        console.log('  ✓ Vencimento deste pagamento:', ultimoPagamento.dataVencimento);
      } else if (f.dataPagamento) {
        // Fallback para campo dataPagamento direto (compatibilidade antiga)
        dataPagamento = new Date(f.dataPagamento);
        console.log('  ⚠ Data de pagamento (campo direto):', dataPagamento.toISOString());
      } else {
        // Se está marcado como Pago mas não tem dataPagamento,
        // assume que foi pago na data de vencimento
        dataPagamento = new Date(f.dataVencimento);
        console.log('  ⚠ Usando data de vencimento:', dataPagamento.toISOString());
      }
      
      const dentroperiodo = dataPagamento >= inicio && dataPagamento <= fim;
      console.log('  Dentro do período?', dentroperiodo ? '✓ SIM' : '❌ NÃO');
      
      return dentroperiodo;
    })
    .reduce((acc, f) => {
      // Soma mensalidade + serviço (se houver)
      const valorMensalidade = f.valorMensalidade || 0;
      const valorServico = f.valorServico ? parseFloat(f.valorServico) : 0;
      const valorTotal = valorMensalidade + valorServico;
      
      console.log('  💰 Somando:', valorMensalidade, '+', valorServico, '=', valorTotal);
      
      return acc + valorTotal;
    }, 0);

  console.log('\n💰 TOTAL ENTRADA:', entradasFinanceiras);
  console.log('========================================\n');

  return entradasFinanceiras;
};

export const calcularTotalEntradaServicos = (
  servicos: Servico[],
  financeiros: Financeiro[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): number => {
  // Serviços não são calculados separadamente
  // O valor já está incluído no financeiro (campo valorServico)
  console.log('⚠ calcularTotalEntradaServicos não é mais usado - valores de serviço já estão no financeiro');
  return 0;
};

export const calcularTotalSaida = (
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): number => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);
  
  console.log('========================================');
  console.log('DEBUG calcularTotalSaida');
  console.log('Total de despesas:', despesas.length);
  console.log('Despesas pagas:', despesas.filter(d => d.pago).length);

  // Apenas despesas pagas aparecem como saídas realizadas
  const total = despesas
    .filter((d) => {
      if (!d.pago) return false;
      
      // Se está marcada como paga mas não tem dataPagamento,
      // usa a data da despesa como fallback
      const dataPagamento = d.dataPagamento 
        ? new Date(d.dataPagamento) 
        : new Date(d.data);
      
      const dentroperiodo = dataPagamento >= inicio && dataPagamento <= fim;
      
      if (dentroperiodo) {
        console.log('✓ Despesa:', d.recebedor, '- R$', d.valor, '-', dataPagamento.toISOString());
      }
      
      return dentroperiodo;
    })
    .reduce((acc, d) => acc + d.valor, 0);
    
  console.log('\n💸 TOTAL SAÍDA:', total);
  console.log('========================================\n');
  
  return total;
};

export const gerarDadosGrafico = (
  financeiros: Financeiro[],
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): DadosGrafico[] => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);
  const dados: Map<string, { entrada: number; saida: number }> = new Map();

  // Processar entradas (financeiros pagos + despesas pagas como negativas)
  financeiros
    .filter((f) => {
      if (f.status !== "Pago") return false;
      
      const ultimoPagamento = f.historicoPagamentos && f.historicoPagamentos.length > 0
        ? [...f.historicoPagamentos].sort((a, b) => 
            new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
          )[0]
        : null;
      
      let dataPagamento: Date;
      
      if (ultimoPagamento && ultimoPagamento.dataPagamento) {
        dataPagamento = new Date(ultimoPagamento.dataPagamento);
      } else if (f.dataPagamento) {
        dataPagamento = new Date(f.dataPagamento);
      } else {
        dataPagamento = new Date(f.dataVencimento);
      }
      
      return dataPagamento >= inicio && dataPagamento <= fim;
    })
    .forEach((f) => {
      const ultimoPagamento = f.historicoPagamentos && f.historicoPagamentos.length > 0
        ? [...f.historicoPagamentos].sort((a, b) => 
            new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
          )[0]
        : null;
      
      let dataStr: string;
      
      if (ultimoPagamento && ultimoPagamento.dataPagamento) {
        dataStr = ultimoPagamento.dataPagamento;
      } else if (f.dataPagamento) {
        dataStr = f.dataPagamento;
      } else {
        dataStr = f.dataVencimento;
      }
      
      const chave = dataStr.split("T")[0];
      const atual = dados.get(chave) || { entrada: 0, saida: 0 };
      
      // Soma mensalidade + serviço (se houver)
      const valorMensalidade = f.valorMensalidade || 0;
      const valorServico = f.valorServico ? parseFloat(f.valorServico) : 0;
      atual.entrada += valorMensalidade + valorServico;
      
      dados.set(chave, atual);
    });

  // As despesas agora são processadas como saídas positivas abaixo

  // Processar saídas (apenas despesas pagas) para o gráfico de evolução
  despesas
    .filter((d) => {
      if (!d.pago) return false;
      
      const dataPagamento = d.dataPagamento 
        ? new Date(d.dataPagamento) 
        : new Date(d.data);
      
      return dataPagamento >= inicio && dataPagamento <= fim;
    })
    .forEach((d) => {
      const dataStr = d.dataPagamento || d.data;
      const chave = dataStr.split("T")[0];
      const atual = dados.get(chave) || { entrada: 0, saida: 0 };
      atual.saida += d.valor;
      dados.set(chave, atual);
    });

  // Gerar array ordenado por data
  const resultado: DadosGrafico[] = Array.from(dados.entries())
    .map(([data, valores]) => ({
      data,
      entrada: valores.entrada,
      saida: valores.saida,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  // Preencher dias faltantes no período
  if (periodo === "dia") {
    return resultado.length > 0
      ? resultado
      : [{ data: inicio.toISOString().split("T")[0], entrada: 0, saida: 0 }];
  }

  if (periodo === "semana" || periodo === "mes" || periodo === "customizado") {
    const preenchido: DadosGrafico[] = [];
    const dataAtual = new Date(inicio);

    while (dataAtual <= fim) {
      const chave = dataAtual.toISOString().split("T")[0];
      const existente = resultado.find((d) => d.data === chave);
      preenchido.push(
        existente || {
          data: chave,
          entrada: 0,
          saida: 0,
        }
      );
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return preenchido;
  }

  return resultado;
};

export const gerarDadosGraficoServicos = (
  servicos: Servico[],
  financeiros: Financeiro[],
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): DadosGrafico[] => {
  // Serviços agora são parte do financeiro
  // Retorna os mesmos dados do gráfico principal
  console.log('⚠ gerarDadosGraficoServicos não é mais usado - dados já estão no gráfico principal');
  return gerarDadosGrafico(financeiros, despesas, periodo, periodoCustomizado);
};

export const formatarDataGrafico = (
  data: string,
  periodo: PeriodoFiltro
): string => {
  const date = new Date(data + "T00:00:00");

  switch (periodo) {
    case "dia":
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    case "semana":
      return date.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    case "mes":
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    case "customizado":
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    default:
      return date.toLocaleDateString("pt-BR");
  }
};
