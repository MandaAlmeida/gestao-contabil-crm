import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import { Financeiro } from "@/types/crm";
import {
  Plus,
  Edit,
  Trash2,
  History,
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
import { CheckCircle, Clock3, AlertTriangle, XCircle } from "lucide-react";
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
import { FiltersBar } from "@/components/FiltersBar";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { HistoricoPagamentosDialog } from "@/components/HistoricoPagamentosDialog";

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
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedItemHistorico, setSelectedItemHistorico] = useState<Financeiro | null>(null);

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
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      dataVencimento: "",
      valorMensalidade: "",
      meioPagamento: "Pix",
      valorServico: "",
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

    const status = calcularStatusFinanceiro({
      status: editingItem?.status ?? "Pendente",
      dataPagamento: null,
      dataVencimento,
      historicoPagamentos: editingItem?.historicoPagamentos || [],
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

            servicoIdAtualizar = await createServico(novoServico);
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
        const temValorServico = formData.valorServico && parseFloat(formData.valorServico) > 0;

        if (!servicoRelacionado && temValorServico) {
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

            servicoId = await createServico(novoServico);
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
        } else if (servicoRelacionado) {
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
          status,
          meioPagamento: formData.meioPagamento,
          servicoId: servicoId,
          valorServico: formData.valorServico,
          observacoes: formData.observacoes,
          ativo: true,
          historicoPagamentos: [],
        });

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
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataHojeStr = hoje.toISOString().split('T')[0];
    
    if (item.status === "Pago") {
      // Verifica se o pagamento foi feito hoje
      const pagamentoAtual = item.historicoPagamentos?.find(
        p => p.dataVencimento === item.dataVencimento
      );
      
      const pagamentoFoiHoje = pagamentoAtual?.dataPagamento === dataHojeStr;
      
      if (pagamentoFoiHoje) {
        // Se foi pago hoje, apenas remove do histórico sem voltar o vencimento
        const historicoAtualizado = (item.historicoPagamentos || []).filter(
          p => p.dataVencimento !== item.dataVencimento
        );
        
        const statusAjustado = calcularStatusFinanceiro({
          status: "Pendente",
          dataPagamento: null,
          dataVencimento: item.dataVencimento,
          historicoPagamentos: historicoAtualizado,
        });

        try {
          await updateFinanceiro(item.id, {
            historicoPagamentos: historicoAtualizado,
            status: statusAjustado,
          });
          toast({
            title: "Pagamento desfeito.",
            description: `${item.clienteNome} voltou ao status anterior.`,
          });
        } catch (error) {
          toast({ title: "Erro ao desfazer pagamento", variant: "destructive" });
        }
        return;
      }
      
      // Se não foi pago hoje, remove do histórico E volta o vencimento
      const historicoAtualizado = (item.historicoPagamentos || []).filter(
        p => p.dataVencimento !== item.dataVencimento
      );
      
      const vencimentoAnterior = removerMes(item.dataVencimento);

      const statusAjustado = calcularStatusFinanceiro({
        status: "Pendente",
        dataPagamento: null,
        dataVencimento: vencimentoAnterior,
        historicoPagamentos: historicoAtualizado,
      });

      try {
        await updateFinanceiro(item.id, {
          historicoPagamentos: historicoAtualizado,
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

    // Registra o pagamento no histórico
    const dataPagamentoStr = dataHojeStr;
    const vencimento = new Date(item.dataVencimento + "T00:00:00");
    const pagamento = new Date(dataHojeStr + "T00:00:00");
    
    const emDia = pagamento <= vencimento;
    const novoVencimento = adicionarMes(item.dataVencimento);
    
    const novoPagamento = {
      id: `${item.id}-${item.dataVencimento}-${Date.now()}`,
      dataVencimento: item.dataVencimento,
      dataPagamento: dataPagamentoStr,
      emDia,
      meioPagamento: "Pix" as const,
    };
    
    const historicoAtualizado = [
      ...(item.historicoPagamentos || []),
      novoPagamento
    ];

    try {
      await updateFinanceiro(item.id, {
        historicoPagamentos: historicoAtualizado,
        dataVencimento: novoVencimento,
        status: "Pago",
      });

      // Excluir notificações relacionadas ao pagamento
      await excluirNotificacoesItem(item.id, "pagamento");

      toast({
        title: emDia ? "Pagamento em dia registrado!" : "Pagamento atrasado registrado!",
        description: emDia 
          ? `${item.clienteNome} foi marcado como pago em dia.`
          : `${item.clienteNome} foi marcado como pago com atraso.`,
      });
    } catch (error) {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    }
  };

  const handleDeleteHistorico = async (financeiroItem: Financeiro, historicoId: string) => {
    // Encontra o pagamento mais recente
    const pagamentoMaisRecente = (financeiroItem.historicoPagamentos || []).reduce((ultimo, atual) => {
      const dataUltimo = new Date(ultimo.dataVencimento);
      const dataAtual = new Date(atual.dataVencimento);
      return dataAtual > dataUltimo ? atual : ultimo;
    });
    
    // Só permite deletar o pagamento mais recente
    if (historicoId !== pagamentoMaisRecente.id) {
      toast({ 
        title: "Não é possível apagar este pagamento", 
        description: "Você deve apagar os pagamentos mais recentes primeiro.",
        variant: "destructive" 
      });
      return;
    }
    
    const historicoAtualizado = (financeiroItem.historicoPagamentos || []).filter(
      h => h.id !== historicoId
    );
    
    // Pega a data de vencimento do pagamento que está sendo apagado
    const pagamentoApagado = financeiroItem.historicoPagamentos?.find(h => h.id === historicoId);
    const dataVencimentoAnterior = pagamentoApagado?.dataVencimento || financeiroItem.dataVencimento;

    const statusAjustado = calcularStatusFinanceiro({
      status: "Pendente",
      dataPagamento: null,
      dataVencimento: dataVencimentoAnterior,
      historicoPagamentos: historicoAtualizado,
    });

    try {
      await updateFinanceiro(financeiroItem.id, {
        historicoPagamentos: historicoAtualizado,
        dataVencimento: dataVencimentoAnterior, // Volta para a data de vencimento do pagamento apagado
        status: statusAjustado,
      });
      
      await refreshFinanceiros();
      
      toast({
        title: "Pagamento removido do histórico.",
        description: `Data de vencimento voltou para ${formatarDataBR(dataVencimentoAnterior)}.`,
      });
      
      // Fechar o dialog após deletar
      setHistoricoDialogOpen(false);
      setSelectedItemHistorico(null);
    } catch (error) {
      toast({ title: "Erro ao remover do histórico", variant: "destructive" });
    }
  };

  const handleEditHistorico = async (
    financeiroItem: Financeiro,
    historicoId: string,
    novaData: string,
    novoMeio: "Pix" | "Boleto"
  ) => {
    const historicoAtualizado = (financeiroItem.historicoPagamentos || []).map(h => {
      if (h.id === historicoId) {
        const vencimento = new Date(h.dataVencimento + "T00:00:00");
        const dataPagamento = new Date(novaData + "T00:00:00");
        vencimento.setHours(0, 0, 0, 0);
        dataPagamento.setHours(0, 0, 0, 0);
        const emDia = dataPagamento <= vencimento;
        
        return {
          ...h,
          dataPagamento: novaData,
          meioPagamento: novoMeio,
          emDia,
        };
      }
      return h;
    });

    try {
      await updateFinanceiro(financeiroItem.id, {
        historicoPagamentos: historicoAtualizado,
      });
      
      await refreshFinanceiros();
      
      toast({
        title: "Histórico atualizado.",
      });
      
      // Atualizar o item selecionado
      const financeiroAtualizado = financeirosRaw.find(f => f.id === financeiroItem.id);
      if (financeiroAtualizado) {
        setSelectedItemHistorico(financeiroAtualizado);
      }
    } catch (error) {
      toast({ title: "Erro ao atualizar histórico", variant: "destructive" });
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

  const totaisMensalidades = useMemo(() => {
    const total = financeirosNormalizados.reduce(
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
    console.log("Total financeiros:", total);
    return total;
  }, [financeirosNormalizados]);

  // Cálculos detalhados para financeiros e serviços
  const totaisDetalhados = useMemo(() => {
    const financeirosRecebidos = financeirosNormalizados
      .filter((f) => f.status === "Pago")
      .reduce((acc, f) => acc + f.valorMensalidade, 0);

    const financeirosAReceber = financeirosNormalizados
      .filter((f) => f.status !== "Pago")
      .reduce((acc, f) => acc + f.valorMensalidade, 0);

    // Serviços pagos (tem financeiro vinculado e está pago)
    const servicosRecebidos = financeirosNormalizados
      .filter((f) => f.servicoId && f.status === "Pago")
      .reduce((acc, f) => {
        const servico = servicos.find((s) => s.id === f.servicoId);
        return servico ? acc + servico.valorMensalidade : acc;
      }, 0);

    // Serviços a receber (tem financeiro vinculado e não está pago)
    const servicosAReceber = financeirosNormalizados
      .filter((f) => f.servicoId && f.status !== "Pago")
      .reduce((acc, f) => {
        const servico = servicos.find((s) => s.id === f.servicoId);
        return servico ? acc + servico.valorMensalidade : acc;
      }, 0);

    return {
      financeirosRecebidos,
      financeirosAReceber,
      servicosRecebidos,
      servicosAReceber,
    };
  }, [financeirosNormalizados, servicos]);

  // Valores vencidos
  const valoresVencidos = useMemo(() => {
    const hoje = new Date();
    
    return financeirosNormalizados
      .filter((f) => {
        if (f.status === "Pago") return false;
        const dataVencimento = new Date(f.dataVencimento);
        return dataVencimento < hoje;
      })
      .reduce((acc, f) => {
        const valorMensalidade = f.valorMensalidade || 0;
        const valorServico = f.valorServico ? parseFloat(f.valorServico) : 0;
        return acc + valorMensalidade + valorServico;
      }, 0);
  }, [financeirosNormalizados]);

  const vencidosFinanceiro = useMemo(() => {
    const hoje = new Date();
    
    return financeirosNormalizados
      .filter((f) => {
        if (f.status === "Pago") return false;
        const dataVencimento = new Date(f.dataVencimento);
        return dataVencimento < hoje;
      })
      .reduce((acc, f) => acc + (f.valorMensalidade || 0), 0);
  }, [financeirosNormalizados]);

  const vencidosServicos = useMemo(() => {
    const hoje = new Date();
    
    return financeirosNormalizados
      .filter((f) => {
        if (f.status === "Pago") return false;
        const dataVencimento = new Date(f.dataVencimento);
        return dataVencimento < hoje;
      })
      .reduce((acc, f) => {
        const valorServico = f.valorServico ? parseFloat(f.valorServico) : 0;
        return acc + valorServico;
      }, 0);
  }, [financeirosNormalizados]);

  // Pagamentos em atraso (pagos após o vencimento em mês diferente)
  const pagamentosAtrasados = useMemo(() => {
    let total = 0;
    
    financeirosNormalizados.forEach((f) => {
      if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
        f.historicoPagamentos.forEach((pagamento) => {
          if (pagamento.emDia === false && pagamento.dataPagamento) {
            const dataPagamento = new Date(pagamento.dataPagamento);
            const dataVencimento = new Date(pagamento.dataVencimento);
            
            const mesmoMes = dataPagamento.getMonth() === dataVencimento.getMonth() && 
                            dataPagamento.getFullYear() === dataVencimento.getFullYear();
            
            if (!mesmoMes) {
              const valorMensalidade = f.valorMensalidade || 0;
              const valorServico = f.valorServico ? parseFloat(f.valorServico) : 0;
              total += valorMensalidade + valorServico;
            }
          }
        });
      }
    });
    
    return total;
  }, [financeirosNormalizados]);

  const atrasadosFinanceiro = useMemo(() => {
    let total = 0;
    
    financeirosNormalizados.forEach((f) => {
      if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
        f.historicoPagamentos.forEach((pagamento) => {
          if (pagamento.emDia === false && pagamento.dataPagamento) {
            const dataPagamento = new Date(pagamento.dataPagamento);
            const dataVencimento = new Date(pagamento.dataVencimento);
            
            const mesmoMes = dataPagamento.getMonth() === dataVencimento.getMonth() && 
                            dataPagamento.getFullYear() === dataVencimento.getFullYear();
            
            if (!mesmoMes) {
              total += f.valorMensalidade || 0;
            }
          }
        });
      }
    });
    
    return total;
  }, [financeirosNormalizados]);

  const atrasadosServicos = useMemo(() => {
    let total = 0;
    
    financeirosNormalizados.forEach((f) => {
      if (f.historicoPagamentos && f.historicoPagamentos.length > 0) {
        f.historicoPagamentos.forEach((pagamento) => {
          if (pagamento.emDia === false && pagamento.dataPagamento) {
            const dataPagamento = new Date(pagamento.dataPagamento);
            const dataVencimento = new Date(pagamento.dataVencimento);
            
            const mesmoMes = dataPagamento.getMonth() === dataVencimento.getMonth() && 
                            dataPagamento.getFullYear() === dataVencimento.getFullYear();
            
            if (!mesmoMes) {
              const valorServico = f.valorServico ? parseFloat(f.valorServico) : 0;
              total += valorServico;
            }
          }
        });
      }
    });
    
    return total;
  }, [financeirosNormalizados]);

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
      icon: XCircle,
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

        <FiltersBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Buscar por cliente..."
          responsavelOptions={responsaveisDisponiveis}
          responsavelValue={searchResponsavel}
          onResponsavelChange={setSearchResponsavel}
          dateStartLabel="Data Vencimento Início"
          dateEndLabel="Data Vencimento Fim"
          dateStartValue={filtroDataInicio}
          dateEndValue={filtroDataFim}
          onDateStartChange={setFiltroDataInicio}
          onDateEndChange={setFiltroDataFim}
          showStatus
          statusValue={filtroStatus}
          statusOptions={[
            { value: "todos", label: "Todos" },
            { value: "Pago", label: "Pago" },
            { value: "Pendente", label: "Pendente" },
            { value: "Vencido", label: "Vencido" },
          ]}
          onStatusChange={(value) =>
            setFiltroStatus(value as Financeiro["status"] | "todos")
          }
          orderValue={`${ordenacao.campo}-${ordenacao.direcao}`}
          orderOptions={[
            { value: "clienteNome-asc", label: "Cliente (A-Z)" },
            { value: "clienteNome-desc", label: "Cliente (Z-A)" },
            { value: "dataVencimento-asc", label: "Vencimento (Mais recente)" },
            { value: "dataVencimento-desc", label: "Vencimento (Mais antigo)" },
            { value: "valorMensalidade-desc", label: "Valor (Maior)" },
            { value: "valorMensalidade-asc", label: "Valor (Menor)" },
            { value: "status-asc", label: "Status (A-Z)" },
            { value: "status-desc", label: "Status (Z-A)" },
          ]}
          onOrderChange={(value) => {
            const [campo, direcao] = value.split("-") as [
              "clienteNome" | "dataVencimento" | "valorMensalidade" | "status",
              "asc" | "desc"
            ];
            setOrdenacao({ campo, direcao });
          }}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => setItemsPerPage(Number(value))}
          showClear={
            !!(
              filtroDataInicio ||
              filtroDataFim ||
              filtroStatus !== "todos" ||
              searchResponsavel !== "todos"
            )
          }
          onClear={() => {
            setFiltroDataInicio("");
            setFiltroDataFim("");
            setFiltroStatus("todos");
            setSearchResponsavel("todos");
          }}
        />

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          {/* Card de Recebidas */}
          <div className="rounded-lg bg-primary p-4 text-primary-foreground">
            <p className="text-lg font-semibold">
              Recebidas: R${" "}
              {(totaisMensalidades.recebidas + totaisDetalhados.servicosRecebidos).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm">
              A receber: R${" "}
              {(totaisMensalidades.aReceber + totaisDetalhados.servicosAReceber).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            {/* Detalhamento por tipo */}
            <div className="mt-3 pt-3 border-t border-primary-foreground/20 text-xs space-y-1">
              <p>
                Financeiros: R${" "}
                {totaisDetalhados.financeirosRecebidos.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {" | A receber: R$"}
                {totaisDetalhados.financeirosAReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p>
                Serviços: R${" "}
                {totaisDetalhados.servicosRecebidos.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {" | A receber: R$"}
                {totaisDetalhados.servicosAReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Card de Vencidos e Atrasados */}
          <div className="rounded-lg bg-destructive p-4 text-destructive-foreground">
            <p className="text-lg font-semibold">
              Vencidos: R${" "}
              {valoresVencidos.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm">
              Pagos em atraso: R${" "}
              {pagamentosAtrasados.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            {/* Detalhamento por tipo */}
            <div className="mt-3 pt-3 border-t border-destructive-foreground/20 text-xs space-y-1">
              <p>
                Financeiros: R${" "}
                {vencidosFinanceiro.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {" | Pagos em atraso: R$"}
                {atrasadosFinanceiro.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p>
                Serviços: R${" "}
                {vencidosServicos.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {" | Pagos em atraso: R$"}
                {atrasadosServicos.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
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
                        onClick={() => {
                          setSelectedItemHistorico(item);
                          setHistoricoDialogOpen(true);
                        }}
                        title="Ver histórico de pagamentos"
                      >
                        <History className="h-4 w-4" />
                      </Button>
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
      <HistoricoPagamentosDialog
        isOpen={historicoDialogOpen}
        onOpenChange={setHistoricoDialogOpen}
        item={selectedItemHistorico}
        onDeleteHistorico={handleDeleteHistorico}
        onEditHistorico={handleEditHistorico}
      />
    </Layout>
  );
}
