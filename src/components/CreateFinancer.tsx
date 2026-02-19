import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Financeiro } from "@/types/crm";
import {
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CreateFinancerProps = {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  resetForm: () => void;
  editingItem: Financeiro | null;
  formData: any;
  setFormData: (data: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  clientesDisponiveisFormulario: { id: string; nome: string; cnpj: string }[];
  servicos: { clienteId: string; valorMensalidade: number }[];
}



export function CreateFinancer({clientesDisponiveisFormulario, editingItem, formData, handleSubmit, isDialogOpen, resetForm, servicos, setFormData, setIsDialogOpen}: CreateFinancerProps){
             return (
                 <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm(); 
                  }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Registro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" onCloseAutoFocus={e => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Editar" : "Novo"} Registro Financeiro
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clienteId">Cliente</Label>
                      <Select
                        value={formData.clienteId}
                        onValueChange={(value) => {
                          setFormData(prev => {
                            const novoFormData = { ...prev, clienteId: value, valorMensalidade: "" };
                            // Preencher automaticamente valor do serviço se existir
                            const servicoCliente = servicos.find(s => s.clienteId === value);
                            if (servicoCliente) {
                              novoFormData.valorMensalidade = servicoCliente.valorMensalidade.toString();
                            }
                            return novoFormData;
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientesDisponiveisFormulario.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome} - {cliente.cnpj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataVencimento">Data de Vencimento</Label>
                        <Input
                          id="dataVencimento"
                          type="date"
                          value={formData.dataVencimento}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dataVencimento: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valorMensalidade">
                          Valor da Mensalidade
                        </Label>
                        <Input
                          id="valorMensalidade"
                          type="number"
                          step="0.01"
                          value={formData.valorMensalidade}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              valorMensalidade: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valorServico">
                          Valor do Serviço
                        </Label>
                        <Input
                          id="valorServico"
                          type="number"
                          step="0.01"
                          value={formData.valorServico}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              valorServico: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meioPagamento">Meio de Pagamento</Label>
                        <Select
                          value={formData.meioPagamento}
                          onValueChange={(value: Financeiro["meioPagamento"]) =>
                            setFormData({ ...formData, meioPagamento: value })
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        value={formData.observacoes}
                        onChange={(e) =>
                          setFormData({ ...formData, observacoes: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
             )
}