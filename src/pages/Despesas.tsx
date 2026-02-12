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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Wallet, Edit, Trash2, CheckCircle, Clock3, AlertCircle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDespesas } from "@/hooks/useDespesas";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useClientes } from "@/hooks/useClientes";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { HistoricoPagamentosDialog } from "@/components/HistoricoPagamentosDialog";
import type { Despesa } from "@/types/despesas";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { cn, formatarDataBR } from "@/lib/utils";

interface FormState {
  descricao: string;
  contabilidade: string;
  valor: string;
  data: string;
  fixo: boolean;
  pago: boolean;
  recebedor: string;
}

const DEFAULT_FORM: FormState = {
  descricao: "",
  contabilidade: "",
  valor: "",
  data: new Date().toISOString().split("T")[0],
  fixo: false,
  pago: false,
  recebedor: "",
};


const adicionarMes = (dataString: string): string => {
  if (!dataString) {
    const hoje = new Date();
    return hoje.toISOString().split("T")[0];
  }

  const partes = dataString.split("-");
  if (partes.length !== 3) {
    return dataString;
  }

  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const dia = parseInt(partes[2], 10);

  let novoAno = ano;
  let novoMes = mes + 1;

  if (novoMes > 12) {
    novoMes = 1;
    novoAno += 1;
  }

  // Garante que o dia não ultrapasse os dias do mês
  const ultimoDiaDoMes = new Date(novoAno, novoMes, 0).getDate();
  const novoDia = Math.min(dia, ultimoDiaDoMes);

  return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
    novoDia
  ).padStart(2, "0")}`;
};

export default function DespesasPage() {
  // Estados
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Despesa | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedItemHistorico, setSelectedItemHistorico] = useState<Despesa | null>(null);
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "pago" | "pendente" | "vencida"
  >("todos");
  const [ordenacao, setOrdenacao] = useState<{
    campo: "descricao" | "data" | "valor" | "status";
    direcao: "asc" | "desc";
  }>({ campo: "data", direcao: "desc" });

  // Hooks customizados
  const { toast } = useToast();
  const { despesas, createDespesa, updateDespesa, deleteDespesa } = useDespesas();
  const { clientes } = useClientes();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();

  // Função auxiliar para determinar o status real da despesa baseado no histórico
  const obterStatusDespesa = (despesa: Despesa): "pago" | "vencida" | "pendente" => {
    // Obter mês e ano da data de vencimento atual
    const dataVencimento = new Date(despesa.data);
    const mesVencimento = dataVencimento.getMonth();
    const anoVencimento = dataVencimento.getFullYear();

    // Verificar se há pagamento no histórico para o mesmo mês/ano
    const pagamentoNoMes = despesa.historicoPagamentos?.find(p => {
      const dataVencimentoPagamento = new Date(p.dataVencimento);
      return (
        dataVencimentoPagamento.getMonth() === mesVencimento &&
        dataVencimentoPagamento.getFullYear() === anoVencimento
      );
    });

    if (pagamentoNoMes) {
      return "pago";
    }

    // Se não há pagamento, verificar se está vencida
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataVencimento.setHours(0, 0, 0, 0);

    if (dataVencimento < hoje) {
      return "vencida";
    }

    return "pendente";
  };

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(clientes.map((cliente) => cliente.responsavel))
      ).sort(),
    [clientes]
  );

  const despesasFiltradas = useMemo(() => {
    return despesas.filter((despesa) => {
      // Filtro por data
      const despesaData = new Date(despesa.data);
      const matchesDataInicio =
        !filtroDataInicio || despesaData >= new Date(filtroDataInicio);
      const matchesDataFim =
        !filtroDataFim || despesaData <= new Date(filtroDataFim);

      // Obter status real baseado no histórico
      const status = obterStatusDespesa(despesa);

      // Filtro por status
      const matchesStatus =
        filtroStatus === "todos" ||
        filtroStatus === status;

      return matchesDataInicio && matchesDataFim && matchesStatus;
    });
  }, [despesas, filtroDataInicio, filtroDataFim, filtroStatus]);

  const despesasOrdenadas = useMemo(() => {
    const items = [...despesasFiltradas];
    items.sort((a, b) => {
      let comparacao = 0;

      switch (ordenacao.campo) {
        case "descricao":
          comparacao = a.descricao.localeCompare(b.descricao, "pt-BR", {
            sensitivity: "base",
          });
          break;
        case "data":
          comparacao = a.data.localeCompare(b.data);
          // Se as datas forem iguais, ordenar por createdAt
          if (comparacao === 0) {
            comparacao = b.createdAt.localeCompare(a.createdAt);
          }
          break;
        case "valor":
          comparacao = a.valor - b.valor;
          break;
        case "status":
          const statusA = obterStatusDespesa(a);
          const statusB = obterStatusDespesa(b);
          
          // Ordem: vencida < pendente < pago
          const statusOrder: Record<string, number> = {
            vencida: 0,
            pendente: 1,
            pago: 2,
          };
          
          comparacao = statusOrder[statusA] - statusOrder[statusB];
          break;
      }

      return ordenacao.direcao === "asc" ? comparacao : -comparacao;
    });
    return items;
  }, [despesasFiltradas, ordenacao]);

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
  } = usePagination(despesasOrdenadas, 10);

  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setEditingItem(null);
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
      if (editingItem) {
        await updateDespesa(editingItem.id, {
          descricao: formState.descricao.trim(),
          contabilidade: formState.contabilidade.trim() || null,
          valor: valorNumber,
          data: formState.data,
          fixo: formState.fixo,
          pago: formState.pago,
          recebedor: formState.recebedor === "none" ? null : (formState.recebedor.trim() || null),
        });
        toast({ title: "Despesa atualizada com sucesso!" });
      } else {
        await createDespesa({
          descricao: formState.descricao.trim(),
          contabilidade: formState.contabilidade.trim() || null,
          valor: valorNumber,
          data: formState.data,
          fixo: formState.fixo,
          pago: formState.pago,
          recebedor: formState.recebedor === "none" ? null : (formState.recebedor.trim() || null),
          ativo: true,
        });
        toast({ title: "Despesa registrada com sucesso!" });
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: editingItem
          ? "Erro ao atualizar despesa"
          : "Erro ao registrar despesa",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (despesa: Despesa) => {
    setEditingItem(despesa);
    setFormState({
      descricao: despesa.descricao,
      contabilidade: despesa.contabilidade || "",
      valor: despesa.valor.toString().replace(".", ","),
      data: despesa.data,
      fixo: despesa.fixo,
      pago: despesa.pago,
      recebedor: despesa.recebedor || "none",
    });
    setIsDialogOpen(true);
  };

  const STATUS_META: Record<
    "pago" | "pendente" | "vencida",
    { label: string; className: string; icon: typeof CheckCircle | typeof Clock3 | typeof AlertCircle }
  > = {
    pago: {
      label: "Pago",
      className: "bg-success/10 text-success hover:bg-success/20",
      icon: CheckCircle,
    },
    pendente: {
      label: "Pendente",
      className: "bg-warning/10 text-warning hover:bg-warning/20",
      icon: Clock3,
    },
    vencida: {
      label: "Vencida",
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      icon: AlertCircle,
    },
  };

  const removerMes = (dataString: string): string => {
    if (!dataString) {
      const hoje = new Date();
      return hoje.toISOString().split("T")[0];
    }

    const partes = dataString.split("-");
    if (partes.length !== 3) {
      return dataString;
    }

    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const dia = parseInt(partes[2], 10);

    let novoAno = ano;
    let novoMes = mes - 1;

    if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }

    // Garante que o dia não ultrapasse os dias do mês
    const ultimoDiaDoMes = new Date(novoAno, novoMes, 0).getDate();
    const novoDia = Math.min(dia, ultimoDiaDoMes);

    return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
      novoDia
    ).padStart(2, "0")}`;
  };

  const handleTogglePago = async (despesa: Despesa) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataHojeStr = hoje.toISOString().split('T')[0];

    // Verificar status atual baseado no histórico
    const statusAtual = obterStatusDespesa(despesa);

    // Obter mês e ano da data de vencimento atual
    const dataVencimento = new Date(despesa.data);
    const mesVencimento = dataVencimento.getMonth();
    const anoVencimento = dataVencimento.getFullYear();

    try {
      if (statusAtual === "pago") {
        // Despesa está paga, desmarcando
        // Encontrar o pagamento do mês/ano atual
        const pagamentoAtual = despesa.historicoPagamentos?.find(p => {
          const dataVencimentoPagamento = new Date(p.dataVencimento);
          return (
            dataVencimentoPagamento.getMonth() === mesVencimento &&
            dataVencimentoPagamento.getFullYear() === anoVencimento
          );
        });

        const pagamentoFoiHoje = pagamentoAtual?.dataPagamento === dataHojeStr;

        if (pagamentoFoiHoje || !despesa.fixo) {
          // Se foi pago hoje OU é despesa não fixa, apenas remove do histórico sem voltar o vencimento
          const historicoAtualizado = (despesa.historicoPagamentos || []).filter(p => {
            const dataVencimentoPagamento = new Date(p.dataVencimento);
            return !(
              dataVencimentoPagamento.getMonth() === mesVencimento &&
              dataVencimentoPagamento.getFullYear() === anoVencimento
            );
          });

          await updateDespesa(despesa.id, {
            historicoPagamentos: historicoAtualizado,
            pago: false,
            dataPagamento: null,
          });

          toast({
            title: "Pagamento desfeito.",
            description: `${despesa.descricao} voltou ao status anterior.`,
          });
          return;
        }

        // Se não foi pago hoje E é despesa fixa, remove do histórico E volta o vencimento
        const historicoAtualizado = (despesa.historicoPagamentos || []).filter(p => {
          const dataVencimentoPagamento = new Date(p.dataVencimento);
          return !(
            dataVencimentoPagamento.getMonth() === mesVencimento &&
            dataVencimentoPagamento.getFullYear() === anoVencimento
          );
        });

        const vencimentoAnterior = removerMes(despesa.data);

        await updateDespesa(despesa.id, {
          historicoPagamentos: historicoAtualizado,
          data: vencimentoAnterior,
          pago: false,
          dataPagamento: null,
        });

        toast({
          title: "Pagamento removido.",
          description: `${despesa.descricao} voltou a ficar pendente.`,
        });
        return;
      }

      // Marcando como pago - adiciona ao histórico
      const vencimento = new Date(despesa.data + "T00:00:00");
      const pagamento = new Date(dataHojeStr + "T00:00:00");
      vencimento.setHours(0, 0, 0, 0);
      pagamento.setHours(0, 0, 0, 0);

      const emDia = pagamento <= vencimento;
      const novaData = despesa.fixo ? adicionarMes(despesa.data) : despesa.data;

      const novoPagamento = {
        id: `${despesa.id}-${despesa.data}-${Date.now()}`,
        dataVencimento: despesa.data,
        dataPagamento: dataHojeStr,
        emDia,
        meioPagamento: "Pix" as const,
      };

      const historicoAtualizado = [
        ...(despesa.historicoPagamentos || []),
        novoPagamento,
      ];

      await updateDespesa(despesa.id, {
        historicoPagamentos: historicoAtualizado,
        data: novaData,
        pago: true,
        dataPagamento: dataHojeStr,
      });

      toast({
        title: emDia ? "Pagamento em dia registrado!" : "Pagamento atrasado registrado!",
        description: despesa.fixo
          ? `Data avançada para ${formatarDataBR(novaData)}`
          : emDia
          ? `${despesa.descricao} foi marcado como pago em dia.`
          : `${despesa.descricao} foi marcado como pago com atraso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar despesa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHistorico = async (despesaItem: Despesa, historicoId: string) => {
    // Encontra o pagamento mais recente
    const pagamentoMaisRecente = (despesaItem.historicoPagamentos || []).reduce((ultimo, atual) => {
      const dataUltimo = new Date(ultimo.dataVencimento);
      const dataAtual = new Date(atual.dataVencimento);
      return dataAtual > dataUltimo ? atual : ultimo;
    });

    // Só permite deletar o pagamento mais recente
    if (historicoId !== pagamentoMaisRecente.id) {
      toast({
        title: "Não é possível apagar este pagamento",
        description: "Você deve apagar os pagamentos mais recentes primeiro.",
        variant: "destructive",
      });
      return;
    }

    const historicoAtualizado = (despesaItem.historicoPagamentos || []).filter(
      h => h.id !== historicoId
    );

    // Pega a data de vencimento do pagamento que está sendo apagado
    const pagamentoApagado = despesaItem.historicoPagamentos?.find(h => h.id === historicoId);
    const dataVencimentoAnterior = pagamentoApagado?.dataVencimento || despesaItem.data;

    try {
      await updateDespesa(despesaItem.id, {
        historicoPagamentos: historicoAtualizado,
        data: dataVencimentoAnterior,
        pago: false,
        dataPagamento: null,
      });

      toast({
        title: "Pagamento removido do histórico.",
        description: `Data de vencimento voltou para ${formatarDataBR(dataVencimentoAnterior)}.`,
      });

      // Fechar o dialog após deletar
      setHistoricoDialogOpen(false);
      setSelectedItemHistorico(null);
    } catch (error) {
      toast({ title: "Erro ao remover do histórico", variant: "destructive" });
    }
  };

  const handleEditHistorico = async (
    despesaItem: Despesa,
    historicoId: string,
    novaData: string,
    novoMeio: "Pix" | "Boleto"
  ) => {
    const historicoAtualizado = (despesaItem.historicoPagamentos || []).map(h => {
      if (h.id === historicoId) {
        const vencimento = new Date(h.dataVencimento + "T00:00:00");
        const dataPagamento = new Date(novaData + "T00:00:00");
        vencimento.setHours(0, 0, 0, 0);
        dataPagamento.setHours(0, 0, 0, 0);
        const emDia = dataPagamento <= vencimento;

        return {
          ...h,
          dataPagamento: novaData,
          meioPagamento: novoMeio,
          emDia,
        };
      }
      return h;
    });

    try {
      await updateDespesa(despesaItem.id, {
        historicoPagamentos: historicoAtualizado,
      });

      toast({
        title: "Histórico atualizado.",
      });

      // Atualizar o item selecionado
      const despesaAtualizada = despesas.find(d => d.id === despesaItem.id);
      if (despesaAtualizada) {
        setSelectedItemHistorico(despesaAtualizada);
      }
    } catch (error) {
      toast({ title: "Erro ao atualizar histórico", variant: "destructive" });
    }
  };

  const handleRemover = async (despesa: Despesa) => {
    showConfirmation(
      "Excluir Despesa",
      `Tem certeza que deseja excluir a despesa "${despesa.descricao}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await deleteDespesa(despesa.id);
          toast({ title: "Despesa removida." });
        } catch (error) {
          toast({
            title: "Erro ao remover despesa",
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
            <div  className="flex gap-2 items-end">
              <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["despesa"]} />
            
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
            <DialogContent className="max-w-lg" onCloseAutoFocus={e => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar despesa" : "Adicionar despesa"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formState.descricao}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        descricao: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contabilidade">
                    Contabilidade (opcional)
                  </Label>
                  <Input
                    id="contabilidade"
                    value={formState.contabilidade}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        contabilidade: event.target.value,
                      }))
                    }
                    placeholder="Informe a contabilidade, se aplicável"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recebedor">
                    Recebedor (opcional)
                  </Label>
                  <Select
                    value={formState.recebedor}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        recebedor: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor</Label>
                    <Input
                      id="valor"
                      value={formState.valor}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          valor: event.target.value,
                        }))
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
                        setFormState((prev) => ({
                          ...prev,
                          data: event.target.value,
                        }))
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
                    {editingItem ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </header>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Histórico de despesas
            </h2>
          </div>
          <div className="flex gap-4 p-4 border-b border-border">
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
                  setFiltroStatus(value as "todos" | "pago" | "pendente" | "vencida")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
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
                    "descricao" | "data" | "valor" | "status",
                    "asc" | "desc"
                  ];
                  setOrdenacao({ campo, direcao });
                }}
              >
                <SelectTrigger id="ordenacao" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descricao-asc">
                    Descrição (A-Z)
                  </SelectItem>
                  <SelectItem value="descricao-desc">
                    Descrição (Z-A)
                  </SelectItem>
                  <SelectItem value="data-desc">Data (Mais recente)</SelectItem>
                  <SelectItem value="data-asc">Data (Mais antigo)</SelectItem>
                  <SelectItem value="valor-desc">Valor (Maior)</SelectItem>
                  <SelectItem value="valor-asc">Valor (Menor)</SelectItem>
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
              filtroStatus !== "todos") && (
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
                <TableHead>Recebedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Próxima Venc.</TableHead>
                <TableHead>Fixo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasOrdenadas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhuma despesa cadastrada até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell className="font-medium">
                      {despesa.descricao.toUpperCase()}
                    </TableCell>
                    <TableCell>{despesa.contabilidade || "-"}</TableCell>
                    <TableCell>{despesa.recebedor?.toUpperCase() || "-"}</TableCell>
                    <TableCell>
                      R${" "}
                      {despesa.valor.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      {despesa.data ? formatarDataBR(despesa.data) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={despesa.fixo ? "default" : "secondary"}>
                        {despesa.fixo ? "Fixa" : "Avulsa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = obterStatusDespesa(despesa);
                        const meta = STATUS_META[status];
                        const Icon = meta.icon;
                        return (
                          <button
                            type="button"
                            onClick={() => handleTogglePago(despesa)}
                            title={
                              status === "pago"
                                ? "Marcar como pendente"
                                : "Marcar como pago"
                            }
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
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItemHistorico(despesa);
                            setHistoricoDialogOpen(true);
                          }}
                          title="Ver histórico de pagamentos"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(despesa)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemover(despesa)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="border-t p-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNext={nextPage}
                onPrevious={previousPage}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={totalItems}
                itemLabel="despesas"
              />
            </div>
          )}
        </section>
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy={["despesa"]}
        />
      </div>
      <HistoricoPagamentosDialog
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
