import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useRenovacao } from "@/hooks/useRenovacao";
import { Renovacao } from "@/types/crm";
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
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { formatarDataBR } from "@/lib/utils";
import { StatusSelect } from "@/components/StatusSelect";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { generateRenovacaoPDF, generateRenovacaoExcel } from "@/lib/pdfGenerator";
import { Download, FileSpreadsheet } from "lucide-react";

export default function RenovacaoPage() {
  const { clientes } = useClientes();
  const { renovacoes, createRenovacao, updateRenovacao, deleteRenovacao, refresh } =
    useRenovacao();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();

  // Função para gerar PDF
  const handleGeneratePDF = async () => {
    await generateRenovacaoPDF(filteredItems, {
      title: "Relatório de Renovações",
      filename: `renovacoes-${new Date().toISOString().split('T')[0]}.pdf`,
      dateRange: filtroDataInicio && filtroDataFim ? {
        start: filtroDataInicio,
        end: filtroDataFim
      } : undefined
    });
  };

  // Função para gerar Excel
  const handleGenerateExcel = () => {
    generateRenovacaoExcel(filteredItems, {
      title: "Relatório de Renovações",
      filename: `renovacoes-${new Date().toISOString().split('T')[0]}.xlsx`,
      dateRange: filtroDataInicio && filtroDataFim ? {
        start: filtroDataInicio,
        end: filtroDataFim
      } : undefined
    });
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Renovacao["status"] | "todos"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataRenovacao" | "valorRenovacao" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "dataRenovacao", direcao: "asc" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Renovacao | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { toast } = useToast();

  // Lista de IDs de clientes que já têm renovação cadastrada
  const clientesComRenovacao = useMemo(
    () => new Set(renovacoes.map((r) => r.clienteId)),
    [renovacoes]
  );

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(clientes.map((cliente) => cliente.responsavel))
      ).sort(),
    [clientes]
  );

  const [formData, setFormData] = useState({
    clienteId: "",
    dataRenovacao: "",
    valorRenovacao: "",
    status: "Pendente" as Renovacao["status"],
    parcela: null as Renovacao["parcela"],
    observacoes: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cliente = clientes.find((c) => c.id === formData.clienteId);
    if (!cliente) {
      toast({ title: "Cliente não encontrado!", variant: "destructive" });
      return;
    }

    let dataRenovacao = formData.dataRenovacao;

    // Regra de negócio: quando status mudar para Renovado, adicionar 1 ano à data
    if (
      editingItem &&
      formData.status === "Renovado" &&
      editingItem.status !== "Renovado"
    ) {
      const currentDate = new Date(formData.dataRenovacao);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      dataRenovacao = currentDate.toISOString().split("T")[0];
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
          parcela: formData.status === "Parcelado" ? formData.parcela : null,
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
          parcela: formData.status === "Parcelado" ? formData.parcela : null,
          observacoes: formData.observacoes,
          ativo: true,
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
        variant: "destructive"
      }
    );
  };

  const filteredItems = renovacoes.filter((item) => {
    const cliente = clientes.find((c) => c.id === item.clienteId);
    const matchesSearch =
      item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      (cliente && cliente.responsavel === searchResponsavel);

    // Filtro por data
    const itemData = new Date(item.dataRenovacao);
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
        case "dataRenovacao":
          comparacao =
            new Date(a.dataRenovacao).getTime() -
            new Date(b.dataRenovacao).getTime();
          break;
        case "valorRenovacao":
          comparacao = a.valorRenovacao - b.valorRenovacao;
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

  // Cálculo de totais por status
  const totaisPorStatus = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        if (item.status === "Renovado") {
          acc.renovado += item.valorRenovacao;
        } else if (item.status === "Pendente") {
          acc.pendente += item.valorRenovacao;
        } else if (item.status === "Em Negociação") {
          acc.negociacao += item.valorRenovacao;
        } else if (item.status === "Parcelado") {
          acc.parcelado += item.valorRenovacao;
        } else if (item.status === "Avisado") {
          acc.avisado += item.valorRenovacao;
        }
        return acc;
      },
      {
        renovado: 0,
        pendente: 0,
        negociacao: 0,
        parcelado: 0,
        avisado: 0,
      }
    );
  }, [filteredItems]);

  // Total geral
  const totalGeral = useMemo(() => {
    return Object.values(totaisPorStatus).reduce((acc, val) => acc + val, 0);
  }, [totaisPorStatus]);

 // Lista ordenada das opções do select
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



  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Renovação</h1>
            <p className="text-muted-foreground">
              Acompanhe renovações de serviços
            </p>
          </div>
          <div className="flex gap-2 items-end">
          <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["renovacao"]} />
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={filteredItems.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateExcel}
            disabled={filteredItems.length === 0}
          >
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar" : "Nova"} Renovação
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clienteId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const clientesFiltrados = clientes.filter((c) => {
                          if (!editingItem) {
                            // Novo registro: não exibir clientes que já possuem renovação
                            return !clientesComRenovacao.has(c.id);
                          }
                          // Edição: permitir o cliente atual mesmo que já tenha renovação
                          return (
                            !clientesComRenovacao.has(c.id) ||
                            c.id === editingItem.clienteId
                          );
                        });

                        const ordenados = [...clientesFiltrados].sort((a, b) =>
                          a.nome.localeCompare(b.nome, "pt-BR", {
                            sensitivity: "base",
                          })
                        );

                        return ordenados.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome} - {cliente.cnpj}
                          </SelectItem>
                        ));
                      })()}
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataRenovacao: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valorRenovacao: e.target.value,
                        })
                      }
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
                        parcela:
                          value === "Parcelado" ? formData.parcela : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Avisado">Avisado</SelectItem>
                      <SelectItem value="Em Negociação">
                        Em Negociação
                      </SelectItem>
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
              <Label
                htmlFor="filtro-data-inicio"
                className="text-xs text-muted-foreground"
              >
                Data Início
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
                Data Fim
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
                  setFiltroStatus(value as Renovacao["status"] | "todos")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Avisado">Avisado</SelectItem>
                  <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                  <SelectItem value="Parcelado">Parcelado</SelectItem>
                  <SelectItem value="Renovado">Renovado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
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
                    "clienteNome" | "dataRenovacao" | "valorRenovacao" | "status",
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
                  <SelectItem value="dataRenovacao-asc">
                    Data (Mais recente)
                  </SelectItem>
                  <SelectItem value="dataRenovacao-desc">
                    Data (Mais antigo)
                  </SelectItem>
                  <SelectItem value="valorRenovacao-desc">
                    Valor (Maior)
                  </SelectItem>
                  <SelectItem value="valorRenovacao-asc">
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
            Total de Renovações: R${" "}
            {totalGeral.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </p>
          {/* Detalhamento por status */}
          <div className="mt-3 pt-3 border-t border-primary-foreground/20 text-xs space-y-1">
            <p>
              Renovado: R${" "}
              {totaisPorStatus.renovado.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p>
              Pendente: R${" "}
              {totaisPorStatus.pendente.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p>
              Em Negociação: R${" "}
              {totaisPorStatus.negociacao.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p>
              Parcelados: R${" "}
              {totaisPorStatus.parcelado.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
            {totaisPorStatus.avisado > 0 && (
              <p>
                Avisado: R${" "}
                {totaisPorStatus.avisado.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Cliente</th>
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">
                  Data Renovação
                </th>
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
                    R${" "}
                    {item.valorRenovacao.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <StatusSelect
                        item={item}
                        onUpdateStatus={updateRenovacao}
                        onStatusChange={refresh}
                        statusOptions={STATUS_OPTIONS}
                      />
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
