import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HistoricoAtividade, Sintegra } from "@/types/crm";
import { CheckCircle2, XCircle, Edit, Trash2, Save, X } from "lucide-react";
import { useState } from "react";

interface HistoricoAtividadesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Sintegra | null;
  onDeleteHistorico?: (item: Sintegra, historicoId: string) => void;
  onEditHistorico?: (item: Sintegra, historicoId: string, novaData: string) => void;
}

const formatarDataBR = (dataISO: string) => {
  if (!dataISO) return "-";
  const data = new Date(dataISO + "T00:00:00");
  return data.toLocaleDateString("pt-BR");
};

export function HistoricoAtividadesDialog({
  isOpen,
  onOpenChange,
  item,
  onDeleteHistorico,
  onEditHistorico,
}: HistoricoAtividadesDialogProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novaData, setNovaData] = useState("");
  
  const clienteNome = item?.clienteNome || "";
  const historico = item?.historicoAtividades || [];
  
  const atividadesNoPrazo = historico.filter(a => a.noPrazo).length;
  const atividadesAtrasadas = historico.filter(a => !a.noPrazo).length;
  
  // Encontra a atividade mais recente (baseado na data de prazo)
  const atividadeMaisRecente = historico.length > 0 
    ? historico.reduce((ultima, atual) => {
        const dataUltima = new Date(ultima.dataPrazo + "T00:00:00");
        const dataAtual = new Date(atual.dataPrazo + "T00:00:00");
        return dataAtual > dataUltima ? atual : ultima;
      })
    : null;

  const handleEditar = (atividade: HistoricoAtividade) => {
    setEditandoId(atividade.id);
    setNovaData(atividade.dataConclusao);
  };

  const handleSalvar = (atividadeId: string) => {
    if (item && onEditHistorico) {
      onEditHistorico(item, atividadeId, novaData);
      setEditandoId(null);
    }
  };

  const handleCancelar = () => {
    setEditandoId(null);
    setNovaData("");
  };

  const handleDeletar = (atividadeId: string) => {
    if (item && onDeleteHistorico) {
      onDeleteHistorico(item, atividadeId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Atividades - {clienteNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">
                <strong>{atividadesNoPrazo}</strong> atividades no prazo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm">
                <strong>{atividadesAtrasadas}</strong> atividades atrasadas
              </span>
            </div>
          </div>

          {/* Lista de atividades */}
          {historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Atividades registradas:</h3>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Prazo</th>
                      <th className="p-3 text-left text-sm font-medium">Data Conclusão</th>
                      <th className="p-3 text-left text-sm font-medium">Status</th>
                      <th className="p-3 text-left text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historico].reverse().map((atividade) => (
                      <tr key={atividade.id} className="border-t">
                        <td className="p-3 text-sm">
                          {formatarDataBR(atividade.dataPrazo)}
                        </td>
                        {editandoId === atividade.id ? (
                          <>
                            <td className="p-3">
                              <Input
                                type="date"
                                value={novaData}
                                onChange={(e) => setNovaData(e.target.value)}
                                className="w-full"
                              />
                            </td>
                            <td className="p-3">
                              {atividade.noPrazo ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  No prazo
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-orange-600">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Atrasado
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSalvar(atividade.id)}
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
                              {formatarDataBR(atividade.dataConclusao)}
                            </td>
                            <td className="p-3">
                              {atividade.noPrazo ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  No prazo
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-orange-600">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Atrasado
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditar(atividade)}
                                  className="h-8 w-8 p-0"
                                  disabled={atividadeMaisRecente?.id !== atividade.id}
                                  title={atividadeMaisRecente?.id !== atividade.id ? "Só é possível editar a atividade mais recente" : "Editar atividade"}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletar(atividade.id)}
                                  className="h-8 w-8 p-0"
                                  disabled={atividadeMaisRecente?.id !== atividade.id}
                                  title={atividadeMaisRecente?.id !== atividade.id ? "Só é possível apagar a atividade mais recente" : "Apagar atividade"}
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
