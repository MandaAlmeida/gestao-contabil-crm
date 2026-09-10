import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { Financeiro } from "@/types/crm";
import { Edit, Trash2, History, RefreshCw } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import {
  calcularStatusFinanceiro,
  sincronizarStatusFinanceiros,
} from "@/lib/financeiro";
import { formatarDataBR, matchesClienteSearch } from "@/lib/utils";
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
import { FiltersBar } from "@/components/FiltersBar";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { HistoricoPagamentosDialog } from "@/components/HistoricoPagamentosDialog";
import { CreateFinancer } from "@/components/CreateFinancer";
import { useNotifications } from "@/hooks/useNotificacoesAutomaticas";
import { useAuth } from "@/contexts/AuthContext";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import { db } from "@/lib/firebase";

/* =========================
   UTIL — DATAS LOCAL
========================= */
function ajustarDataLocal(dataString: string | undefined): Date {
  if (!dataString) return new Date();
  if (dataString.includes("T")) return new Date(dataString);
  const [ano, mes, dia] = dataString.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0);
}

export default function FinanceiroPage() {
  const { clientes } = useClientes();
  const { user } = useAuth();
  const { servicos, createServico, deleteServico } = useServicos();
  const {
    financeiros: financeirosRaw,
    createFinanceiro,
    updateFinanceiro,
    deleteFinanceiro,
    refresh: refreshFinanceiros,
  } = useFinanceiro();
  const { showConfirmation, ConfirmationDialogComponent } =
    useConfirmationDialog();

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
  const [selectedItemHistorico, setSelectedItemHistorico] =
    useState<Financeiro | null>(null);
  const { removeNotificationItem, fetchNotifications } = useNotifications(
    user.uid,
  );

  const [formData, setFormData] = useState({
    clienteId: "",
    dataVencimento: "",
    valorMensalidade: "",
    valorServico: 0,
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
      valorServico: 0,
      servicoId: null,
      observacoes: "",
    });
    setEditingItem(null);
  };

  const STATUS_META: Record<"Pago" | "Pendente" | "Vencido", StatusMeta> = {
    Pago: {
      label: "Pago",
      icon: CheckCircle,
      className: "bg-green-600/40 text-white",
    },
    Pendente: {
      label: "Pendente",
      icon: Clock3,
      className: "bg-yellow-600/40 text-white",
    },
    Vencido: {
      label: "Vencido",
      icon: AlertTriangle,
      className: "bg-red-600/40 text-white",
    },
  };

  const alterarMes = (dataString: string, delta: number): string => {
    if (!dataString) return new Date().toISOString().split("T")[0];
    const [anoStr, mesStr, diaStr] = dataString.split("-");
    if (!anoStr || !mesStr || !diaStr) return dataString;

    let ano = parseInt(anoStr, 10);
    let mes = parseInt(mesStr, 10) + delta;
    const dia = parseInt(diaStr, 10);

    if (mes > 12) {
      mes = 1;
      ano++;
    } else if (mes < 1) {
      mes = 12;
      ano--;
    }

    const ultimoDia = new Date(ano, mes, 0).getDate();
    const novoDia = Math.min(dia, ultimoDia);
    return `${ano}-${String(mes).padStart(2, "0")}-${String(novoDia).padStart(2, "0")}`;
  };

  const adicionarMes = (data: string) => alterarMes(data, 1);
  const removerMes = (data: string) => alterarMes(data, -1);

  const handleTogglePagamento = async (item: Financeiro) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split("T")[0];
    const historico = item.historicoPagamentos || [];

    try {
      if (item.status === "Pago") {
        const historicoAtualizado = historico.filter((p) => {
          if (!p.dataVencimento) return true;
          const dataHist = new Date(p.dataVencimento + "T00:00:00");
          const dataItem = new Date();
          const mesmoMes =
            dataHist.getMonth() === dataItem.getMonth() &&
            dataHist.getFullYear() === dataItem.getFullYear();
          return !mesmoMes;
        });

        const statusAjustado = calcularStatusFinanceiro({
          status: "Pendente",
          dataPagamento: null,
          dataVencimento: item.dataVencimento,
          historicoPagamentos: historicoAtualizado,
        });

        const novoVencimento = removerMes(item.dataVencimento);
        await updateFinanceiro(item.id, {
          historicoPagamentos: historicoAtualizado,
          status: statusAjustado,
          dataVencimento: novoVencimento,
        });
        await refreshFinanceiros();
        toast({
          title: "Pagamento desfeito.",
          description: `${item.clienteNome} voltou para pendente.`,
        });
        return;
      }

      const vencimentoDate = new Date(item.dataVencimento + "T00:00:00");
      const pagamentoDate = new Date(hojeStr + "T00:00:00");
      const emDia = pagamentoDate <= vencimentoDate;

      const novoPagamento = {
        id: `${item.id}-${item.dataVencimento}-${Date.now()}`,
        dataVencimento: item.dataVencimento,
        dataPagamento: hojeStr,
        emDia,
        meioPagamento: item.meioPagamento || "Pix",
      };

      const historicoAtualizado = [...historico, novoPagamento];
      const novoVencimento = adicionarMes(item.dataVencimento);

      await updateFinanceiro(item.id, {
        historicoPagamentos: historicoAtualizado,
        status: "Pago",
        dataVencimento: novoVencimento,
      });
      await excluirNotificacoesItem(item.id, "pagamento");
      await refreshFinanceiros();

      toast({
        title: emDia
          ? "Pagamento em dia registrado!"
          : "Pagamento atrasado registrado!",
        description: `${item.clienteNome} foi marcado como pago.`,
      });
    } catch (error) {
      toast({ title: "Erro ao atualizar pagamento", variant: "destructive" });
    }
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
      valorServico: Number(item.valorServico) || 0,
      servicoId: item.servicoId || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (
    id: string,
    clientName: string,
    serviceId?: string,
  ) => {
    await showConfirmation(
      "Excluir financeiro?",
      "Esta ação não pode ser desfeita.",
      async () => {
        await removeNotificationItem(user.uid, clientName, "pagamento");
        await removeNotificationItem(user.uid, clientName, "servico");
        await deleteFinanceiro(id);
        if (serviceId) await deleteServico(serviceId);
        toast({ title: "Financeiro excluído com sucesso!" });
        setTimeout(() => fetchNotifications(), 300);
        refreshFinanceiros();
      },
    );
  };

  const handleDeleteHistorico = async (
    financeiroItem: Financeiro,
    historicoId: string,
  ) => {
    const pagamentoMaisRecente = (
      financeiroItem.historicoPagamentos || []
    ).reduce((ultimo, atual) => {
      const dataUltimo = new Date(ultimo.dataVencimento);
      const dataAtual = new Date(atual.dataVencimento);
      return dataAtual > dataUltimo ? atual : ultimo;
    });

    if (historicoId !== pagamentoMaisRecente.id) {
      toast({
        title: "Não é possível apagar este pagamento",
        description: "Você deve apagar os pagamentos mais recentes primeiro.",
        variant: "destructive",
      });
      return;
    }

    const historicoAtualizado = (
      financeiroItem.historicoPagamentos || []
    ).filter((h) => h.id !== historicoId);
    const pagamentoApagado = financeiroItem.historicoPagamentos?.find(
      (h) => h.id === historicoId,
    );
    const dataVencimentoAnterior =
      pagamentoApagado?.dataVencimento || financeiroItem.dataVencimento;

    const statusAjustado = calcularStatusFinanceiro({
      status: "Pendente",
      dataPagamento: null,
      dataVencimento: dataVencimentoAnterior,
      historicoPagamentos: historicoAtualizado,
    });

    try {
      await updateFinanceiro(financeiroItem.id, {
        historicoPagamentos: historicoAtualizado,
        dataVencimento: dataVencimentoAnterior,
        status: statusAjustado,
      });
      await refreshFinanceiros();
      toast({
        title: "Pagamento removido do histórico.",
        description: `Data de vencimento voltou para ${formatarDataBR(dataVencimentoAnterior)}.`,
      });
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
    novoMeio: "Pix" | "Boleto",
  ) => {
    const historicoAtualizado = (financeiroItem.historicoPagamentos || []).map(
      (h) => {
        if (h.id === historicoId) {
          const vencimento = new Date(h.dataVencimento + "T00:00:00");
          const dataPagamento = new Date(novaData + "T00:00:00");
          vencimento.setHours(0, 0, 0, 0);
          dataPagamento.setHours(0, 0, 0, 0);
          return {
            ...h,
            dataPagamento: novaData,
            meioPagamento: novoMeio,
            emDia: dataPagamento <= vencimento,
          };
        }
        return h;
      },
    );

    try {
      await updateFinanceiro(financeiroItem.id, {
        historicoPagamentos: historicoAtualizado,
      });
      await refreshFinanceiros();
      toast({ title: "Histórico atualizado." });
      const financeiroAtualizado = financeirosRaw.find(
        (f) => f.id === financeiroItem.id,
      );
      if (financeiroAtualizado) setSelectedItemHistorico(financeiroAtualizado);
    } catch (error) {
      toast({ title: "Erro ao atualizar histórico", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cliente = clientes.find((c) => c.id === formData.clienteId);
    if (!cliente) return;

    try {
      const hoje = new Date();
      const vencimento = ajustarDataLocal(formData.dataVencimento);
      const mesmoMes =
        hoje.getMonth() === vencimento.getMonth() &&
        hoje.getFullYear() === vencimento.getFullYear();
      let statusValid: Financeiro["status"] =
        formData.status === "Pago"
          ? "Pago"
          : mesmoMes
            ? "Pendente"
            : vencimento < hoje
              ? "Vencido"
              : "Pendente";

      let currentServicoId = formData.servicoId;

      // Só cria serviço se houver valor e não houver ID vinculado
      if (!currentServicoId && Number(formData.valorServico) > 0) {
        currentServicoId = await createServico({
          clienteId: formData.clienteId,
          clienteCNPJ: cliente.cnpj,
          clienteNome: cliente.nome,
          responsavel: cliente.responsavel || "",
          descricao: "Mensalidade gerada automaticamente",
          dataVencimento: formData.dataVencimento,
          valorMensalidade: Number(formData.valorServico), // Enviando como número
          status: statusValid,
          meioPagamento: formData.meioPagamento,
          observacoes: formData.observacoes || "",
          ativo: true,
        });
      }

      // Objeto de limpeza para evitar campos undefined
      const payload = {
        clienteId: formData.clienteId,
        clienteNome: cliente.nome,
        clienteCNPJ: cliente.cnpj,
        dataVencimento: formData.dataVencimento,
        valorMensalidade: Number(formData.valorMensalidade),
        valorServico: Number(formData.valorServico), // Forçando Number aqui
        servicoId: currentServicoId || null,
        status: statusValid,
        meioPagamento: formData.meioPagamento,
        observacoes: formData.observacoes || "",
        updatedAt: new Date().toISOString(),
        ativo: true,
      };

      if (editingItem) {
        // Se o valor do serviço foi zerado e existe um serviço vinculado, apaga o serviço
        if (Number(formData.valorServico) === 0 && formData.servicoId) {
          await deleteServico(formData.servicoId);
          payload.servicoId = null;
        }
        await updateFinanceiro(editingItem.id, payload);
        toast({ title: "Financeiro atualizado!" });
      } else {
        // Para criação, o hasValidTimestamps exige createdAt
        const newPayload = {
          ...payload,
          createdAt: new Date().toISOString(),
        };
        await createFinanceiro(newPayload);
        toast({ title: "Financeiro criado!" });
      }

      resetForm();
      setIsDialogOpen(false);
      refreshFinanceiros();
    } catch (error) {
      console.error("Erro no Firebase:", error);
      toast({
        title: "Erro de permissão ou validação",
        variant: "destructive",
      });
    }
  };

  const parseDate = (date: string) => {
    if (!date) return null;
    const d = new Date(date + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const filteredItems = useMemo(() => {
    return financeirosRaw.filter((item) => {
      const cliente = clientes.find((c) => c.id === item.clienteId);
      const matchesSearch = matchesClienteSearch(item.clienteNome, item.clienteCNPJ, searchTerm);
      const matchesResponsavel =
        searchResponsavel === "todos" ||
        (cliente && cliente.responsavel === searchResponsavel);

      let matchesData = true;
      if (filtroDataInicio && filtroDataFim) {
        const inicio = new Date(filtroDataInicio + "T00:00:00");
        const fim = new Date(filtroDataFim + "T23:59:59");

        // 1. Verifica se a data de vencimento atual está dentro do período
        const dataVencAtual = new Date(item.dataVencimento + "T00:00:00");
        let dataNoPeriodo = dataVencAtual >= inicio && dataVencAtual <= fim;

        // 2. Se a data atual não estiver no período, verifica se existe alguma parcela no histórico cujo vencimento caia no período
        if (
          !dataNoPeriodo &&
          item.historicoPagamentos &&
          item.historicoPagamentos.length > 0
        ) {
          dataNoPeriodo = item.historicoPagamentos.some((p) => {
            const dataVencHist = new Date(
              (p.dataVencimento || item.dataVencimento) + "T00:00:00",
            );
            return dataVencHist >= inicio && dataVencHist <= fim;
          });
        }

        matchesData = dataNoPeriodo;
      }

      const matchesStatus =
        filtroStatus === "todos" || item.status === filtroStatus;

      return (
        matchesSearch && matchesResponsavel && matchesData && matchesStatus
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

  const responsaveisDisponiveis = useMemo(
    () => Array.from(new Set(clientes.map((c) => c.responsavel))).sort(),
    [clientes],
  );
  const clientesComFinanceiro = useMemo(
    () => new Set(filteredItems.map((f) => f.clienteId)),
    [filteredItems],
  );
  const clientesDisponiveisFormulario = useMemo(() => {
    let lista = !editingItem
      ? clientes.filter((c) => !clientesComFinanceiro.has(c.id))
      : clientes.filter(
          (c) =>
            !clientesComFinanceiro.has(c.id) || c.id === editingItem.clienteId,
        );
    return [...lista].sort((a, b) =>
      a.nome
        .trim()
        .localeCompare(b.nome.trim(), "pt-BR", { sensitivity: "base" }),
    );
  }, [clientes, clientesComFinanceiro, editingItem]);

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

  // ==========================================
  // LÓGICA DE TOTAIS (MANTENDO A REGRA CORRETA)
  // ==========================================
  const totaisCalculados = useMemo(() => {
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

    const inicio = filtroDataInicio
      ? ajustarDataLocal(filtroDataInicio)
      : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicio.setHours(0, 0, 0, 0);

    const fim = filtroDataFim
      ? ajustarDataLocal(filtroDataFim)
      : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    fim.setHours(23, 59, 59, 999);

    filteredItems.forEach((item) => {
      const valorFin = Number(item.valorMensalidade) || 0;
      const valorServ = Number(item.valorServico) || 0;

      const vencimentoBase = ajustarDataLocal(item.dataVencimento);
      vencimentoBase.setHours(0, 0, 0, 0);

      // Variável para saber especificamente se a parcela atual do item foi paga
      let vencimentoAtualPago = false;

      // 1. Processa Entradas Reais (Histórico e Fallback)
      if (item.historicoPagamentos && item.historicoPagamentos.length > 0) {
        item.historicoPagamentos.forEach((hp) => {
          if (!hp.dataPagamento) return;
          const dPag = ajustarDataLocal(hp.dataPagamento);
          dPag.setHours(0, 0, 0, 0);
          const dVenc = ajustarDataLocal(
            hp.dataVencimento || item.dataVencimento,
          );
          dVenc.setHours(0, 0, 0, 0);

          // Verifica se ESSE registro no histórico é a quitação do vencimento atual
          if (dVenc.getTime() === vencimentoBase.getTime()) {
            vencimentoAtualPago = true;
          }

          // Se o pagamento caiu dentro do mês do filtro (Março, por exemplo)
          if (dPag >= inicio && dPag <= fim) {
            const mesmoMesEAno =
              dPag.getMonth() === dVenc.getMonth() &&
              dPag.getFullYear() === dVenc.getFullYear();

            // Se for um pagamento feito no mês do filtro, mas o vencimento era de antes
            if (!mesmoMesEAno && dPag > dVenc) {
              financeiroAtraso += valorFin;
              servicoAtraso += valorServ;
            } else {
              financeiroRecebido += valorFin;
              servicoRecebido += valorServ;
            }
          }
        });
      } else if (item.status === "Pago") {
        // Fallback antigo
        const dPag = ajustarDataLocal(
          item.dataPagamento || item.dataVencimento,
        );
        dPag.setHours(0, 0, 0, 0);
        const dVenc = ajustarDataLocal(item.dataVencimento);
        dVenc.setHours(0, 0, 0, 0);

        vencimentoAtualPago = true;

        if (dPag >= inicio && dPag <= fim) {
          const mesmoMes =
            dPag.getMonth() === dVenc.getMonth() &&
            dPag.getFullYear() === dVenc.getFullYear();
          if (!mesmoMes && dPag > dVenc) {
            financeiroAtraso += valorFin;
            servicoAtraso += valorServ;
          } else {
            financeiroRecebido += valorFin;
            servicoRecebido += valorServ;
          }
        }
      }

      // 2. Processa os Valores Em Aberto (A Receber e Vencido)
      // Só entra aqui se o VENCIMENTO DESTE MÊS não foi pago
      // 2. Processa os Valores Em Aberto (A Receber e Vencido)
      if (!vencimentoAtualPago && item.status !== "Pago") {
        // Se a data cai dentro da janela filtrada (ex: mês atual), soma APENAS no A Receber
        if (vencimentoBase >= inicio && vencimentoBase <= fim) {
          financeiroAReceber += valorFin;
          servicoAReceber += valorServ;
        }
        // Se a data for ANTERIOR ao início do filtro (ex: meses passados), é Vencido
        else if (vencimentoBase < inicio) {
          financeiroVencido += valorFin;
          servicoVencido += valorServ;
        }
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
  }, [filteredItems, filtroDataInicio, filtroDataFim]);

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
            <NotificationButton
              onClick={() => setNotificationsOpen(true)}
              filterBy={["pagamento"]}
            />
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
            <Button
              onClick={sincronizarStatusFinanceiros}
              title="Sincronizar e atualizar status no banco de dados"
              variant="outline" // Opcional: deixa o botão com estilo secundário
              size="icon" // Opcional: se usar shadcn, isso deixa o botão quadrado
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
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
              "asc" | "desc",
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
          {/* Banner Amarelo (Recebidas / A Receber) */}
          <div className="rounded-lg bg-primary p-4 text-primary-foreground">
            <div className="text-lg font-semibold mb-1">
              Recebidas: R${" "}
              {totaisCalculados.total.recebido.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-sm mb-4">
              A receber: R${" "}
              {totaisCalculados.total.aReceber.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-primary-foreground/20 text-xs space-y-1">
              <p>
                Financeiros: Recebidas: R${" "}
                {totaisCalculados.financeiro.recebido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                | A receber: R${" "}
                {totaisCalculados.financeiro.aReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p>
                Serviços: Recebidas: R${" "}
                {totaisCalculados.servico.recebido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                | A receber: R${" "}
                {totaisCalculados.servico.aReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Banner Vermelho (Vencidos / Pagos em Atraso) */}
          <div className="rounded-lg bg-destructive p-4 text-destructive-foreground">
            <div className="text-lg font-semibold mb-1">
              Vencidos: R${" "}
              {totaisCalculados.total.vencido.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-sm mb-4">
              Pagos em atraso: R${" "}
              {totaisCalculados.total.atraso.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-destructive-foreground/20 text-xs space-y-1">
              <p>
                Financeiros: R${" "}
                {totaisCalculados.financeiro.vencido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                | Pagos em atraso: R${" "}
                {totaisCalculados.financeiro.atraso.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p>
                Serviços: R${" "}
                {totaisCalculados.servico.vencido.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                | Pagos em atraso: R${" "}
                {totaisCalculados.servico.atraso.toLocaleString("pt-BR", {
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
                            const servico = servicos.find(
                              (s) => s.id === item.servicoId,
                            );
                            return servico
                              ? `R$ ${servico.valorMensalidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "Serviço não encontrado";
                          })()
                        : "Nenhum serviço vinculado"}
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
                        onClick={() =>
                          handleDelete(
                            item.id,
                            item.clienteNome,
                            item.servicoId,
                          )
                        }
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
                    },
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
