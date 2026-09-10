import { useMemo, useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { deleteClienteWithRelations } from "@/lib/firestore/deleteClienteWithRelations";
import { useContabilidades } from "@/hooks/useContabilidades";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useAuth } from "@/contexts/AuthContext";
import { createUsuarioIfNotExists } from "@/lib/firestore/usuarios";
import { Cliente, Contabilidade } from "@/types/crm";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox"; // <-- NOVO: Import do Checkbox
import { useToast } from "@/hooks/use-toast";
import { formatarTelefone, matchesClienteSearch } from "@/lib/utils";
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

export default function Clientes() {
  const {
    clientes,
    createCliente,
    updateCliente,
    deleteCliente,
    loading: clientesLoading,
    refresh: refreshClientes,
  } = useClientes();
  const {
    contabilidades,
    createContabilidade,
    updateContabilidade,
    deleteContabilidade,
    loading: contabilidadesLoading,
  } = useContabilidades();
  const {
    usuarios,
    loading: usuariosLoading,
    refresh: refreshUsuarios,
  } = useUsuarios();
  const { user } = useAuth();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "nome" | "cnpj" | "cidade" | "responsavel";
    direcao: "asc" | "desc";
  }>({ campo: "nome", direcao: "asc" });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isContabilidadeDialogOpen, setIsContabilidadeDialogOpen] = useState(false);
  const [isGerenciarContabilidadesOpen, setIsGerenciarContabilidadesOpen] = useState(false);
  const [editingContabilidade, setEditingContabilidade] = useState<Contabilidade | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);

  const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "Erro desconhecido ao salvar cliente.";

  const handleMigrarParaFiscal = async () => {
    showConfirmation(
      "Migração em Lote",
      "Tem certeza que deseja marcar TODOS os clientes existentes como 'Fiscal'? Esta ação atualizará o banco de dados.",
      async () => {
        setIsMigrating(true);
        try {
          let atualizados = 0;
          
          // Cria um array de promessas para atualizar os clientes simultaneamente
          const promises = clientes.map(cliente => {
            // Só atualiza os que ainda não estão marcados (economiza leituras/gravações no Firebase)
            if (!cliente.isFiscal) {
              atualizados++;
              return updateCliente(cliente.id, { isFiscal: true });
            }
            return Promise.resolve();
          });

          await Promise.all(promises);
          
          toast({ 
            title: "Migração concluída!", 
            description: `${atualizados} clientes foram marcados como Fiscal.` 
          });
          await refreshClientes();
        } catch (error) {
          console.error("Erro na migração:", error);
          toast({ 
            title: "Erro ao migrar clientes", 
            variant: "destructive" 
          });
        } finally {
          setIsMigrating(false);
        }
      }
    );
  };

  useEffect(() => {
    if (user && user.email && !usuariosLoading && usuarios.length === 0) {
      const syncUser = async () => {
        try {
          const nome = user.displayName || user.email?.split("@")[0] || "Usuário";
          await createUsuarioIfNotExists(user.email!, nome);
          await refreshUsuarios();
        } catch (error: any) {
          console.error("Erro ao sincronizar usuário:", error);
          if (error.code === "permission-denied") {
            console.warn(
              "Permissão negada para criar usuário. O usuário pode não ter permissão ou o email não corresponde ao usuário autenticado."
            );
          }
        }
      };
      syncUser();
    }
  }, [user, usuarios.length, usuariosLoading, refreshUsuarios]);

  const responsaveisDisponiveis = useMemo(
    () =>
      usuarios
        .filter((usuario) => usuario.type !== "dev")
        .map((usuario) => usuario.nome)
        .sort(),
    [usuarios]
  );

  // <-- NOVO: isFiscal e isGerencial adicionados ao state inicial
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    cidade: "",
    contato: "",
    contabilidade: "",
    responsavel: "",
    observacoes: "",
    isFiscal: false,
    isGerencial: false,
  });

  const [contabilidadeFormData, setContabilidadeFormData] = useState({
    nome: "",
    cnpj: "",
    email: "",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      cnpj: "",
      cidade: "",
      contato: "",
      contabilidade: "",
      responsavel: "",
      observacoes: "",
      isFiscal: false, // <-- NOVO: resetando
      isGerencial: false, // <-- NOVO: resetando
    });
    setEditingCliente(null);
  };

  const resetContabilidadeForm = () => {
    setContabilidadeFormData({
      nome: "",
      cnpj: "",
      email: "",
    });
    setEditingContabilidade(null);
  };

  const handleContabilidadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContabilidade) {
        await updateContabilidade(editingContabilidade.id, {
          ...contabilidadeFormData,
        });
        toast({ title: "Contabilidade atualizada com sucesso!" });
      } else {
        await createContabilidade({
          ...contabilidadeFormData,
          ativo: true,
        });
        toast({ title: "Contabilidade adicionada com sucesso!" });
      }
      resetContabilidadeForm();
      setIsContabilidadeDialogOpen(false);
    } catch (error) {
      toast({
        title: editingContabilidade
          ? "Erro ao atualizar contabilidade"
          : "Erro ao adicionar contabilidade",
        variant: "destructive",
      });
    }
  };

  const handleEditContabilidade = (contabilidade: Contabilidade) => {
    setEditingContabilidade(contabilidade);
    setContabilidadeFormData({
      nome: contabilidade.nome,
      cnpj: contabilidade.cnpj || "",
      email: contabilidade.email,
    });
    setIsContabilidadeDialogOpen(true);
  };

  const handleDeleteContabilidade = async (id: string) => {
    showConfirmation(
      "Excluir Contabilidade",
      "Tem certeza que deseja excluir esta contabilidade? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteContabilidade(id);
          toast({ title: "Contabilidade excluída com sucesso!" });
        } catch (error) {
          toast({
            title: "Erro ao excluir contabilidade",
            variant: "destructive",
          });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nome = formData.nome.trim();
    const cnpj = formData.cnpj.trim();
    const cidade = formData.cidade.trim();
    const contato = formData.contato.trim();
    const responsavel = formData.responsavel.trim();
    const contabilidade = formData.contabilidade.trim();
    const observacoes = formData.observacoes.trim();

    if (!nome || !responsavel) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: "Preencha Nome e Responsável.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      nome,
      cnpj,
      cidade,
      contato,
      contabilidade,
      responsavel,
      observacoes,
      isFiscal: formData.isFiscal,
      isGerencial: formData.isGerencial,
      ativo: true,
    };

    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, payload);
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await createCliente(payload);
        toast({ title: "Cliente adicionado com sucesso!" });
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro ao salvar cliente",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      cidade: cliente.cidade,
      contato: cliente.contato,
      contabilidade: cliente.contabilidade,
      responsavel: cliente.responsavel,
      observacoes: cliente.observacoes,
      isFiscal: cliente.isFiscal || false, // <-- NOVO: Puxando dados existentes
      isGerencial: cliente.isGerencial || false, // <-- NOVO: Puxando dados existentes
    });
    setIsDialogOpen(true);
  };

const handleDelete = async (id: string) => {
    showConfirmation(
      "Excluir Cliente",
      "Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await deleteClienteWithRelations(id);
          await refreshClientes(); 
          toast({ title: "Cliente excluído com sucesso! (Registros relacionados desativados, certificados mantidos)" });
        } catch (error) {
          // ===> ADICIONE ESTA LINHA AQUI <===
          console.error("ERRO AO EXCLUIR CLIENTE:", error); 
          
          toast({
            title: "Erro ao excluir cliente",
            variant: "destructive",
          });
        }
      },
      {
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      }
    );
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter((cliente) => {
      const matchesSearch = matchesClienteSearch(cliente.nome, cliente.cnpj, searchTerm);

      const matchesResponsavel =
        searchResponsavel === "todos" ||
        cliente.responsavel === searchResponsavel;

      const clienteData = new Date(cliente.createdAt);

      const matchesDataInicio =
        !filtroDataInicio || clienteData >= new Date(filtroDataInicio);

      const matchesDataFim =
        !filtroDataFim || clienteData <= new Date(filtroDataFim);

      return (
        matchesSearch &&
        matchesResponsavel &&
        matchesDataInicio &&
        matchesDataFim
      );
    });
  }, [
    clientes,
    searchTerm,
    searchResponsavel,
    filtroDataInicio,
    filtroDataFim,
  ]);

  const clientesOrdenados = useMemo(() => {
    const items = [...filteredClientes];
    items.sort((a, b) => {
      let comparacao = 0;
      switch (ordenacao.campo) {
        case "nome":
          comparacao = a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
          break;
        case "cnpj":
          comparacao = a.cnpj.localeCompare(b.cnpj, "pt-BR", { sensitivity: "base" });
          break;
        case "cidade":
          comparacao = a.cidade.localeCompare(b.cidade, "pt-BR", { sensitivity: "base" });
          break;
        case "responsavel":
          comparacao = a.responsavel.localeCompare(b.responsavel, "pt-BR", { sensitivity: "base" });
          break;
      }
      return ordenacao.direcao === "asc" ? comparacao : -comparacao;
    });
    return items;
  }, [filteredClientes, ordenacao]);

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
  } = usePagination(clientesOrdenados, 10);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie os clientes cadastrados
            </p>
          </div>
          <div className="flex gap-2 items-end">
            <Dialog
              open={isContabilidadeDialogOpen}
              onOpenChange={(open) => {
                setIsContabilidadeDialogOpen(open);
                if (!open) resetContabilidadeForm();
              }}
            >
              <Button 
              variant="secondary" 
              onClick={handleMigrarParaFiscal}
              disabled={isMigrating || clientesLoading}
            >
              {isMigrating ? "Atualizando..." : "Marcar todos como Fiscal"}
            </Button>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="mr-2 h-4 w-4" />
                  Adicionar Contabilidade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingContabilidade ? "Editar Contabilidade" : "Nova Contabilidade"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleContabilidadeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contabilidade-nome">Nome da Contabilidade</Label>
                    <Input
                      id="contabilidade-nome"
                      value={contabilidadeFormData.nome}
                      onChange={(e) => setContabilidadeFormData({ ...contabilidadeFormData, nome: e.target.value })}
                      required
                      placeholder="Ex: Contábil Plus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contabilidade-cnpj">CNPJ</Label>
                    <Input
                      id="contabilidade-cnpj"
                      value={contabilidadeFormData.cnpj}
                      onChange={(e) => setContabilidadeFormData({ ...contabilidadeFormData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contabilidade-email">E-mail</Label>
                    <Input
                      id="contabilidade-email"
                      type="email"
                      value={contabilidadeFormData.email}
                      onChange={(e) => setContabilidadeFormData({ ...contabilidadeFormData, email: e.target.value })}
                      required
                      placeholder="Ex: contato@contabil.com.br"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsContabilidadeDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingContabilidade ? "Atualizar" : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isGerenciarContabilidadesOpen} onOpenChange={setIsGerenciarContabilidadesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="mr-2 h-4 w-4" />
                  Gerenciar Contabilidades
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Contabilidades Cadastradas</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium">Nome</th>
                          <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                          <th className="p-3 text-left text-sm font-medium">E-mail</th>
                          <th className="p-3 text-left text-sm font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contabilidadesLoading ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-muted-foreground">Carregando...</td>
                          </tr>
                        ) : contabilidades.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-muted-foreground">Nenhuma contabilidade cadastrada</td>
                          </tr>
                        ) : (
                          contabilidades.map((contabilidade) => (
                            <tr key={contabilidade.id} className="border-t">
                              <td className="p-3">{contabilidade.nome}</td>
                              <td className="p-3">{contabilidade.cnpj || "-"}</td>
                              <td className="p-3">{contabilidade.email}</td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      handleEditContabilidade(contabilidade);
                                      setIsGerenciarContabilidadesOpen(false);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteContabilidade(contabilidade.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>
                    {editingCliente ? "Editar" : "Novo"} Cliente
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Cliente</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contato">Contato</Label>
                      <Input
                        id="contato"
                        value={formData.contato}
                        onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                        onBlur={(e) => {
                          const formatado = formatarTelefone(e.target.value);
                          setFormData({ ...formData, contato: formatado });
                        }}
                        placeholder="(31) 9 9789-1102"
                      />
                    </div>
                  </div>
                  
                  {/* <-- NOVO: Checkboxes de Tipo Fiscal/Gerencial adicionados aqui --> */}
                  <div className="flex gap-6 mt-2 mb-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isFiscal"
                        checked={formData.isFiscal}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isFiscal: !!checked })
                        }
                      />
                      <Label htmlFor="isFiscal" className="cursor-pointer">Fiscal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isGerencial"
                        checked={formData.isGerencial}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isGerencial: !!checked })
                        }
                      />
                      <Label htmlFor="isGerencial" className="cursor-pointer">Gerencial</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contabilidade">Nome da Contabilidade</Label>
                      <Select
                        value={formData.contabilidade}
                        onValueChange={(value) => {
                          if (value === "_remover") {
                            setFormData((prev) => ({
                              ...prev,
                              contabilidade: "",
                              observacoes: prev.observacoes 
                            }));
                            return;
                          }
                          const contabilidadeSelecionada = contabilidades.find((c) => c.nome === value);
                          const emailContabilidade = contabilidadeSelecionada?.email || "";
                          let observacoesAtualizadas = formData.observacoes || "";

                          if (emailContabilidade && emailContabilidade.trim() !== "") {
                            const emailJaExiste = observacoesAtualizadas.includes(emailContabilidade);
                            if (!emailJaExiste) {
                              if (observacoesAtualizadas.trim()) {
                                observacoesAtualizadas = `${emailContabilidade}\n${observacoesAtualizadas}`;
                              } else {
                                observacoesAtualizadas = emailContabilidade;
                              }
                            }
                          }
                          setFormData((prev) => ({
                            ...prev,
                            contabilidade: value,
                            observacoes: observacoesAtualizadas,
                          }));
                        }}
                      >
                        <SelectTrigger id="contabilidade">
                          <SelectValue placeholder="Selecione a contabilidade">
                            {formData.contabilidade || "Selecione a contabilidade"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {formData.contabilidade && (
                            <SelectItem value="_remover">Remover contabilidade</SelectItem>
                          )}
                          {contabilidadesLoading ? (
                            <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                          ) : contabilidades.length === 0 ? (
                            <SelectItem value="_empty" disabled>Nenhuma contabilidade cadastrada</SelectItem>
                          ) : (
                            <>
                              {formData.contabilidade && !contabilidades.some((c) => c.nome === formData.contabilidade) && (
                                <SelectItem key="current-contabilidade" value={formData.contabilidade}>
                                  {formData.contabilidade}
                                </SelectItem>
                              )}
                              {contabilidades.map((contabilidade) => (
                                <SelectItem key={contabilidade.id} value={contabilidade.nome}>
                                  {contabilidade.nome}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Select
                        value={formData.responsavel}
                        onValueChange={(value) => setFormData({ ...formData, responsavel: value })}
                        required
                      >
                        <SelectTrigger id="responsavel">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {usuariosLoading ? (
                            <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                          ) : usuarios.length === 0 ? (
                            <SelectItem value="_empty" disabled>Nenhum responsável cadastrado</SelectItem>
                          ) : (
                            usuarios
                              .filter((usuario) => usuario.type !== "dev")
                              .map((usuario) => (
                                <SelectItem key={usuario.id} value={usuario.nome}>
                                  {usuario.nome}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
          searchPlaceholder="Buscar por nome ou CNPJ..."
          responsavelOptions={responsaveisDisponiveis}
          responsavelValue={searchResponsavel}
          onResponsavelChange={setSearchResponsavel}
          dateStartLabel="Data Cadastro Início"
          dateEndLabel="Data Cadastro Fim"
          dateStartValue={filtroDataInicio}
          dateEndValue={filtroDataFim}
          onDateStartChange={setFiltroDataInicio}
          onDateEndChange={setFiltroDataFim}
          showStatus={false}
          orderValue={`${ordenacao.campo}-${ordenacao.direcao}`}
          orderOptions={[
            { value: "nome-asc", label: "Nome (A-Z)" },
            { value: "nome-desc", label: "Nome (Z-A)" },
            { value: "cnpj-asc", label: "CNPJ (A-Z)" },
            { value: "cnpj-desc", label: "CNPJ (Z-A)" },
            { value: "cidade-asc", label: "Cidade (A-Z)" },
            { value: "cidade-desc", label: "Cidade (Z-A)" },
            { value: "responsavel-asc", label: "Responsável (A-Z)" },
            { value: "responsavel-desc", label: "Responsável (Z-A)" },
          ]}
          onOrderChange={(value) => {
            const [campo, direcao] = value.split("-") as [
              "nome" | "cnpj" | "cidade" | "responsavel",
              "asc" | "desc"
            ];
            setOrdenacao({ campo, direcao });
          }}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => setItemsPerPage(Number(value))}
          showClear={!!(filtroDataInicio || filtroDataFim || searchResponsavel !== "todos")}
          onClear={() => {
            setFiltroDataInicio("");
            setFiltroDataFim("");
            setSearchResponsavel("todos");
          }}
        />

        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Nome</th>
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                {/* <-- NOVO: Coluna Tipo adicionada na tabela --> */}
                <th className="p-3 text-left text-sm font-medium">Tipo</th>
                <th className="p-3 text-left text-sm font-medium">Cidade</th>
                <th className="p-3 text-left text-sm font-medium">Contato</th>
                <th className="p-3 text-left text-sm font-medium">Responsável</th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((cliente) => (
                <tr key={cliente.id} className="border-t">
                  <td className="p-3 font-medium">{cliente.nome}</td>
                  <td className="p-3 text-muted-foreground">{cliente.cnpj}</td>
                  
                  {/* <-- NOVO: Exibição visual de Fiscal e Gerencial --> */}
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {cliente.isFiscal && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Fiscal
                        </span>
                      )}
                      {cliente.isGerencial && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          Gerencial
                        </span>
                      )}
                      {!cliente.isFiscal && !cliente.isGerencial && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>

                  <td className="p-3">{cliente.cidade}</td>
                  <td className="p-3">{cliente.contato}</td>
                  <td className="p-3">{cliente.responsavel}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(cliente)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(cliente.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clientesLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado</div>
          ) : null}
          {totalPages > 1 && (
            <div className="border-t p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {endIndex} de {totalItems} clientes
                </p>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={previousPage}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
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
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={nextPage}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
      {ConfirmationDialogComponent}
    </Layout>
  );
}