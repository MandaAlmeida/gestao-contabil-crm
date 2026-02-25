import { Financeiro, Servico } from "@/types/crm";
import { Despesa } from "@/types/despesas";

export type PeriodoFiltro = "dia" | "semana" | "mes" | "ano" | "customizado";

export interface PeriodoCustomizado {
  inicio: Date;
  fim: Date;
}

export interface DadosGrafico {
  data: string;
  entrada: number;
  entradaAtrasada: number; // NOVA PROPRIEDADE
  saida: number;
}

/* =========================
   UTIL — DATAS LOCAL (Correção de Fuso)
========================= */
function ajustarDataLocal(dataInput: string | Date | undefined): Date {
  if (!dataInput) return new Date();
  if (dataInput instanceof Date) return dataInput;
  if (dataInput.includes("T")) return new Date(dataInput);
  
  const [ano, mes, dia] = dataInput.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0);
}

// Retorna YYYY-MM-DD com base na data local
function dataParaStringLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const startOfDay = (date: Date): Date => {
  const d = new Date(date); d.setHours(0, 0, 0, 0); return d;
};
const endOfDay = (date: Date): Date => {
  const d = new Date(date); d.setHours(23, 59, 59, 999); return d;
};
const startOfWeek = (date: Date): Date => {
  const d = new Date(date); const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); return startOfDay(d);
};
const endOfWeek = (date: Date): Date => {
  const d = startOfWeek(date); d.setDate(d.getDate() + 6); return endOfDay(d);
};
const startOfMonth = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1); return startOfDay(d);
};
const endOfMonth = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0); return endOfDay(d);
};

export const calcularPeriodo = (
  periodo: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
): { inicio: Date; fim: Date } => {
  const hoje = new Date();
  switch (periodo) {
    case "dia": return { inicio: startOfDay(hoje), fim: endOfDay(hoje) };
    case "semana": return { inicio: startOfWeek(hoje), fim: endOfWeek(hoje) };
    case "mes": return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    case "customizado":
      if (periodoCustomizado) {
        return { inicio: startOfDay(periodoCustomizado.inicio), fim: endOfDay(periodoCustomizado.fim) };
      }
      return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    default: return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
  }
};

export const calcularTotalEntrada = () => 0; // Usado via hook agora
export const calcularTotalEntradaServicos = () => 0; // Usado via hook agora
export const calcularTotalSaida = (despesas: Despesa[], periodo: PeriodoFiltro, periodoCustomizado?: PeriodoCustomizado): number => {
  const { inicio, fim } = calcularPeriodo(periodo, periodoCustomizado);
  return despesas
    .filter((d) => {
      if (!d.pago) return false;
      const dataStr = d.dataPagamento || d.data;
      const dataPagamento = ajustarDataLocal(dataStr);
      dataPagamento.setHours(0,0,0,0);
      const inicioLimpo = new Date(inicio); inicioLimpo.setHours(0,0,0,0);
      const fimLimpo = new Date(fim); fimLimpo.setHours(23,59,59,999);
      return dataPagamento >= inicioLimpo && dataPagamento <= fimLimpo;
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
  const dados: Map<string, { entrada: number; entradaAtrasada: number; saida: number }> = new Map();

  const inicioLimpo = new Date(inicio); inicioLimpo.setHours(0,0,0,0);
  const fimLimpo = new Date(fim); fimLimpo.setHours(23,59,59,999);

  // 1. Processar Entradas (Sincronizado com a nova lógica do Hook)
  financeiros.forEach((f) => {
    let temHistoricoNoPeriodo = false;

    if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
      f.historicoPagamentos.forEach((hp) => {
        if (!hp.dataPagamento) return;
        const dPag = ajustarDataLocal(hp.dataPagamento); dPag.setHours(0,0,0,0);
        const dVenc = ajustarDataLocal(hp.dataVencimento || f.dataVencimento); dVenc.setHours(0,0,0,0);

        if (dPag >= inicioLimpo && dPag <= fimLimpo) {
          temHistoricoNoPeriodo = true;
          const chave = dataParaStringLocal(dPag);
          const atual = dados.get(chave) || { entrada: 0, entradaAtrasada: 0, saida: 0 };
          const valor = (f.valorMensalidade || 0) + (Number(f.valorServico) || 0);

          const mesmoMesAno = dPag.getMonth() === dVenc.getMonth() && dPag.getFullYear() === dVenc.getFullYear();
          if (!mesmoMesAno && dPag > dVenc) {
            atual.entradaAtrasada += valor;
          } else {
            atual.entrada += valor;
          }
          dados.set(chave, atual);
        }
      });
    }

    if (!temHistoricoNoPeriodo && f.status === "Pago") {
      const dataStr = f.dataPagamento || f.dataVencimento;
      if (dataStr) {
        const dPag = ajustarDataLocal(dataStr); dPag.setHours(0,0,0,0);
        const dVenc = ajustarDataLocal(f.dataVencimento); dVenc.setHours(0,0,0,0);

        if (dPag >= inicioLimpo && dPag <= fimLimpo) {
          const chave = dataParaStringLocal(dPag);
          const atual = dados.get(chave) || { entrada: 0, entradaAtrasada: 0, saida: 0 };
          const valor = (f.valorMensalidade || 0) + (Number(f.valorServico) || 0);

          const mesmoMesAno = dPag.getMonth() === dVenc.getMonth() && dPag.getFullYear() === dVenc.getFullYear();
          if (!mesmoMesAno && dPag > dVenc) {
            atual.entradaAtrasada += valor;
          } else {
            atual.entrada += valor;
          }
          dados.set(chave, atual);
        }
      }
    }
  });

  // 2. Processar Saídas
  despesas
    .filter((d) => {
      if (!d.pago) return false;
      const dataStr = d.dataPagamento || d.data;
      const dataLocal = ajustarDataLocal(dataStr);
      dataLocal.setHours(0,0,0,0);
      return dataLocal >= inicioLimpo && dataLocal <= fimLimpo;
    })
    .forEach((d) => {
      const dataStr = d.dataPagamento || d.data;
      const dataLocal = ajustarDataLocal(dataStr);
      const chave = dataParaStringLocal(dataLocal);
      const atual = dados.get(chave) || { entrada: 0, entradaAtrasada: 0, saida: 0 };
      atual.saida += d.valor;
      dados.set(chave, atual);
    });

  // 3. Montar Array Final
  const resultado: DadosGrafico[] = Array.from(dados.entries())
    .map(([data, valores]) => ({
      data,
      entrada: valores.entrada,
      entradaAtrasada: valores.entradaAtrasada,
      saida: valores.saida,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  // 4. Preencher Dias Faltantes
  if (periodo === "dia") {
    return resultado.length > 0 ? resultado : [{ data: dataParaStringLocal(inicio), entrada: 0, entradaAtrasada: 0, saida: 0 }];
  }

  if (periodo === "semana" || periodo === "mes" || periodo === "customizado") {
    const preenchido: DadosGrafico[] = [];
    const dataAtual = new Date(inicio);
    dataAtual.setHours(0,0,0,0);

    while (dataAtual <= fim) {
      const chave = dataParaStringLocal(dataAtual);
      const existente = resultado.find((d) => d.data === chave);
      preenchido.push(existente || { data: chave, entrada: 0, entradaAtrasada: 0, saida: 0 });
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    return preenchido;
  }

  return resultado;
};

export const gerarDadosGraficoServicos = (servicos: Servico[], financeiros: Financeiro[], despesas: Despesa[], periodo: PeriodoFiltro, periodoCustomizado?: PeriodoCustomizado): DadosGrafico[] => {
  return gerarDadosGrafico(financeiros, despesas, periodo, periodoCustomizado);
};

export const formatarDataGrafico = (data: string, periodo: PeriodoFiltro): string => {
  const date = new Date(data + "T00:00:00");
  switch (periodo) {
    case "dia": return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    case "semana": return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
    case "mes":
    case "customizado": return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    default: return date.toLocaleDateString("pt-BR");
  }
};