import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HistoricoPagamento, Financeiro, Sintegra, Servico, Renovacao } from "@/types/crm";
import { Despesa } from "@/types/despesas";
import { CheckCircle2, XCircle, Edit, Trash2, Save, X } from "lucide-react";
import { useState } from "react";

interface HistoricoPagamentosDialogProps<T extends Financeiro | Sintegra | Despesa | Servico | Renovacao = Financeiro> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item?: T | null;
  onDeleteHistorico?: (item: T, historicoId: string) => void;
  onEditHistorico?: (item: T, historicoId: string, novaData: string, novoMeio: "Pix" | "Boleto") => void;
}

const formatarDataBR = (dataISO: string) => {
  if (!dataISO) return "-";
  const data = new Date(dataISO + "T00:00:00");
  return data.toLocaleDateString("pt-BR");
};

export function HistoricoPagamentosDialog<T extends Financeiro | Sintegra | Despesa | Servico | Renovacao = Financeiro>({
  isOpen,
  onOpenChange,
  item,
  onDeleteHistorico,
  onEditHistorico,
}: HistoricoPagamentosDialogProps<T>) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novaData, setNovaData] = useState("");
  const [novoMeio, setNovoMeio] = useState<"Pix" | "Boleto">("Pix");
  
  const clienteNome =
    (item as any)?.clienteNome || (item as any)?.descricao || item?.id || "";
  // Verifica se é Financeiro, Servico, Despesa, Renovacao ou Sintegra para pegar o histórico correto
  const historico = ('historicoPagamentos' in (item || {})) 
    ? (item as any)?.historicoPagamentos || [] 
    : [];
  
  const pagamentosEmDia = historico.filter(p => p.emDia).length;
  const pagamentosAtrasados = historico.filter(p => !p.emDia).length;
  
  // O pagamento mais recente é o último adicionado ao histórico
  const pagamentoMaisRecente = historico.length > 0
    ? historico[historico.length - 1]
    : null;

  const handleEditar = (pag: HistoricoPagamento) => {
    setEditandoId(pag.id);
    setNovaData(pag.dataPagamento);
    setNovoMeio(pag.meioPagamento);
  };

  const handleSalvar = (pagId: string) => {
    if (item && onEditHistorico) {
      onEditHistorico(item, pagId, novaData, novoMeio);
      setEditandoId(null);
    }
  };

  const handleCancelar = () => {
    setEditandoId(null);
    setNovaData("");
    setNovoMeio("Pix");
  };

  const handleDeletar = (pagId: string) => {
    if (item && onDeleteHistorico) {
      onDeleteHistorico(item, pagId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Pagamentos - {clienteNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">
                <strong>{pagamentosEmDia}</strong> pagamentos em dia
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm">
                <strong>{pagamentosAtrasados}</strong> pagamentos atrasados
              </span>
            </div>
          </div>

          {/* Lista de pagamentos */}
          {historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Pagamentos registrados:</h3>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Vencimento</th>
                      <th className="p-3 text-left text-sm font-medium">Data Pagamento</th>
                      <th className="p-3 text-left text-sm font-medium">Meio</th>
                      <th className="p-3 text-left text-sm font-medium">Status</th>
                      <th className="p-3 text-left text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historico].reverse().map((pag, index) => (
                      <tr key={pag.id} className="border-t">
                        <td className="p-3 text-sm">
                          {formatarDataBR(pag.dataVencimento)}
                        </td>
                        {editandoId === pag.id ? (
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
                              <Select value={novoMeio} onValueChange={(v: "Pix" | "Boleto") => setNovoMeio(v)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pix">Pix</SelectItem>
                                  <SelectItem value="Boleto">Boleto</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              {pag.emDia ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Em dia
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
                                  onClick={() => handleSalvar(pag.id)}
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
                              {formatarDataBR(pag.dataPagamento)}
                            </td>
                            <td className="p-3 text-sm">
                              {pag.meioPagamento}
                            </td>
                            <td className="p-3">
                              {pag.emDia ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Em dia
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
                                  onClick={() => handleEditar(pag)}
                                  className="h-8 w-8 p-0"
                                  disabled={pagamentoMaisRecente?.id !== pag.id}
                                  title={pagamentoMaisRecente?.id !== pag.id ? "Só é possível editar o pagamento mais recente" : "Editar pagamento"}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletar(pag.id)}
                                  className="h-8 w-8 p-0"
                                  disabled={pagamentoMaisRecente?.id !== pag.id}
                                  title={pagamentoMaisRecente?.id !== pag.id ? "Só é possível apagar o pagamento mais recente" : "Apagar pagamento"}
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
