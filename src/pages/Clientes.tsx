import { useMemo, useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/useClientes";
import { useContabilidades } from "@/hooks/useContabilidades";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useAuth } from "@/contexts/AuthContext";
import { createUsuarioIfNotExists } from "@/lib/firestore/usuarios";
import { Cliente, Contabilidade } from "@/types/crm";
import { Plus, Search, Edit, Trash2, Building2 } from "lucide-react";
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

export default function Clientes() {
  const {
    clientes,
    createCliente,
    updateCliente,
    deleteCliente,
    loading: clientesLoading,
  } = useClientes();
  const {
    contabilidades,
    createContabilidade,
    loading: contabilidadesLoading,
  } = useContabilidades();
  const {
    usuarios,
    loading: usuariosLoading,
    refresh: refreshUsuarios,
  } = useUsuarios();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResponsavel, setSearchResponsavel] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isContabilidadeDialogOpen, setIsContabilidadeDialogOpen] =
    useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();

  // Sincronizar usuário atual quando carregar a página
  useEffect(() => {
    // Só tentar sincronizar se o usuário estiver autenticado e não houver usuários carregados
    if (user && user.email && !usuariosLoading && usuarios.length === 0) {
      const syncUser = async () => {
        try {
          const nome =
            user.displayName || user.email?.split("@")[0] || "Usuário";
          await createUsuarioIfNotExists(user.email!, nome);
          await refreshUsuarios();
        } catch (error: any) {
          console.error("Erro ao sincronizar usuário:", error);
          // Se for erro de permissão, não é crítico - apenas logar
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
    () => usuarios.map((usuario) => usuario.nome).sort(),
    [usuarios]
  );

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    cidade: "",
    contato: "",
    contabilidade: "",
    responsavel: "",
    observacoes: "",
  });

  const [contabilidadeFormData, setContabilidadeFormData] = useState({
    nome: "",
    cnpj: "",
    cidade: "",
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
    });
    setEditingCliente(null);
  };

  const resetContabilidadeForm = () => {
    setContabilidadeFormData({
      nome: "",
      cnpj: "",
      cidade: "",
    });
  };

  const handleContabilidadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createContabilidade({
        ...contabilidadeFormData,
        ativo: true,
      });
      toast({ title: "Contabilidade adicionada com sucesso!" });
      resetContabilidadeForm();
      setIsContabilidadeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao adicionar contabilidade",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData);
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await createCliente({
          ...formData,
          ativo: true,
        });
        toast({ title: "Cliente adicionado com sucesso!" });
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar cliente",
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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        await deleteCliente(id);
        toast({ title: "Cliente excluído com sucesso!" });
      } catch (error) {
        toast({
          title: "Erro ao excluir cliente",
          variant: "destructive",
        });
      }
    }
  };

  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch =
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cnpj.includes(searchTerm);
    const matchesResponsavel =
      searchResponsavel === "todos" ||
      cliente.responsavel === searchResponsavel;

    // Filtro por data (data de cadastro)
    const clienteData = new Date(cliente.createdAt);
    const matchesDataInicio =
      !filtroDataInicio || clienteData >= new Date(filtroDataInicio);
    const matchesDataFim =
      !filtroDataFim || clienteData <= new Date(filtroDataFim);

    return (
      matchesSearch && matchesResponsavel && matchesDataInicio && matchesDataFim
    );
  });

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
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="mr-2 h-4 w-4" />
                  Adicionar Contabilidade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Contabilidade</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleContabilidadeSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="contabilidade-nome">
                      Nome da Contabilidade
                    </Label>
                    <Input
                      id="contabilidade-nome"
                      value={contabilidadeFormData.nome}
                      onChange={(e) =>
                        setContabilidadeFormData({
                          ...contabilidadeFormData,
                          nome: e.target.value,
                        })
                      }
                      required
                      placeholder="Ex: Contábil Plus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contabilidade-cnpj">CNPJ</Label>
                    <Input
                      id="contabilidade-cnpj"
                      value={contabilidadeFormData.cnpj}
                      onChange={(e) =>
                        setContabilidadeFormData({
                          ...contabilidadeFormData,
                          cnpj: e.target.value,
                        })
                      }
                      required
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contabilidade-cidade">Cidade</Label>
                    <Input
                      id="contabilidade-cidade"
                      value={contabilidadeFormData.cidade}
                      onChange={(e) =>
                        setContabilidadeFormData({
                          ...contabilidadeFormData,
                          cidade: e.target.value,
                        })
                      }
                      required
                      placeholder="Ex: São Paulo"
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
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
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
              <DialogContent className="max-w-2xl">
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
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) =>
                          setFormData({ ...formData, cnpj: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) =>
                          setFormData({ ...formData, cidade: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contato">Contato</Label>
                      <Input
                        id="contato"
                        value={formData.contato}
                        onChange={(e) =>
                          setFormData({ ...formData, contato: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contabilidade">
                        Nome da Contabilidade
                      </Label>
                      <Input
                        id="contabilidade"
                        value={formData.contabilidade}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contabilidade: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Select
                        value={formData.responsavel}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            responsavel: value,
                          })
                        }
                        required
                      >
                        <SelectTrigger id="responsavel">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {usuariosLoading ? (
                            <SelectItem value="" disabled>
                              Carregando...
                            </SelectItem>
                          ) : usuarios.length === 0 ? (
                            <SelectItem value="" disabled>
                              Nenhum responsável cadastrado
                            </SelectItem>
                          ) : (
                            usuarios.map((usuario) => (
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
                  placeholder="Buscar por nome ou CNPJ..."
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
                Data Cadastro Início
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
                Data Cadastro Fim
              </Label>
              <Input
                id="filtro-data-fim"
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-40"
              />
            </div>
            {(filtroDataInicio ||
              filtroDataFim ||
              searchResponsavel !== "todos") && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroDataInicio("");
                    setFiltroDataFim("");
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
                <th className="p-3 text-left text-sm font-medium">Nome</th>
                <th className="p-3 text-left text-sm font-medium">CNPJ</th>
                <th className="p-3 text-left text-sm font-medium">Cidade</th>
                <th className="p-3 text-left text-sm font-medium">Contato</th>
                <th className="p-3 text-left text-sm font-medium">
                  Responsável
                </th>
                <th className="p-3 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id} className="border-t">
                  <td className="p-3">{cliente.nome}</td>
                  <td className="p-3">{cliente.cnpj}</td>
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
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
