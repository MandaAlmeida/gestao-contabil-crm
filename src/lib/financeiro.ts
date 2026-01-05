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
  item: Pick<Financeiro, "status" | "dataPagamento" | "dataVencimento">
): Financeiro["status"] => {
  if (item.dataPagamento) {
    return "Pago";
  }

  // Sem data de pagamento, nunca pode ser "Recebido"
  const hoje = startOfDay(new Date());
  const vencimento = parseDate(item.dataVencimento);

  if (vencimento < hoje) {
    return "Vencido";
  }

  return "Pendente";
};

export const normalizarFinanceiros = (lista: Financeiro[]) => {
  let houveAlteracao = false;
  const hoje = startOfDay(new Date());

  const normalizados = lista.map((item) => {
    let dataPagamento = item.dataPagamento ?? null;

    if (dataPagamento) {
      const dataPagamentoDate = startOfDay(new Date(dataPagamento));
      if (!mesmoMesEAno(dataPagamentoDate, hoje)) {
        dataPagamento = null;
      }
    }

    const statusCalculado = calcularStatusFinanceiro({
      status: item.status,
      dataPagamento,
      dataVencimento: item.dataVencimento,
    });

    if (statusCalculado !== item.status || dataPagamento !== item.dataPagamento) {
      houveAlteracao = true;
      return {
        ...item,
        dataPagamento,
        status: statusCalculado,
      };
    }

    return item;
  });

  return houveAlteracao ? normalizados : lista;
};

