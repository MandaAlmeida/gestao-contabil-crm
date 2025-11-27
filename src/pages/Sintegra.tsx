import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useSintegra } from "@/hooks/useSintegra";
import { Cliente, Sintegra } from "@/types/crm";
import { Plus, Search, Edit, Trash2, Clock3, CheckCircle } from "lucide-react";
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
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { cn, formatarDataBR } from "@/lib/utils";

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
};

export default function SintegraPage() {
  const { clientes } = useClientes();
  const { sintegras, createSintegra, updateSintegra, deleteSintegra } =
    useSintegra();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Sintegra["status"] | "todos"
  >("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sintegra | null>(null);
  const { toast } = useToast();

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(clientes.map((cliente) => cliente.responsavel))
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

    let dataPrazo = formData.dataPrazo;

    // Regra de negócio: quando status mudar para Concluído, avançar para próximo período (mês seguinte)
    if (
      editingItem &&
      formData.status === "Concluído" &&
      editingItem.status !== "Concluído"
    ) {
      const currentDate = new Date(formData.dataPrazo);
      currentDate.setMonth(currentDate.getMonth() + 1);
      dataPrazo = currentDate.toISOString().split("T")[0];
    }

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
    if (confirm("Tem certeza que deseja excluir este Sintegra?")) {
      try {
        await deleteSintegra(id);
        toast({ title: "Sintegra excluído com sucesso!" });
      } catch (error) {
        toast({ title: "Erro ao excluir sintegra", variant: "destructive" });
      }
    }
  };

  const handleToggleStatus = async (item: Sintegra) => {
    let novoStatus: Sintegra["status"];
    let novaDataPrazo = item.dataPrazo;

    if (item.status === "Pendente") {
      novoStatus = "Concluído";
      novaDataPrazo = formatarISO(adicionarMes(item.dataPrazo));
    } else {
      novoStatus = "Pendente";
      novaDataPrazo = formatarISO(removerMes(item.dataPrazo));
    }

    try {
      await updateSintegra(item.id, {
        status: novoStatus,
        dataPrazo: novaDataPrazo,
      });

      toast({
        title: "Status atualizado!",
        description:
          novoStatus === "Concluído"
            ? `${item.clienteNome} concluído. Novo prazo: ${formatarDataBR(
                novaDataPrazo
              )}.`
            : `${item.clienteNome} voltou para pendente.`,
      });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const getToggleTitle = (status: Sintegra["status"]) => {
    switch (status) {
      case "Pendente":
        return "Marcar como concluído";
      case "Concluído":
        return "Reabrir como pendente";
      default:
        return "Atualizar status";
    }
  };

  const filteredItems = sintegras.filter((item) => {
    const cliente = clientes.find((c) => c.id === item.clienteId);
    const matchesSearch = item.clienteNome
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      (cliente && cliente.responsavel === searchResponsavel);

    // Filtro por data
    const itemData = new Date(item.dataPrazo);
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
  } = usePagination(filteredItems, 10);

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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar" : "Novo"} Sintegra
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
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  setFiltroStatus(value as Sintegra["status"] | "todos")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
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
                          onClick={() => handleToggleStatus(item)}
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
      </div>
    </Layout>
  );
}
