import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { Cliente, Financeiro } from "@/types/crm";
import { Plus, Search, Edit, Trash2, CheckCircle, Clock3, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { calcularStatusFinanceiro, normalizarFinanceiros } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

export default function FinanceiroPage() {
  const { clientes } = useClientes();
  const { financeiros: financeirosRaw, createFinanceiro, updateFinanceiro, deleteFinanceiro } = useFinanceiro();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResponsavel, setSearchResponsavel] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<Financeiro['status'] | 'todos'>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Financeiro | null>(null);
  const { toast } = useToast();

  const responsaveisDisponiveis = useMemo(
    () => Array.from(new Set(clientes.map((cliente) => cliente.responsavel))).sort(),
    [clientes]
  );

  const financeirosNormalizados = useMemo(() => normalizarFinanceiros(financeirosRaw), [financeirosRaw]);

  const [formData, setFormData] = useState({
    clienteId: '',
    dataVencimento: '',
    valorMensalidade: '',
    dataPagamento: '',
    meioPagamento: 'Pix' as Financeiro['meioPagamento'],
    observacoes: '',
  });

  const resetForm = () => {
    setFormData({
      clienteId: '',
      dataVencimento: '',
      valorMensalidade: '',
      dataPagamento: '',
      meioPagamento: 'Pix',
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

    let dataVencimento = formData.dataVencimento;
    
    if (editingItem && editingItem.status === 'Recebido' && !formData.dataPagamento) {
      const currentDate = new Date(formData.dataVencimento);
      currentDate.setMonth(currentDate.getMonth() + 1);
      dataVencimento = currentDate.toISOString().split('T')[0];
    }
    
    const valorMensalidadeNumber = parseFloat(formData.valorMensalidade);
    if (Number.isNaN(valorMensalidadeNumber)) {
      toast({ title: "Informe um valor de mensalidade válido.", variant: "destructive" });
      return;
    }
    const dataPagamento = formData.dataPagamento ? formData.dataPagamento : null;
    const status = calcularStatusFinanceiro({
      status: editingItem?.status ?? 'A Vencer',
      dataPagamento,
      dataVencimento,
    });

    try {
      if (editingItem) {
        await updateFinanceiro(editingItem.id, {
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          dataVencimento,
          valorMensalidade: valorMensalidadeNumber,
          dataPagamento,
          status,
          meioPagamento: formData.meioPagamento,
          observacoes: formData.observacoes,
        });
        toast({ title: "Registro atualizado com sucesso!" });
      } else {
        await createFinanceiro({
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          dataVencimento,
          valorMensalidade: valorMensalidadeNumber,
          dataPagamento,
          status,
          meioPagamento: formData.meioPagamento,
          observacoes: formData.observacoes,
        });
        toast({ title: "Registro adicionado com sucesso!" });
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ 
        title: "Erro ao salvar registro", 
        variant: "destructive" 
      });
    }
  };

  const adicionarMes = (data: string) => {
    const baseDate = data ? new Date(data) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      return new Date();
    }
    const novaData = new Date(baseDate);
    novaData.setMonth(novaData.getMonth() + 1);
    return novaData;
  };

  const removerMes = (data: string) => {
    const baseDate = data ? new Date(data) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      return new Date();
    }
    const novaData = new Date(baseDate);
    novaData.setMonth(novaData.getMonth() - 1);
    return novaData;
  };

  const formatarISO = (date: Date) => date.toISOString().split('T')[0];

  const handleTogglePagamento = async (item: Financeiro) => {
    if (item.status === 'Recebido') {
      const vencimentoAnterior = formatarISO(removerMes(item.dataVencimento));
      const statusAjustado = calcularStatusFinanceiro({
        status: item.status,
        dataPagamento: null,
        dataVencimento: vencimentoAnterior,
      });

      try {
        await updateFinanceiro(item.id, {
          dataPagamento: null,
          dataVencimento: vencimentoAnterior,
          status: statusAjustado,
        });
        toast({
          title: "Pagamento removido.",
          description:
            statusAjustado === 'A Vencer'
              ? `${item.clienteNome} voltou a ficar pendente neste mês.`
              : `${item.clienteNome} foi marcado como vencido.`,
        });
      } catch (error) {
        toast({ title: "Erro ao remover pagamento", variant: "destructive" });
      }
      return;
    }

    const hoje = new Date();
    const novaDataPagamento = formatarISO(hoje);
    const novoVencimento = formatarISO(adicionarMes(item.dataVencimento));

    try {
      await updateFinanceiro(item.id, {
        dataPagamento: novaDataPagamento,
        dataVencimento: novoVencimento,
        status: 'Recebido',
      });
      toast({ title: "Pagamento registrado!", description: `${item.clienteNome} foi marcado como pago.` });
    } catch (error) {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    }
  };

  const handleEdit = (item: Financeiro) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataVencimento: item.dataVencimento,
      valorMensalidade: item.valorMensalidade.toString(),
      dataPagamento: item.dataPagamento ?? '',
      meioPagamento: item.meioPagamento,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      try {
        await deleteFinanceiro(id);
        toast({ title: "Registro excluído com sucesso!" });
      } catch (error) {
        toast({ title: "Erro ao excluir registro", variant: "destructive" });
      }
    }
  };

  const filteredItems = financeirosNormalizados.filter(item => {
    const cliente = clientes.find(c => c.id === item.clienteId);
    const matchesSearch = item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel = searchResponsavel === 'todos' || 
                                (cliente && cliente.responsavel === searchResponsavel);
    
    // Filtro por data (data de vencimento)
    const itemData = new Date(item.dataVencimento);
    const matchesDataInicio = !filtroDataInicio || itemData >= new Date(filtroDataInicio);
    const matchesDataFim = !filtroDataFim || itemData <= new Date(filtroDataFim);
    
    // Filtro por status
    const matchesStatus = filtroStatus === 'todos' || item.status === filtroStatus;
    
    return matchesSearch && matchesResponsavel && matchesDataInicio && matchesDataFim && matchesStatus;
  });

  const totaisMensalidades = filteredItems.reduce(
    (acc, item) => {
      if (item.status === 'Recebido') {
        acc.recebidas += item.valorMensalidade;
      } else {
        acc.aReceber += item.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  const STATUS_META: Record<Financeiro['status'], { label: string; className: string; icon: LucideIcon }> = {
    Recebido: {
      label: 'Pago',
      className: 'bg-success/10 text-success hover:bg-success/20',
      icon: CheckCircle,
    },
    'A Vencer': {
      label: 'Pendente',
      className: 'bg-warning/10 text-warning hover:bg-warning/20',
      icon: Clock3,
    },
    Vencido: {
      label: 'Vencido',
      className: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
      icon: AlertTriangle,
    },
  };

  const getToggleTitle = (item: Financeiro) => {
    if (item.status === 'Recebido') {
      return 'Remover pagamento e retornar ao ciclo atual';
    }
    if (item.status === 'Vencido') {
      return 'Registrar pagamento (vencido)';
    }
    return 'Registrar pagamento';
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
                    <Label htmlFor="dataPagamento">Data de Pagamento</Label>
                    <Input
                      id="dataPagamento"
                      type="date"
                      value={formData.dataPagamento}
                      onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                    />
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
              <Label htmlFor="filtro-data-inicio" className="text-xs text-muted-foreground">Data Vencimento Início</Label>
              <Input
                id="filtro-data-inicio"
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-data-fim" className="text-xs text-muted-foreground">Data Vencimento Fim</Label>
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
              <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as Financeiro['status'] | 'todos')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Recebido">Recebido</SelectItem>
                  <SelectItem value="A Vencer">A Vencer</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
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

        <div className="mb-4 rounded-lg bg-primary p-4 text-primary-foreground">
          <p className="text-lg font-semibold">
            Recebidas: R$ {totaisMensalidades.recebidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm">
            A receber: R$ {totaisMensalidades.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    {(() => {
                      const meta = STATUS_META[item.status];
                      const Icon = meta.icon;
                      return (
                        <button
                          type="button"
                          onClick={() => handleTogglePagamento(item)}
                          title={getToggleTitle(item)}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            "border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            meta.className,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {meta.label}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span>{item.meioPagamento}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.dataPagamento ? new Date(item.dataPagamento).toLocaleDateString('pt-BR') : 'Sem registro'}
                      </span>
                    </div>
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
              Nenhum registro encontrado
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
