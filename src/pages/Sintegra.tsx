import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Cliente, Sintegra } from "@/types/crm";
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

export default function SintegraPage() {
  const [clientes] = useLocalStorage<Cliente[]>('crm-clientes', []);
  const [sintegras, setSintegras] = useLocalStorage<Sintegra[]>('crm-sintegra', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResponsavel, setSearchResponsavel] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sintegra | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    dataPrazo: '',
    acesso: '',
    status: 'Pendente' as Sintegra['status'],
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      clienteId: '',
      dataPrazo: '',
      acesso: '',
      status: 'Pendente',
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

    let dataPrazo = formData.dataPrazo;
    
    // Regra de negócio: quando status mudar para Concluído, avançar para próximo período (mês seguinte)
    if (editingItem && formData.status === 'Concluído' && editingItem.status !== 'Concluído') {
      const currentDate = new Date(formData.dataPrazo);
      currentDate.setMonth(currentDate.getMonth() + 1);
      dataPrazo = currentDate.toISOString().split('T')[0];
    }
    
    if (editingItem) {
      setSintegras(sintegras.map(s => 
        s.id === editingItem.id 
          ? {
              ...formData,
              id: s.id,
              clienteNome: cliente.nome,
              dataPrazo,
              createdAt: s.createdAt,
              updatedAt: new Date().toISOString(),
            }
          : s
      ));
      toast({ title: "Sintegra atualizado com sucesso!" });
    } else {
      const newItem: Sintegra = {
        ...formData,
        id: crypto.randomUUID(),
        clienteNome: cliente.nome,
        dataPrazo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSintegras([...sintegras, newItem]);
      toast({ title: "Sintegra adicionado com sucesso!" });
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Sintegra) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataPrazo: item.dataPrazo,
      acesso: item.acesso,
      status: item.status,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este Sintegra?')) {
      setSintegras(sintegras.filter(s => s.id !== id));
      toast({ title: "Sintegra excluído com sucesso!" });
    }
  };

  const filteredItems = sintegras.filter(item => {
    const cliente = clientes.find(c => c.id === item.clienteId);
    const matchesSearch = item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResponsavel = searchResponsavel === '' || 
                                (cliente && cliente.responsavel.toLowerCase().includes(searchResponsavel.toLowerCase()));
    return matchesSearch && matchesResponsavel;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-success/10 text-success';
      case 'Em Andamento': return 'bg-warning/10 text-warning';
      case 'Pendente': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sintegra</h1>
            <p className="text-muted-foreground">Acompanhe obrigações fiscais SINTEGRA</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Sintegra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Sintegra</DialogTitle>
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
                    <Label htmlFor="dataPrazo">Data do Prazo</Label>
                    <Input
                      id="dataPrazo"
                      type="date"
                      value={formData.dataPrazo}
                      onChange={(e) => setFormData({ ...formData, dataPrazo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: Sintegra['status']) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acesso">Acesso (TeamViewer, AnyDesk, etc.)</Label>
                  <Input
                    id="acesso"
                    value={formData.acesso}
                    onChange={(e) => setFormData({ ...formData, acesso: e.target.value })}
                    placeholder="Ex: TeamViewer ID: 123456789"
                  />
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

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Cliente</th>
                <th className="p-3 text-left text-sm font-medium">Data Prazo</th>
                <th className="p-3 text-left text-sm font-medium">Acesso</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{new Date(item.dataPrazo).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">{item.acesso || '-'}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
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
              Nenhum Sintegra encontrado
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
