import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDespesas } from "@/hooks/useDespesas";
import type { Despesa } from "@/types/despesas";

interface FormState {
  descricao: string;
  contabilidade: string;
  valor: string;
  data: string;
  fixo: boolean;
  pago: boolean;
}

const DEFAULT_FORM: FormState = {
  descricao: "",
  contabilidade: "",
  valor: "",
  data: new Date().toISOString().split("T")[0],
  fixo: false,
  pago: false,
};

export default function DespesasPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { despesas, createDespesa, updateDespesa, deleteDespesa } = useDespesas();
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "pendente">("todos");

  const despesasFiltradas = useMemo(() => {
    return despesas.filter((despesa) => {
      // Filtro por data
      const despesaData = new Date(despesa.data);
      const matchesDataInicio = !filtroDataInicio || despesaData >= new Date(filtroDataInicio);
      const matchesDataFim = !filtroDataFim || despesaData <= new Date(filtroDataFim);
      
      // Filtro por status
      const matchesStatus = 
        filtroStatus === "todos" || 
        (filtroStatus === "pago" && despesa.pago) ||
        (filtroStatus === "pendente" && !despesa.pago);
      
      return matchesDataInicio && matchesDataFim && matchesStatus;
    });
  }, [despesas, filtroDataInicio, filtroDataFim, filtroStatus]);

  const despesasOrdenadas = useMemo(
    () =>
      [...despesasFiltradas].sort((a, b) => {
        if (a.data === b.data) {
          return b.createdAt.localeCompare(a.createdAt);
        }
        return b.data.localeCompare(a.data);
      }),
    [despesasFiltradas],
  );

  const resetForm = () => {
    setFormState(DEFAULT_FORM);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valorNormalizado = formState.valor.replace(",", ".");
    const valorNumber = Number(valorNormalizado);

    if (Number.isNaN(valorNumber) || valorNumber <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor numérico maior que zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await createDespesa({
        descricao: formState.descricao.trim(),
        contabilidade: formState.contabilidade.trim() || null,
        valor: valorNumber,
        data: formState.data,
        fixo: formState.fixo,
        pago: formState.pago,
      });
      toast({ title: "Despesa registrada com sucesso!" });
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao registrar despesa",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePago = async (despesa: Despesa) => {
    try {
      await updateDespesa(despesa.id, { pago: !despesa.pago });
      toast({
        title: despesa.pago ? "Despesa marcada como pendente" : "Despesa marcada como paga",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar despesa",
        variant: "destructive",
      });
    }
  };

  const handleRemover = async (despesa: Despesa) => {
    if (!confirm(`Excluir a despesa "${despesa.descricao}"?`)) {
      return;
    }

    try {
      await deleteDespesa(despesa.id);
      toast({ title: "Despesa removida." });
    } catch (error) {
      toast({
        title: "Erro ao remover despesa",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 p-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
              <Wallet className="h-7 w-7" />
              Despesas
            </h1>
            <p className="text-muted-foreground">
              Controle seus gastos e acompanhe as despesas recorrentes.
            </p>
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar despesa</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formState.descricao}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, descricao: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contabilidade">Contabilidade (opcional)</Label>
                  <Input
                    id="contabilidade"
                    value={formState.contabilidade}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, contabilidade: event.target.value }))
                    }
                    placeholder="Informe a contabilidade, se aplicável"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor</Label>
                    <Input
                      id="valor"
                      value={formState.valor}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, valor: event.target.value }))
                      }
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formState.data}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, data: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <Label htmlFor="fixo" className="text-sm">
                        Despesa fixa
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Mantém a despesa como recorrente
                      </p>
                    </div>
                    <Switch
                      id="fixo"
                      checked={formState.fixo}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({ ...prev, fixo: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <Label htmlFor="pago" className="text-sm">
                        Pago
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Marque se a despesa já foi quitada
                      </p>
                    </div>
                    <Switch
                      id="pago"
                      checked={formState.pago}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({ ...prev, pago: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    Adicionar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Histórico de despesas</h2>
          </div>
          <div className="flex gap-4 p-4 border-b border-border">
            <div className="space-y-1">
              <Label htmlFor="filtro-data-inicio" className="text-xs text-muted-foreground">Data Início</Label>
              <Input
                id="filtro-data-inicio"
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-data-fim" className="text-xs text-muted-foreground">Data Fim</Label>
              <Input
                id="filtro-data-fim"
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-status" className="text-xs text-muted-foreground">Status</Label>
              <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as "todos" | "pago" | "pendente")}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filtroDataInicio || filtroDataFim || filtroStatus !== "todos") && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroDataInicio("");
                    setFiltroDataFim("");
                    setFiltroStatus("todos");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Contabilidade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fixo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasOrdenadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma despesa cadastrada até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                despesasOrdenadas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell className="font-medium">{despesa.descricao}</TableCell>
                    <TableCell>{despesa.contabilidade || "-"}</TableCell>
                    <TableCell>
                      R$ {despesa.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {despesa.data
                        ? new Date(despesa.data).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={despesa.fixo ? "default" : "secondary"}>
                        {despesa.fixo ? "Fixa" : "Avulsa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={despesa.pago ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => handleTogglePago(despesa)}
                      >
                        {despesa.pago ? "Pago" : "Pendente"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemover(despesa)}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </Layout>
  );
}

