import { useMemo, useState } from "react";
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
  const { clientes } = useClientes();
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes");
  const [periodoCustomizado, setPeriodoCustomizado] =
    useState<PeriodoCustomizado>({
      dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      dataFim: new Date(),
    });
  const [recebedorFiltro, setRecebedorFiltro] = useState<string>("todos");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const recebedoresDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(despesas.map((despesa) => despesa.recebedor).filter(Boolean))
      ).sort(),
    [despesas]
  );

  const financeirosNormalizados = useMemo(
    () => normalizarFinanceiros(financeirosRaw),
    [financeirosRaw]
  );

  // Cálculos para gráficos
  const totalEntrada = useMemo(
    () => {
      const entradaFinanceiro = calcularTotalEntrada(
        financeirosNormalizados,
        despesas,
        periodoFiltro,
        periodoCustomizado
      );
      const entradaServicos = calcularTotalEntradaServicos(
        servicosRaw,
        financeirosNormalizados,
        periodoFiltro,
        periodoCustomizado
      );
      return entradaFinanceiro + entradaServicos;
    },
    [financeirosNormalizados, servicosRaw, despesas, periodoFiltro, periodoCustomizado]
  );

  // Cálculos detalhados para mostrar financeiros e serviços separadamente
  const entradaFinanceiro = useMemo(
    () =>
      calcularTotalEntrada(
        financeirosNormalizados,
        despesas,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosNormalizados, despesas, periodoFiltro, periodoCustomizado]
  );

  const entradaServicos = useMemo(
    () =>
      calcularTotalEntradaServicos(
        servicosRaw,
        financeirosNormalizados,
        periodoFiltro,
        periodoCustomizado
      ),
    [servicosRaw, financeirosNormalizados, periodoFiltro, periodoCustomizado]
  );

  // Valores a receber
  const aReceberFinanceiro = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoFiltro, periodoCustomizado);
    return financeirosNormalizados
      .filter((f) => {
        if (f.status === "Pago") return false;
        const dataVencimento = new Date(f.dataVencimento);
        return dataVencimento >= inicio && dataVencimento <= fim;
      })
      .reduce((acc, f) => acc + f.valorMensalidade, 0);
  }, [financeirosNormalizados, periodoFiltro, periodoCustomizado]);

  const aReceberServicos = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoFiltro, periodoCustomizado);
    return servicosRaw
      .filter((s) => {
        // Serviço não pago (financeiro vinculado não pago ou não existe)
        const financeiroRelacionado = financeirosNormalizados.find(
          (f) => f.servicoId === s.id
        );
        if (financeiroRelacionado && financeiroRelacionado.status === "Pago") {
          return false;
        }
        const dataVencimento = new Date(s.dataVencimento);
        return dataVencimento >= inicio && dataVencimento <= fim;
      })
      .reduce((acc, s) => acc + s.valorMensalidade, 0);
  }, [servicosRaw, financeirosNormalizados, periodoFiltro, periodoCustomizado]);

  const despesasFiltradas = useMemo(() => {
    let filtered = despesas;

    // Filtro por período
    const dataInicio = periodoFiltro === "dia"
      ? new Date()
      : periodoFiltro === "semana"
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : periodoFiltro === "mes"
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : periodoCustomizado.dataInicio;

    const dataFim = periodoFiltro === "dia"
      ? new Date()
      : periodoFiltro === "semana"
      ? new Date()
      : periodoFiltro === "mes"
      ? new Date()
      : periodoCustomizado.dataFim;

    filtered = filtered.filter((despesa) => {
      // Para despesas pagas, usa dataPagamento; para não pagas, usa data de vencimento
      const despesaDate = despesa.pago && despesa.dataPagamento
        ? new Date(despesa.dataPagamento)
        : new Date(despesa.data);
      return despesaDate >= dataInicio && despesaDate <= dataFim;
    });

    // Filtro por recebedor
    if (recebedorFiltro !== "todos") {
      filtered = filtered.filter((despesa) => despesa.recebedor === recebedorFiltro);
    }

    return filtered;
  }, [despesas, periodoFiltro, periodoCustomizado, recebedorFiltro]);

  const totalSaida = useMemo(
    () => calcularTotalSaida(despesasFiltradas, periodoFiltro, periodoCustomizado),
    [despesasFiltradas, periodoFiltro, periodoCustomizado]
  );

  const dadosGrafico = useMemo(
    () =>
      gerarDadosGrafico(
        financeirosNormalizados,
        despesasFiltradas,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosNormalizados, despesasFiltradas, periodoFiltro, periodoCustomizado]
  );

  const dadosGraficoFormatado = useMemo(
    () =>
      dadosGrafico.map((d) => ({
        ...d,
        dataFormatada: formatarDataGrafico(d.data, periodoFiltro),
      })),
    [dadosGrafico, periodoFiltro]
  );

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

  const saldo = totalEntrada - totalSaida;
  const percentualEntrada =
    totalEntrada > 0
      ? ((totalEntrada / (totalEntrada + totalSaida)) * 100).toFixed(1)
      : "0";
  const percentualSaida =
    totalSaida > 0
      ? ((totalSaida / (totalEntrada + totalSaida)) * 100).toFixed(1)
      : "0";

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
                  <SelectValue placeholder="Selecione o recebedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os recebedores</SelectItem>
                  {recebedoresDisponiveis.map((recebedor, index) => (
                    <SelectItem
                      key={`recebedor-${index}-${recebedor}`}
                      value={recebedor}
                    >
                      {recebedor?.toUpperCase()}
                    </SelectItem>
                  ))}
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
                    value={
                      periodoCustomizado.dataInicio.toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      setPeriodoCustomizado({
                        ...periodoCustomizado,
                        dataInicio: new Date(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="w-full max-w-xs space-y-1">
                  <Label htmlFor="dataFim" className="text-xs">
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={
                      periodoCustomizado.dataFim.toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      setPeriodoCustomizado({
                        ...periodoCustomizado,
                        dataFim: new Date(e.target.value),
                      })
                    }
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
                {totalEntrada.toLocaleString("pt-BR", {
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
                  {entradaFinanceiro.toLocaleString("pt-BR", {
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
                  {entradaServicos.toLocaleString("pt-BR", {
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
