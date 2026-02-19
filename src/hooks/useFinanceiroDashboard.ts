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
  historicoPagamentos?: PagamentoHistorico[];
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
  }

  if (filtro === "semana") {
    const diaSemana = hoje.getDay();
    inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - diaSemana);
    fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
  }

  if (filtro === "ano") {
    inicio = new Date(hoje.getFullYear(), 0, 1);
    fim = new Date(hoje.getFullYear(), 11, 31);
  }

  if (filtro === "customizado" && custom) {
    inicio = custom.inicio;
    fim = custom.fim;
  }

  inicio.setHours(0, 0, 0, 0);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}

/* =========================
   UTIL — PAGAMENTOS NO PERÍODO
========================= */

function obterPagamentosPeriodo(
  financeiros: Financeiro[],
  inicio: Date,
  fim: Date
) {
  const pagamentos: {
    financeiro: Financeiro;
    pagamento: PagamentoHistorico;
  }[] = [];

  financeiros.forEach((f) => {
    if (!f.historicoPagamentos?.length) return;

    f.historicoPagamentos.forEach((p) => {
      if (!p.dataPagamento) return;

      const dataPagamento = new Date(p.dataPagamento);

      if (dataPagamento >= inicio && dataPagamento <= fim) {
        pagamentos.push({
          financeiro: f,
          pagamento: p,
        });
      }
    });
  });

  return pagamentos;
}


/* =========================
   NORMALIZAÇÃO
========================= */

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

  const pagamentosPeriodo = useMemo(
    () =>
      obterPagamentosPeriodo(
        financeirosNormalizados,
        periodo.inicio,
        periodo.fim
      ),
    [financeirosNormalizados, periodo]
  );

  const hoje = new Date();

  /* =========================
     TOTAL ENTRADA
  ========================= */

const totalEntrada = useMemo(() => {
  return pagamentosPeriodo.reduce((acc, { financeiro, pagamento }) => {
    const vencimento = new Date(pagamento.dataVencimento);

    if (vencimento < periodo.inicio || vencimento > periodo.fim) {
      return acc;
    }

    const mensalidade = financeiro.valorMensalidade || 0;
    const servico = Number(financeiro.valorServico || 0);

    return acc + mensalidade + servico;
  }, 0);
}, [pagamentosPeriodo, periodo]);


  /* =========================
     ENTRADA MENSALIDADES
  ========================= */

const entradaFinanceiro = useMemo(() => {
  return pagamentosPeriodo.reduce((acc, { financeiro, pagamento }) => {
    const vencimento = new Date(pagamento.dataVencimento);

    if (vencimento < periodo.inicio || vencimento > periodo.fim) {
      return acc; // não pertence ao mês
    }

    return acc + (financeiro.valorMensalidade || 0);
  }, 0);
}, [pagamentosPeriodo, periodo]);


  /* =========================
     ENTRADA SERVIÇOS
  ========================= */

const entradaServicos = useMemo(() => {
  return pagamentosPeriodo.reduce((acc, { financeiro, pagamento }) => {
    const vencimento = new Date(pagamento.dataVencimento);

    if (vencimento < periodo.inicio || vencimento > periodo.fim) {
      return acc;
    }

    const valor = Number(financeiro.valorServico || 0);

    return acc + valor;
  }, 0);
}, [pagamentosPeriodo, periodo]);


  /* =========================
     PAGAMENTOS ATRASADOS
  ========================= */

const pagamentosAtrasados = useMemo(() => {
  let total = 0;

  pagamentosPeriodo.forEach(({ financeiro, pagamento }) => {
    const dataPagamento = new Date(pagamento.dataPagamento);
    const dataVencimento = new Date(pagamento.dataVencimento);

    const venceuAntesDoPeriodo = dataVencimento < periodo.inicio;

    if (venceuAntesDoPeriodo && dataPagamento >= periodo.inicio && dataPagamento <= periodo.fim) {
      const mensalidade = financeiro.valorMensalidade || 0;
      const servico = Number(financeiro.valorServico || 0);

      total += mensalidade + servico;
    }
  });

  return total;
}, [pagamentosPeriodo, periodo]);


  /* =========================
     VALORES VENCIDOS
  ========================= */

  const valoresVencidos = useMemo(() => {
    return financeirosNormalizados.reduce((acc, f) => {
      if (!f.dataVencimento) return acc;

      const vencimento = new Date(f.dataVencimento);

      if (vencimento < hoje && f.status !== "Pago") {
        const mensalidade = f.valorMensalidade || 0;
        const servico = Number(f.valorServico || 0);

        return acc + mensalidade + servico;
      }

      return acc;
    }, 0);
  }, [financeirosNormalizados]);

  /* =========================
     QUANTIDADE CLIENTES PAGOS
  ========================= */

  const clientesPagos = useMemo(() => {
    const ids = new Set(
      pagamentosPeriodo.map((p) => p.financeiro.id)
    );

    return ids.size;
  }, [pagamentosPeriodo]);

  /* =========================
     QUANTIDADE CLIENTES ATRASO
  ========================= */

  const clientesAtraso = useMemo(() => {
    const ids = new Set<string>();

    pagamentosPeriodo.forEach(({ financeiro, pagamento }) => {
      const dataPagamento = new Date(pagamento.dataPagamento);
      const dataVencimento = new Date(pagamento.dataVencimento);

      if (dataPagamento > dataVencimento) {
        ids.add(financeiro.id);
      }
    });

    return ids.size;
  }, [pagamentosPeriodo]);

  return {
    totalEntrada,
    entradaFinanceiro,
    entradaServicos,
    pagamentosAtrasados,
    valoresVencidos,
    clientesPagos,
    clientesAtraso,
    periodo,
  };
}
