import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useRenovacao } from "@/hooks/useRenovacao";
import { Renovacao } from "@/types/crm";
import { Plus, Edit, Trash2, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useTarefas } from "@/hooks/useTarefas";
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
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { formatarDataBR } from "@/lib/utils";
import { StatusSelect } from "@/components/StatusSelect";
import { FiltersBar } from "@/components/FiltersBar";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { generateRenovacaoPDF, generateRenovacaoExcel } from "@/lib/pdfGenerator";
import { SelectClienteComBusca } from "@/components/SelectClienteComBusca";

export default function RenovacoesPage() {
  // 1. Hooks Customizados
  const { addTarefa, tarefas, deleteTarefa, updateTarefa } = useTarefas();
  const { clientes } = useClientes();
  const { renovacoes, createRenovacao, updateRenovacao, deleteRenovacao, refresh } = useRenovacao();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);

  // 2. Estados (States)
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Renovacao["status"] | "todos">("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataRenovacao" | "valorRenovacao" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "dataRenovacao", direcao: "asc" });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Renovacao | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [formData, setFormData] = useState({
    clienteId: "",
    dataRenovacao: "",
    valorRenovacao: "",
    status: "Pendente" as Renovacao["status"],
    parcela: null as Renovacao["parcela"],
    observacoes: "",
  });

  // 3. Memoização (Dados derivados)
  const clientesComRenovacao = useMemo(
    () => new Set(renovacoes.map((r) => r.clienteId)),
    [renovacoes]
  );

  const responsaveisDisponiveis = useMemo(
    () => Array.from(new Set(clientes.map((cliente) => cliente.responsavel))).sort(),
    [clientes]
  );

  const filteredItems = useMemo(() => {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    };

    const clientesMap = new Map(clientes.map((c) => [c.id, c]));

    return renovacoes.filter((item) => {
      const cliente = clientesMap.get(item.clienteId);

      const nome = item.clienteNome?.toLowerCase() || "";
      const cnpj = item.clienteCNPJ || "";
      const termo = searchTerm.toLowerCase();

      const matchesSearch = nome.includes(termo) || cnpj.includes(searchTerm);

      const matchesResponsavel =
        searchResponsavel === "todos" ||
        (cliente && cliente.responsavel === searchResponsavel);

      const itemData = parseDate(item.dataRenovacao);
      const dataInicio = parseDate(filtroDataInicio);
      const dataFim = parseDate(filtroDataFim);

      const matchesDataInicio = !dataInicio || (itemData && itemData >= dataInicio);
      const matchesDataFim = !dataFim || (itemData && itemData <= dataFim);
      const matchesStatus = filtroStatus === "todos" || item.status === filtroStatus;

      return (
        matchesSearch &&
        matchesResponsavel &&
        matchesDataInicio &&
        matchesDataFim &&
        matchesStatus
      );
    });
  }, [
    renovacoes,
    clientes,
    searchTerm,
    searchResponsavel,
    filtroDataInicio,
    filtroDataFim,
    filtroStatus,
  ]);

  const itemsOrdenados = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let comparacao = 0;
      switch (ordenacao.campo) {
        case "clienteNome":
          comparacao = a.clienteNome.localeCompare(b.clienteNome, "pt-BR", { sensitivity: "base" });
          break;
        case "dataRenovacao":
          comparacao = new Date(a.dataRenovacao).getTime() - new Date(b.dataRenovacao).getTime();
          break;
        case "valorRenovacao":
          comparacao = a.valorRenovacao - b.valorRenovacao;
          break;
        case "status":
          comparacao = a.status.localeCompare(b.status, "pt-BR", { sensitivity: "base" });
          break;
      }
      return ordenacao.direcao === "asc" ? comparacao : -comparacao;
    });
    return items;
  }, [filteredItems, ordenacao]);

  const totaisPorStatus = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        if (item.status === "Renovado") acc.renovado += item.valorRenovacao;
        else if (item.status === "Pendente") acc.pendente += item.valorRenovacao;
        else if (item.status === "Em Negociação") acc.negociacao += item.valorRenovacao;
        else if (item.status === "Parcelado") acc.parcelado += item.valorRenovacao;
        else if (item.status === "Avisado") acc.avisado += item.valorRenovacao;
        return acc;
      },
      { renovado: 0, pendente: 0, negociacao: 0, parcelado: 0, avisado: 0 }
    );
  }, [filteredItems]);

  const totalGeral = useMemo(() => {
    return Object.values(totaisPorStatus).reduce((acc, val) => acc + val, 0);
  }, [totaisPorStatus]);

  // 4. Paginação
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

  // 5. Handlers (Funções de ação)
  const handleSincronizarTarefas = async () => {
    setIsSyncing(true);
    let tarefasCriadas = 0;

    // 1. Filtra as renovações que estão com o status "Pendente"
    const renovacoesPendentes = renovacoes.filter(r => r.status === "Pendente");

    for (const renovacao of renovacoesPendentes) {
      // 2. Busca na lista de tarefas se JÁ EXISTE uma com o mesmo Cliente E Título
      const temTarefa = tarefas.some(t => 
        t.clienteId === renovacao.clienteId && 
        t.titulo?.trim().toUpperCase() === "RENOVAÇÃO ANUAL"
      );

      // 3. Se não encontrar a tarefa, cria uma nova com os dados da imagem
      if (!temTarefa) {
        try {
          await addTarefa({
            titulo: "RENOVAÇÃO ANUAL",
            descricao: renovacao.observacoes || "",
            data: `${renovacao.dataRenovacao}T00:00:00`,
            horaInicio: "08:00",
            horaFim: "17:00",
            prioridade: "Média",
            concluida: false,
            ativo: true,
            clienteId: renovacao.clienteId,
            clienteNome: renovacao.clienteNome,
            categoria: "", 
          });
          tarefasCriadas++;
        } catch (error) {
          console.error("Erro ao criar tarefa para o cliente:", renovacao.clienteNome);
        }
      }
    }

    setIsSyncing(false);
    
    // 4. Feedbacks na tela para você saber exatamente o que houve
    if (tarefasCriadas > 0) {
      toast({ 
        title: `${tarefasCriadas} tarefa(s) de renovação criada(s) com sucesso!`, 
        variant: "default" 
      });
    } else if (renovacoesPendentes.length === 0) {
      toast({ 
        title: "Nenhuma ação realizada", 
        description: "Você não possui nenhuma renovação com o status 'Pendente'.",
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Tudo certo!", 
        description: "Todas as suas renovações pendentes já possuem uma tarefa 'RENOVAÇÃO ANUAL'.",
        variant: "default" 
      });
    }
  };

  const handleGeneratePDF = async () => {
    await generateRenovacaoPDF(filteredItems, {
      title: "Relatório de Renovações",
      filename: `renovacoes-${new Date().toISOString().split("T")[0]}.pdf`,
      dateRange:
        filtroDataInicio && filtroDataFim
          ? { start: filtroDataInicio, end: filtroDataFim }
          : undefined,
    });
  };

  const handleGenerateExcel = () => {
    generateRenovacaoExcel(filteredItems, {
      title: "Relatório de Renovações",
      filename: `renovacoes-${new Date().toISOString().split("T")[0]}.xlsx`,
      dateRange:
        filtroDataInicio && filtroDataFim
          ? { start: filtroDataInicio, end: filtroDataFim }
          : undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      clienteId: "",
      dataRenovacao: "",
      valorRenovacao: "",
      status: "Pendente",
      parcela: null,
      observacoes: "",
    });
    setEditingItem(null);
  };

const createRenovacaoTasks = async (
    numParcelas: number, 
    valorTotal: number, 
    dataBase: string, 
    observacoes: string, 
    clienteId: string, 
    clienteNome: string,
    status: string,
    mudouEstrutura: boolean
  ) => {
    const [ano, mes, dia] = dataBase.split("-").map(Number);

    // 1. Limpeza: Se mudou algo, apaga as tarefas antigas de renovação deste cliente
    if (mudouEstrutura) {
      const tarefasAntigas = tarefas.filter(t => 
        t.clienteId === clienteId && 
        t.titulo?.trim().toUpperCase().startsWith("RENOVAÇÃO ANUAL")
      );
      for (const t of tarefasAntigas) {
        try { await deleteTarefa(t.id); } catch(e) { console.error("Erro ao deletar:", e); }
      }
    }

    // 2. Criação baseada no Status
    if (status === "Parcelado") {
      const valorMensal = valorTotal / numParcelas;
      
      // Cria as parcelas do ANO ATUAL
      for (let i = 0; i < numParcelas; i++) {
        const dataParcela = new Date(ano, (mes - 1) + i, dia);
        const dataFormatada = `${dataParcela.getFullYear()}-${String(dataParcela.getMonth() + 1).padStart(2, '0')}-${String(dataParcela.getDate()).padStart(2, '0')}`;
        
        await addTarefa({
          titulo: `RENOVAÇÃO ANUAL - Parcela ${i + 1}/${numParcelas}`,
          descricao: `Dividido em ${numParcelas}x.\nTotal: R$ ${valorTotal.toFixed(2)}\nParcela: R$ ${valorMensal.toFixed(2)}\n\n${observacoes || ""}`,
          data: `${dataFormatada}T00:00:00`,
          horaInicio: "08:00", horaFim: "17:00", prioridade: "Média",
          concluida: i === 0, // 1ª paga, demais pendentes
          ativo: true, clienteId: clienteId || "", clienteNome: clienteNome || "", categoria: ""
        });
      }
      
      // Cria o lembrete pro ANO QUE VEM
      await addTarefa({
        titulo: "RENOVAÇÃO ANUAL",
        descricao: observacoes || "",
        data: `${ano + 1}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`,
        horaInicio: "08:00", horaFim: "17:00", prioridade: "Média",
        concluida: false, ativo: true, clienteId: clienteId || "", clienteNome: clienteNome || "", categoria: ""
      });

    } else {
      // Se for Renovado, Pendente, etc (Cria apenas uma tarefa)
      await addTarefa({
        titulo: "RENOVAÇÃO ANUAL",
        descricao: observacoes || "",
        data: `${dataBase}T00:00:00`,
        horaInicio: "08:00", horaFim: "17:00", prioridade: "Média",
        concluida: status === "Renovado",
        ativo: true, clienteId: clienteId || "", clienteNome: clienteNome || "", categoria: ""
      });

      // Se marcou como pago, já agenda o ano que vem
      if (status === "Renovado") {
        await addTarefa({
          titulo: "RENOVAÇÃO ANUAL",
          descricao: observacoes || "",
          data: `${ano + 1}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`,
          horaInicio: "08:00", horaFim: "17:00", prioridade: "Média",
          concluida: false, ativo: true, clienteId: clienteId || "", clienteNome: clienteNome || "", categoria: ""
        });
      }
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cliente = clientes.find((c) => c.id === formData.clienteId);
    if (!cliente) return;

    let dataRenovacaoBanco = formData.dataRenovacao;
    const dataBaseOriginal = formData.dataRenovacao;

    if (editingItem && (formData.status === "Renovado" || formData.status === "Parcelado") && 
       (editingItem.status !== "Renovado" && editingItem.status !== "Parcelado")) {
      const [y, m, d] = formData.dataRenovacao.split("-").map(Number);
      dataRenovacaoBanco = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const valorRenovacaoNumber = parseFloat(formData.valorRenovacao);
    const numParcelas = formData.status === "Parcelado" && formData.parcela ? parseInt(String(formData.parcela).split(" ")[0]) : 1;
    const numParcelasAntigo = editingItem?.parcela ? parseInt(String(editingItem.parcela).split(" ")[0]) : 1;
    
    // Sempre recria se for parcelado ou se o status mudou
    const mudouEstrutura = editingItem 
      ? (formData.status !== editingItem.status || numParcelas !== numParcelasAntigo)
      : true;

    try {
      if (editingItem) {
        await updateRenovacao(editingItem.id, {
          ...formData,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj || "", 
          valorRenovacao: valorRenovacaoNumber,
          dataRenovacao: dataRenovacaoBanco,
          parcela: formData.status === "Parcelado" ? formData.parcela : null,
        });
      } else {
        await createRenovacao({
          ...formData,
          clienteNome: cliente.nome,
          clienteCNPJ: cliente.cnpj || "", 
          valorRenovacao: valorRenovacaoNumber,
          dataRenovacao: dataRenovacaoBanco,
          ativo: true
        });
      }

      await createRenovacaoTasks(numParcelas, valorRenovacaoNumber, dataBaseOriginal, formData.observacoes, cliente.id, cliente.nome, formData.status, mudouEstrutura);
      
      toast({ title: "Salvo com sucesso!" });
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };
  

  const handleEdit = (item: Renovacao) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataRenovacao: item.dataRenovacao,
      valorRenovacao: item.valorRenovacao.toString(),
      status: item.status,
      parcela: item.parcela || null,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirmation(
      "Excluir Renovação",
      "Tem certeza que deseja excluir esta renovação? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteRenovacao(id);
          toast({ title: "Renovação excluída com sucesso!" });
        } catch (error) {
          toast({ title: "Erro ao excluir renovação", variant: "destructive" });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive",
      }
    );
  };

  // 6. Constantes
  const STATUS_OPTIONS = [
    { value: "Pendente", label: "Pendente" },
    { value: "Avisado", label: "Avisado" },
    { value: "Em Negociação", label: "Em Negociação" },
    { value: "Parcelado (1 Vez)", label: "Parcelado (1 Vez)" },
    { value: "Parcelado (2 Vezes)", label: "Parcelado (2 Vezes)" },
    { value: "Parcelado (3 Vezes)", label: "Parcelado (3 Vezes)" },
    { value: "Renovado", label: "Renovado" },
    { value: "Cancelado", label: "Cancelado" },
  ];

  // 7. Renderização
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Renovação</h1>
            <p className="text-muted-foreground">Acompanhe renovações de serviços</p>
          </div>
          <div className="flex gap-2 items-end">
            <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["renovacao"]} />
            
            {/* NOVO: Botão de Sincronizar Tarefas */}
            <Button 
              variant="outline" 
              onClick={handleSincronizarTarefas} 
              disabled={isSyncing || renovacoes.length === 0}
              title="Validar e gerar tarefas faltantes"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar Tarefas
            </Button>

            <Button variant="outline" onClick={handleGeneratePDF} disabled={filteredItems.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={handleGenerateExcel} disabled={filteredItems.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Baixar Excel
            </Button>
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
                  Nova Renovação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Editar" : "Nova"} Renovação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clienteId">Cliente</Label>
                    <SelectClienteComBusca
                      clientes={(() => {
                        const clientesFiltrados = clientes.filter((c) => {
                          if (!editingItem) return !clientesComRenovacao.has(c.id);
                          return !clientesComRenovacao.has(c.id) || c.id === editingItem.clienteId;
                        });
                        return [...clientesFiltrados].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
                      })()}
                      value={formData.clienteId}
                      onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                      placeholder="Selecione um cliente"
                    />
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
                    <Select
                      value={formData.status}
                      onValueChange={(value: Renovacao["status"]) =>
                        setFormData({
                          ...formData,
                          status: value,
                          parcela: value === "Parcelado" ? formData.parcela : null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Avisado">Avisado</SelectItem>
                        <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                        <SelectItem value="Parcelado">Parcelado</SelectItem>
                        <SelectItem value="Renovado">Renovado</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.status === "Parcelado" && (
                    <div className="space-y-2">
                      <Label htmlFor="parcela">Parcela</Label>
                      <Select
                        value={formData.parcela || ""}
                        onValueChange={(value: "1 Vez" | "2 Vezes" | "3 Vezes") =>
                          setFormData({ ...formData, parcela: value })
                        }
                        required={formData.status === "Parcelado"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a parcela" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 Vez">1 Vez</SelectItem>
                          <SelectItem value="2 Vezes">2 Vezes</SelectItem>
                          <SelectItem value="3 Vezes">3 Vezes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
        </div>

        <FiltersBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Buscar por cliente..."
          responsavelOptions={responsaveisDisponiveis}
          responsavelValue={searchResponsavel}
          onResponsavelChange={setSearchResponsavel}
          dateStartLabel="Data Início"
          dateEndLabel="Data Fim"
          dateStartValue={filtroDataInicio}
          dateEndValue={filtroDataFim}
          onDateStartChange={setFiltroDataInicio}
          onDateEndChange={setFiltroDataFim}
          showStatus
          statusValue={filtroStatus}
          statusOptions={[
            { value: "todos", label: "Todos" },
            { value: "Pendente", label: "Pendente" },
            { value: "Avisado", label: "Avisado" },
            { value: "Em Negociação", label: "Em Negociação" },
            { value: "Parcelado", label: "Parcelado" },
            { value: "Renovado", label: "Renovado" },
            { value: "Cancelado", label: "Cancelado" },
          ]}
          onStatusChange={(value) => setFiltroStatus(value as Renovacao["status"] | "todos")}
          orderValue={`${ordenacao.campo}-${ordenacao.direcao}`}
          orderOptions={[
            { value: "clienteNome-asc", label: "Cliente (A-Z)" },
            { value: "clienteNome-desc", label: "Cliente (Z-A)" },
            { value: "dataRenovacao-asc", label: "Data (Mais recente)" },
            { value: "dataRenovacao-desc", label: "Data (Mais antigo)" },
            { value: "valorRenovacao-desc", label: "Valor (Maior)" },
            { value: "valorRenovacao-asc", label: "Valor (Menor)" },
            { value: "status-asc", label: "Status (A-Z)" },
            { value: "status-desc", label: "Status (Z-A)" },
          ]}
          onOrderChange={(value) => {
            const [campo, direcao] = value.split("-") as [
              "clienteNome" | "dataRenovacao" | "valorRenovacao" | "status",
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

        <div className="mb-4 rounded-lg bg-primary p-4 text-primary-foreground">
          <p className="text-lg font-semibold">
            Total de Renovações: R${" "}
            {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3 pt-3 border-t border-primary-foreground/20 text-xs space-y-1">
            <p>Renovado: R$ {totaisPorStatus.renovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p>Pendente: R$ {totaisPorStatus.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p>Em Negociação: R$ {totaisPorStatus.negociacao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p>Parcelados: R$ {totaisPorStatus.parcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            {totaisPorStatus.avisado > 0 && (
              <p>Avisado: R$ {totaisPorStatus.avisado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
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
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{formatarDataBR(item.dataRenovacao)}</td>
                  <td className="p-3">
                    R$ {item.valorRenovacao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                    <StatusSelect
                        item={item}
                        onUpdateStatus={async (id, data) => {
                          const safeData = { ...data, clienteCNPJ: item.clienteCNPJ || "", observacoes: item.observacoes || "" };
                          await updateRenovacao(id, safeData as any);

                          // PEGA O NÚMERO DE PARCELAS DO 'DATA' (O novo valor clicado)
                          const parcelaString = data.status === "Parcelado" ? (data.parcela || "1 Vez") : "1 Vez";
                          const numParcelas = parseInt(parcelaString.split(" ")[0]) || 1;
                          
                          await createRenovacaoTasks(
                            numParcelas, 
                            item.valorRenovacao, 
                            item.dataRenovacao, 
                            item.observacoes || "", 
                            item.clienteId, 
                            item.clienteNome, 
                            data.status as string,
                            true 
                          );
                          
                          toast({ title: "Status e tarefas atualizados!" });
                        }}
                        onStatusChange={refresh}
                        statusOptions={STATUS_OPTIONS}
                      />
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
              Nenhuma renovação encontrada
            </div>
          )}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onNext={nextPage}
            onPrevious={previousPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            itemLabel="renovações"
          />
        </div>
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy={["renovacao"]}
        />
      </div>
      {ConfirmationDialogComponent}
    </Layout>
  );
}