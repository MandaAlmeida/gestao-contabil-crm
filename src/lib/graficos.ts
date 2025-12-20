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

  const entradasFinanceiras = financeiros
    .filter((f) => {
      if (f.status !== "Recebido" || !f.dataPagamento) return false;
      const dataPagamento = new Date(f.dataPagamento);
      return dataPagamento >= inicio && dataPagamento <= fim;
    })
    .reduce((acc, f) => acc + f.valorMensalidade, 0);

  // Agora as despesas são mostradas como saídas positivas no gráfico,
  // então não subtraímos elas das entradas aqui
  return entradasFinanceiras;
};

export const calcularTotalEntradaServicos = (
  servicos: Servico[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): number => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);

  return servicos
    .filter((s) => {
      if (s.status !== "Recebido" || !s.dataPagamento) return false;
      const dataPagamento = new Date(s.dataPagamento);
      return dataPagamento >= inicio && dataPagamento <= fim;
    })
    .reduce((acc, s) => acc + s.valorMensalidade, 0);
};

export const calcularTotalSaida = (
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): number => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);

  // Apenas despesas pagas aparecem como saídas realizadas
  return despesas
    .filter((d) => {
      return d.pago && d.dataPagamento &&
        new Date(d.dataPagamento) >= inicio &&
        new Date(d.dataPagamento) <= fim;
    })
    .reduce((acc, d) => acc + d.valor, 0);
};

export const gerarDadosGrafico = (
  financeiros: Financeiro[],
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): DadosGrafico[] => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);
  const dados: Map<string, { entrada: number; saida: number }> = new Map();

  // Processar entradas (financeiros recebidos + despesas pagas como negativas)
  financeiros
    .filter((f) => {
      if (f.status !== "Recebido" || !f.dataPagamento) return false;
      const dataPagamento = new Date(f.dataPagamento);
      return dataPagamento >= inicio && dataPagamento <= fim;
    })
    .forEach((f) => {
      const data = f.dataPagamento!;
      const chave = data.split("T")[0];
      const atual = dados.get(chave) || { entrada: 0, saida: 0 };
      atual.entrada += f.valorMensalidade;
      dados.set(chave, atual);
    });

  // As despesas agora são processadas como saídas positivas abaixo

  // Processar saídas (apenas despesas pagas) para o gráfico de evolução
  despesas
    .filter((d) => {
      // Apenas despesas pagas aparecem no gráfico como saídas realizadas
      return d.pago && d.dataPagamento &&
        new Date(d.dataPagamento) >= inicio &&
        new Date(d.dataPagamento) <= fim;
    })
    .forEach((d) => {
      const chave = d.dataPagamento!.split("T")[0];
      const atual = dados.get(chave) || { entrada: 0, saida: 0 };
      atual.saida += d.valor; // Apenas despesas pagas aparecem como saída no gráfico
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
  despesas: Despesa[],
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): DadosGrafico[] => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);
  const dados: Map<string, { entrada: number; saida: number }> = new Map();

  // Processar entradas de serviços
  servicos
    .filter((s) => {
      if (s.status !== "Recebido" || !s.dataPagamento) return false;
      const dataPagamento = new Date(s.dataPagamento);
      return dataPagamento >= inicio && dataPagamento <= fim;
    })
    .forEach((s) => {
      const data = s.dataPagamento!;
      const chave = data.split("T")[0];
      const atual = dados.get(chave) || { entrada: 0, saida: 0 };
      atual.entrada += s.valorMensalidade;
      dados.set(chave, atual);
    });

  // Processar saídas (apenas despesas pagas) para o gráfico de evolução
  despesas
    .filter((d) => {
      // Apenas despesas pagas aparecem no gráfico como saídas realizadas
      return d.pago && d.dataPagamento &&
        new Date(d.dataPagamento) >= inicio &&
        new Date(d.dataPagamento) <= fim;
    })
    .forEach((d) => {
      const chave = d.dataPagamento!.split("T")[0];
      const atual = dados.get(chave) || { entrada: 0, saida: 0 };
      atual.saida += d.valor; // Apenas despesas pagas aparecem como saída no gráfico
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
