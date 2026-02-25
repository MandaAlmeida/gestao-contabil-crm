import { PeriodoFiltro } from "@/lib/graficos";
import { useMemo } from "react";

/* =========================
   TIPOS
========================= */

interface PeriodoCustomizado {
  inicio: Date;
  fim: Date;
}

interface PagamentoHistorico {
  id: string;
  dataPagamento: string;
  dataVencimento: string;
  emDia?: boolean;
  meioPagamento?: string;
}

interface Financeiro {
  id: string;
  clienteNome: string;
  valorMensalidade?: number;
  valorServico?: string | number;
  dataVencimento: string;
  status: string;
  dataPagamento?: string;
  historicoPagamentos?: PagamentoHistorico[];
}

/* =========================
   UTIL — DATAS LOCAL
========================= */

function ajustarDataLocal(dataString: string | undefined): Date {
  if (!dataString) return new Date();
  if (dataString.includes("T")) return new Date(dataString);

  const [ano, mes, dia] = dataString.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0);
}

/* =========================
   UTIL — PERÍODO
========================= */

function calcularPeriodo(
  filtro: PeriodoFiltro,
  custom?: PeriodoCustomizado
) {
  const hoje = new Date();

  let inicio = new Date(hoje);
  let fim = new Date(hoje);

  if (filtro === "mes") {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  } else if (filtro === "semana") {
    const diaSemana = hoje.getDay();
    inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - diaSemana);
    fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
  } else if (filtro === "ano") {
    inicio = new Date(hoje.getFullYear(), 0, 1);
    fim = new Date(hoje.getFullYear(), 11, 31);
  } else if (filtro === "customizado" && custom) {
    inicio = custom.inicio;
    fim = custom.fim;
  }

  inicio.setHours(0, 0, 0, 0);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}

function normalizarFinanceiros(financeiros: Financeiro[]): Financeiro[] {
  return financeiros.map((f) => ({
    ...f,
    valorMensalidade: Number(f.valorMensalidade || 0),
    valorServico: Number(f.valorServico || 0),
    historicoPagamentos: f.historicoPagamentos || [],
  }));
}

/* =========================
   HOOK PRINCIPAL
========================= */

export function useFinanceiroMetricas(
  financeiros: Financeiro[],
  periodoFiltro: PeriodoFiltro,
  periodoCustomizado?: PeriodoCustomizado
) {
  const financeirosNormalizados = useMemo(
    () => normalizarFinanceiros(financeiros),
    [financeiros]
  );

  const periodo = useMemo(
    () => calcularPeriodo(periodoFiltro, periodoCustomizado),
    [periodoFiltro, periodoCustomizado]
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  /* =========================
     EXTRAÇÃO DE PAGAMENTOS
  ========================= */
  const pagamentosDoPeriodo = useMemo(() => {
    const pgs: { financeiro: Financeiro; dataPagamento: Date; dataVencimento: Date }[] = [];

    const inicioLimpo = new Date(periodo.inicio); inicioLimpo.setHours(0,0,0,0);
    const fimLimpo = new Date(periodo.fim); fimLimpo.setHours(23,59,59,999);

    financeirosNormalizados.forEach((f) => {
      let temHistoricoNoPeriodo = false;

      if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
        f.historicoPagamentos.forEach((hp) => {
          if (!hp.dataPagamento) return;

          const dPag = ajustarDataLocal(hp.dataPagamento); dPag.setHours(0,0,0,0);
          const dVenc = ajustarDataLocal(hp.dataVencimento || f.dataVencimento); dVenc.setHours(0,0,0,0);

          if (dPag >= inicioLimpo && dPag <= fimLimpo) {
            pgs.push({ financeiro: f, dataPagamento: dPag, dataVencimento: dVenc });
            temHistoricoNoPeriodo = true;
          }
        });
      }

      if (!temHistoricoNoPeriodo && f.status === "Pago") {
        const dataStr = f.dataPagamento || f.dataVencimento;
        if (dataStr) {
          const dPag = ajustarDataLocal(dataStr); dPag.setHours(0,0,0,0);
          const dVenc = ajustarDataLocal(f.dataVencimento); dVenc.setHours(0,0,0,0);

          if (dPag >= inicioLimpo && dPag <= fimLimpo) {
            pgs.push({ financeiro: f, dataPagamento: dPag, dataVencimento: dVenc });
          }
        }
      }
    });

    return pgs;
  }, [financeirosNormalizados, periodo]);

  /* =========================
     BIFURCAÇÃO DE CAIXA (NO PRAZO vs ATRASADO)
  ========================= */
  const metricasCaixa = useMemo(() => {
    let finNoPrazo = 0;
    let servNoPrazo = 0;
    
    let atrasadosFin = 0;
    let atrasadosServ = 0;
    
    let totalEntrada = 0;

    pagamentosDoPeriodo.forEach((p) => {
      const valorFin = p.financeiro.valorMensalidade || 0;
      const valorServ = Number(p.financeiro.valorServico) || 0;
      const somaTotal = valorFin + valorServ;

      totalEntrada += somaTotal;

      const mesmoMesAno =
        p.dataPagamento.getMonth() === p.dataVencimento.getMonth() &&
        p.dataPagamento.getFullYear() === p.dataVencimento.getFullYear();

      if (!mesmoMesAno && p.dataPagamento > p.dataVencimento) {
        atrasadosFin += valorFin;
        atrasadosServ += valorServ;
      } else {
        finNoPrazo += valorFin;
        servNoPrazo += valorServ;
      }
    });

    return { totalEntrada, finNoPrazo, servNoPrazo, atrasadosFin, atrasadosServ };
  }, [pagamentosDoPeriodo]);

  /* =========================
     VALORES VENCIDOS (Separado e Subtraído)
  ========================= */
  const metricasVencidos = useMemo(() => {
    let vencidosFin = 0;
    let vencidosServ = 0;

    financeirosNormalizados.forEach((f) => {
      if (!f.dataVencimento) return;

      const vencimento = ajustarDataLocal(f.dataVencimento);
      vencimento.setHours(0,0,0,0);

      if (vencimento < hoje && f.status !== "Pago") {
        vencidosFin += (f.valorMensalidade || 0);
        vencidosServ += (Number(f.valorServico) || 0);
      }
    });

    // Subtrai do montante vencido o que já foi pago em atraso no período (regra solicitada)
    // Usamos Math.max para garantir que o valor nunca fique negativo
    const finalFin = Math.max(0, vencidosFin - metricasCaixa.atrasadosFin);
    const finalServ = Math.max(0, vencidosServ - metricasCaixa.atrasadosServ);

    return {
      total: finalFin + finalServ,
      financeiro: finalFin,
      servicos: finalServ,
    };
  }, [financeirosNormalizados, hoje, metricasCaixa]);

  /* =========================
     QUANTIDADES (Clientes)
  ========================= */
  const clientesPagos = useMemo(() => {
    const ids = new Set(pagamentosDoPeriodo.map((p) => p.financeiro.id));
    return ids.size;
  }, [pagamentosDoPeriodo]);

  const clientesAtraso = useMemo(() => {
    const ids = new Set<string>();

    pagamentosDoPeriodo.forEach((p) => {
      const mesmoMesAno =
        p.dataPagamento.getMonth() === p.dataVencimento.getMonth() &&
        p.dataPagamento.getFullYear() === p.dataVencimento.getFullYear();

      if (!mesmoMesAno && p.dataPagamento > p.dataVencimento) {
        ids.add(p.financeiro.id);
      }
    });

    return ids.size;
  }, [pagamentosDoPeriodo]);

  return {
    totalEntrada: metricasCaixa.totalEntrada,
    entradaFinanceiro: metricasCaixa.finNoPrazo,
    entradaServicos: metricasCaixa.servNoPrazo,
    
    pagamentosAtrasados: metricasCaixa.atrasadosFin + metricasCaixa.atrasadosServ,
    pagamentosAtrasadosFinanceiro: metricasCaixa.atrasadosFin,
    pagamentosAtrasadosServicos: metricasCaixa.atrasadosServ,
    
    // Agora o painel recebe as três propriedades detalhadas do Vencido:
    valoresVencidos: metricasVencidos.total,
    valoresVencidosFinanceiro: metricasVencidos.financeiro,
    valoresVencidosServicos: metricasVencidos.servicos,
    
    clientesPagos,
    clientesAtraso,
    periodo,
  };
}