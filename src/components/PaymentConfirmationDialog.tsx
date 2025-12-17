import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MeioPagamento = "Pix" | "Boleto";

interface PaymentConfirmationDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: T | null;
  valor: number;
  clienteNome: string;
  onConfirm: (data: { dataPagamento: string; meioPagamento: MeioPagamento }) => void;
  dataPagamentoInicial?: string;
  meioPagamentoInicial?: MeioPagamento;
}

export function PaymentConfirmationDialog<T>({
  open,
  onOpenChange,
  item,
  valor,
  clienteNome,
  onConfirm,
  dataPagamentoInicial,
  meioPagamentoInicial = "Pix",
}: PaymentConfirmationDialogProps<T>) {
  const [pagamentoData, setPagamentoData] = useState({
    dataPagamento: "",
    meioPagamento: "Pix" as MeioPagamento,
  });

  useEffect(() => {
    if (open && item) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const dia = String(hoje.getDate()).padStart(2, "0");
      const dataHoje = `${ano}-${mes}-${dia}`;

      setPagamentoData({
        dataPagamento: dataPagamentoInicial || dataHoje,
        meioPagamento: meioPagamentoInicial || "Pix",
      });
    }
  }, [open, item, dataPagamentoInicial, meioPagamentoInicial]);

  const handleConfirm = () => {
    if (!pagamentoData.dataPagamento) {
      return;
    }
    onConfirm(pagamentoData);
  };

  const handleCancel = () => {
    setPagamentoData({ dataPagamento: "", meioPagamento: "Pix" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium">{clienteNome}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Valor:{" "}
              <span className="font-medium">
                R${" "}
                {valor.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pagamento-data">Data de Pagamento *</Label>
            <Input
              id="pagamento-data"
              type="date"
              value={pagamentoData.dataPagamento}
              onChange={(e) =>
                setPagamentoData({
                  ...pagamentoData,
                  dataPagamento: e.target.value,
                })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pagamento-meio">Meio de Pagamento *</Label>
            <Select
              value={pagamentoData.meioPagamento}
              onValueChange={(value: MeioPagamento) =>
                setPagamentoData({
                  ...pagamentoData,
                  meioPagamento: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!pagamentoData.dataPagamento}
            >
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

