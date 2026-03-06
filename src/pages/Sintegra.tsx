import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useSintegra } from "@/hooks/useSintegra";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { Sintegra } from "@/types/crm";
import { Plus, Edit, Trash2, Clock3, CheckCircle, XCircle, History } from "lucide-react";
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
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { cn, formatarDataBR } from "@/lib/utils";
import { FiltersBar } from "@/components/FiltersBar";
import { HistoricoAtividadesDialog } from "@/components/HistoricoAtividadesDialog";
import { calcularStatusSintegra } from "@/lib/sintegra";
import { excluirNotificacoesItem } from "@/utils/notificacoes";
import { SelectClienteComBusca } from "@/components/SelectClienteComBusca";

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

const formatarISO = (date: Date) => date.toISOString().split("T")[0];

const STATUS_META: Record<
  Sintegra["status"],
  { label: string; className: string; icon: LucideIcon }
> = {
  Pendente: {
    label: "Pendente",
    className: "bg-warning/10 text-warning hover:bg-warning/20",
    icon: Clock3,
  },
  Concluído: {
    label: "Concluído",
    className: "bg-success/10 text-success hover:bg-success/20",
    icon: CheckCircle,
  },
  Vencido: {
    label: "Vencido",
    className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    icon: XCircle,
  },
};

export default function SintegraPage() {
  const { clientes } = useClientes();
  const { sintegras, sintegrasRaw, createSintegra, updateSintegra, deleteSintegra, refreshSintegras } =
    useSintegra();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Sintegra["status"] | "todos"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataPrazo" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "dataPrazo", direcao: "asc" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sintegra | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedItemHistorico, setSelectedItemHistorico] = useState<Sintegra | null>(null);
  const { toast } = useToast();

  // Lista de IDs de clientes que já têm Sintegra cadastrado
  const clientesComSintegra = useMemo(
    () => new Set(sintegras.map((s) => s.clienteId)),
    [sintegras]
  );

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          clientes
            .map((cliente) => cliente.responsavel)
            .filter((responsavel) => responsavel && responsavel.trim() !== "")
        )
      ).sort(),
    [clientes]
  );

  const [formData, setFormData] = useState({
    clienteId: "",
    dataPrazo: "",
    acesso: "",
    status: "Pendente" as Sintegra["status"],
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      dataPrazo: "",
      acesso: "",
      status: "Pendente",
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

    const dataPrazo = formData.dataPrazo;

    try {
      if (editingItem) {
        await updateSintegra(editingItem.id, {
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          dataPrazo,
          acesso: formData.acesso,
          status: formData.status,
          observacoes: formData.observacoes,
        });
        toast({ title: "Sintegra atualizado com sucesso!" });
      } else {
        await createSintegra({
          clienteId: formData.clienteId,
          clienteNome: cliente.nome,
          dataPrazo,
          acesso: formData.acesso,
          status: formData.status,
          observacoes: formData.observacoes,
          ativo: true,
        });
        toast({ title: "Sintegra adicionado com sucesso!" });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar sintegra", variant: "destructive" });
    }
  };

  const handleEdit = (item: Sintegra) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      dataPrazo: item.dataPrazo,
      acesso: item.acesso,
      status: item.status,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirmation(
      "Excluir Sintegra",
      "Tem certeza que deseja excluir este Sintegra? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteSintegra(id);
          toast({ title: "Sintegra excluído com sucesso!" });
        } catch (error) {
          toast({ title: "Erro ao excluir sintegra", variant: "destructive" });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      }
    );
  };

 const handleToggleAtividade = async (item: Sintegra) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split("T")[0];

  const historico = item.historicoAtividades || [];

  try {
// ==========================
// DESFAZER CONCLUSÃO
// ==========================
if (item.status === "Concluído") {

  if (!historico.length) return;

  // pega o último registro
  const ultimaAtividade = historico[historico.length - 1];

  const atividadeFoiHoje =
    ultimaAtividade.dataConclusao === hojeStr;

  // remove apenas o último
  const historicoAtualizado = historico.slice(0, -1);

  let novoPrazo = formatarISO(removerMes(item.dataPrazo));

  const statusAjustado = calcularStatusSintegra({
    status: "Pendente",
    dataPagamento: null,
    dataPrazo: novoPrazo,
    historicoAtividades: historicoAtualizado,
  });

  await updateSintegra(item.id, {
    historicoAtividades: historicoAtualizado,
    dataPrazo: novoPrazo,
    status: statusAjustado,
  });

  toast({
    title: "Atividade desfeita.",
    description: `${item.clienteNome} voltou para ${statusAjustado}.`,
  });

  return;
}

    // ==========================
    // REGISTRAR CONCLUSÃO
    // ==========================

    const prazoDate = new Date(item.dataPrazo + "T00:00:00");
    const conclusaoDate = new Date(hojeStr + "T00:00:00");

    const noPrazo = conclusaoDate <= prazoDate;

    const novaAtividade = {
      id: `${item.id}-${item.dataPrazo}-${Date.now()}`,
      dataPrazo: item.dataPrazo,
      dataConclusao: hojeStr,
      noPrazo,
    };

    const historicoAtualizado = [...historico, novaAtividade];

    const novoPrazo = formatarISO(adicionarMes(item.dataPrazo));

    await updateSintegra(item.id, {
      historicoAtividades: historicoAtualizado,
      dataPrazo: novoPrazo,
      status: "Concluído",
    });

    await excluirNotificacoesItem(item.id, "sintegra");

    toast({
      title: noPrazo
        ? "Atividade concluída no prazo!"
        : "Atividade concluída com atraso!",
      description: `${item.clienteNome} foi marcado como concluído.`,
    });

  } catch (error) {
    toast({
      title: "Erro ao atualizar atividade",
      variant: "destructive",
    });
  }
};

  const handleDeleteHistorico = async (sintegraItem: Sintegra, historicoId: string) => {
    // Encontra a atividade mais recente
    const atividadeMaisRecente = (sintegraItem.historicoAtividades || []).reduce((ultima, atual) => {
      const dataUltima = new Date(ultima.dataPrazo + "T00:00:00");
      const dataAtual = new Date(atual.dataPrazo + "T00:00:00");
      return dataAtual > dataUltima ? atual : ultima;
    });
    
    // Só permite deletar a atividade mais recente
    if (historicoId !== atividadeMaisRecente.id) {
      toast({ 
        title: "Não é possível apagar esta atividade", 
        description: "Você deve apagar as atividades mais recentes primeiro.",
        variant: "destructive" 
      });
      return;
    }
    
    try {
      const historicoAtualizado = (sintegraItem.historicoAtividades || []).filter(
        h => h.id !== historicoId
      );
      
      // Pega a data de prazo da atividade que está sendo apagada
      const atividadeApagada = sintegraItem.historicoAtividades?.find(h => h.id === historicoId);
      const dataPrazoAnterior = atividadeApagada?.dataPrazo || sintegraItem.dataPrazo;

      const statusAjustado = calcularStatusSintegra({
        status: "Pendente",
        dataPagamento: null,
        dataPrazo: dataPrazoAnterior,
        historicoAtividades: historicoAtualizado,
      });

      await updateSintegra(sintegraItem.id, {
        historicoAtividades: historicoAtualizado,
        dataPrazo: dataPrazoAnterior,
        status: statusAjustado,
      });
      
      await refreshSintegras();
      
      toast({
        title: "Atividade removida do histórico.",
        description: `Data de prazo voltou para ${formatarDataBR(dataPrazoAnterior)}.`,
      });
      
      // Fechar o dialog após deletar
      setHistoricoDialogOpen(false);
      setSelectedItemHistorico(null);
    } catch (error) {
      toast({ title: "Erro ao remover do histórico", variant: "destructive" });
    }
  };

  const handleEditHistorico = async (
    sintegraItem: Sintegra,
    historicoId: string,
    novaData: string
  ) => {
    const historicoAtualizado = (sintegraItem.historicoAtividades || []).map(h => {
      if (h.id === historicoId) {
        const prazo = new Date(h.dataPrazo + "T00:00:00");
        const dataConclusao = new Date(novaData + "T00:00:00");
        prazo.setHours(0, 0, 0, 0);
        dataConclusao.setHours(0, 0, 0, 0);
        const noPrazo = dataConclusao <= prazo;
        
        return {
          ...h,
          dataConclusao: novaData,
          noPrazo,
        };
      }
      return h;
    });

    try {
      await updateSintegra(sintegraItem.id, {
        historicoAtividades: historicoAtualizado,
      });
      
      await refreshSintegras();
      
      toast({
        title: "Histórico atualizado.",
      });
      
      // Atualizar o item selecionado
      const sintegraAtualizado = sintegrasRaw.find(s => s.id === sintegraItem.id);
      if (sintegraAtualizado) {
        setSelectedItemHistorico(sintegraAtualizado);
      }
    } catch (error) {
      toast({ title: "Erro ao atualizar histórico", variant: "destructive" });
    }
  };

  const getToggleTitle = (status: Sintegra["status"]) => {
    switch (status) {
      case "Pendente":
      case "Vencido":
        return "Marcar como concluído";
      case "Concluído":
        return "Desfazer conclusão";
      default:
        return "Atualizar status";
    }
  };

  const filteredItems = useMemo(() => {
  return sintegras.filter((item) => {
    const cliente = clientes.find((c) => c.id === item.clienteId);

    // 🔎 Busca por nome
    const matchesSearch =
      item.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase());

    // 👤 Responsável
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      (cliente && cliente.responsavel === searchResponsavel);

    // 📅 Filtro de data
    let matchesData = true;

    if (filtroDataInicio && filtroDataFim) {
      const inicio = new Date(filtroDataInicio + "T00:00:00");
      const fim = new Date(filtroDataFim + "T00:00:00");

      const itemData = new Date(item.dataPrazo + "T00:00:00");

      matchesData = itemData >= inicio && itemData <= fim;
    }

    // 📊 Status
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
  sintegras,
  clientes,
  searchTerm,
  searchResponsavel,
  filtroDataInicio,
  filtroDataFim,
  filtroStatus,
]);

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
        case "dataPrazo":
          comparacao =
            new Date(a.dataPrazo).getTime() -
            new Date(b.dataPrazo).getTime();
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

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sintegra</h1>
            <p className="text-muted-foreground">
              Acompanhe obrigações fiscais SINTEGRA
            </p>
          </div>
          <div className="flex gap-2 items-end">
          <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["sintegra"]} />
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
                Novo Sintegra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" onCloseAutoFocus={e => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar" : "Novo"} Sintegra
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <SelectClienteComBusca
                    clientes={(() => {
                      const clientesFiltrados = clientes.filter((c) => {
                        if (!editingItem) {
                          // Novo registro: não exibir clientes que já possuem Sintegra
                          return !clientesComSintegra.has(c.id);
                        }
                        // Edição: permitir o cliente atual mesmo que já tenha Sintegra
                        return (
                          !clientesComSintegra.has(c.id) ||
                          c.id === editingItem.clienteId
                        );
                      });

                      return [...clientesFiltrados].sort((a, b) =>
                        a.nome.localeCompare(b.nome, "pt-BR", {
                          sensitivity: "base",
                        })
                      );
                    })()}
                    value={formData.clienteId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clienteId: value })
                    }
                    placeholder="Selecione um cliente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataPrazo">Data do Prazo</Label>
                    <Input
                      id="dataPrazo"
                      type="date"
                      value={formData.dataPrazo}
                      onChange={(e) =>
                        setFormData({ ...formData, dataPrazo: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: Sintegra["status"]) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Atrasado">Atrasado</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acesso">
                    Acesso (TeamViewer, AnyDesk, etc.)
                  </Label>
                  <Input
                    id="acesso"
                    value={formData.acesso}
                    onChange={(e) =>
                      setFormData({ ...formData, acesso: e.target.value })
                    }
                    placeholder="Ex: TeamViewer ID: 123456789"
                  />
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
                    placeholder="Ex: Instalado no meu computador (PATRICK)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemplo: Instalado no meu computador (PATRICK)
                  </p>
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
            { value: "Concluído", label: "Concluído" },
            { value: "Vencido", label: "Vencido" },
          ]}
          onStatusChange={(value) =>
            setFiltroStatus(value as Sintegra["status"] | "todos")
          }
          orderValue={`${ordenacao.campo}-${ordenacao.direcao}`}
          orderOptions={[
            { value: "clienteNome-asc", label: "Cliente (A-Z)" },
            { value: "clienteNome-desc", label: "Cliente (Z-A)" },
            { value: "dataPrazo-asc", label: "Data (Mais recente)" },
            { value: "dataPrazo-desc", label: "Data (Mais antigo)" },
            { value: "status-asc", label: "Status (A-Z)" },
            { value: "status-desc", label: "Status (Z-A)" },
          ]}
          onOrderChange={(value) => {
            const [campo, direcao] = value.split("-") as [
              "clienteNome" | "dataPrazo" | "status",
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

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Cliente</th>
                <th className="p-3 text-left text-sm font-medium">
                  Data Prazo
                </th>
                <th className="p-3 text-left text-sm font-medium">Acesso</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{formatarDataBR(item.dataPrazo)}</td>
                  <td className="p-3">{item.acesso || "-"}</td>
                  <td className="p-3">
                    {(() => {
                      const meta = STATUS_META[item.status];
                      const Icon = meta.icon;
                      return (
                        <button
                          type="button"
                          onClick={() => handleToggleAtividade(item)}
                          title={getToggleTitle(item.status)}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            "border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            meta.className
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {meta.label}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {item.historicoAtividades && item.historicoAtividades.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedItemHistorico(item);
                            setHistoricoDialogOpen(true);
                          }}
                          title="Ver histórico de atividades"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
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
              Nenhum Sintegra encontrado
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
            itemLabel="registros"
          />
        </div>
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy={["sintegra"]}
        />
      </div>
      <HistoricoAtividadesDialog
        isOpen={historicoDialogOpen}
        onOpenChange={(open) => {
          setHistoricoDialogOpen(open);
          if (!open) setSelectedItemHistorico(null);
        }}
        item={selectedItemHistorico}
        onDeleteHistorico={handleDeleteHistorico}
        onEditHistorico={handleEditHistorico}
      />
      {ConfirmationDialogComponent}
    </Layout>
  );
}
