import { useMemo, useState } from "react";
import { useFinanceiroMetricas } from "@/hooks/useFinanceiroDashboard";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useDespesas } from "@/hooks/useDespesas";
import { useClientes } from "@/hooks/useClientes";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { normalizarFinanceiros } from "@/lib/financeiro";
import {
  calcularTotalEntrada,
  calcularTotalEntradaServicos,
  calcularTotalSaida,
  calcularPeriodo,
  gerarDadosGrafico,
  formatarDataGrafico,
  type PeriodoFiltro,
  type PeriodoCustomizado,
} from "@/lib/graficos";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardFinanceiro() {
  const { financeiros: financeirosRaw } = useFinanceiro();
  const { servicos: servicosRaw } = useServicos();
  const { despesas } = useDespesas();

  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes");
  
  // AJUSTE 1: Iniciar os estados com horários cravados em 00:00:00 e 23:59:59
  const hoje = new Date();
  const [periodoCustomizado, setPeriodoCustomizado] = useState<PeriodoCustomizado>({
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0),
    fim: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999),
  });

  const [recebedorFiltro, setRecebedorFiltro] = useState<string>("todos");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // AJUSTE 2: Função para formatar a data respeitando o fuso horário local
  const formatarDataInput = (data: Date) => {
    if (!data) return "";
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };

  // Usar o hook para métricas financeiras
  const metricas = useFinanceiroMetricas(
    financeirosRaw,
    periodoFiltro === "customizado" ? "customizado" : periodoFiltro,
    periodoFiltro === "customizado" ? periodoCustomizado : undefined
  );

  // =============================
  // DESPESAS FILTRO
  // =============================

  // Mantém a filtragem de despesas e cálculo de saída
  const despesasFiltradas = useMemo(() => {
    let filtered = despesas;
    const { inicio, fim } = metricas.periodo;
    filtered = filtered.filter((despesa) => {
      const data = despesa.pago && despesa.dataPagamento
        ? new Date(despesa.dataPagamento)
        : new Date(despesa.data);
      return data >= inicio && data <= fim;
    });
    if (recebedorFiltro !== "todos") {
      filtered = filtered.filter((d) => d.recebedor === recebedorFiltro);
    }
    return filtered;
  }, [despesas, metricas.periodo, recebedorFiltro]);

  const totalSaida = useMemo(
    () => calcularTotalSaida(despesasFiltradas, periodoFiltro, periodoCustomizado),
    [despesasFiltradas, periodoFiltro, periodoCustomizado]
  );

  // =============================
  // GRÁFICO
  // =============================

  const dadosGrafico = useMemo(
    () =>
      gerarDadosGrafico(
        financeirosRaw,
        despesasFiltradas,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosRaw, despesasFiltradas, periodoFiltro, periodoCustomizado]
  );

  const dadosGraficoFormatado = useMemo(
    () =>
      dadosGrafico.map((d) => ({
        ...d,
        dataFormatada: formatarDataGrafico(
          d.data,
          periodoFiltro
        ),
      })),
    [dadosGrafico, periodoFiltro]
  );

  const saldo = metricas.totalEntrada - totalSaida;

  const percentualEntrada =
    metricas.totalEntrada > 0
      ? (
          (metricas.totalEntrada /
            (metricas.totalEntrada + totalSaida)) *
          100
        ).toFixed(1)
      : "0";

  const percentualSaida =
    totalSaida > 0
      ? (
          (totalSaida /
            (metricas.totalEntrada + totalSaida)) *
          100
        ).toFixed(1)
      : "0";

  const aReceberFinanceiro = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoFiltro, periodoCustomizado);

    return (financeirosRaw ?? [])
      .filter((f) => {
        if (f.status === "Pago") return false;

        const dataVencimento = new Date(f.dataVencimento);
        return dataVencimento >= inicio && dataVencimento <= fim;
      })
      .reduce((acc, f) => acc + (f.valorMensalidade ?? 0), 0);
  }, [financeirosRaw, periodoFiltro, periodoCustomizado]);

  const aReceberServicos = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoFiltro, periodoCustomizado);

    // Mapa para busca rápida por servicoId
    const financeiroPorServico = new Map(
      (financeirosRaw ?? []).map((f) => [f.servicoId, f])
    );

    return (servicosRaw ?? [])
      .filter((s) => {
        const financeiroRelacionado = financeiroPorServico.get(s.id);

        // Se existe financeiro e está pago → não entra
        if (financeiroRelacionado?.status === "Pago") return false;

        const dataVencimento = new Date(s.dataVencimento);
        return dataVencimento >= inicio && dataVencimento <= fim;
      })
      .reduce((acc, s) => acc + (s.valorMensalidade ?? 0), 0);
  }, [servicosRaw, financeirosRaw, periodoFiltro, periodoCustomizado]);

  const chartConfig = {
    entrada: {
      label: "Entrada",
      theme: {
        light: "hsl(43, 96%, 56%)",
        dark: "hsl(43, 96%, 56%)",
      },
    },
    saida: {
      label: "Saída",
      theme: {
        light: "hsl(0, 84.2%, 60.2%)",
        dark: "hsl(0, 62.8%, 30.6%)",
      },
    },
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard Financeiro
            </h1>
            <p className="text-muted-foreground">
              Acompanhe entradas, saídas e saldo financeiro
            </p>
          </div>
          <div className="flex flex-col gap-4 md:flex-row items-end">
            <div className="w-full max-w-xs md:w-auto">
              <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["pagamento", "despesa"]} />
            </div>
            <div className="w-full max-w-xs md:w-auto">
              <Select
                value={periodoFiltro}
                onValueChange={(value) =>
                  setPeriodoFiltro(value as PeriodoFiltro)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="customizado">
                    Período Customizado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full max-w-xs md:w-auto">
            <Select
              value={recebedorFiltro}
              onValueChange={setRecebedorFiltro}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="todos">
                  Todos
                </SelectItem>
              </SelectContent>
            </Select>
            </div>
            {periodoFiltro === "customizado" && (
              <div className="flex gap-2">
                <div className="w-full max-w-xs space-y-1">
                  <Label htmlFor="dataInicio" className="text-xs">
                    Data Início
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={formatarDataInput(periodoCustomizado.inicio)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      // Quebra a string "YYYY-MM-DD" que vem do input
                      const [ano, mes, dia] = e.target.value.split("-").map(Number);
                      setPeriodoCustomizado((prev) => ({
                        ...prev,
                        inicio: new Date(ano, mes - 1, dia, 0, 0, 0), // Garante 00:00:00 local
                      }));
                    }}
                  />
                </div>
                <div className="w-full max-w-xs space-y-1">
                  <Label htmlFor="dataFim" className="text-xs">
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={formatarDataInput(periodoCustomizado.fim)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      // Quebra a string "YYYY-MM-DD" que vem do input
                      const [ano, mes, dia] = e.target.value.split("-").map(Number);
                      setPeriodoCustomizado((prev) => ({
                        ...prev,
                        fim: new Date(ano, mes - 1, dia, 23, 59, 59, 999), // Garante 23:59:59 local
                      }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Financeiro Rápido */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Entrada
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R${" "}
                {metricas.totalEntrada.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {percentualEntrada}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Saída
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R${" "}
                {totalSaida.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {percentualSaida}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign
                className={`h-4 w-4 ${
                  saldo >= 0 ? "text-success" : "text-destructive"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  saldo >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Divisão de Recebidos e A Receber */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Detalhamento por Tipo</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Financeiros Recebidos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Financeiros Recebidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R${" "}
                  {metricas.entradaFinanceiro.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamentos diretos
                </p>
              </CardContent>
            </Card>

            {/* Serviços Recebidos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Serviços Recebidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R${" "}
                  {metricas.entradaServicos.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Serviços pagos
                </p>
              </CardContent>
            </Card>

            {/* Financeiros A Receber */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Financeiros A Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R${" "}
                  {aReceberFinanceiro.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamentos pendentes
                </p>
              </CardContent>
            </Card>

            {/* Serviços A Receber */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Serviços A Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R${" "}
                  {aReceberServicos.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Serviços pendentes
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vencidos e Atrasados */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Pendências e Atrasos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Valores Vencidos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Valores Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R${" "}
                  {metricas.valoresVencidos.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamentos não realizados após vencimento
                </p>
              </CardContent>
            </Card>

            {/* Pagamentos em Atraso */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                  Pagamentos em Atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  R${" "}
                  {metricas.pagamentosAtrasados.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamentos realizados após vencimento
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Gráfico Comparativo Principal */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Comparação Entrada vs Saída</CardTitle>
              <CardDescription>
                Visualização comparativa dos valores de entrada e saída no
                período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full sm:h-[280px] md:h-[320px] lg:h-[380px]"
              >
                <BarChart data={dadosGraficoFormatado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dataFormatada"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={60}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `R$ ${(value / 1000000).toFixed(1)}M`;
                      }
                      if (value >= 1000) {
                        return `R$ ${(value / 1000).toFixed(1)}k`;
                      }
                      return `R$ ${value}`;
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs sm:text-sm">
                          <div className="grid gap-2">
                            {payload.map((item: any, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-2 sm:gap-4"
                              >
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div
                                    className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        item.dataKey === "entrada"
                                          ? "hsl(43, 96%, 56%)"
                                          : "hsl(0, 84.2%, 60.2%)",
                                    }}
                                  />
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {item.dataKey === "entrada"
                                      ? "Entrada"
                                      : "Saída"}
                                  </span>
                                </div>
                                <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                  R${" "}
                                  {Number(item.value).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="entrada" fill="hsl(43, 96%, 56%)" radius={4} />
                  <Bar dataKey="saida" fill="hsl(0, 84.2%, 60.2%)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Individuais de Entrada e Saída */}
        <div className="mt-8 grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução de Entrada
              </CardTitle>
              <CardDescription className="text-xs">
                Valores recebidos ao longo do período
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer
                config={chartConfig}
                className="h-[180px] w-full sm:h-[200px] md:h-[240px]"
              >
                <AreaChart data={dadosGraficoFormatado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dataFormatada"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    hide
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    hide
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium text-xs sm:text-sm">
                            R${" "}
                            {Number(payload[0].value).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="entrada"
                    stroke="hsl(43, 96%, 56%)"
                    fill="hsl(43, 96%, 56%)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Evolução de Saída
              </CardTitle>
              <CardDescription className="text-xs">
                Valores gastos ao longo do período
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer
                config={chartConfig}
                className="h-[180px] w-full sm:h-[200px] md:h-[240px]"
              >
                <AreaChart data={dadosGraficoFormatado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dataFormatada"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    hide
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    hide
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium text-xs sm:text-sm">
                            R${" "}
                            {Number(payload[0].value).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="saida"
                    stroke="hsl(0, 84.2%, 60.2%)"
                    fill="hsl(0, 84.2%, 60.2%)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy={["pagamento", "despesa"]}
        />
      </div>
    </Layout>
  );
}