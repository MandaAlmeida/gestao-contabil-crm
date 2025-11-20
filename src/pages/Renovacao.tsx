import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useRenovacao } from "@/hooks/useRenovacao";
import { Cliente, Renovacao } from "@/types/crm";
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

export default function RenovacaoPage() {
  const { clientes } = useClientes();
  const { renovacoes, createRenovacao, updateRenovacao, deleteRenovacao } = useRenovacao();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResponsavel, setSearchResponsavel] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<Renovacao['status'] | 'todos'>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Renovacao | null>(null);
  const { toast } = useToast();

  const responsaveisDisponiveis = useMemo(
    () => Array.from(new Set(clientes.map((cliente) => cliente.responsavel))).sort(),
    [clientes]
  );

  const [formData, setFormData] = useState({
    clienteId: '',
    dataRenovacao: '',
    valorRenovacao: '',
    status: 'Em Negociação' as Renovacao['status'],
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      clienteId: '',
      dataRenovacao: '',
      valorRenovacao: '',
      status: 'Em Negociação',
      observacoes: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cliente = clientes.find(c => c.id === formData.clienteId);
    if (!cliente) {
      toast({ title: "Cliente não encontrado!", variant: "destructive" });
      return;
    }

    let dataRenovacao = formData.dataRenovacao;
    
    // Regra de negócio: quando status mudar para Renovado, adicionar 1 ano à data
    if (editingItem && formData.status === 'Renovado' && editingItem.status !== 'Renovado') {
      const currentDate = new Date(formData.dataRenovacao);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      dataRenovacao = currentDate.toISOString().split('T')[0];
    }
    
    const valorRenovacaoNumber = parseFloat(formData.valorRenovacao);
    if (Number.isNaN(valorRenovacaoNumber)) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    
    try {
      if (editingItem) {
        await updateRenovacao(editingItem.id, {
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          valorRenovacao: valorRenovacaoNumber,
          dataRenovacao,
          status: formData.status,
          observacoes: formData.observacoes,
        });
        toast({ title: "Renovação atualizada com sucesso!" });
      } else {
        await createRenovacao({
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          valorRenovacao: valorRenovacaoNumber,
          dataRenovacao,
          status: formData.status,
          observacoes: formData.observacoes,
        });
        toast({ title: "Renovação adicionada com sucesso!" });
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar renovação", variant: "destructive" });
    }
  };

  const handleEdit = (item: Renovacao) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataRenovacao: item.dataRenovacao,
      valorRenovacao: item.valorRenovacao.toString(),
      status: item.status,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta renovação?')) {
      try {
        await deleteRenovacao(id);
        toast({ title: "Renovação excluída com sucesso!" });
      } catch (error) {
        toast({ title: "Erro ao excluir renovação", variant: "destructive" });
      }
    }
  };

  const filteredItems = renovacoes.filter(item => {
    const cliente = clientes.find(c => c.id === item.clienteId);
    const matchesSearch = item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel = searchResponsavel === 'todos' || 
                                (cliente && cliente.responsavel === searchResponsavel);
    
    // Filtro por data
    const itemData = new Date(item.dataRenovacao);
    const matchesDataInicio = !filtroDataInicio || itemData >= new Date(filtroDataInicio);
    const matchesDataFim = !filtroDataFim || itemData <= new Date(filtroDataFim);
    
    // Filtro por status
    const matchesStatus = filtroStatus === 'todos' || item.status === filtroStatus;
    
    return matchesSearch && matchesResponsavel && matchesDataInicio && matchesDataFim && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Renovado': return 'bg-success/10 text-success';
      case 'Em Negociação': return 'bg-warning/10 text-warning';
      case 'Cancelado': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Renovação</h1>
            <p className="text-muted-foreground">Acompanhe renovações de serviços</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Renovação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar' : 'Nova'} Renovação</DialogTitle>
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
                    <Label htmlFor="dataRenovacao">Data de Renovação</Label>
                    <Input
                      id="dataRenovacao"
                      type="date"
                      value={formData.dataRenovacao}
                      onChange={(e) => setFormData({ ...formData, dataRenovacao: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorRenovacao">Valor da Renovação</Label>
                    <Input
                      id="valorRenovacao"
                      type="number"
                      step="0.01"
                      value={formData.valorRenovacao}
                      onChange={(e) => setFormData({ ...formData, valorRenovacao: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: Renovacao['status']) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                      <SelectItem value="Renovado">Renovado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
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

        <div className="mb-4 space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="filtro-busca"
                className="text-xs text-muted-foreground"
              >
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="filtro-busca"
                  placeholder="Buscar por cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-64 space-y-1">
              <Label htmlFor="filtro-responsavel" className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={searchResponsavel} onValueChange={setSearchResponsavel}>
                <SelectTrigger id="filtro-responsavel">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  {responsaveisDisponiveis.map((responsavel) => (
                    <SelectItem key={responsavel} value={responsavel}>
                      {responsavel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-1">
              <Label htmlFor="filtro-data-inicio" className="text-xs text-muted-foreground">Data Início</Label>
              <Input
                id="filtro-data-inicio"
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-data-fim" className="text-xs text-muted-foreground">Data Fim</Label>
              <Input
                id="filtro-data-fim"
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-status" className="text-xs text-muted-foreground">Status</Label>
              <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as Renovacao['status'] | 'todos')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                  <SelectItem value="Renovado">Renovado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filtroDataInicio || filtroDataFim || filtroStatus !== 'todos' || searchResponsavel !== 'todos') && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroDataInicio('');
                    setFiltroDataFim('');
                    setFiltroStatus('todos');
                    setSearchResponsavel('todos');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Cliente</th>
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">Data Renovação</th>
                <th className="p-3 text-left text-sm font-medium">Valor</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{new Date(item.dataRenovacao).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">R$ {item.valorRenovacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
              Nenhuma renovação encontrada
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
