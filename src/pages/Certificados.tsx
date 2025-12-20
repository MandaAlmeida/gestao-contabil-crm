import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useCertificados } from "@/hooks/useCertificados";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Cliente, Certificado } from "@/types/crm";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Users,
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
  normalizarCertificados,
  calcularStatusCertificado,
} from "@/lib/certificados";
import { formatarDataBR } from "@/lib/utils";
import { CertificadoStatusButton, type CertificadoStatusMeta } from "@/components/CertificadoStatusButton";
import { CheckCircle, Clock3, AlertTriangle } from "lucide-react";
import { cn, formatarTelefone } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { StatusSelect } from "@/components/StatusSelect";

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

export default function Certificados() {
  const { clientes } = useClientes();
  const {
    certificados: certificadosRaw,
    createCertificado,
    updateCertificado,
    deleteCertificado,
    refresh,
  } = useCertificados();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    Certificado["status"] | "todos"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "clienteNome" | "dataVencimento" | "tipoCertificado" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "dataVencimento", direcao: "asc" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Certificado | null>(null);
  const [modoCliente, setModoCliente] = useState<"existente" | "novo">(
    "existente"
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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

  // Lista de IDs de clientes que já têm certificados cadastrados
  const clientesComCertificado = useMemo(
    () => new Set(certificadosNormalizados.map((c) => c.clienteId)),
    [certificadosNormalizados]
  );

  const [formData, setFormData] = useState({
    clienteId: "",
    tipoCertificado: "A1" as Certificado["tipoCertificado"],
    dataVencimento: "",
    status: "Pendente" as Certificado["status"],
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
      status: "Pendente",
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

    // Regra de negócio: quando status mudar para Renovado, adicionar 1 ano à data
    if (
      editingItem &&
      formData.status === "Renovado" &&
      editingItem.status !== "Renovado"
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
    showConfirmation(
      "Excluir Certificado",
      "Tem certeza que deseja excluir este certificado? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteCertificado(id);
          toast({ title: "Certificado excluído com sucesso!" });
        } catch (error) {
          toast({ title: "Erro ao excluir certificado", variant: "destructive" });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      }
    );
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
        case "tipoCertificado":
          comparacao = a.tipoCertificado.localeCompare(
            b.tipoCertificado,
            "pt-BR",
            { sensitivity: "base" }
          );
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

  const STATUS_OPTIONS = [
    { value: "Pendente", label: "Pendente" },
    { value: "Avisado", label: "Avisado" },
    { value: "Renovado", label: "Renovado" },
  ];

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
          <div className="flex w-auto gap-2 items-end">
              <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy="certificados" />
            
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
                        {(() => {
                          // Clientes disponíveis para seleção no formulário:
                          // - Novo certificado: não listar clientes que já possuem certificado
                          // - Edição: permitir o cliente atual mesmo que já tenha certificado
                          const clientesFiltrados = clientes.filter((c) => {
                            if (!editingItem) {
                              return !clientesComCertificado.has(c.id);
                            }
                            return (
                              !clientesComCertificado.has(c.id) ||
                              c.id === editingItem.clienteId
                            );
                          });

                          const clientesOrdenados = [...clientesFiltrados].sort(
                            (a, b) =>
                              a.nome.localeCompare(b.nome, "pt-BR", {
                                sensitivity: "base",
                              })
                          );

                          return clientesOrdenados.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome} - {cliente.cnpj}
                            </SelectItem>
                          ));
                        })()}
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
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Avisado">Avisado</SelectItem>
                      <SelectItem value="Renovado">Renovado</SelectItem>
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
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Avisado">Avisado</SelectItem>
                  <SelectItem value="Renovado">Renovado</SelectItem>
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
                    "clienteNome" | "dataVencimento" | "tipoCertificado" | "status",
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
                  <SelectItem value="tipoCertificado-asc">
                    Tipo (A-Z)
                  </SelectItem>
                  <SelectItem value="tipoCertificado-desc">
                    Tipo (Z-A)
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
                  <td className="p-3">{formatarDataBR(item.dataVencimento)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                    <StatusSelect
                        item={item}
                        onUpdateStatus={updateCertificado}
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
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy="certificados"
        />
      </div>
      {ConfirmationDialogComponent}
    </Layout>
  );
}
