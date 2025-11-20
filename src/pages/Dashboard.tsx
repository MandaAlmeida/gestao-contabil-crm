import { useEffect, useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useCertificados } from "@/hooks/useCertificados";
import { useSintegra } from "@/hooks/useSintegra";
import { useDespesas } from "@/hooks/useDespesas";
import { Cliente, Financeiro, Certificado, Sintegra } from "@/types/crm";
import { Despesa } from "@/types/despesas";
import {
  Users,
  DollarSign,
  AlertCircle,
  FileCheck,
  Calendar,
  TrendingUp,
  TrendingDown,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

export default function Dashboard() {
  const { clientes } = useClientes();
  const { financeiros: financeirosRaw, updateFinanceiro } = useFinanceiro();
  const { certificados } = useCertificados();
  const { sintegras } = useSintegra();
  const { despesas } = useDespesas();
  const [responsavelSelecionado, setResponsavelSelecionado] =
    useState<string>("todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes");
  const [periodoCustomizado, setPeriodoCustomizado] =
    useState<PeriodoCustomizado>({
      dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      dataFim: new Date(),
    });

  const financeirosNormalizados = useMemo(() => normalizarFinanceiros(financeirosRaw), [financeirosRaw]);

  const responsaveisDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(clientes.map((cliente) => cliente.responsavel))
      ).sort(),
    [clientes]
  );

  const clientesFiltrados =
    responsavelSelecionado === "todos"
      ? clientes
      : clientes.filter(
          (cliente) => cliente.responsavel === responsavelSelecionado
        );

  const clienteIdsFiltrados = new Set(
    clientesFiltrados.map((cliente) => cliente.id)
  );

  const financeirosFiltrados = financeirosNormalizados.filter((financeiro) =>
    clienteIdsFiltrados.has(financeiro.clienteId)
  );

  const certificadosFiltrados = certificados.filter((certificado) =>
    clienteIdsFiltrados.has(certificado.clienteId)
  );

  const sintegrasFiltradas = sintegras.filter((sintegra) =>
    clienteIdsFiltrados.has(sintegra.clienteId)
  );

  const totaisMensalidades = financeirosFiltrados.reduce(
    (acc, f) => {
      if (f.status === "Recebido") {
        acc.recebidas += f.valorMensalidade;
      } else {
        acc.aReceber += f.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  const certificadosVencendo = certificadosFiltrados.filter((cert) => {
    const dataVencimento = new Date(cert.dataVencimento);
    const hoje = new Date();
    const diff = Math.ceil(
      (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff <= 30 && diff >= 0;
  }).length;

  const sintegrasPendentes = sintegrasFiltradas.filter(
    (s) => s.status === "Pendente"
  ).length;
  const financeirosEmAberto = financeirosFiltrados.filter(
    (f) => f.status !== "Recebido"
  ).length;
  const totalRecebidos = financeirosFiltrados.filter(
    (f) => f.status === "Recebido"
  ).length;
  const totalAVencer = financeirosFiltrados.filter(
    (f) => f.status === "A Vencer"
  ).length;
  const totalVencidos = financeirosFiltrados.filter(
    (f) => f.status === "Vencido"
  ).length;

  // Cálculos para gráficos
  const totalEntrada = useMemo(
    () =>
      calcularTotalEntrada(
        financeirosFiltrados,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosFiltrados, periodoFiltro, periodoCustomizado]
  );

  const totalSaida = useMemo(
    () => calcularTotalSaida(despesas, periodoFiltro, periodoCustomizado),
    [despesas, periodoFiltro, periodoCustomizado]
  );

  const dadosGrafico = useMemo(
    () =>
      gerarDadosGrafico(
        financeirosFiltrados,
        despesas,
        periodoFiltro,
        periodoCustomizado
      ),
    [financeirosFiltrados, despesas, periodoFiltro, periodoCustomizado]
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

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Acompanhe os indicadores por responsável
            </p>
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="w-full max-w-xs md:w-auto">
              <Select
                value={responsavelSelecionado}
                onValueChange={setResponsavelSelecionado}
              >
                <SelectTrigger>
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
                <div className="w-full max-w-xs">
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
                <div className="w-full max-w-xs">
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

        {/* Resumo Financeiro Rápido 
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
                no período selecionado
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
                no período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign
                className={`h-4 w-4 ${
                  totalEntrada - totalSaida >= 0
                    ? "text-success"
                    : "text-destructive"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalEntrada - totalSaida >= 0
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                R${" "}
                {(totalEntrada - totalSaida).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalEntrada - totalSaida >= 0
                  ? "Saldo positivo"
                  : "Saldo negativo"}
              </p>
            </CardContent>
          </Card>
        </div>*/}

        {/* Cards de Resumo Geral */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Clientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clientesFiltrados.length}
              </div>
              <p className="text-xs text-muted-foreground">
                clientes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Mensalidades
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R${" "}
                {(
                  totaisMensalidades.recebidas + totaisMensalidades.aReceber
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Recebidas: R${" "}
                {totaisMensalidades.recebidas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                A receber: R${" "}
                {totaisMensalidades.aReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Cobranças em aberto: {financeirosEmAberto}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Certificados a Vencer
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {certificadosVencendo}
              </div>
              <p className="text-xs text-muted-foreground">próximos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sintegra Pendentes
              </CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sintegrasPendentes}</div>
              <p className="text-xs text-muted-foreground">
                aguardando conclusão
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Certificados e Sintegra */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Certificados Vencendo</CardTitle>
              <CardDescription>
                Certificados que vencem nos próximos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certificadosFiltrados
                  .filter((cert) => {
                    const dataVencimento = new Date(cert.dataVencimento);
                    const hoje = new Date();
                    const diff = Math.ceil(
                      (dataVencimento.getTime() - hoje.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return diff <= 30 && diff >= 0;
                  })
                  .slice(0, 5)
                  .map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{cert.clienteNome}</p>
                        <p className="text-sm text-muted-foreground">
                          Vence em{" "}
                          {new Date(cert.dataVencimento).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                        {cert.tipoCertificado}
                      </span>
                    </div>
                  ))}
                {certificadosVencendo === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum certificado vencendo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sintegra Pendentes</CardTitle>
              <CardDescription>
                Obrigações fiscais aguardando conclusão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sintegrasFiltradas
                  .filter((s) => s.status === "Pendente")
                  .slice(0, 5)
                  .map((sintegra) => (
                    <div
                      key={sintegra.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{sintegra.clienteNome}</p>
                        <p className="text-sm text-muted-foreground">
                          Prazo:{" "}
                          {new Date(sintegra.dataPrazo).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                {sintegrasPendentes === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum Sintegra pendente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 grid-cols-1 lg:grid-cols-3">
          {/* Gráfico Comparativo Principal - Ocupa 2 colunas */}
          <Card className="lg:col-span-2">
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

          {/* Coluna de Relatórios - Ocupa 1 coluna */}
          <Card className="flex flex-col gap-4 h-full">
            <CardHeader>
              <CardTitle>Resumo de Pagamentos</CardTitle>
              <CardDescription>
                Status dos recebimentos dos clientes filtrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Recebido</TableCell>
                    <TableCell className="text-right">
                      {totalRecebidos}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>A vencer</TableCell>
                    <TableCell className="text-right">{totalAVencer}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Vencido</TableCell>
                    <TableCell className="text-right">
                      {totalVencidos}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
