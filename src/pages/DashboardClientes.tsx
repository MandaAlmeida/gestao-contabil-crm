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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useCertificados } from "@/hooks/useCertificados";
import { useSintegra } from "@/hooks/useSintegra";
import { useRenovacao } from "@/hooks/useRenovacao";
import { formatarDataBR } from "@/lib/utils";
import {
  Cliente,
  Financeiro,
  Servico,
  Certificado,
  Sintegra,
  Renovacao,
} from "@/types/crm";
import {
  Users,
  DollarSign,
  AlertCircle,
  FileCheck,
  Calendar,
  Building2,
  MapPin,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { normalizarFinanceiros } from "@/lib/financeiro";
import { normalizarServicos } from "@/lib/servicos";

export default function DashboardClientes() {
  const { clientes } = useClientes();
  const { financeiros: financeirosRaw } = useFinanceiro();
  const { servicos: servicosRaw } = useServicos();
  const { certificados } = useCertificados();
  const { sintegras } = useSintegra();
  const { renovacoes } = useRenovacao();
  const [responsavelSelecionado, setResponsavelSelecionado] =
    useState<string>("todos");

  const financeirosNormalizados = useMemo(
    () => normalizarFinanceiros(financeirosRaw),
    [financeirosRaw]
  );

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

  const renovacoesFiltradas = renovacoes.filter((renovacao) =>
    clienteIdsFiltrados.has(renovacao.clienteId)
  );

  const servicosNormalizados = useMemo(
    () => normalizarServicos(servicosRaw),
    [servicosRaw]
  );

  const servicosFiltrados = servicosNormalizados.filter((servico) =>
    clienteIdsFiltrados.has(servico.clienteId)
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

  const totaisServicos = servicosFiltrados.reduce(
    (acc, s) => {
      if (s.status === "Recebido") {
        acc.recebidas += s.valorMensalidade;
      } else {
        acc.aReceber += s.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  const servicosEmAberto = servicosFiltrados.filter(
    (s) => s.status !== "Recebido"
  ).length;

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

  const totaisRenovacoes = renovacoesFiltradas.reduce(
    (acc, r) => {
      if (r.status === "Renovado") {
        acc.recebidas += r.valorRenovacao;
      } else if (
        r.status === "Pendente" ||
        r.status === "Avisado" ||
        r.status === "Em Negociação" ||
        r.status === "Parcelado"
      ) {
        acc.aReceber += r.valorRenovacao;
        acc.emAberto += 1;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0, emAberto: 0 }
  );

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

  // Estatísticas por cidade
  const clientesPorCidade = useMemo(() => {
    const cidadeMap = new Map<string, number>();
    clientesFiltrados.forEach((cliente) => {
      const count = cidadeMap.get(cliente.cidade) || 0;
      cidadeMap.set(cliente.cidade, count + 1);
    });
    return Array.from(cidadeMap.entries())
      .map(([cidade, count]) => ({ cidade, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [clientesFiltrados]);

  // Estatísticas por responsável
  const clientesPorResponsavel = useMemo(() => {
    const responsavelMap = new Map<string, number>();
    clientesFiltrados.forEach((cliente) => {
      const count = responsavelMap.get(cliente.responsavel) || 0;
      responsavelMap.set(cliente.responsavel, count + 1);
    });
    return Array.from(responsavelMap.entries())
      .map(([responsavel, count]) => ({ responsavel, count }))
      .sort((a, b) => b.count - a.count);
  }, [clientesFiltrados]);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard de Clientes
            </h1>
            <p className="text-muted-foreground">
              Acompanhe informações e métricas dos clientes
            </p>
          </div>
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
        </div>

        {/* Cards de Valores */}
        <div className="grid gap-4 md:grid-cols-3">
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
                Total Serviços
              </CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R${" "}
                {(
                  totaisServicos.recebidas + totaisServicos.aReceber
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Recebidas: R${" "}
                {totaisServicos.recebidas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                A receber: R${" "}
                {totaisServicos.aReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Cobranças em aberto: {servicosEmAberto}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Renovações
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R${" "}
                {(
                  totaisRenovacoes.recebidas + totaisRenovacoes.aReceber
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Recebidas: R${" "}
                {totaisRenovacoes.recebidas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                A receber: R${" "}
                {totaisRenovacoes.aReceber.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Em aberto: {totaisRenovacoes.emAberto}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Informações */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
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

        {/* Cards de Detalhes */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                          Vence em {formatarDataBR(cert.dataVencimento)}
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
                          Prazo: {formatarDataBR(sintegra.dataPrazo)}
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

          <Card>
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

        {/* Estatísticas Adicionais
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Clientes por Cidade
              </CardTitle>
              <CardDescription>
                Distribuição geográfica dos clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesPorCidade.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.cidade}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.count} clientes
                    </span>
                  </div>
                ))}
                {clientesPorCidade.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum dado disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Clientes por Responsável
              </CardTitle>
              <CardDescription>Distribuição por responsável</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesPorResponsavel.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium">{item.responsavel}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.count} clientes
                    </span>
                  </div>
                ))}
                {clientesPorResponsavel.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum dado disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </Layout>
  );
}
