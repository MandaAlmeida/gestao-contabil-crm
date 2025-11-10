import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Cliente, Financeiro } from "@/types/crm";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function FinanceiroPage() {
  const [clientes] = useLocalStorage<Cliente[]>('crm-clientes', []);
  const [financeiros, setFinanceiros] = useLocalStorage<Financeiro[]>('crm-financeiro', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResponsavel, setSearchResponsavel] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Financeiro | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    dataVencimento: '',
    valorMensalidade: '',
    status: 'Pendente' as Financeiro['status'],
    meioPagamento: 'Pix' as Financeiro['meioPagamento'],
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      clienteId: '',
      dataVencimento: '',
      valorMensalidade: '',
      status: 'Pendente',
      meioPagamento: 'Pix',
      observacoes: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cliente = clientes.find(c => c.id === formData.clienteId);
    if (!cliente) {
      toast({ title: "Cliente não encontrado!", variant: "destructive" });
      return;
    }

    let dataVencimento = formData.dataVencimento;
    
    // Regra de negócio: atualizar data de vencimento quando status for Pago ou Pendente
    if (editingItem && (formData.status === 'Pago' || formData.status === 'Pendente') && 
        editingItem.status !== formData.status) {
      const currentDate = new Date(formData.dataVencimento);
      currentDate.setMonth(currentDate.getMonth() + 1);
      dataVencimento = currentDate.toISOString().split('T')[0];
    }
    
    if (editingItem) {
      setFinanceiros(financeiros.map(f => 
        f.id === editingItem.id 
          ? {
              ...formData,
              id: f.id,
              clienteNome: cliente.nome,
              clienteCNPJ: cliente.cnpj,
              valorMensalidade: parseFloat(formData.valorMensalidade),
              dataVencimento,
              createdAt: f.createdAt,
              updatedAt: new Date().toISOString(),
            }
          : f
      ));
      toast({ title: "Registro atualizado com sucesso!" });
    } else {
      const newItem: Financeiro = {
        ...formData,
        id: crypto.randomUUID(),
        clienteNome: cliente.nome,
        clienteCNPJ: cliente.cnpj,
        valorMensalidade: parseFloat(formData.valorMensalidade),
        dataVencimento,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFinanceiros([...financeiros, newItem]);
      toast({ title: "Registro adicionado com sucesso!" });
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Financeiro) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataVencimento: item.dataVencimento,
      valorMensalidade: item.valorMensalidade.toString(),
      status: item.status,
      meioPagamento: item.meioPagamento,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      setFinanceiros(financeiros.filter(f => f.id !== id));
      toast({ title: "Registro excluído com sucesso!" });
    }
  };

  const filteredItems = financeiros.filter(item => {
    const cliente = clientes.find(c => c.id === item.clienteId);
    const matchesSearch = item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel = searchResponsavel === '' || 
                                (cliente && cliente.responsavel.toLowerCase().includes(searchResponsavel.toLowerCase()));
    return matchesSearch && matchesResponsavel;
  });

  const totalMensalidades = filteredItems.reduce((sum, item) => sum + item.valorMensalidade, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago': return 'bg-success/10 text-success';
      case 'Pendente': return 'bg-warning/10 text-warning';
      case 'Atrasado': return 'bg-destructive/10 text-destructive';
      case 'Cancelado': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie pagamentos e mensalidades</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Registro Financeiro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <Select value={formData.clienteId} onValueChange={(value) => setFormData({ ...formData, clienteId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(cliente => (
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
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorMensalidade">Valor da Mensalidade</Label>
                    <Input
                      id="valorMensalidade"
                      type="number"
                      step="0.01"
                      value={formData.valorMensalidade}
                      onChange={(e) => setFormData({ ...formData, valorMensalidade: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: Financeiro['status']) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Atrasado">Atrasado</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meioPagamento">Meio de Pagamento</Label>
                    <Select value={formData.meioPagamento} onValueChange={(value: Financeiro['meioPagamento']) => setFormData({ ...formData, meioPagamento: value })}>
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
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="Filtrar por responsável..."
            value={searchResponsavel}
            onChange={(e) => setSearchResponsavel(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="mb-4 rounded-lg bg-primary p-4 text-primary-foreground">
          <p className="text-lg font-semibold">
            Total: R$ {totalMensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Cliente</th>
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">Vencimento</th>
                <th className="p-3 text-left text-sm font-medium">Valor</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Pagamento</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{new Date(item.dataVencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">R$ {item.valorMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3">{item.meioPagamento}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum registro encontrado
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
