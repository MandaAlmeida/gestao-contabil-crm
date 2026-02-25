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
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import {
  calcularTotalSaida,
  calcularPeriodo,
  gerarDadosGrafico,
  formatarDataGrafico,
  type PeriodoFiltro,
  type PeriodoCustomizado,
} from "@/lib/graficos";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

/* =========================
   UTIL — DATAS LOCAL
========================= */
function ajustarDataLocal(dataInput: string | Date | undefined): Date {
  if (!dataInput) return new Date();
  if (dataInput instanceof Date) return dataInput;
  if (dataInput.includes("T")) return new Date(dataInput);
  
  const [ano, mes, dia] = dataInput.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0);
}

export default function DashboardFinanceiro() {
  const { financeiros: financeirosRaw } = useFinanceiro();
  const { servicos: servicosRaw } = useServicos();
  const { despesas } = useDespesas();

  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes");
  
  const hoje = new Date();
  const [periodoCustomizado, setPeriodoCustomizado] = useState<PeriodoCustomizado>({
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0),
    fim: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999),
  });

  const [recebedorFiltro, setRecebedorFiltro] = useState<string>("todos");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const formatarDataInput = (data: Date) => {
    if (!data) return "";
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };

  const metricas = useFinanceiroMetricas(
    financeirosRaw,
    periodoFiltro === "customizado" ? "customizado" : periodoFiltro,
    periodoFiltro === "customizado" ? periodoCustomizado : undefined
  );

  const despesasFiltradas = useMemo(() => {
    let filtered = despesas;
    const { inicio, fim } = metricas.periodo;
    
    filtered = filtered.filter((despesa) => {
      const dataStr = despesa.pago && despesa.dataPagamento ? despesa.dataPagamento : despesa.data;
      const dataLocal = ajustarDataLocal(dataStr as string);
      dataLocal.setHours(0, 0, 0, 0);

      const inicioLimpo = new Date(inicio); inicioLimpo.setHours(0, 0, 0, 0);
      const fimLimpo = new Date(fim); fimLimpo.setHours(23, 59, 59, 999);

      return dataLocal >= inicioLimpo && dataLocal <= fimLimpo;
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

  const dadosGrafico = useMemo(
    () => gerarDadosGrafico(financeirosRaw, despesasFiltradas, periodoFiltro, periodoCustomizado),
    [financeirosRaw, despesasFiltradas, periodoFiltro, periodoCustomizado]
  );

  const dadosGraficoFormatado = useMemo(
    () => dadosGrafico.map((d) => ({
      ...d,
      dataFormatada: formatarDataGrafico(d.data, periodoFiltro),
    })),
    [dadosGrafico, periodoFiltro]
  );

  const saldo = metricas.totalEntrada - totalSaida;

  const percentualEntrada = metricas.totalEntrada > 0 ? ((metricas.totalEntrada / (metricas.totalEntrada + totalSaida)) * 100).toFixed(1) : "0";
  const percentualSaida = totalSaida > 0 ? ((totalSaida / (metricas.totalEntrada + totalSaida)) * 100).toFixed(1) : "0";

  const aReceberFinanceiro = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoFiltro, periodoCustomizado);
    return (financeirosRaw ?? [])
      .filter((f) => {
        if (f.status === "Pago") return false;
        const dataVencimento = ajustarDataLocal(f.dataVencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        return dataVencimento >= inicio && dataVencimento <= fim;
      })
      .reduce((acc, f) => acc + (f.valorMensalidade ?? 0), 0);
  }, [financeirosRaw, periodoFiltro, periodoCustomizado]);

  const aReceberServicos = useMemo(() => {
    const { inicio, fim } = calcularPeriodo(periodoFiltro, periodoCustomizado);
    const financeiroPorServico = new Map((financeirosRaw ?? []).map((f) => [f.servicoId, f]));

    return (servicosRaw ?? [])
      .filter((s) => {
        const financeiroRelacionado = financeiroPorServico.get(s.id);
        if (financeiroRelacionado?.status === "Pago") return false;
        const dataVencimento = ajustarDataLocal(s.dataVencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        return dataVencimento >= inicio && dataVencimento <= fim;
      })
      .reduce((acc, s) => acc + (s.valorMensalidade ?? 0), 0);
  }, [servicosRaw, financeirosRaw, periodoFiltro, periodoCustomizado]);

  const chartConfig = {
    entrada: {
      label: "Entrada (No Prazo)",
      theme: { light: "#23fb40", dark: "#23fb40" },
    },
    entradaAtrasada: {
      label: "Entrada (Em Atraso)",
      theme: { light: "#fc6703", dark: "#fc6703" },
    },
    saida: {
      label: "Saída",
      theme: { light: "#ef4444", dark: "#7f1d1d" },
    },
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">Acompanhe entradas, saídas e saldo financeiro</p>
          </div>
          <div className="flex flex-col gap-4 md:flex-row items-end">
            <div className="w-full max-w-xs md:w-auto">
              <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["pagamento", "despesa"]} />
            </div>
            <div className="w-full max-w-xs md:w-auto">
              <Select value={periodoFiltro} onValueChange={(value) => setPeriodoFiltro(value as PeriodoFiltro)}>
                <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="customizado">Período Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full max-w-xs md:w-auto">
            <Select value={recebedorFiltro} onValueChange={setRecebedorFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            </div>
            {periodoFiltro === "customizado" && (
              <div className="flex gap-2">
                <div className="w-full max-w-xs space-y-1">
                  <Label htmlFor="dataInicio" className="text-xs">Data Início</Label>
                  <Input
                    id="dataInicio" type="date" value={formatarDataInput(periodoCustomizado.inicio)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [ano, mes, dia] = e.target.value.split("-").map(Number);
                      setPeriodoCustomizado((prev) => ({ ...prev, inicio: new Date(ano, mes - 1, dia, 0, 0, 0) }));
                    }}
                  />
                </div>
                <div className="w-full max-w-xs space-y-1">
                  <Label htmlFor="dataFim" className="text-xs">Data Fim</Label>
                  <Input
                    id="dataFim" type="date" value={formatarDataInput(periodoCustomizado.fim)}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [ano, mes, dia] = e.target.value.split("-").map(Number);
                      setPeriodoCustomizado((prev) => ({ ...prev, fim: new Date(ano, mes - 1, dia, 23, 59, 59, 999) }));
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
              <CardTitle className="text-sm font-medium">Total de Entrada</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {metricas.totalEntrada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">{percentualEntrada}% do total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Saída</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {totalSaida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">{percentualSaida}% do total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign className={`h-4 w-4 ${saldo >= 0 ? "text-success" : "text-destructive"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">{saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}</p>
            </CardContent>
          </Card>
        </div>

        {/* ======================================================= */}
        {/* DETALHAMENTO POR TIPO E PENDÊNCIAS (EXATO COMO A IMAGEM) */}
        {/* ======================================================= */}
        
        {/* Detalhamento por Tipo */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Detalhamento por Tipo</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Financeiros Recebidos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {metricas.entradaFinanceiro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Pagamentos diretos</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Serviços Recebidos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {metricas.entradaServicos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Serviços pagos</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Financeiros A Receber</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">R$ {aReceberFinanceiro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Pagamentos pendentes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Serviços A Receber</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">R$ {aReceberServicos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Serviços pendentes</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pendências e Atrasos */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Pendências e Atrasos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Financeiros Recebidos em atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R$ {metricas.pagamentosAtrasadosFinanceiro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Financeiros pagos após vencimento</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Serviços Recebidos em atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R$ {metricas.pagamentosAtrasadosServicos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Serviços pagos após vencimento</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Financeiros em Atraso</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">R$ {(metricas.valoresVencidosFinanceiro || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Pagamentos pendentes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Serviços em Atraso</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">R$ {(metricas.valoresVencidosServicos || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Serviços pendentes</p>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* ======================================================= */}

        {/* Gráfico Comparativo Principal */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Comparação Entrada vs Saída</CardTitle>
              <CardDescription>Visualização comparativa dos valores de entrada e saída no período selecionado</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[280px] md:h-[320px] lg:h-[380px]">
                <BarChart data={dadosGraficoFormatado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dataFormatada" tickLine={false} axisLine={false} tickMargin={8} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={60} tickFormatter={(value) => value >= 1000000 ? `R$ ${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${value}`} tick={{ fontSize: 10 }} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs sm:text-sm">
                          <div className="grid gap-2">
                            {payload.map((item: any, index) => (
                              <div key={index} className="flex items-center justify-between gap-2 sm:gap-4">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div
                                    className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        item.dataKey === "entrada" ? "#23fb40" :
                                        item.dataKey === "entradaAtrasada" ? "#fc6703" :
                                        "#ef4444",
                                    }}
                                  />
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {item.dataKey === "entrada" ? "No Prazo" : item.dataKey === "entradaAtrasada" ? "Em Atraso" : "Saída"}
                                  </span>
                                </div>
                                <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                  R$ {Number(item.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="entrada" stackId="a" fill="#23fb40" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="entradaAtrasada" stackId="a" fill="#fc6703" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saida" fill="#ef4444" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Individuais de Entrada e Saída */}
        <div className="mt-8 grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />Evolução de Entrada</CardTitle>
              <CardDescription className="text-xs">Valores recebidos ao longo do período</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer config={chartConfig} className="h-[180px] w-full sm:h-[200px] md:h-[240px]">
                <AreaChart data={dadosGraficoFormatado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dataFormatada" tickLine={false} axisLine={false} tickMargin={8} hide />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} hide />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const totalEntradaDia = payload.reduce((acc, p) => acc + Number(p.value), 0);
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium text-xs sm:text-sm">
                            R$ {totalEntradaDia.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="entrada" stackId="1" stroke="#23fb40" fill="#23fb40" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="entradaAtrasada" stackId="1" stroke="#fc6703" fill="#fc6703" fillOpacity={0.6} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingDown className="h-4 w-4 text-destructive" />Evolução de Saída</CardTitle>
              <CardDescription className="text-xs">Valores gastos ao longo do período</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer config={chartConfig} className="h-[180px] w-full sm:h-[200px] md:h-[240px]">
                <AreaChart data={dadosGraficoFormatado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dataFormatada" tickLine={false} axisLine={false} tickMargin={8} hide />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} hide />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium text-xs sm:text-sm">
                            R$ {Number(payload[0].value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="saida" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <NotificationPanel isOpen={notificationsOpen} onToggle={() => setNotificationsOpen(!notificationsOpen)} filterBy={["pagamento", "despesa"]} />
      </div>
    </Layout>
  );
}