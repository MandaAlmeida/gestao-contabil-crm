import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { Cliente, Servico } from "@/types/crm";
import {
  Plus,
  Search,
  Edit,
  Trash2,
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
import { useToast } from "@/hooks/use-toast";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import {
  calcularStatusServico,
  normalizarServicos,
} from "@/lib/servicos";
import {
  useServicos,
  adicionarMes,
  removerMes,
} from "@/hooks/useServicos";
import { formatarDataBR } from "@/lib/utils";
import { StatusButton, type StatusMeta } from "@/components/StatusButton";
import { PaymentConfirmationDialog } from "@/components/PaymentConfirmationDialog";
import { CheckCircle, Clock3, AlertTriangle } from "lucide-react";
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

export default function ServicosPage() {
  const { clientes } = useClientes();
  const {
    servicos: servicosRaw,
    createServico,
    updateServico,
    deleteServico,
    togglePagamento,
    confirmarPagamento,
  } = useServicos();
  const {
    usuarios
  } = useUsuarios();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Servico["status"] | "todos"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataVencimento" | "valorMensalidade" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "dataVencimento", direcao: "asc" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Servico | null>(null);
  const [isPagamentoDialogOpen, setIsPagamentoDialogOpen] = useState(false);
  const [itemParaPagamento, setItemParaPagamento] = useState<Servico | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { toast } = useToast();

  const servicosNormalizados = useMemo(
    () => normalizarServicos(servicosRaw),
    [servicosRaw]
  );

  // Lista de IDs de clientes que já têm registros de serviços
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

  // Clientes disponíveis para seleção no formulário
  // Ao criar novo registro, mostra apenas clientes não cadastrados
  // Ao editar, mostra todos os clientes (incluindo o que está sendo editado)
  const clientesDisponiveisFormulario = useMemo(() => {
    let clientesFiltrados = clientes;

    if (!editingItem) {
      // Novo registro: exibe apenas clientes que ainda não possuem serviço
      clientesFiltrados = clientes.filter(
        (c) => !clientesComServico.has(c.id)
      );
    } else {
      // Edição: inclui o cliente atual mesmo que já tenha serviço,
      // e esconde apenas os demais clientes que já possuem serviço
      clientesFiltrados = clientes.filter(
        (c) => !clientesComServico.has(c.id) || c.id === editingItem.clienteId
      );
    }

    // Ordenar alfabeticamente por nome
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
    dataPagamento: "",
    meioPagamento: "Pix" as Servico["meioPagamento"],
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      responsavel: "",
      descricao: "",
      dataVencimento: "",
      valorMensalidade: "",
      dataPagamento: "",
      meioPagamento: "Pix",
      observacoes: "",
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cliente = clientes.find((c) => c.id === formData.clienteId);
    if (!cliente) {
      toast({ title: "Cliente não encontrado!", variant: "destructive" });
      return;
    }

    // Garantir que o responsável seja preenchido
    const responsavel = formData.responsavel || cliente.responsavel;
    if (!responsavel) {
      toast({
        title: "Selecione um responsável!",
        variant: "destructive",
      });
      return;
    }

    let dataVencimento = formData.dataVencimento;

    const valorMensalidadeNumber = parseFloat(formData.valorMensalidade);
    if (Number.isNaN(valorMensalidadeNumber)) {
      toast({
        title: "Informe um valor de mensalidade válido.",
        variant: "destructive",
      });
      return;
    }
    const dataPagamento = formData.dataPagamento
      ? formData.dataPagamento
      : null;

    // Avanço automático da data de vencimento quando um pagamento é registrado
    // Apenas se o item não estava como "Recebido" antes (ou seja, está registrando um novo pagamento)
    if (dataPagamento && (!editingItem || editingItem.status !== "Recebido")) {
      dataVencimento = adicionarMes(dataVencimento);
    }
    const status = calcularStatusServico({
      status: editingItem?.status ?? "A Vencer",
      dataPagamento,
      dataVencimento,
    });

    try {
      if (editingItem) {
        await updateServico(editingItem.id, {
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          responsavel: responsavel,
          descricao: formData.descricao,
          dataVencimento,
          valorMensalidade: valorMensalidadeNumber,
          dataPagamento,
          status,
          meioPagamento: formData.meioPagamento,
          observacoes: formData.observacoes,
        });
        toast({ title: "Registro atualizado com sucesso!" });
      } else {
        await createServico({
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          responsavel: responsavel,
          descricao: formData.descricao,
          dataVencimento,
          valorMensalidade: valorMensalidadeNumber,
          dataPagamento,
          status,
          meioPagamento: formData.meioPagamento,
          observacoes: formData.observacoes,
          ativo: true,
        });
        toast({ title: "Registro adicionado com sucesso!" });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar registro",
        variant: "destructive",
      });
    }
  };

  const handleTogglePagamento = async (item: Servico) => {
    if (item.status === "Recebido") {
      // Quando remove o pagamento, sempre volta exatamente 1 mês da data atual
      // (já que o pagamento avançou 1 mês quando foi registrado)
      const vencimentoAnterior = removerMes(item.dataVencimento);

      // Calcula o status baseado na nova data de vencimento, sem considerar o status antigo
      const statusAjustado = calcularStatusServico({
        status: "A Vencer", // Força recalcular baseado apenas na data
        dataPagamento: null,
        dataVencimento: vencimentoAnterior,
      });

      try {
        await updateServico(item.id, {
          dataPagamento: null,
          meioPagamento: "Pix", // Reset para valor padrão
          dataVencimento: vencimentoAnterior,
          status: statusAjustado,
        });
        toast({
          title: "Pagamento removido.",
          description:
            statusAjustado === "A Vencer"
              ? `${item.clienteNome} voltou a ficar pendente.`
              : `${item.clienteNome} foi marcado como vencido.`,
        });
      } catch (error) {
        toast({ title: "Erro ao remover pagamento", variant: "destructive" });
      }
      return;
    }

    // Abre modal para confirmar pagamento
    setItemParaPagamento(item);
    setIsPagamentoDialogOpen(true);
  };

  const handleConfirmarPagamento = async (data: {
    dataPagamento: string;
    meioPagamento: "Pix" | "Boleto";
  }) => {
    if (!itemParaPagamento) return;

    try {
      await confirmarPagamento(
        itemParaPagamento,
        data,
        (title, description) => {
          toast({
            title,
            description,
          });
        },
        (title) => {
          toast({ title, variant: "destructive" });
        }
      );
      setIsPagamentoDialogOpen(false);
      setItemParaPagamento(null);
    } catch (error) {
      // Erro já foi tratado no hook
    }
  };

  const handleEdit = (item: Servico) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      responsavel: item.responsavel,
      descricao: item.descricao || "",
      dataVencimento: item.dataVencimento,
      valorMensalidade: item.valorMensalidade.toString(),
      dataPagamento: item.dataPagamento ?? "",
      meioPagamento: item.meioPagamento,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirmation(
      "Excluir Serviço",
      "Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteServico(id);
          toast({ title: "Registro excluído com sucesso!" });
        } catch (error) {
          toast({ title: "Erro ao excluir registro", variant: "destructive" });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      }
    );
  };

  const filteredItems = servicosNormalizados.filter((item) => {
    const matchesSearch =
      item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      item.responsavel === searchResponsavel;

    // Filtro por data (data de vencimento)
    const itemData = new Date(item.dataVencimento);
    const matchesDataInicio =
      !filtroDataInicio || itemData >= new Date(filtroDataInicio);
    const matchesDataFim =
      !filtroDataFim || itemData <= new Date(filtroDataFim);

    // Filtro por status
    const matchesStatus =
      filtroStatus === "todos" || item.status === filtroStatus;

    return (
      matchesSearch &&
      matchesResponsavel &&
      matchesDataInicio &&
      matchesDataFim &&
      matchesStatus
    );
  });

  // Aplicar ordenação
  const itemsOrdenados = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let comparacao = 0;
      
      switch (ordenacao.campo) {
        case "clienteNome":
          comparacao = a.clienteNome.localeCompare(b.clienteNome, "pt-BR", {
            sensitivity: "base",
          });
          break;
        case "dataVencimento":
          comparacao =
            new Date(a.dataVencimento).getTime() -
            new Date(b.dataVencimento).getTime();
          break;
        case "valorMensalidade":
          comparacao = a.valorMensalidade - b.valorMensalidade;
          break;
        case "status":
          comparacao = a.status.localeCompare(b.status, "pt-BR", {
            sensitivity: "base",
          });
          break;
      }
      
      return ordenacao.direcao === "asc" ? comparacao : -comparacao;
    });
    return items;
  }, [filteredItems, ordenacao]);

  const {
    currentPage,
    totalPages,
    paginatedItems,
    nextPage,
    previousPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    itemsPerPage,
    setItemsPerPage,
  } = usePagination(itemsOrdenados, 10);

  const totaisMensalidades = filteredItems.reduce(
    (acc, item) => {
      if (item.status === "Recebido") {
        acc.recebidas += item.valorMensalidade;
      } else {
        acc.aReceber += item.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  const STATUS_META: Record<Servico["status"], StatusMeta> = {
    Recebido: {
      label: "Pago",
      className: "bg-success/10 text-success hover:bg-success/20",
      icon: CheckCircle,
    },
    "A Vencer": {
      label: "Pendente",
      className: "bg-warning/10 text-warning hover:bg-warning/20",
      icon: Clock3,
    },
    Vencido: {
      label: "Vencido",
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      icon: AlertTriangle,
    },
  };

  const getToggleTitle = (item: Servico) => {
    if (item.status === "Recebido") {
      return "Remover pagamento e retornar ao ciclo atual";
    }
    if (item.status === "Vencido") {
      return "Registrar pagamento (vencido)";
    }
    return "Registrar pagamento";
  };

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
          <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy="servicos" />
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar" : "Novo"} Registro de Serviço
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) => {
                      const clienteSelecionado = clientes.find(
                        (c) => c.id === value
                      );
                      setFormData({
                        ...formData,
                        clienteId: value,
                        responsavel: clienteSelecionado?.responsavel || "",
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
                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Select
                    value={formData.responsavel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, responsavel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsaveisDisponiveis.map((responsavel, index) => (
                        <SelectItem
                          key={`responsavel-${index}-${responsavel}`}
                          value={responsavel}
                        >
                          {responsavel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição do Serviço</Label>
                  <Input
                    id="descricao"
                    type="text"
                    placeholder="Ex: Manutenção de site, Suporte técnico..."
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                  />
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
                    <Label htmlFor="dataPagamento">Data de Pagamento</Label>
                    <Input
                      id="dataPagamento"
                      type="date"
                      value={formData.dataPagamento}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataPagamento: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meioPagamento">Meio de Pagamento</Label>
                    <Select
                      value={formData.meioPagamento}
                      onValueChange={(value: Servico["meioPagamento"]) =>
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
          </div>
        </div>

        {/* Modal de Confirmação de Pagamento */}
        <PaymentConfirmationDialog
          open={isPagamentoDialogOpen}
          onOpenChange={(open) => {
            setIsPagamentoDialogOpen(open);
            if (!open) {
              setItemParaPagamento(null);
            }
          }}
          item={itemParaPagamento}
          valor={itemParaPagamento?.valorMensalidade || 0}
          clienteNome={itemParaPagamento?.clienteNome || ""}
          onConfirm={handleConfirmarPagamento}
          dataPagamentoInicial={itemParaPagamento?.dataPagamento || undefined}
          meioPagamentoInicial={itemParaPagamento?.meioPagamento || "Pix"}
        />

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
              <Label
                htmlFor="filtro-responsavel"
                className="text-xs text-muted-foreground"
              >
                Responsável
              </Label>
              <Select
                value={searchResponsavel}
                onValueChange={setSearchResponsavel}
              >
                <SelectTrigger id="filtro-responsavel">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  {responsaveisDisponiveis.map((responsavel, index) => (
                    <SelectItem
                      key={`responsavel-${index}-${responsavel}`}
                      value={responsavel}
                    >
                      {responsavel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="filtro-data-inicio"
                className="text-xs text-muted-foreground"
              >
                Data Vencimento Início
              </Label>
              <Input
                id="filtro-data-inicio"
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="filtro-data-fim"
                className="text-xs text-muted-foreground"
              >
                Data Vencimento Fim
              </Label>
              <Input
                id="filtro-data-fim"
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="filtro-status"
                className="text-xs text-muted-foreground"
              >
                Status
              </Label>
              <Select
                value={filtroStatus}
                onValueChange={(value) =>
                  setFiltroStatus(value as Servico["status"] | "todos")
                }
              >
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
            <div className="space-y-1">
              <Label
                htmlFor="ordenacao"
                className="text-xs text-muted-foreground"
              >
                Ordenar por
              </Label>
              <Select
                value={`${ordenacao.campo}-${ordenacao.direcao}`}
                onValueChange={(value) => {
                  const [campo, direcao] = value.split("-") as [
                    "clienteNome" | "dataVencimento" | "valorMensalidade" | "status",
                    "asc" | "desc"
                  ];
                  setOrdenacao({ campo, direcao });
                }}
              >
                <SelectTrigger id="ordenacao" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clienteNome-asc">
                    Cliente (A-Z)
                  </SelectItem>
                  <SelectItem value="clienteNome-desc">
                    Cliente (Z-A)
                  </SelectItem>
                  <SelectItem value="dataVencimento-asc">
                    Vencimento (Mais recente)
                  </SelectItem>
                  <SelectItem value="dataVencimento-desc">
                    Vencimento (Mais antigo)
                  </SelectItem>
                  <SelectItem value="valorMensalidade-desc">
                    Valor (Maior)
                  </SelectItem>
                  <SelectItem value="valorMensalidade-asc">
                    Valor (Menor)
                  </SelectItem>
                  <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                  <SelectItem value="status-desc">Status (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {totalItems > 11 && (
              <div className="space-y-1">
                <Label
                  htmlFor="items-per-page"
                  className="text-xs text-muted-foreground"
                >
                  Itens por página
                </Label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger id="items-per-page" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(filtroDataInicio ||
              filtroDataFim ||
              filtroStatus !== "todos" ||
              searchResponsavel !== "todos") && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroDataInicio("");
                    setFiltroDataFim("");
                    setFiltroStatus("todos");
                    setSearchResponsavel("todos");
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
            Recebidas: R${" "}
            {totaisMensalidades.recebidas.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm">
            A receber: R${" "}
            {totaisMensalidades.aReceber.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
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
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Pagamento</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{formatarDataBR(item.dataVencimento)}</td>
                  <td className="p-3">
                    R${" "}
                    {item.valorMensalidade.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-3">
                    <StatusButton
                      status={item.status}
                      statusMeta={STATUS_META}
                      onClick={() => handleTogglePagamento(item)}
                      title={getToggleTitle(item)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span>{item.meioPagamento}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.dataPagamento
                          ? formatarDataBR(item.dataPagamento)
                          : "Sem registro"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                      >
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
          {totalPages > 1 && (
            <div className="border-t p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {endIndex} de {totalItems}{" "}
                  registros
                </p>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={previousPage}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => goToPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={nextPage}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy="servicos"
        />
      </div>
      {ConfirmationDialogComponent}
    </Layout>
  );
}

