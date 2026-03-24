import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Certificado } from "@/types/crm";
import { Edit, Trash2, Save, X, Clock } from "lucide-react";
import { useState } from "react";

interface HistoricoRenovacoesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Certificado | null;
  onDeleteHistorico?: (item: Certificado, historicoId: string) => void;
  onEditHistorico?: (
    item: Certificado,
    historicoId: string,
    novaDataRenovacao: string,
  ) => void;
}

const formatarDataBR = (dataISO: string) => {
  if (!dataISO) return "-";
  const data = new Date(dataISO + "T00:00:00");
  return data.toLocaleDateString("pt-BR");
};

export function HistoricoRenovacoesDialog({
  isOpen,
  onOpenChange,
  item,
  onDeleteHistorico,
  onEditHistorico,
}: HistoricoRenovacoesDialogProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novaData, setNovaData] = useState("");

  const clienteNome = item?.clienteNome || "";
  const historico = item?.historicoRenovacoes || [];

  const renovacaoMaisRecente =
    historico.length > 0
      ? historico.reduce((ultima, atual) => {
          const dataUltima = new Date(ultima.dataRenovacao + "T00:00:00");
          const dataAtual = new Date(atual.dataRenovacao + "T00:00:00");
          return dataAtual > dataUltima ? atual : ultima;
        })
      : null;

  const handleEditar = (renovacao: any) => {
    setEditandoId(renovacao.id);
    setNovaData(renovacao.dataRenovacao);
  };

  const handleSalvar = (renovacaoId: string) => {
    if (item && onEditHistorico) {
      onEditHistorico(item, renovacaoId, novaData);
      setEditandoId(null);
    }
  };

  const handleCancelar = () => {
    setEditandoId(null);
    setNovaData("");
  };

  const handleDeletar = (renovacaoId: string) => {
    if (item && onDeleteHistorico) {
      onDeleteHistorico(item, renovacaoId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Renovações - {clienteNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg items-center">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-sm">
              Este certificado foi renovado <strong>{historico.length}</strong>{" "}
              vezes.
            </span>
          </div>

          {historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma renovação registrada.
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Renovações:
              </h3>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">
                        Data da Ação
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Vencimento Anterior
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Novo Vencimento
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historico].reverse().map((renovacao) => (
                      <tr key={renovacao.id} className="border-t">
                        {editandoId === renovacao.id ? (
                          <>
                            <td className="p-3">
                              <Input
                                type="date"
                                value={novaData}
                                onChange={(e) => setNovaData(e.target.value)}
                                className="w-full"
                              />
                            </td>
                            <td className="p-3 text-sm">
                              {formatarDataBR(renovacao.vencimentoAnterior)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatarDataBR(renovacao.novoVencimento)}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSalvar(renovacao.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Save className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelar}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-sm">
                              {formatarDataBR(renovacao.dataRenovacao)}
                            </td>
                            <td className="p-3 text-sm line-through text-muted-foreground">
                              {formatarDataBR(renovacao.vencimentoAnterior)}
                            </td>
                            <td className="p-3 text-sm font-medium text-green-600">
                              {formatarDataBR(renovacao.novoVencimento)}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditar(renovacao)}
                                  className="h-8 w-8 p-0"
                                  disabled={
                                    renovacaoMaisRecente?.id !== renovacao.id
                                  }
                                  title={
                                    renovacaoMaisRecente?.id !== renovacao.id
                                      ? "Apenas a renovação mais recente pode ser editada"
                                      : "Editar data"
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletar(renovacao.id)}
                                  className="h-8 w-8 p-0"
                                  disabled={
                                    renovacaoMaisRecente?.id !== renovacao.id
                                  }
                                  title={
                                    renovacaoMaisRecente?.id !== renovacao.id
                                      ? "Apenas a renovação mais recente pode ser apagada"
                                      : "Desfazer renovação"
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
