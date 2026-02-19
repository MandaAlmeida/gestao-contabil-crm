import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { Financeiro } from "@/types/crm";
import {
  Edit,
  Trash2,
  History,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { calcularStatusFinanceiro } from "@/lib/financeiro";
import { useFinanceiroMetricas } from "@/hooks/useFinanceiroDashboard";
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
import { NotificationPanel, NotificationType } from "@/components/NotificationPanel";
import { HistoricoPagamentosDialog } from "@/components/HistoricoPagamentosDialog";
import { CreateFinancer } from "@/components/CreateFinancer";
import { useNotifications } from "@/hooks/useNotificacoesAutomaticas";
import { useAuth } from "@/contexts/AuthContext";

export default function FinanceiroPage() {
  const { clientes } = useClientes();
  const { user } = useAuth();
  const { servicos, createServico, deleteServico} = useServicos();
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
  const {
 removeNotificationItem,
 fetchNotifications
  } = useNotifications(user.uid);

  // =========================
  // Formulário CreateFinancer
  // =========================
  const [formData, setFormData] = useState({
    clienteId: "",
    dataVencimento: "",
    valorMensalidade: "",
    valorServico: "",
    servicoId: null,
    status: "Pendente",
    meioPagamento: "Pix" as "Pix" | "Boleto",
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      dataVencimento: "",
      valorMensalidade: "",
      status: "Pendente",
      meioPagamento: "Pix",
      valorServico: "",
      servicoId: null,
      observacoes: "",
    });
    setEditingItem(null);
  };
  // =========================
  // Constantes e Handlers ausentes
  // =========================
  const STATUS_META: Record<"Pago" | "Pendente" | "Vencido", StatusMeta> = {
    Pago: {
      label: "Pago",
      icon: CheckCircle,
      className: "bg-green-500 text-white",
    },
    Pendente: {
      label: "Pendente",
      icon: Clock3,
      className: "bg-yellow-500 text-black",
    },
    Vencido: {
      label: "Vencido",
      icon: AlertTriangle,
      className: "bg-red-500 text-white",
    },
  };

  const handleTogglePagamento = async (item: Financeiro) => {
    const novoStatus: Financeiro["status"] =
      item.status === "Pago"
        ? "Pendente"
        : item.status === "Pendente"
        ? "Pago"
        : "Pendente";
    await updateFinanceiro(item.id, {
      status: novoStatus,
    });
    toast({ title: `Status alterado para ${novoStatus}` });
    refreshFinanceiros();
  };

  const getToggleTitle = (item: Financeiro) => {
    if (item.status === "Pago") return "Marcar como pendente";
    if (item.status === "Pendente") return "Marcar como pago";
    if (item.status === "Vencido") return "Marcar como pendente";
    return "Alterar status";
  };

  const handleEdit = (item: Financeiro) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataVencimento: item.dataVencimento,
      valorMensalidade: String(item.valorMensalidade),
      status: item.status,
      meioPagamento: item.meioPagamento,
      observacoes: item.observacoes || "", 
      valorServico: item.valorServico || "",
      servicoId:item.servicoId || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, clientName: string, serviceId?: string) => {
    await showConfirmation(
      "Excluir financeiro?",
      "Esta ação não pode ser desfeita.",
      async () => {
        await removeNotificationItem(user.uid, clientName, "pagamento");
        await removeNotificationItem(user.uid, clientName, "servico");
        await deleteFinanceiro(id);
        if (serviceId) await deleteServico(serviceId);
        toast({ title: "Financeiro excluído com sucesso!" });
        // Aguarda um pequeno delay para garantir que o Firestore atualize
        setTimeout(() => {
          fetchNotifications();
        }, 300);
        refreshFinanceiros();
      }
    );
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

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const cliente = clientes.find((c) => c.id === formData.clienteId);

  if (!cliente) {
    toast({ title: "Cliente não encontrado!", variant: "destructive" });
    return;
  }

  try {
    const hoje = new Date();
    const vencimento = new Date(formData.dataVencimento);

    const mesmoMes =
      hoje.getFullYear() === vencimento.getFullYear() &&
      hoje.getMonth() === vencimento.getMonth();

    let statusValid: Financeiro["status"];

    if (formData.status === "Pago") {
      statusValid = "Pago";
    } else if (mesmoMes) {
      statusValid = "Pendente"; // A RECEBER
    } else if (vencimento < hoje) {
      statusValid = "Vencido";
    } else {
      statusValid = "Pendente";
    }

    if (editingItem) {
      await updateFinanceiro(editingItem.id, {
        ...formData,
        status: statusValid,
        valorMensalidade: Number(formData.valorMensalidade),
      });

      toast({ title: "Financeiro atualizado com sucesso!" });
    } else {
      let servicoId = formData.servicoId;

      if (Number(formData.valorServico) > 0 && !formData.servicoId) {
        const novoServicoId = await createServico({
          clienteId: formData.clienteId,
          clienteCNPJ: cliente.cnpj,
          clienteNome: cliente.nome,
          responsavel: cliente.responsavel,
          valorMensalidade: Number(formData.valorServico),
          dataVencimento: formData.dataVencimento,
          status: statusValid,
          observacoes: formData.observacoes || "",
          meioPagamento: formData.meioPagamento,
          ativo: true,
          descricao: ""
        });

        servicoId = novoServicoId;
      }

      await createFinanceiro({
        ...formData,
        status: statusValid,
        clienteNome: cliente.nome,
        clienteCNPJ: cliente.cnpj,
        valorMensalidade: Number(formData.valorMensalidade),
        ativo: true,
        servicoId: servicoId,
      });

      toast({ title: "Financeiro adicionado com sucesso!" });
    }

    resetForm();
    setIsDialogOpen(false);
  } catch (error) {
    toast({ title: "Erro ao salvar financeiro", variant: "destructive" });
  }
};

 // =========================
// Helpers
// =========================
const parseDate = (date: string) => {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
};

  // =========================
  // Filtros locais
  // =========================
  const filteredItems = useMemo(() => {
    return financeirosRaw.filter((item) => {
      const cliente = clientes.find((c) => c.id === item.clienteId);
      const matchesSearch =
        item.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clienteCNPJ?.includes(searchTerm);
      const matchesResponsavel =
        searchResponsavel === "todos" ||
        (cliente && cliente.responsavel === searchResponsavel);
      let matchesData = true;
      if (filtroDataInicio && filtroDataFim) {
        const inicio = new Date(filtroDataInicio + "T00:00:00");
        const fim = new Date(filtroDataFim + "T00:00:00");
        if (item.historicoPagamentos && item.historicoPagamentos.length > 0) {
          // Se tem histórico, filtra por dataPagamento
          matchesData = item.historicoPagamentos.some((p) => {
            if (!p.dataPagamento) return false;
            const dataPag = new Date(p.dataPagamento + "T00:00:00");
            return dataPag >= inicio && dataPag <= fim;
          });
        } else {
          // Se não tem histórico, filtra por dataVencimento
          const dataVenc = new Date(item.dataVencimento + "T00:00:00");
          matchesData = dataVenc >= inicio && dataVenc <= fim;
        }
      }
      const matchesStatus =
        filtroStatus === "todos" || item.status === filtroStatus;
      return (
        matchesSearch &&
        matchesResponsavel &&
        matchesData &&
        matchesStatus
      );
    });
  }, [
    financeirosRaw,
    clientes,
    searchTerm,
    searchResponsavel,
    filtroDataInicio,
    filtroDataFim,
    filtroStatus,
  ]);

  // =========================
  // Normalização e Métricas
  // =========================
  // Definir período customizado se filtro de datas estiver preenchido
  const periodoCustomizado =
    filtroDataInicio && filtroDataFim
      ? {
          inicio: new Date(filtroDataInicio + "T00:00:00"),
          fim: new Date(filtroDataFim + "T00:00:00"),
        }
      : undefined;


// =========================
// Responsáveis
// =========================
const responsaveisDisponiveis = useMemo(
  () =>
    Array.from(
      new Set(clientes.map((c) => c.responsavel))
    ).sort(),
  [clientes]
);

// =========================
// Clientes com financeiro
// =========================
const clientesComFinanceiro = useMemo(
  () => new Set(filteredItems.map((f) => f.clienteId)),
  [filteredItems]
);

// =========================
// Clientes disponíveis formulário
// =========================
const clientesDisponiveisFormulario = useMemo(() => {
  let lista = clientes;
  if (!editingItem) {
    lista = clientes.filter((c) => !clientesComFinanceiro.has(c.id));
  } else {
    lista = clientes.filter(
      (c) =>
        !clientesComFinanceiro.has(c.id) ||
        c.id === editingItem.clienteId
    );
  }
  return [...lista].sort((a, b) =>
    a.nome.trim().localeCompare(b.nome.trim(), "pt-BR", {
      sensitivity: "base",
    })
  );
}, [clientes, clientesComFinanceiro, editingItem]);

// =========================
// Ordenação
// =========================
const itemsOrdenados = useMemo(() => {
  const items = [...filteredItems];
  items.sort((a, b) => {
    let comp = 0;
    switch (ordenacao.campo) {
      case "clienteNome":
        comp = a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
        break;
      case "dataVencimento":
        comp =
          parseDate(a.dataVencimento)!.getTime() -
          parseDate(b.dataVencimento)!.getTime();
        break;
      case "valorMensalidade":
        comp = a.valorMensalidade - b.valorMensalidade;
        break;
      case "status":
        comp = a.status.localeCompare(b.status);
        break;
    }
    return ordenacao.direcao === "asc" ? comp : -comp;
  });
  return items;
}, [filteredItems, ordenacao]);

// =========================
// Paginação
// =========================
const {
  currentPage,
  totalPages,
  paginatedItems: pagination,
  nextPage,
  previousPage,
  goToPage,
  startIndex,
  endIndex,
  totalItems,
  itemsPerPage,
  setItemsPerPage,
} = usePagination(itemsOrdenados, 10);

const totais = useMemo(() => {
  let financeiroRecebido = 0;
  let financeiroAReceber = 0;
  let financeiroVencido = 0;
  let financeiroAtraso = 0;

  let servicoRecebido = 0;
  let servicoAReceber = 0;
  let servicoVencido = 0;
  let servicoAtraso = 0;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let inicio: Date;
  let fim: Date;

  if (filtroDataInicio && filtroDataFim) {
    inicio = new Date(filtroDataInicio + "T00:00:00");
    fim = new Date(filtroDataFim + "T23:59:59");
  } else {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
  }

  filteredItems.forEach((item) => {
    const valorFin = item.valorMensalidade || 0;

    const servico = item.servicoId
      ? servicos.find((s) => String(s.id) === String(item.servicoId))
      : null;

    const valorServ = servico?.valorMensalidade || 0;

    const historicos = item.historicoPagamentos ?? [];

    let recebeuNoMes = false;
    let recebeuAtrasado = false;

    historicos.forEach((h) => {
      if (!h.dataPagamento) return;

      const dataPagamento = new Date(h.dataPagamento + "T00:00:00");
      const dataVencimento = new Date(h.dataVencimento + "T00:00:00");

      const pagamentoNoPeriodo =
        dataPagamento >= inicio && dataPagamento <= fim;

      if (!pagamentoNoPeriodo) return;

      const vencimentoNoPeriodo =
        dataVencimento >= inicio && dataVencimento <= fim;

      if (vencimentoNoPeriodo) {
        recebeuNoMes = true;
      } else if (dataVencimento < inicio) {
        recebeuAtrasado = true;
      }
    });

    // ================= RECEBIDO =================
    if (recebeuNoMes) {
      financeiroRecebido += valorFin;
      servicoRecebido += valorServ;
    }

    // ================= ATRASADO =================
    if (recebeuAtrasado) {
      financeiroAtraso += valorFin;
      servicoAtraso += valorServ;
    }

    // ================= VENCIMENTO BASE =================
    const vencimentoBase = new Date(
      (item.dataVencimento || "") + "T00:00:00"
    );

    // ================= A RECEBER =================
    if (
      !recebeuNoMes &&
      vencimentoBase >= inicio &&
      vencimentoBase <= fim
    ) {
      financeiroAReceber += valorFin;
      servicoAReceber += valorServ;
    }

    // ================= VENCIDO =================
    if (
      !recebeuNoMes &&
      vencimentoBase < inicio
    ) {
      financeiroVencido += valorFin;
      servicoVencido += valorServ;
    }
  });

  return {
    financeiro: {
      recebido: financeiroRecebido,
      aReceber: financeiroAReceber,
      vencido: financeiroVencido,
      atraso: financeiroAtraso,
    },
    servico: {
      recebido: servicoRecebido,
      aReceber: servicoAReceber,
      vencido: servicoVencido,
      atraso: servicoAtraso,
    },
    total: {
      recebido: financeiroRecebido + servicoRecebido,
      aReceber: financeiroAReceber + servicoAReceber,
      vencido: financeiroVencido + servicoVencido,
      atraso: financeiroAtraso + servicoAtraso,
    },
  };
}, [filteredItems, filtroDataInicio, filtroDataFim, servicos]);

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
           <CreateFinancer
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            resetForm={resetForm}
            editingItem={editingItem}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            clientesDisponiveisFormulario={clientesDisponiveisFormulario}
            servicos={servicos}
          />
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
                {totais.total.recebido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p className="text-sm">
                A receber: R${" "}
                {totais.total.aReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>

            {/* Detalhamento por tipo */}
            <div className="mt-3 pt-3 border-t border-primary-foreground/20 text-xs space-y-1">
              <p>
                <strong>Financeiros:</strong> Recebidas: R${totais.financeiro.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | A receber: R${totais.financeiro.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p>
                <strong>Serviços:</strong> Recebidas: R${totais.servico.recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | A receber: R${totais.servico.aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Card de Vencidos e Atrasados */}
          <div className="rounded-lg bg-destructive p-4 text-destructive-foreground">
           <p className="text-lg font-semibold">
              Vencidos: R${" "}
              {totais.total.vencido.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>

            <p className="text-sm">
              Pagos em atraso: R${" "}
              {totais.total.atraso.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>

            {/* Detalhamento por tipo */}
            <div className="mt-3 pt-3 border-t border-destructive-foreground/20 text-xs space-y-1">
              <p>
                Financeiros: R${" "}
                {totais.financeiro.vencido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {" | Pagos em atraso: R$"}
                {totais.financeiro.atraso.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p>
                Serviços: R${" "}
                {totais.servico.vencido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
                {" | Pagos em atraso: R$"}
                {totais.servico.atraso.toLocaleString("pt-BR", {
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
              {pagination.map((item) => (
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
                        onClick={() => handleDelete(item.id, item.clienteNome, item.servicoId)}
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
