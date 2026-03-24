import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  generateFinanceiroPDF,
  generateFinanceiroExcel,
} from "@/lib/pdfGenerator";
import { Financeiro } from "@/types/crm";

interface ExportButtonsProps {
  data: Financeiro[];
  filtroDataInicio?: string;
  filtroDataFim?: string;
}

export function ExportButtons({
  data,
  filtroDataInicio,
  filtroDataFim,
}: ExportButtonsProps) {
  const handleGeneratePDF = async () => {
    await generateFinanceiroPDF(data, {
      title: "Relatório Financeiro",
      filename: `financeiro-${new Date().toISOString().split("T")[0]}.pdf`,
      dateRange:
        filtroDataInicio && filtroDataFim
          ? {
              start: filtroDataInicio,
              end: filtroDataFim,
            }
          : undefined,
    });
  };

  // Função para gerar Excel
  const handleGenerateExcel = () => {
    generateFinanceiroExcel(data, {
      title: "Relatório Financeiro",
      filename: `financeiro-${new Date().toISOString().split("T")[0]}.xlsx`,
      dateRange:
        filtroDataInicio && filtroDataFim
          ? {
              start: filtroDataInicio,
              end: filtroDataFim,
            }
          : undefined,
    });
  };

  return (
    <div className="flex gap-2 items-end">
      <Button
        variant="outline"
        onClick={handleGeneratePDF}
        disabled={data.length === 0}
      >
        <Download className="mr-2 h-4 w-4" />
        Baixar PDF
      </Button>
      <Button
        variant="outline"
        onClick={handleGenerateExcel}
        disabled={data.length === 0}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Baixar Excel
      </Button>
    </div>
  );
}
