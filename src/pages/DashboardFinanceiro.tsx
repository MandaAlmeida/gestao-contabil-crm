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
import { useDespesas } from "@/hooks/useDespesas";
import { Financeiro } from "@/types/crm";
import { Despesa } from "@/types/despesas";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { normalizarFinanceiros } from "@/lib/financeiro";
import {
  calcularTotalEntrada,
  calcularTotalSaida,
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
  const { despesas } = useDespesas();
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes");
  const [periodoCustomizado, setPeriodoCustomizado] =
    useState<PeriodoCustomizado>({
      dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      dataFim: new Date(),
    });

  const financeirosNormalizados = useMemo(
    () => normalizarFinanceiros(financeirosRaw),
    [financeirosRaw]
  );

  // Cálculos para gráficos
  const totalEntrada = useMemo(
    () =>
      calcularTotalEntrada(
        financeirosNormalizados,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosNormalizados, periodoFiltro, periodoCustomizado]
  );

  const totalSaida = useMemo(
    () => calcularTotalSaida(despesas, periodoFiltro, periodoCustomizado),
    [despesas, periodoFiltro, periodoCustomizado]
  );

  const dadosGrafico = useMemo(
    () =>
      gerarDadosGrafico(
        financeirosNormalizados,
        despesas,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosNormalizados, despesas, periodoFiltro, periodoCustomizado]
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
      </div>
    </Layout>
  );
}
