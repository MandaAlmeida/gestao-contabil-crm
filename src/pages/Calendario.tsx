import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTarefas } from "@/hooks/useTarefas";
import { useClientes } from "@/hooks/useClientes";
import { Tarefa } from "@/types/tarefas";
import { Plus, CheckCircle2, Circle, Trash2, Edit, Calendar as CalendarIcon } from "lucide-react";
import { pt } from "date-fns/locale";
import { format } from "date-fns";
import { CustomAlert } from "@/components/CustomAlert";

export default function Calendario() {
  const { tarefas, addTarefa, updateTarefa, deleteTarefa, toggleConcluida } = useTarefas();
  const { clientes } = useClientes();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [tarefaParaExcluir, setTarefaParaExcluir] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    horaInicio: "",
    horaFim: "",
    prioridade: "Média" as "Baixa" | "Média" | "Alta",
    categoria: "",
    clienteId: "",
  });

  const tarefasDoDia = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return tarefas.filter((t) => t.data.startsWith(dateStr));
  }, [tarefas, selectedDate]);

  const diasComTarefas = useMemo(() => {
    const dias = new Set<string>();
    tarefas.forEach((t) => {
      const date = new Date(t.data);
      dias.add(format(date, "yyyy-MM-dd"));
    });
    return dias;
  }, [tarefas]);

  const handleOpenDialog = (tarefa?: Tarefa) => {
    if (tarefa) {
      setEditingTarefa(tarefa);
      setFormData({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        horaInicio: tarefa.horaInicio || "",
        horaFim: tarefa.horaFim || "",
        prioridade: tarefa.prioridade,
        categoria: tarefa.categoria || "",
        clienteId: tarefa.clienteId || "",
      });
    } else {
      setEditingTarefa(null);
      setFormData({
        titulo: "",
        descricao: "",
        horaInicio: "",
        horaFim: "",
        prioridade: "Média",
        categoria: "",
        clienteId: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTarefa(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {

      const clienteSelecionado = clientes.find((c) => c.id === formData.clienteId);
      // Monta o objeto sem campos undefined ou vazios
      const tarefaData: any = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        data: selectedDate.toISOString(),
        prioridade: formData.prioridade,
        concluida: editingTarefa?.concluida || false,
        ativo: true,
      };
      if (formData.horaInicio) tarefaData.horaInicio = formData.horaInicio;
      if (formData.horaFim) tarefaData.horaFim = formData.horaFim;
      if (formData.categoria) tarefaData.categoria = formData.categoria;
      if (formData.clienteId) tarefaData.clienteId = formData.clienteId;
      if (clienteSelecionado?.nome) tarefaData.clienteNome = clienteSelecionado.nome;

      if (editingTarefa) {
        await updateTarefa(editingTarefa.id, tarefaData);
      } else {
        await addTarefa(tarefaData);
      }

      handleCloseDialog();
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    }
  };

  const handleDelete = (id: string) => {
    setTarefaParaExcluir(id);
    setAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (tarefaParaExcluir) {
      try {
        await deleteTarefa(tarefaParaExcluir);
      } catch (error) {
        console.error("Erro ao excluir tarefa:", error);
      }
      setTarefaParaExcluir(null);
      setAlertOpen(false);
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "Alta":
        return "bg-red-500";
      case "Média":
        return "bg-yellow-500";
      case "Baixa":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Calendário de Tarefas</h1>
          <p className="text-muted-foreground">
            Organize e gerencie suas tarefas diárias
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendário */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário
              </CardTitle>
              <CardDescription>Selecione uma data</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={pt}
                className="rounded-md border"
                modifiers={{
                  comTarefas: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return diasComTarefas.has(dateStr);
                  },
                }}
                modifiersStyles={{
                  comTarefas: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Lista de Tarefas do Dia */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Tarefas de {format(selectedDate, "dd/MM/yyyy", { locale: pt })}
                  </CardTitle>
                  <CardDescription>
                    {tarefasDoDia.length} tarefa(s) para este dia
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Tarefa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tarefasDoDia.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma tarefa para este dia
                  </div>
                ) : (
                  tarefasDoDia.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="flex items-start gap-4 rounded-lg border p-4 hover:bg-accent transition-colors"
                    >
                      <button
                        onClick={() => toggleConcluida(tarefa.id, !tarefa.concluida)}
                        className="mt-1"
                      >
                        {tarefa.concluida ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`font-semibold ${
                              tarefa.concluida ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {tarefa.titulo}
                          </h3>
                          <div
                            className={`h-2 w-2 rounded-full ${getPrioridadeColor(
                              tarefa.prioridade
                            )}`}
                          />
                        </div>

                        {tarefa.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {tarefa.descricao}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {(tarefa.horaInicio || tarefa.horaFim) && (
                            <Badge variant="outline">
                              {tarefa.horaInicio || "00:00"} - {tarefa.horaFim || "23:59"}
                            </Badge>
                          )}
                          {tarefa.categoria && (
                            <Badge variant="secondary">{tarefa.categoria}</Badge>
                          )}
                          {tarefa.clienteNome && (
                            <Badge>{tarefa.clienteNome}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenDialog(tarefa)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(tarefa.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerta personalizado para exclusão de tarefa (fora do loop) */}
        {/* Modal de confirmação de exclusão */}
        {alertOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-2 text-destructive">Excluir Tarefa</h2>
              <p className="mb-4">Tem certeza que deseja excluir esta tarefa? Esta ação não poderá ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setAlertOpen(false); setTarefaParaExcluir(null); }}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>Excluir</Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog para Adicionar/Editar Tarefa */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" onCloseAutoFocus={e => e.preventDefault()}>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingTarefa ? "Editar Tarefa" : "Nova Tarefa"}
                </DialogTitle>
                <DialogDescription>
                  {format(selectedDate, "dd/MM/yyyy", { locale: pt })}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="horaInicio">Hora Início</Label>
                    <Input
                      id="horaInicio"
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) =>
                        setFormData({ ...formData, horaInicio: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="horaFim">Hora Fim</Label>
                    <Input
                      id="horaFim"
                      type="time"
                      value={formData.horaFim}
                      onChange={(e) =>
                        setFormData({ ...formData, horaFim: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value: "Baixa" | "Média" | "Alta") =>
                      setFormData({ ...formData, prioridade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    placeholder="Ex: Reunião, Entrega, Análise..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select
                    value={formData.clienteId ? formData.clienteId : "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clienteId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clientes
                        .filter((c) => c.ativo)
                        .map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTarefa ? "Salvar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
