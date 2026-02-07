import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Financeiro } from '@/types/crm';
import { Renovacao } from '@/types/crm';

export interface PDFGeneratorOptions {
  title: string;
  filename: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export function generateFinanceiroExcel(
  data: Financeiro[],
  options: PDFGeneratorOptions
): void {
  // Preparar dados para Excel
  const excelData = data.map((item) => {
    const ultimoPagamento = item.historicoPagamentos && item.historicoPagamentos.length > 0
      ? item.historicoPagamentos[item.historicoPagamentos.length - 1]
      : null;
    
    const pagamentosEmDia = item.historicoPagamentos?.filter(p => p.emDia).length || 0;
    const pagamentosAtrasados = item.historicoPagamentos?.filter(p => !p.emDia).length || 0;
    
    return {
      'Cliente': item.clienteNome,
      'CNPJ': item.clienteCNPJ,
      'Data Vencimento': item.dataVencimento,
      'Valor': `R$ ${item.valorMensalidade.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      'Status': item.status,
      'Pag. Em Dia': pagamentosEmDia,
      'Pag. Atrasados': pagamentosAtrasados,
      'Último Pagamento': ultimoPagamento?.dataPagamento || '',
      'Observações': item.observacoes || '',
    };
  });

  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 25 }, // Cliente
    { wch: 18 }, // CNPJ
    { wch: 15 }, // Data Vencimento
    { wch: 15 }, // Valor
    { wch: 12 }, // Status
    { wch: 12 }, // Pag. Em Dia
    { wch: 15 }, // Pag. Atrasados
    { wch: 16 }, // Último Pagamento
    { wch: 30 }, // Observações
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');

  // Salvar arquivo
  XLSX.writeFile(wb, options.filename.replace('.pdf', '.xlsx'));
}

export function generateRenovacaoExcel(
  data: Renovacao[],
  options: PDFGeneratorOptions
): void {
  // Preparar dados para Excel
  const excelData = data.map((item) => ({
    'Cliente': item.clienteNome,
    'CNPJ': item.clienteCNPJ,
    'Data Renovação': item.dataRenovacao,
    'Valor': `R$ ${item.valorRenovacao.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    'Status': item.status,
    'Observações': item.observacoes || '',
  }));

  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 25 }, // Cliente
    { wch: 18 }, // CNPJ
    { wch: 15 }, // Data Renovação
    { wch: 15 }, // Valor
    { wch: 12 }, // Status
    { wch: 30 }, // Observações
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Renovações');

  // Salvar arquivo
  XLSX.writeFile(wb, options.filename.replace('.pdf', '.xlsx'));
}

export async function generateFinanceiroPDF(
  data: Financeiro[],
  options: PDFGeneratorOptions
): Promise<void> {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(20);
  doc.text(options.title, 14, 22);

  // Data de geração
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

  // Período se fornecido
  if (options.dateRange) {
    doc.text(
      `Período: ${options.dateRange.start} a ${options.dateRange.end}`,
      14,
      38
    );
  }

  // Preparar dados para a tabela
  const tableData = data.map((item) => [
    item.clienteNome,
    item.dataVencimento,
    `R$ ${item.valorMensalidade.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    item.status,
  ]);

  // Importar autoTable dinamicamente
  const { default: autoTable } = await import('jspdf-autotable');

  // Configurar e gerar tabela
  autoTable(doc, {
    head: [['Cliente', 'Data Vencimento', 'Valor', 'Status']],
    body: tableData,
    startY: options.dateRange ? 45 : 40,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 45 },
  });

  // Salvar PDF
  doc.save(options.filename);
}

export async function generateRenovacaoPDF(
  data: Renovacao[],
  options: PDFGeneratorOptions
): Promise<void> {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(20);
  doc.text(options.title, 14, 22);

  // Data de geração
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

  // Período se fornecido
  if (options.dateRange) {
    doc.text(
      `Período: ${options.dateRange.start} a ${options.dateRange.end}`,
      14,
      38
    );
  }

  // Preparar dados para a tabela
  const tableData = data.map((item) => [
    item.clienteNome,
    item.dataRenovacao,
    `R$ ${item.valorRenovacao.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    item.status,
  ]);

  // Importar autoTable dinamicamente
  const { default: autoTable } = await import('jspdf-autotable');

  // Configurar e gerar tabela
  autoTable(doc, {
    head: [['Cliente', 'Data Renovação', 'Valor', 'Status']],
    body: tableData,
    startY: options.dateRange ? 45 : 40,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [52, 152, 219],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 45 },
  });

  // Salvar PDF
  doc.save(options.filename);
}
