import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Cliente, Certificado } from "@/types/crm";
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

export default function Certificados() {
  const [clientes] = useLocalStorage<Cliente[]>('crm-clientes', []);
  const [certificados, setCertificados] = useLocalStorage<Certificado[]>('crm-certificados', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResponsavel, setSearchResponsavel] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Certificado | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: '',
    tipoCertificado: 'A1' as Certificado['tipoCertificado'],
    dataVencimento: '',
    status: 'Válido' as Certificado['status'],
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      clienteId: '',
      tipoCertificado: 'A1',
      dataVencimento: '',
      status: 'Válido',
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
    
    // Regra de negócio: quando status mudar para Válido, adicionar 1 ano à data
    if (editingItem && formData.status === 'Válido' && editingItem.status !== 'Válido') {
      const currentDate = new Date(formData.dataVencimento);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      dataVencimento = currentDate.toISOString().split('T')[0];
    }
    
    if (editingItem) {
      setCertificados(certificados.map(c => 
        c.id === editingItem.id 
          ? {
              ...formData,
              id: c.id,
              clienteNome: cliente.nome,
              clienteCNPJ: cliente.cnpj,
              dataVencimento,
              createdAt: c.createdAt,
              updatedAt: new Date().toISOString(),
            }
          : c
      ));
      toast({ title: "Certificado atualizado com sucesso!" });
    } else {
      const newItem: Certificado = {
        ...formData,
        id: crypto.randomUUID(),
        clienteNome: cliente.nome,
        clienteCNPJ: cliente.cnpj,
        dataVencimento,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCertificados([...certificados, newItem]);
      toast({ title: "Certificado adicionado com sucesso!" });
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (item: Certificado) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      tipoCertificado: item.tipoCertificado,
      dataVencimento: item.dataVencimento,
      status: item.status,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este certificado?')) {
      setCertificados(certificados.filter(c => c.id !== id));
      toast({ title: "Certificado excluído com sucesso!" });
    }
  };

  const filteredItems = certificados.filter(item => {
    const cliente = clientes.find(c => c.id === item.clienteId);
    const matchesSearch = item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel = searchResponsavel === '' || 
                                (cliente && cliente.responsavel.toLowerCase().includes(searchResponsavel.toLowerCase()));
    return matchesSearch && matchesResponsavel;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Válido': return 'bg-success/10 text-success';
      case 'A Vencer': return 'bg-warning/10 text-warning';
      case 'Vencido': return 'bg-destructive/10 text-destructive';
      default: return '';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Certificados</h1>
            <p className="text-muted-foreground">Gerencie certificados digitais</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Certificado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Certificado</DialogTitle>
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
                    <Label htmlFor="tipoCertificado">Tipo de Certificado</Label>
                    <Select value={formData.tipoCertificado} onValueChange={(value: Certificado['tipoCertificado']) => setFormData({ ...formData, tipoCertificado: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: Certificado['status']) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Válido">Válido</SelectItem>
                      <SelectItem value="A Vencer">A Vencer</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
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
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">Tipo</th>
                <th className="p-3 text-left text-sm font-medium">Vencimento</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{item.tipoCertificado}</td>
                  <td className="p-3">{new Date(item.dataVencimento).toLocaleDateString('pt-BR')}</td>
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
              Nenhum certificado encontrado
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
