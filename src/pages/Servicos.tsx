import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { Servico } from "@/types/crm";
import {
  Plus,
  Edit,
  Trash2,
  Receipt, // <-- Ícone novo sugerido
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useServicos } from "@/hooks/useServicos";
import { formatarDataBR } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useUsuarios } from "@/hooks/useUsuarios";
import { FiltersBar } from "@/components/FiltersBar";
import { SelectClienteComBusca } from "@/components/SelectClienteComBusca";
import { PaginationControls } from "@/components/PaginationControls";

// Função auxiliar para formatar a exibição do período na tabela
const formatarPeriodoDatas = (datasStr?: string) => {
  if (!datasStr) return "Feita";
  const partes = datasStr.split("|");
  if (partes.length === 1 || !partes[1]) {
    return formatarDataBR(partes[0]);
  }
  return `${formatarDataBR(partes[0])} até ${formatarDataBR(partes[1])}`;
};

export default function ServicosPage() {
  const { clientes } = useClientes();
  const { financeiros } = useFinanceiro();
  const {
    servicos: servicosRaw,
    createServico,
    updateServico,
    deleteServico,
  } = useServicos();
  const { usuarios } = useUsuarios();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataVencimento" | "valorMensalidade";
    direcao: "asc" | "desc";
  }>({ campo: "dataVencimento", direcao: "asc" });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Servico | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { toast } = useToast();

  const servicosNormalizados = servicosRaw;

  // <-- NOVOS ESTADOS PARA O MODAL RÁPIDO DE NOTAS FISCAIS -->
  const [isNfeModalOpen, setIsNfeModalOpen] = useState(false);
  const [selectedNfeItem, setSelectedNfeItem] = useState<Servico | null>(null);
  const [nfeFormData, setNfeFormData] = useState({
    nfe: false, nfeInicio: "", nfeFim: "",
    nfce: false, nfceInicio: "", nfceFim: "",
  });

  const clientesComServico = useMemo(
    () => new Set(servicosNormalizados.map((s) => s.clienteId)),
    [servicosNormalizados]
  );

  const responsaveisDisponiveis = useMemo(
    () =>
      usuarios
        .filter((usuario) => usuario.type !== "dev")
        .map((usuario) => usuario.nome)
        .sort(),
    [usuarios]
  );

  const clientesDisponiveisFormulario = useMemo(() => {
    let clientesFiltrados = clientes;
    if (!editingItem) {
      clientesFiltrados = clientes.filter((c) => !clientesComServico.has(c.id));
    } else {
      clientesFiltrados = clientes.filter(
        (c) => !clientesComServico.has(c.id) || c.id === editingItem.clienteId
      );
    }
    return [...clientesFiltrados].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
  }, [clientes, clientesComServico, editingItem]);

  const [formData, setFormData] = useState({
    clienteId: "",
    responsavel: "",
    descricao: "",
    dataVencimento: "",
    valorMensalidade: "",
    observacoes: "",
    nfe: false, nfeInicio: "", nfeFim: "",
    nfce: false, nfceInicio: "", nfceFim: "",
  });

  const resetForm = () => {
    setFormData({
      clienteId: "", responsavel: "", descricao: "", dataVencimento: "",
      valorMensalidade: "", observacoes: "",
      nfe: false, nfeInicio: "", nfeFim: "",
      nfce: false, nfceInicio: "", nfceFim: "",
    });
    setEditingItem(null);
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cliente = clientes.find((c) => c.id === formData.clienteId);
    if (!cliente) return toast({ title: "Cliente não encontrado!", variant: "destructive" });
    const responsavel = formData.responsavel || cliente.responsavel;
    if (!responsavel) return toast({ title: "Selecione um responsável!", variant: "destructive" });
    
    const valorMensalidadeNumber = parseFloat(formData.valorMensalidade);
    if (Number.isNaN(valorMensalidadeNumber)) return toast({ title: "Valor inválido.", variant: "destructive" });

    // <-- INÍCIO DA NOVA VALIDAÇÃO NF-e / NFC-e -->
    if (formData.nfe) {
      if (!formData.nfeInicio) {
        return toast({ title: "A data inicial da NF-e é obrigatória.", variant: "destructive" });
      }
      if (formData.nfeFim && formData.nfeFim < formData.nfeInicio) {
        return toast({ title: "A data final da NF-e não pode ser anterior à inicial.", variant: "destructive" });
      }
    }

    if (formData.nfce) {
      if (!formData.nfceInicio) {
        return toast({ title: "A data inicial da NFC-e é obrigatória.", variant: "destructive" });
      }
      if (formData.nfceFim && formData.nfceFim < formData.nfceInicio) {
        return toast({ title: "A data final da NFC-e não pode ser anterior à inicial.", variant: "destructive" });
      }
    }
    // <-- FIM DA NOVA VALIDAÇÃO -->

    const nfeDatasFormatada = [formData.nfeInicio, formData.nfeFim].filter(Boolean).join("|");
    const nfceDatasFormatada = [formData.nfceInicio, formData.nfceFim].filter(Boolean).join("|");

    try {
      if (editingItem) {
        await updateServico(editingItem.id, {
          clienteId: formData.clienteId, clienteNome: cliente.nome, clienteCNPJ: cliente.cnpj,
          responsavel, descricao: formData.descricao, dataVencimento: formData.dataVencimento,
          valorMensalidade: valorMensalidadeNumber, observacoes: formData.observacoes,
          nfe: formData.nfe, nfeDatas: nfeDatasFormatada,
          nfce: formData.nfce, nfceDatas: nfceDatasFormatada,
        });
        toast({ title: "Registro atualizado com sucesso!" });
      } else {
        await createServico({
          clienteId: formData.clienteId, clienteNome: cliente.nome, clienteCNPJ: cliente.cnpj,
          responsavel, descricao: formData.descricao, dataVencimento: formData.dataVencimento,
          valorMensalidade: valorMensalidadeNumber, status: "Pendente", meioPagamento: "Pix",
          observacoes: formData.observacoes, ativo: true,
          nfe: formData.nfe, nfeDatas: nfeDatasFormatada,
          nfce: formData.nfce, nfceDatas: nfceDatasFormatada,
        });
        toast({ title: "Registro adicionado com sucesso!" });
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.log(error)
      toast({ title: "Erro ao salvar registro", variant: "destructive" });
    }
  };

  const handleEdit = (item: Servico) => {
    setEditingItem(item);
    const nfeParts = (item.nfeDatas || "").split("|");
    const nfceParts = (item.nfceDatas || "").split("|");
    setFormData({
      clienteId: item.clienteId, responsavel: item.responsavel, descricao: item.descricao || "",
      dataVencimento: item.dataVencimento, valorMensalidade: item.valorMensalidade.toString(),
      observacoes: item.observacoes || "",
      nfe: item.nfe || false, nfeInicio: nfeParts[0] || "", nfeFim: nfeParts[1] || "",
      nfce: item.nfce || false, nfceInicio: nfceParts[0] || "", nfceFim: nfceParts[1] || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirmation("Excluir Serviço", "Tem certeza que deseja excluir?", async () => {
      try {
        await deleteServico(id);
        toast({ title: "Registro excluído com sucesso!" });
      } catch (error) {
        toast({ title: "Erro ao excluir registro", variant: "destructive" });
      }
    }, { confirmText: "Excluir", cancelText: "Cancelar", variant: "destructive" });
  };

  // <-- NOVO: FUNÇÕES DO MODAL RÁPIDO -->
  const handleOpenNfeModal = (item: Servico) => {
    setSelectedNfeItem(item);
    const nfeParts = (item.nfeDatas || "").split("|");
    const nfceParts = (item.nfceDatas || "").split("|");
    setNfeFormData({
      nfe: item.nfe || false, nfeInicio: nfeParts[0] || "", nfeFim: nfeParts[1] || "",
      nfce: item.nfce || false, nfceInicio: nfceParts[0] || "", nfceFim: nfceParts[1] || "",
    });
    setIsNfeModalOpen(true);
  };

  const handleSaveNfeModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNfeItem) return;

    const nfeDatasFormatada = [nfeFormData.nfeInicio, nfeFormData.nfeFim].filter(Boolean).join("|");
    const nfceDatasFormatada = [nfeFormData.nfceInicio, nfeFormData.nfceFim].filter(Boolean).join("|");

    try {
      await updateServico(selectedNfeItem.id, {
        nfe: nfeFormData.nfe,
        nfeDatas: nfeDatasFormatada,
        nfce: nfeFormData.nfce,
        nfceDatas: nfceDatasFormatada,
      });
      toast({ title: "Notas fiscais atualizadas!" });
      setIsNfeModalOpen(false);
    } catch (error) {
      console.log(error)
      toast({ title: "Erro ao salvar notas fiscais", variant: "destructive" });
    }
  };

  const handleDeleteNfe = async () => {
    if (!selectedNfeItem) return;

    showConfirmation(
      "Excluir Notas Fiscais",
      "Tem certeza que deseja remover as informações de NF-e e NFC-e deste serviço?",
      async () => {
        try {
          await updateServico(selectedNfeItem.id, {
            nfe: false,
            nfeDatas: "",
            nfce: false,
            nfceDatas: "",
          });
          toast({ title: "Notas fiscais excluídas com sucesso!" });
          setIsNfeModalOpen(false);
        } catch (error) {
          toast({ title: "Erro ao excluir notas", variant: "destructive" });
        }
      },
      { confirmText: "Excluir Notas", cancelText: "Cancelar", variant: "destructive" }
    );
  };

  const filteredItems = useMemo(() => {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    };

    return servicosNormalizados.filter((item) => {
      const nome = item.clienteNome?.toLowerCase() || "";
      const cnpj = item.clienteCNPJ || "";
      const termo = searchTerm.toLowerCase();

      const matchesSearch = nome.includes(termo) || cnpj.includes(searchTerm);
      const matchesResponsavel = searchResponsavel === "todos" || item.responsavel === searchResponsavel;

      const itemData = parseDate(item.dataVencimento);
      const dataInicio = parseDate(filtroDataInicio);
      const dataFim = parseDate(filtroDataFim);

      const matchesDataInicio = !dataInicio || (itemData && itemData >= dataInicio);
      const matchesDataFim = !dataFim || (itemData && itemData <= dataFim);

      return matchesSearch && matchesResponsavel && matchesDataInicio && matchesDataFim;
    });
  }, [servicosNormalizados, searchTerm, searchResponsavel, filtroDataInicio, filtroDataFim]);

  const itemsOrdenados = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let comparacao = 0;
      switch (ordenacao.campo) {
        case "clienteNome": comparacao = a.clienteNome.localeCompare(b.clienteNome, "pt-BR", { sensitivity: "base" }); break;
        case "dataVencimento": comparacao = new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime(); break;
        case "valorMensalidade": comparacao = a.valorMensalidade - b.valorMensalidade; break;
      }
      return ordenacao.direcao === "asc" ? comparacao : -comparacao;
    });
    return items;
  }, [filteredItems, ordenacao]);

  const {
    currentPage, totalPages, paginatedItems, nextPage, previousPage, goToPage, startIndex, endIndex, totalItems, itemsPerPage, setItemsPerPage,
  } = usePagination(itemsOrdenados, 10);

  const totaisMensalidades = filteredItems.reduce(
    (acc, item) => {
      const servicoPago = financeiros.some(f => f.servicoId === item.id && f.status === "Pago");
      if (servicoPago) acc.recebidas += item.valorMensalidade;
      else acc.aReceber += item.valorMensalidade;
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Serviços</h1>
            <p className="text-muted-foreground">
              Gerencie pagamentos e mensalidades de serviços
            </p>
          </div>
          <div className="flex gap-2 items-end">
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onCloseAutoFocus={e => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Editar" : "Novo"} Registro de Serviço</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="clienteId">Cliente</Label>
                    <SelectClienteComBusca
                      clientes={clientesDisponiveisFormulario}
                      value={formData.clienteId}
                      onValueChange={(value) => {
                        const clienteSelecionado = clientes.find((c) => c.id === value);
                        setFormData({ ...formData, clienteId: value, responsavel: clienteSelecionado?.responsavel || "" });
                      }}
                      placeholder="Selecione um cliente"
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Select value={formData.responsavel} onValueChange={(value) => setFormData({ ...formData, responsavel: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                    <SelectContent>
                      {responsaveisDisponiveis.map((responsavel, index) => (
                        <SelectItem key={`responsavel-${index}-${responsavel}`} value={responsavel}>{responsavel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição do Serviço</Label>
                  <Input id="descricao" type="text" placeholder="Ex: Manutenção de site..." value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataVencimento">Data de Vencimento</Label>
                    <Input id="dataVencimento" type="date" value={formData.dataVencimento} onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorMensalidade">Valor da Mensalidade</Label>
                    <Input id="valorMensalidade" type="number" step="0.01" value={formData.valorMensalidade} onChange={(e) => setFormData({ ...formData, valorMensalidade: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                  <Label className="text-base font-semibold">Emissão de Notas Fiscais</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="nfe" checked={formData.nfe} onCheckedChange={(c) => setFormData({...formData, nfe: !!c})} />
                      <Label htmlFor="nfe" className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">NF-e Emitida</Label>
                    </div>
                    {formData.nfe && (
                      <div className="flex items-center gap-2 pl-6">
                        <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Inicial</Label><Input type="date" value={formData.nfeInicio} onChange={(e) => setFormData({...formData, nfeInicio: e.target.value})} /></div>
                        <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Final (Opcional)</Label><Input type="date" value={formData.nfeFim} onChange={(e) => setFormData({...formData, nfeFim: e.target.value})} /></div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="nfce" checked={formData.nfce} onCheckedChange={(c) => setFormData({...formData, nfce: !!c})} />
                      <Label htmlFor="nfce" className="cursor-pointer font-medium text-purple-600 dark:text-purple-400">NFC-e Emitida</Label>
                    </div>
                    {formData.nfce && (
                      <div className="flex items-center gap-2 pl-6">
                        <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Inicial</Label><Input type="date" value={formData.nfceInicio} onChange={(e) => setFormData({...formData, nfceInicio: e.target.value})} /></div>
                        <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Final (Opcional)</Label><Input type="date" value={formData.nfceFim} onChange={(e) => setFormData({...formData, nfceFim: e.target.value})} /></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <FiltersBar
          searchTerm={searchTerm} onSearchTermChange={setSearchTerm} searchPlaceholder="Buscar por cliente..." responsavelOptions={responsaveisDisponiveis}
          responsavelValue={searchResponsavel} onResponsavelChange={setSearchResponsavel} dateStartLabel="Data Vencimento Início" dateEndLabel="Data Vencimento Fim"
          dateStartValue={filtroDataInicio} dateEndValue={filtroDataFim} onDateStartChange={setFiltroDataInicio} onDateEndChange={setFiltroDataFim} showStatus={false}
          orderValue={`${ordenacao.campo}-${ordenacao.direcao}`}
          orderOptions={[
            { value: "clienteNome-asc", label: "Cliente (A-Z)" }, { value: "clienteNome-desc", label: "Cliente (Z-A)" },
            { value: "dataVencimento-asc", label: "Vencimento (Mais recente)" }, { value: "dataVencimento-desc", label: "Vencimento (Mais antigo)" },
            { value: "valorMensalidade-desc", label: "Valor (Maior)" }, { value: "valorMensalidade-asc", label: "Valor (Menor)" },
          ]}
          onOrderChange={(value) => {
            const [campo, direcao] = value.split("-") as ["clienteNome" | "dataVencimento" | "valorMensalidade", "asc" | "desc"];
            setOrdenacao({ campo, direcao });
          }}
          totalItems={totalItems} itemsPerPage={itemsPerPage} onItemsPerPageChange={(value) => setItemsPerPage(Number(value))}
          showClear={!!(filtroDataInicio || filtroDataFim || searchResponsavel !== "todos")}
          onClear={() => { setFiltroDataInicio(""); setFiltroDataFim(""); setSearchResponsavel("todos"); }}
        />

        <div className="mb-4 rounded-lg bg-primary p-4 text-primary-foreground">
          <p className="text-lg font-semibold">
            Recebidas: R$ {totaisMensalidades.recebidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm">
            A receber: R$ {totaisMensalidades.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Cliente</th>
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">
                  Vencimento
                </th>
                <th className="p-3 text-left text-sm font-medium">Valor</th>
                {/* <-- NOVO: Duas colunas separadas --> */}
                <th className="p-3 text-left text-sm font-medium">NF-e</th>
                <th className="p-3 text-left text-sm font-medium">NFC-e</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{formatarDataBR(item.dataVencimento)}</td>
                  <td className="p-3">R$ {item.valorMensalidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>

                  {/* <-- NOVO: Coluna NF-e clicável --> */}
                  <td className="p-3">
                    <div 
                      onClick={() => handleOpenNfeModal(item)}
                      className="cursor-pointer hover:opacity-75 transition-opacity"
                    >
                      {item.nfe ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs whitespace-nowrap">
                          {formatarPeriodoDatas(item.nfeDatas)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs border border-dashed border-muted-foreground/50 rounded px-2 py-1 whitespace-nowrap flex items-center w-fit gap-1">
                          <Plus className="h-3 w-3" /> Adicionar
                        </span>
                      )}
                    </div>
                  </td>

                  {/* <-- NOVO: Coluna NFC-e clicável --> */}
                  <td className="p-3">
                    <div 
                      onClick={() => handleOpenNfeModal(item)}
                      className="cursor-pointer hover:opacity-75 transition-opacity"
                    >
                      {item.nfce ? (
                        <span className="text-purple-600 dark:text-purple-400 font-medium bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-xs whitespace-nowrap">
                          {formatarPeriodoDatas(item.nfceDatas)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs border border-dashed border-muted-foreground/50 rounded px-2 py-1 whitespace-nowrap flex items-center w-fit gap-1">
                          <Plus className="h-3 w-3" /> Adicionar
                        </span>
                      )}
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
            <div className="p-8 text-center text-muted-foreground">Nenhum registro encontrado</div>
          )}
          {totalPages > 1 && (
             <div className="border-t p-4">
                {/* Controles de paginação... */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onNext={nextPage}
                  onPrevious={previousPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  itemLabel="registros"
                />
             </div>
          )}
        </div>
        <NotificationPanel isOpen={notificationsOpen} onToggle={() => setNotificationsOpen(!notificationsOpen)} filterBy={["servico"]} />
      </div>

      {/* <-- NOVO: Modal Rápido de Notas Fiscais --> */}
      <Dialog open={isNfeModalOpen} onOpenChange={setIsNfeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Notas Fiscais
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedNfeItem?.clienteNome}
            </p>
          </DialogHeader>
          <form onSubmit={handleSaveNfeModal} className="space-y-4">
            <div className="space-y-4 p-4 border rounded-md bg-muted/10">
              
              {/* NF-e */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="modal-nfe" checked={nfeFormData.nfe} onCheckedChange={(c) => setNfeFormData({...nfeFormData, nfe: !!c})} />
                  <Label htmlFor="modal-nfe" className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">NF-e Emitida</Label>
                </div>
                {nfeFormData.nfe && (
                  <div className="flex items-center gap-2 pl-6">
                    <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Inicial</Label><Input type="date" value={nfeFormData.nfeInicio} onChange={(e) => setNfeFormData({...nfeFormData, nfeInicio: e.target.value})} /></div>
                    <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Final (Opcional)</Label><Input type="date" value={nfeFormData.nfeFim} onChange={(e) => setNfeFormData({...nfeFormData, nfeFim: e.target.value})} /></div>
                  </div>
                )}
              </div>

              {/* NFC-e */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center space-x-2">
                  <Checkbox id="modal-nfce" checked={nfeFormData.nfce} onCheckedChange={(c) => setNfeFormData({...nfeFormData, nfce: !!c})} />
                  <Label htmlFor="modal-nfce" className="cursor-pointer font-medium text-purple-600 dark:text-purple-400">NFC-e Emitida</Label>
                </div>
                {nfeFormData.nfce && (
                  <div className="flex items-center gap-2 pl-6">
                    <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Inicial</Label><Input type="date" value={nfeFormData.nfceInicio} onChange={(e) => setNfeFormData({...nfeFormData, nfceInicio: e.target.value})} /></div>
                    <div className="w-full space-y-1"><Label className="text-xs text-muted-foreground">Data Final (Opcional)</Label><Input type="date" value={nfeFormData.nfceFim} onChange={(e) => setNfeFormData({...nfeFormData, nfceFim: e.target.value})} /></div>
                  </div>
                )}
              </div>

            </div>
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteNfe}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Notas
              </Button>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsNfeModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Notas</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmationDialogComponent}
    </Layout>
  );
}