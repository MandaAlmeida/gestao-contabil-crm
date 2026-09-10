import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useCertificados } from "@/hooks/useCertificados";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Certificado } from "@/types/crm";
import {
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Users,
  History, // <-- Importando ícone de Histórico
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
import { normalizarCertificados } from "@/lib/certificados";
import { formatarDataBR, matchesClienteSearch } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { StatusSelect } from "@/components/StatusSelect";
import { FiltersBar } from "@/components/FiltersBar";
import { SelectClienteComBusca } from "@/components/SelectClienteComBusca";
import { HistoricoRenovacoesDialog } from "@/components/HistoricoRenovacoesDialog";

export default function Certificados() {
  const { clientes } = useClientes();
  const {
    certificados: certificadosRaw,
    createCertificado,
    updateCertificado,
    deleteCertificado,
    refresh,
  } = useCertificados();
  const { showConfirmation, ConfirmationDialogComponent } =
    useConfirmationDialog();

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
    "existente",
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // States para o Histórico de Renovações
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedItemHistorico, setSelectedItemHistorico] =
    useState<Certificado | null>(null);

  const { toast } = useToast();

  const responsaveisDisponiveis = useMemo(
    () => Array.from(new Set(clientes.map((c) => c.responsavel))).sort(),
    [clientes],
  );
  const certificadosNormalizados = useMemo(
    () => normalizarCertificados(certificadosRaw),
    [certificadosRaw],
  );
  const clientesComCertificado = useMemo(
    () => new Set(certificadosNormalizados.map((c) => c.clienteId)),
    [certificadosNormalizados],
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
    setNovoClienteData({ nome: "", cnpj: "" });
    setModoCliente("existente");
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let clienteNome = "";
    let clienteCNPJ = "";
    let clienteId = "";

    if (modoCliente === "novo") {
      if (!novoClienteData.nome || !novoClienteData.cnpj) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha pelo menos o nome e CNPJ/CPF.",
          variant: "destructive",
        });
        return;
      }
      clienteNome = novoClienteData.nome;
      clienteCNPJ = novoClienteData.cnpj;
      clienteId = `manual-${Date.now()}`;
    } else {
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
    let historicoAtual = editingItem?.historicoRenovacoes || [];

    // REGRA DE RENOVAÇÃO NO FORMULÁRIO
    if (
      editingItem &&
      formData.status === "Renovado" &&
      editingItem.status !== "Renovado"
    ) {
      const currentDate = new Date(formData.dataVencimento);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      dataVencimento = currentDate.toISOString().split("T")[0];

      const novaRenovacao = {
        id: `renov-${Date.now()}`,
        dataRenovacao: new Date().toISOString().split("T")[0],
        vencimentoAnterior: formData.dataVencimento,
        novoVencimento: dataVencimento,
      };
      historicoAtual = [...historicoAtual, novaRenovacao];
    }

    try {
      if (editingItem) {
        await updateCertificado(editingItem.id, {
          clienteId,
          clienteNome,
          clienteCNPJ,
          tipoCertificado: formData.tipoCertificado,
          dataVencimento,
          status: formData.status,
          observacoes: formData.observacoes,
          historicoRenovacoes: historicoAtual,
        });
        toast({ title: "Certificado atualizado com sucesso!" });
      } else {
        await createCertificado({
          clienteId,
          clienteNome,
          clienteCNPJ,
          tipoCertificado: formData.tipoCertificado,
          dataVencimento,
          status: formData.status,
          observacoes: formData.observacoes,
          ativo: true,
        });
        toast({ title: "Certificado adicionado com sucesso!" });
      }

      resetForm();
      setIsDialogOpen(false);
      refresh();
    } catch (error) {
      toast({ title: "Erro ao salvar certificado", variant: "destructive" });
    }
  };

  // REGRA DE RENOVAÇÃO DIRETO PELA TABELA (StatusSelect)
  const handleUpdateStatusTable = async (
    id: string,
    updates: Partial<Certificado>,
  ) => {
    const item = certificadosRaw.find((c) => c.id === id);
    if (!item) return;

    let payload = { ...updates };

    if (updates.status === "Renovado" && item.status !== "Renovado") {
      const baseDate = new Date(item.dataVencimento);
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      const novaData = baseDate.toISOString().split("T")[0];

      payload.dataVencimento = novaData;
      payload.historicoRenovacoes = [
        ...(item.historicoRenovacoes || []),
        {
          id: `renov-${Date.now()}`,
          dataRenovacao: new Date().toISOString().split("T")[0],
          vencimentoAnterior: item.dataVencimento,
          novoVencimento: novaData,
        },
      ];
      toast({ title: "Certificado renovado! 1 ano adicionado." });
    }

    await updateCertificado(id, payload);
    refresh();
  };

  // Funções para manipular histórico dentro do Dialog
  const handleDeleteHistorico = async (
    item: Certificado,
    historicoId: string,
  ) => {
    const historico = item.historicoRenovacoes || [];
    const renovacaoApagada = historico.find((h) => h.id === historicoId);
    const historicoAtualizado = historico.filter((h) => h.id !== historicoId);

    // Volta a data para antes da renovação
    const dataVencimentoRevertida = renovacaoApagada
      ? renovacaoApagada.vencimentoAnterior
      : item.dataVencimento;

    await updateCertificado(item.id, {
      historicoRenovacoes: historicoAtualizado,
      dataVencimento: dataVencimentoRevertida,
      status: "Pendente", // Volta pra pendente para indicar que precisa renovar
    });

    toast({ title: "Renovação desfeita com sucesso!" });
    refresh();
    setHistoricoDialogOpen(false);
  };

  const handleEditHistorico = async (
    item: Certificado,
    historicoId: string,
    novaDataRenovacao: string,
  ) => {
    const historico = item.historicoRenovacoes || [];
    const historicoAtualizado = historico.map((h) =>
      h.id === historicoId ? { ...h, dataRenovacao: novaDataRenovacao } : h,
    );
    await updateCertificado(item.id, {
      historicoRenovacoes: historicoAtualizado,
    });
    refresh();
  };

  const handleEdit = (item: Certificado) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      tipoCertificado: item.tipoCertificado,
      dataVencimento: item.dataVencimento,
      status: item.status,
      observacoes: item.observacoes || "",
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
          refresh();
        } catch (error) {
          toast({
            title: "Erro ao excluir certificado",
            variant: "destructive",
          });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive",
      },
    );
  };

  const filteredItems = useMemo(() => {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    };

    const clientesMap = new Map(clientes.map((c) => [c.id, c]));

    return certificadosNormalizados.filter((item) => {
      const cliente = clientesMap.get(item.clienteId);
      const matchesSearch = matchesClienteSearch(item.clienteNome, item.clienteCNPJ, searchTerm);
      const matchesResponsavel =
        searchResponsavel === "todos" ||
        (cliente && cliente.responsavel === searchResponsavel);

      const itemData = parseDate(item.dataVencimento);
      const dataInicio = parseDate(filtroDataInicio);
      const dataFim = parseDate(filtroDataFim);
      const matchesDataInicio =
        !dataInicio || (itemData && itemData >= dataInicio);
      const matchesDataFim = !dataFim || (itemData && itemData <= dataFim);

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
  }, [
    certificadosNormalizados,
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
            { sensitivity: "base" },
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
        {/* ... (O cabeçalho e os filtros permanecem exatamente iguais) ... */}
        <div className="mb-8 flex items-center justify-between">
          {/* OMITIDO PARA BREVIDADE (Seu JSX padrão) */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Certificados</h1>
            <p className="text-muted-foreground">
              Gerencie certificados digitais
            </p>
          </div>
          <div className="flex w-auto gap-2 items-end">
            <NotificationButton
              onClick={() => setNotificationsOpen(true)}
              filterBy={["certificado"]}
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
                  Novo Certificado
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-2xl"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Editar" : "Novo"} Certificado
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ... (O Modal de Formulário continua o mesmo) ... */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="clienteId">Cliente</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setModoCliente(
                            modoCliente === "existente" ? "novo" : "existente",
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
                      <SelectClienteComBusca
                        clientes={(() => {
                          const clientesFiltrados = clientes.filter((c) => {
                            if (!editingItem) {
                              return !clientesComCertificado.has(c.id);
                            }
                            return (
                              !clientesComCertificado.has(c.id) ||
                              c.id === editingItem.clienteId
                            );
                          });

                          return [...clientesFiltrados].sort((a, b) =>
                            a.nome.localeCompare(b.nome, "pt-BR", {
                              sensitivity: "base",
                            }),
                          );
                        })()}
                        value={formData.clienteId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, clienteId: value })
                        }
                        placeholder="Selecione um cliente"
                      />
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
                            <Label htmlFor="novo-cliente-cnpj">
                              CNPJ/CPF *
                            </Label>
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
                          * Apenas os campos Nome e CNPJ/CPF são obrigatórios.
                          Os demais campos são opcionais e não serão salvos como
                          cliente.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipoCertificado">
                        Tipo de Certificado
                      </Label>
                      <Select
                        value={formData.tipoCertificado}
                        onValueChange={(
                          value: Certificado["tipoCertificado"],
                        ) =>
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
                        setFormData({
                          ...formData,
                          observacoes: e.target.value,
                        })
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
          // ... (Filtros permanecem os mesmos) ...
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
            { value: "Renovado", label: "Renovado" },
          ]}
          onStatusChange={(value) =>
            setFiltroStatus(value as Certificado["status"] | "todos")
          }
          orderValue={`${ordenacao.campo}-${ordenacao.direcao}`}
          orderOptions={[
            { value: "clienteNome-asc", label: "Cliente (A-Z)" },
            { value: "clienteNome-desc", label: "Cliente (Z-A)" },
            { value: "dataVencimento-asc", label: "Vencimento (Mais recente)" },
            { value: "dataVencimento-desc", label: "Vencimento (Mais antigo)" },
            { value: "tipoCertificado-asc", label: "Tipo (A-Z)" },
            { value: "tipoCertificado-desc", label: "Tipo (Z-A)" },
            { value: "status-asc", label: "Status (A-Z)" },
            { value: "status-desc", label: "Status (Z-A)" },
          ]}
          onOrderChange={(value) => {
            const [campo, direcao] = value.split("-") as [
              "clienteNome" | "dataVencimento" | "tipoCertificado" | "status",
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
                        onUpdateStatus={handleUpdateStatusTable} // <-- Modificado aqui para chamar a função que trata renovação
                        onStatusChange={refresh}
                        statusOptions={STATUS_OPTIONS}
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {/* BOTÃO DE HISTÓRICO NOVO AQUI */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedItemHistorico(item);
                          setHistoricoDialogOpen(true);
                        }}
                        title="Ver histórico de renovações"
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
          filterBy={["certificado"]}
        />
      </div>

      {/* DIALOG DE HISTÓRICO AQUI EMBAIXO */}
      <HistoricoRenovacoesDialog
        isOpen={historicoDialogOpen}
        onOpenChange={setHistoricoDialogOpen}
        item={selectedItemHistorico}
        onDeleteHistorico={handleDeleteHistorico}
        onEditHistorico={handleEditHistorico}
      />

      {ConfirmationDialogComponent}
    </Layout>
  );
}
