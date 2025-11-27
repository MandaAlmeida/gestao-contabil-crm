import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useCertificados } from "@/hooks/useCertificados";
import { Cliente, Certificado } from "@/types/crm";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  Clock3,
  AlertTriangle,
  UserPlus,
  Users,
} from "lucide-react";
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
import {
  normalizarCertificados,
  calcularStatusCertificado,
} from "@/lib/certificados";
import { cn, formatarTelefone } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

const adicionarAno = (data?: string) => {
  const baseDate = data ? new Date(data) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return new Date();
  }
  const novaData = new Date(baseDate);
  novaData.setFullYear(novaData.getFullYear() + 1);
  return novaData;
};

const removerAno = (data: string) => {
  const baseDate = data ? new Date(data) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return new Date();
  }
  const novaData = new Date(baseDate);
  novaData.setFullYear(novaData.getFullYear() - 1);
  return novaData;
};

const formatarISO = (date: Date) => date.toISOString().split("T")[0];

const STATUS_META: Record<
  Certificado["status"],
  { label: string; className: string; icon: LucideIcon }
> = {
  Válido: {
    label: "Válido",
    className: "bg-success/10 text-success hover:bg-success/20",
    icon: CheckCircle,
  },
  "A Vencer": {
    label: "A vencer",
    className: "bg-warning/10 text-warning hover:bg-warning/20",
    icon: Clock3,
  },
  Vencido: {
    label: "Vencido",
    className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    icon: AlertTriangle,
  },
};

const getToggleTitle = (status: Certificado["status"]) => {
  switch (status) {
    case "Válido":
      return "Reverter vigência";
    case "A Vencer":
      return "Renovar certificado";
    case "Vencido":
      return "Renovar certificado";
    default:
      return "Atualizar status";
  }
};

export default function Certificados() {
  const { clientes } = useClientes();
  const {
    certificados: certificadosRaw,
    createCertificado,
    updateCertificado,
    deleteCertificado,
  } = useCertificados();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Certificado["status"] | "todos"
  >("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Certificado | null>(null);
  const [modoCliente, setModoCliente] = useState<"existente" | "novo">(
    "existente"
  );
  const { toast } = useToast();

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(clientes.map((cliente) => cliente.responsavel))
      ).sort(),
    [clientes]
  );

  const certificadosNormalizados = useMemo(
    () => normalizarCertificados(certificadosRaw),
    [certificadosRaw]
  );

  const [formData, setFormData] = useState({
    clienteId: "",
    tipoCertificado: "A1" as Certificado["tipoCertificado"],
    dataVencimento: "",
    status: "Válido" as Certificado["status"],
    observacoes: "",
  });

  const [novoClienteData, setNovoClienteData] = useState({
    nome: "",
    cnpj: "",
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      tipoCertificado: "A1",
      dataVencimento: "",
      status: "Válido",
      observacoes: "",
    });
    setNovoClienteData({
      nome: "",
      cnpj: "",
    });
    setModoCliente("existente");
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let clienteNome = "";
    let clienteCNPJ = "";
    let clienteId = "";

    // Se estiver no modo "novo cliente", usar os dados preenchidos manualmente
    if (modoCliente === "novo") {
      if (!novoClienteData.nome || !novoClienteData.cnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha pelo menos o nome e CNPJ/CPF.",
          variant: "destructive",
        });
        return;
      }

      // Usar dados preenchidos manualmente (não criar cliente na base)
      clienteNome = novoClienteData.nome;
      clienteCNPJ = novoClienteData.cnpj;
      clienteId = `manual-${Date.now()}`; // ID temporário para identificar que não é um cliente cadastrado
    } else {
      // Modo cliente existente - buscar dados do cliente
      const cliente = clientes.find((c) => c.id === formData.clienteId);
      if (!cliente) {
        toast({ title: "Cliente não encontrado!", variant: "destructive" });
        return;
      }
      clienteNome = cliente.nome;
      clienteCNPJ = cliente.cnpj;
      clienteId = cliente.id;
    }

    let dataVencimento = formData.dataVencimento;

    // Regra de negócio: quando status mudar para Válido, adicionar 1 ano à data
    if (
      editingItem &&
      formData.status === "Válido" &&
      editingItem.status !== "Válido"
    ) {
      const currentDate = new Date(formData.dataVencimento);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      dataVencimento = currentDate.toISOString().split("T")[0];
    }

    try {
      if (editingItem) {
        await updateCertificado(editingItem.id, {
          clienteId: clienteId,
          clienteNome: clienteNome,
          clienteCNPJ: clienteCNPJ,
          tipoCertificado: formData.tipoCertificado,
          dataVencimento,
          status: formData.status,
          observacoes: formData.observacoes,
        });
        toast({ title: "Certificado atualizado com sucesso!" });
      } else {
        await createCertificado({
          clienteId: clienteId,
          clienteNome: clienteNome,
          clienteCNPJ: clienteCNPJ,
          tipoCertificado: formData.tipoCertificado,
          dataVencimento,
          status: formData.status,
          observacoes: formData.observacoes,
          ativo: true,
        });
        toast({
          title: "Certificado adicionado com sucesso!",
          description:
            modoCliente === "novo"
              ? "Certificado criado com dados informados manualmente."
              : undefined,
        });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar certificado", variant: "destructive" });
    }
  };

  const handleEdit = (item: Certificado) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      tipoCertificado: item.tipoCertificado,
      dataVencimento: item.dataVencimento,
      status: item.status,
      observacoes: item.observacoes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este certificado?")) {
      try {
        await deleteCertificado(id);
        toast({ title: "Certificado excluído com sucesso!" });
      } catch (error) {
        toast({ title: "Erro ao excluir certificado", variant: "destructive" });
      }
    }
  };

  const filteredItems = certificadosNormalizados.filter((item) => {
    const cliente = clientes.find((c) => c.id === item.clienteId);
    const matchesSearch =
      item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clienteCNPJ.includes(searchTerm);
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      (cliente && cliente.responsavel === searchResponsavel);

    // Filtro por data
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
  } = usePagination(filteredItems, 10);

  const handleToggleStatus = async (item: Certificado) => {
    const registroAtual =
      certificadosRaw.find((cert) => cert.id === item.id) ?? item;

    if (registroAtual.status === "Válido") {
      const dataAnterior = formatarISO(
        removerAno(registroAtual.dataVencimento)
      );
      const statusRecalculado = calcularStatusCertificado({
        dataVencimento: dataAnterior,
      });

      try {
        await updateCertificado(item.id, {
          status: statusRecalculado,
          dataVencimento: dataAnterior,
        });
        toast({
          title: "Status revertido.",
          description:
            statusRecalculado === "Vencido"
              ? `${registroAtual.clienteNome} voltou a ficar vencido.`
              : `${registroAtual.clienteNome} agora está a vencer.`,
        });
      } catch (error) {
        toast({ title: "Erro ao atualizar status", variant: "destructive" });
      }
      return;
    }

    const novoVencimento = formatarISO(adicionarAno());

    try {
      await updateCertificado(item.id, {
        status: "Válido",
        dataVencimento: novoVencimento,
      });
      toast({
        title: "Certificado renovado!",
        description: `${registroAtual.clienteNome} está válido até ${new Date(
          novoVencimento
        ).toLocaleDateString("pt-BR")}.`,
      });
    } catch (error) {
      toast({ title: "Erro ao renovar certificado", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Certificados</h1>
            <p className="text-muted-foreground">
              Gerencie certificados digitais
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
                Novo Certificado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar" : "Novo"} Certificado
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clienteId">Cliente</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setModoCliente(
                          modoCliente === "existente" ? "novo" : "existente"
                        )
                      }
                      className="h-8"
                    >
                      {modoCliente === "existente" ? (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Novo Cliente
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-4 w-4" />
                          Cliente Existente
                        </>
                      )}
                    </Button>
                  </div>

                  {modoCliente === "existente" ? (
                    <Select
                      value={formData.clienteId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, clienteId: value })
                      }
                      required
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
                  ) : (
                    <div className="space-y-3 p-4 border rounded-md bg-muted/30">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="novo-cliente-nome">Nome *</Label>
                          <Input
                            id="novo-cliente-nome"
                            value={novoClienteData.nome}
                            onChange={(e) =>
                              setNovoClienteData({
                                ...novoClienteData,
                                nome: e.target.value,
                              })
                            }
                            required
                            placeholder="Nome do cliente/pessoa"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="novo-cliente-cnpj">CNPJ/CPF *</Label>
                          <Input
                            id="novo-cliente-cnpj"
                            value={novoClienteData.cnpj}
                            onChange={(e) =>
                              setNovoClienteData({
                                ...novoClienteData,
                                cnpj: e.target.value,
                              })
                            }
                            required
                            placeholder="00.000.000/0000-00 ou 000.000.000-00"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        * Apenas os campos Nome e CNPJ/CPF são obrigatórios. Os
                        demais campos são opcionais e não serão salvos como
                        cliente.
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipoCertificado">Tipo de Certificado</Label>
                    <Select
                      value={formData.tipoCertificado}
                      onValueChange={(value: Certificado["tipoCertificado"]) =>
                        setFormData({ ...formData, tipoCertificado: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A3">A3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Certificado["status"]) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Válido">Válido</SelectItem>
                      <SelectItem value="A Vencer">A Vencer</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
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
                  setFiltroStatus(value as Certificado["status"] | "todos")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Válido">Válido</SelectItem>
                  <SelectItem value="A Vencer">A Vencer</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">Tipo</th>
                <th className="p-3 text-left text-sm font-medium">
                  Vencimento
                </th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.clienteNome}</td>
                  <td className="p-3">{item.clienteCNPJ}</td>
                  <td className="p-3">{item.tipoCertificado}</td>
                  <td className="p-3">
                    {new Date(item.dataVencimento).toLocaleDateString("pt-BR")}
                  </td>
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
              Nenhum certificado encontrado
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
            itemLabel="certificados"
          />
        </div>
      </div>
    </Layout>
  );
}
