import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import { Financeiro } from "@/types/crm";
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
import {
  calcularStatusFinanceiro,
  normalizarFinanceiros,
} from "@/lib/financeiro";
import { formatarDataBR } from "@/lib/utils";
import { StatusButton, type StatusMeta } from "@/components/StatusButton";
import { ExportButtons } from "@/components/ExportButtons";
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
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";

export default function FinanceiroPage() {
  const location = useLocation();
  const { clientes } = useClientes();
  const { servicos, createServico, deleteServico, refresh: refreshServicos } = useServicos();
  const {
    financeiros: financeirosRaw,
    createFinanceiro,
    updateFinanceiro,
    deleteFinanceiro,
    refresh: refreshFinanceiros,
  } = useFinanceiro();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Financeiro["status"] | "todos"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataVencimento" | "valorMensalidade" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "dataVencimento", direcao: "asc" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Financeiro | null>(null);
  const { toast } = useToast();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Aplicar filtros do state quando a página é carregada
  useEffect(() => {
    if (location.state) {
      const { statusFilter, responsavelFilter } = location.state as {
        statusFilter?: string;
        responsavelFilter?: string;
      };

      if (statusFilter) {
        setFiltroStatus(statusFilter as Financeiro["status"] | "todos");
      }

      if (responsavelFilter && responsavelFilter !== "todos") {
        setSearchResponsavel(responsavelFilter);
      }
    }
  }, [location.state]);

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(clientes.map((cliente) => cliente.responsavel))
      ).sort(),
    [clientes]
  );

  const financeirosNormalizados = useMemo(
    () => normalizarFinanceiros(financeirosRaw),
    [financeirosRaw]
  );

  // Lista de IDs de clientes que já têm registros financeiros
  const clientesComFinanceiro = useMemo(
    () => new Set(financeirosNormalizados.map((f) => f.clienteId)),
    [financeirosNormalizados]
  );

  // Clientes disponíveis para seleção no formulário
  // Ao criar novo registro, mostra apenas clientes não cadastrados
  // Ao editar, mostra todos os clientes (incluindo o que está sendo editado)
  const clientesDisponiveisFormulario = useMemo(() => {
    let clientesFiltrados = clientes;

    // Se estiver criando um novo registro (não editando), mostra apenas clientes não cadastrados
    if (!editingItem) {
      clientesFiltrados = clientes.filter(
        (c) => !clientesComFinanceiro.has(c.id)
      );
    } else {
      // Se estiver editando, inclui o cliente atual mesmo que já tenha registro
      clientesFiltrados = clientes.filter(
        (c) =>
          !clientesComFinanceiro.has(c.id) || c.id === editingItem.clienteId
      );
    }

    // Ordenar alfabeticamente por nome (ignorando espaços no início)
    return [...clientesFiltrados].sort((a, b) =>
      a.nome.trim().localeCompare(b.nome.trim(), "pt-BR", { sensitivity: "base" })
    );
  }, [clientes, clientesComFinanceiro, editingItem]);

  const [formData, setFormData] = useState({
    clienteId: "",
    dataVencimento: "",
    valorMensalidade: "",
    meioPagamento: "Pix" as Financeiro["meioPagamento"],
    valorServico: "",
    observacoes: "",
    dataPagamento: null,
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      dataVencimento: "",
      valorMensalidade: "",
      meioPagamento: "Pix",
      valorServico: "",
      observacoes: "",
      dataPagamento: null,
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

    let dataVencimento = formData.dataVencimento;

    // Permitir usar o campo "Valor do Serviço" como base quando preenchido
    const valorServicoNumber = parseFloat(formData.valorServico || "");
    const valorMensalidadeNumber = parseFloat(formData.valorMensalidade || "");
    const valorPrincipal = !Number.isNaN(valorServicoNumber)
      ? valorServicoNumber
      : valorMensalidadeNumber;

    if (Number.isNaN(valorPrincipal)) {
      toast({
        title: "Informe um valor válido (mensalidade ou serviço).",
        variant: "destructive",
      });
      return;
    }
    const dataPagamento = formData.dataPagamento
      ? formData.dataPagamento
      : null;

    // Avanço automático da data de vencimento quando um pagamento é registrado
    // Apenas se o item não estava como "Pago" antes (ou seja, está registrando um novo pagamento)
    if (dataPagamento && (!editingItem || editingItem.status !== "Pago")) {
      dataVencimento = adicionarMes(dataVencimento);
    }
    const status = calcularStatusFinanceiro({
      status: editingItem?.status ?? "Pendente",
      dataPagamento,
      dataVencimento,
    });

    try {
      if (editingItem) {
        // Verificar se precisa criar serviço ao editar
        let servicoIdAtualizar = editingItem.servicoId || null;
        const temValorServico = formData.valorServico && parseFloat(formData.valorServico) > 0;
        const naoTemServicoVinculado = !editingItem.servicoId;
        const servicoFoiLimpado = editingItem.servicoId && !temValorServico;

        // Se o serviço foi vinculado e agora foi limpo, deleta o serviço
        if (servicoFoiLimpado) {
          try {
            console.log("🗑️ Deletando serviço ao limpar campo:", editingItem.servicoId);
            await deleteServico(editingItem.servicoId);
            servicoIdAtualizar = null;
            toast({ title: "Serviço deletado!" });
            await refreshServicos();
          } catch (error) {
            console.error("❌ Erro ao deletar serviço:", error);
            servicoIdAtualizar = null;
          }
        }

        if (temValorServico && naoTemServicoVinculado) {
          // Criar serviço automaticamente ao editar
          try {
            const valorServicoNumber = parseFloat(formData.valorServico);
            const novoServico = {
              clienteId: formData.clienteId,
              clienteNome: cliente.nome,
              clienteCNPJ: cliente.cnpj,
              responsavel: cliente.responsavel,
              descricao: `Serviço mensal - ${cliente.nome}`,
              dataVencimento: dataVencimento,
              valorMensalidade: valorServicoNumber,
              status: "Pendente" as const,
              meioPagamento: "Pix" as const,
              observacoes: `Serviço criado automaticamente via financeiro - ${new Date().toLocaleDateString('pt-BR')}`,
              ativo: true,
            };

            console.log("🔧 Criando serviço ao editar financeiro:", JSON.stringify(novoServico, null, 2));
            servicoIdAtualizar = await createServico(novoServico);
            console.log("✅ Serviço criado ao editar com ID:", servicoIdAtualizar);
            toast({ title: "Serviço criado automaticamente!" });
            await refreshServicos();
          } catch (error) {
            console.error("❌ Erro ao criar serviço na edição:", error);
            toast({
              title: "Registro atualizado sem vínculo com serviço",
              description: "Não foi possível criar o serviço automaticamente.",
            });
          }
        }

        await updateFinanceiro(editingItem.id, {
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          dataVencimento,
          valorMensalidade: valorMensalidadeNumber,
          dataPagamento,
          status,
          meioPagamento: formData.meioPagamento,
          servicoId: servicoIdAtualizar,
          valorServico: formData.valorServico,
          observacoes: formData.observacoes,
        });
        await Promise.all([refreshFinanceiros(), refreshServicos()]);
        toast({ title: "Registro atualizado com sucesso!" });
      } else {
        // Verificar se já existe serviço para este cliente
        let servicoRelacionado = servicos.find(s => s.clienteId === formData.clienteId);
        let servicoId: string | null = null;
        let valorParaServico = valorPrincipal;

        if (!servicoRelacionado) {
          // Se não existe serviço, criar automaticamente
          try {
            const novoServico = {
              clienteId: formData.clienteId,
              clienteNome: cliente.nome,
              clienteCNPJ: cliente.cnpj,
              responsavel: cliente.responsavel,
              descricao: `Serviço mensal - ${cliente.nome}`,
              dataVencimento: dataVencimento,
              valorMensalidade: valorPrincipal,
              status: "Pendente" as const,
              meioPagamento: "Pix" as const,
              observacoes: `Serviço criado automaticamente via financeiro - ${new Date().toLocaleDateString('pt-BR')}`,
              ativo: true,
            };

            console.log("🔧 Dados do serviço a ser criado:", JSON.stringify(novoServico, null, 2));
            servicoId = await createServico(novoServico);
            console.log("✅ Serviço criado com ID:", servicoId);
            console.log("✅ Dados enviados para Firebase:", novoServico);
            toast({ title: "Serviço criado automaticamente!" });
            
            // Atualizar serviços para refletir o novo serviço
            await refreshServicos();
          } catch (error) {
            console.error("❌ Erro ao criar serviço:", error);
            console.error("❌ Stack trace:", (error as any)?.stack);
            toast({
              title: "Registro criado sem vínculo com serviço",
              description: "Não foi possível criar o serviço automaticamente.",
            });
            servicoId = null;
            valorParaServico = valorPrincipal;
          }
        } else {
          // Se existe serviço, usar o ID e valor dele
          servicoId = servicoRelacionado.id;
          valorParaServico = servicoRelacionado.valorMensalidade;
          toast({ title: "Serviço vinculado automaticamente!" });
        }

        await createFinanceiro({
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj,
          dataVencimento,
          // Usa o valor principal (mensalidade ou valor do serviço, se informado)
          valorMensalidade: valorParaServico,
          dataPagamento,
          status,
          meioPagamento: formData.meioPagamento,
          servicoId: servicoId,
          valorServico: formData.valorServico,
          observacoes: formData.observacoes,
          ativo: true,
        });
        console.log("✅ Financeiro criado com servicoId:", servicoId);
        // Garante que as listas estejam sincronizadas em tela
        await Promise.all([refreshFinanceiros(), refreshServicos()]);
        toast({ title: "Registro financeiro adicionado com sucesso!" });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("❌ Erro ao salvar registro:", error);
      toast({
        title: "Erro ao salvar registro",
        variant: "destructive",
      });
    }
  };

  /**
   * Adiciona um mês a uma data no formato YYYY-MM-DD
   * Trabalha diretamente com strings para evitar problemas de timezone
   */
  const adicionarMes = (dataString: string): string => {
    if (!dataString) {
      const hoje = new Date();
      return hoje.toISOString().split("T")[0];
    }

    const partes = dataString.split("-");
    if (partes.length !== 3) {
      return dataString;
    }

    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const dia = parseInt(partes[2], 10);

    let novoAno = ano;
    let novoMes = mes + 1;

    if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    }

    // Garante que o dia não ultrapasse os dias do mês
    const ultimoDiaDoMes = new Date(novoAno, novoMes, 0).getDate();
    const novoDia = Math.min(dia, ultimoDiaDoMes);

    return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
      novoDia
    ).padStart(2, "0")}`;
  };

  /**
   * Remove um mês de uma data no formato YYYY-MM-DD
   * Trabalha diretamente com strings para evitar problemas de timezone
   */
  const removerMes = (dataString: string): string => {
    if (!dataString) {
      const hoje = new Date();
      return hoje.toISOString().split("T")[0];
    }

    const partes = dataString.split("-");
    if (partes.length !== 3) {
      return dataString;
    }

    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const dia = parseInt(partes[2], 10);

    let novoAno = ano;
    let novoMes = mes - 1;

    if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }

    // Garante que o dia não ultrapasse os dias do mês
    const ultimoDiaDoMes = new Date(novoAno, novoMes, 0).getDate();
    const novoDia = Math.min(dia, ultimoDiaDoMes);

    return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
      novoDia
    ).padStart(2, "0")}`;
  };

  const handleTogglePagamento = async (item: Financeiro) => {
    if (item.status === "Pago") {
      // Quando remove o pagamento, sempre volta exatamente 1 mês da data atual
      // (já que o pagamento avançou 1 mês quando foi registrado)
      const vencimentoAnterior = removerMes(item.dataVencimento);

      // Calcula o status baseado na nova data de vencimento, sem considerar o status antigo
      const statusAjustado = calcularStatusFinanceiro({
        status: "Pendente", // Força recalcular baseado apenas na data
        dataPagamento: null,
        dataVencimento: vencimentoAnterior,
      });

      try {
        await updateFinanceiro(item.id, {
          dataPagamento: null,
          meioPagamento: "Pix", // Reset para valor padrão
          dataVencimento: vencimentoAnterior,
          status: statusAjustado,
        });
        toast({
          title: "Pagamento removido.",
          description:
            statusAjustado === "Pendente"
              ? `${item.clienteNome} voltou a ficar pendente.`
              : `${item.clienteNome} foi marcado como vencido.`,
        });
      } catch (error) {
        toast({ title: "Erro ao remover pagamento", variant: "destructive" });
      }
      return;
    }

    // Marca como pago diretamente
    const hoje = new Date().toISOString().split('T')[0]; // Data de hoje no formato YYYY-MM-DD
    const novoVencimento = adicionarMes(item.dataVencimento);

    try {
      await updateFinanceiro(item.id, {
        dataPagamento: hoje,
        dataVencimento: novoVencimento,
        status: "Pago",
        meioPagamento: "Pix",
      });

      // Excluir notificações relacionadas ao pagamento
      await excluirNotificacoesItem(item.id, "pagamento");

      toast({
        title: "Pagamento registrado!",
        description: `${item.clienteNome} foi marcado como pago.`,
      });
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
      meioPagamento: item.meioPagamento ?? "Pix",
      valorServico: item.valorServico?.toString() ?? "",
      dataPagamento: item.dataPagamento ?? null,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirmation(
      "Excluir Registro Financeiro",
      "Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteFinanceiro(id);
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

  const filteredItems = financeirosNormalizados.filter((item) => {
    const cliente = clientes.find((c) => c.id === item.clienteId);
    const matchesSearch =
      item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      (cliente && cliente.responsavel === searchResponsavel);

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
      if (item.status === "Pago") {
        acc.recebidas += item.valorMensalidade;
      } else {
        acc.aReceber += item.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  const STATUS_META: Record<Financeiro["status"], StatusMeta> = {
    Pago: {
      label: "Pago",
      className: "bg-success/10 text-success hover:bg-success/20",
      icon: CheckCircle,
    },
    Pendente: {
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

  const getToggleTitle = (item: Financeiro) => {
    if (item.status === "Pago") {
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
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">
              Gerencie pagamentos e mensalidades
            </p>
          </div>
          <div className="flex gap-2 items-end">
          <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["pagamento"]} />
          <ExportButtons
            data={filteredItems}
            filtroDataInicio={filtroDataInicio}
            filtroDataFim={filtroDataFim}
          />
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
          </div>
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
                  setFiltroStatus(value as Financeiro["status"] | "todos")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
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
                    (
                      | "clienteNome"
                      | "dataVencimento"
                      | "valorMensalidade"
                      | "status"
                    ),
                    "asc" | "desc"
                  ];
                  setOrdenacao({ campo, direcao });
                }}
              >
                <SelectTrigger id="ordenacao" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clienteNome-asc">Cliente (A-Z)</SelectItem>
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
                <th className="p-3 text-left text-sm font-medium">Serviço</th>
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
                    <span className="text-sm text-muted-foreground">
                      {item.servicoId
                        ? (() => {
                            const servico = servicos.find(s => s.id === item.servicoId);
                            return servico
                              ? `R$ ${servico.valorMensalidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "Serviço não encontrado";
                          })()
                        : "Nenhum serviço vinculado"
                      }
                    </span>
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
      </div>
      {ConfirmationDialogComponent}
      <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy={["pagamento"]}
        />
    </Layout>
  );
}
