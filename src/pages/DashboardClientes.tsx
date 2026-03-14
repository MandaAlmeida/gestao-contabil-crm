import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { useClientes } from "@/hooks/useClientes";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useServicos } from "@/hooks/useServicos";
import { useCertificados } from "@/hooks/useCertificados";
import { useSintegra } from "@/hooks/useSintegra";
import { useRenovacao } from "@/hooks/useRenovacao";
import { NotificationButton } from "@/components/NotificationButton";
import { NotificationPanel } from "@/components/NotificationPanel";
import { formatarDataBR } from "@/lib/utils";
import {
  Users,
  DollarSign,
  AlertCircle,
  FileCheck,
  Calendar,
  RefreshCw,
  Wrench,
  ChevronDown,
} from "lucide-react";
import { normalizarFinanceiros } from "@/lib/financeiro";
import { Separator } from "@/components/ui/separator";

export default function DashboardClientes() {
  const navigate = useNavigate();
  const { clientes } = useClientes();
  const { financeiros: financeirosRaw } = useFinanceiro();
  const { servicos: servicosRaw } = useServicos();
  const { certificados } = useCertificados();

  const financeiros = financeirosRaw;
  const { sintegras } = useSintegra();
  const { renovacoes } = useRenovacao();
  const [responsavelSelecionado, setResponsavelSelecionado] =
    useState<string>("todos");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

          // <-- ADICIONE ESTE BLOCO AQUI -->
  const totaisTipoCliente = useMemo(() => {
    return clientesFiltrados.reduce(
      (acc, cliente) => {
        if (cliente.isFiscal) acc.fiscal += 1;
        if (cliente.isGerencial) acc.gerencial += 1;
        return acc;
      },
      { fiscal: 0, gerencial: 0 }
    );
  }, [clientesFiltrados]);


  const clienteIdsFiltrados = new Set(
    clientesFiltrados.map((cliente) => cliente.id)
  );

  const financeirosFiltrados = financeirosNormalizados.filter((financeiro) =>
    clienteIdsFiltrados.has(financeiro.clienteId)
  );

  const certificadosFiltrados = certificados.filter((certificado) =>
    clienteIdsFiltrados.has(certificado.clienteId)
  );

  const renovacoesFiltradas = renovacoes.filter((renovacao) =>
    clienteIdsFiltrados.has(renovacao.clienteId)
  );

  const servicosNormalizados = servicosRaw;


  // Filtrar serviços da mesma forma que a página de Serviços
  // Apenas pelo responsável do serviço, não pelos clientes
  const servicosFiltrados = servicosNormalizados.filter((servico) => {
    const matchesResponsavel = responsavelSelecionado === "todos" || 
                                servico.responsavel === responsavelSelecionado;
    
    return matchesResponsavel;
  });

  const totaisMensalidades = financeirosFiltrados.reduce(
    (acc, f) => {
      if (f.status === "Pago") {
        acc.recebidas += f.valorMensalidade;
      } else {
        acc.aReceber += f.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  // Serviços agora não têm status de pagamento - sempre são considerados "a receber"
  // O status de pagamento está no financeiro
  const totaisServicos = servicosFiltrados.reduce(
    (acc, s) => {
      // Verificar se o serviço foi pago no financeiro
      const servicoPago = financeiros.some(f =>
        f.servicoId === s.id && f.status === "Pago"
      );

      if (servicoPago) {
        acc.recebidas += s.valorMensalidade;
      } else {
        acc.aReceber += s.valorMensalidade;
      }
      return acc;
    },
    { recebidas: 0, aReceber: 0 }
  );

  const servicosEmAberto = servicosFiltrados.filter(
    (s) => !financeiros.some(f => f.servicoId === s.id && f.status === "Pago")
  ).length;

  const certificadosVencendo = certificadosFiltrados.filter((cert) => {
    const dataVencimento = new Date(cert.dataVencimento);
    const hoje = new Date();
    hoje.setHours(hoje.getHours() - 3); // Horário brasileiro
    const diff = Math.ceil(
      (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff <= 30 && diff >= 0;
  }).length;

  const sintegrasPendentes = sintegras.filter(
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

  const financeirosEmAberto = financeirosNormalizados.filter(
    (f) => f.status !== "Pago"
  ).length;

  const totalRecebidos = financeirosNormalizados.filter(
    (f) => f.status === "Pago"
  ).length;
  const totalAVencer = financeirosNormalizados.filter(
    (f) => f.status === "Pendente"
  ).length;
  const totalVencidos = financeirosNormalizados.filter(
    (f) => f.status === "Vencido"
  ).length;


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
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="w-full max-w-xs md:w-auto">
              <NotificationButton onClick={() => setNotificationsOpen(true)} filterBy={["all"]} />
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
              
              {/* <-- NOVO: Detalhamento por Tipo --> */}
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Fiscal: <span className="font-medium text-foreground ml-1">{totaisTipoCliente.fiscal}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  Gerencial: <span className="font-medium text-foreground ml-1">{totaisTipoCliente.gerencial}</span>
                </div>
              </div>
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
             <div className="text-2xl font-bold">
               {sintegras.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pendentes: {sintegrasPendentes}
              </p>
              <p className="text-xs text-muted-foreground">
                Concluidos: {sintegras.length - sintegrasPendentes}
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
            <CardContent className="p-6 pt-0 overflow-hidden">
              {(() => {
                const certificadosVencendoLista = certificadosFiltrados.filter(
                  (cert) => {
                    const dataVencimento = new Date(cert.dataVencimento);
                    const hoje = new Date();
                    hoje.setHours(hoje.getHours() - 3); // Horário brasileiro
                    const diff = Math.ceil(
                      (dataVencimento.getTime() - hoje.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return diff <= 30 && diff >= 0;
                  }
                );

                return (
                  <div className="relative">
                    <div
                      className="space-y-4 max-h-[300px] overflow-x-hidden  overflow-y-auto
      [scrollbar-width:none]
      [-ms-overflow-style:none]
      [&::-webkit-scrollbar]:hidden"
                    >
                      {certificadosVencendoLista.length > 0 ? (
                        certificadosVencendoLista.map((cert) => (
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
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum certificado vencendo
                        </p>
                      )}
                    </div>
                    {certificadosVencendoLista.length > 3 && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 rounded-full p-1">
                        <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sintegra Pendentes</CardTitle>
              <CardDescription>
                Obrigações fiscais aguardando conclusão
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 overflow-hidden">
              {(() => {
                const sintegrasPendentesLista = sintegras.filter(
                  (s) => s.status === "Pendente"
                );

                return (
                  <div className="relative">
                    <div
                      className="space-y-4 max-h-[300px] overflow-x-hidden  overflow-y-auto
      [scrollbar-width:none]
      [-ms-overflow-style:none]
      [&::-webkit-scrollbar]:hidden"
                    >
                      {sintegrasPendentesLista.length > 0 ? (
                        sintegrasPendentesLista.map((sintegra) => (
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
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum Sintegra pendente
                        </p>
                      )}
                    </div>
                    {sintegrasPendentesLista.length > 3 && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 rounded-full p-1">
                        <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
                      </div>
                    )}
                  </div>
                );
              })()}
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

              <div>
                <div className="flex items-center justify-between text-muted-foreground p-4">
                  <span className="font-medium text-sm">Status</span>
                  <span className="font-medium text-sm">Quantidade</span>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full h-full rounded-none justify-between border-none p-4"
                  onClick={() => navigate('/financeiro', { state: { statusFilter: 'Pago', responsavelFilter: responsavelSelecionado } })}
                >
                  <span className="font-normal">Pagos</span>
                  <span className="font-medium">{totalRecebidos}</span>
                </Button>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full h-full rounded-none justify-between border-none p-4"
                  onClick={() => navigate('/financeiro', { state: { statusFilter: 'Pendente', responsavelFilter: responsavelSelecionado } })}
                >
                  <span className="font-normal">Pendentes</span>
                  <span className="font-medium">{totalAVencer}</span>
                </Button>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full h-full rounded-none justify-between border-none p-4"
                  onClick={() => navigate('/financeiro', { state: { statusFilter: 'Vencido', responsavelFilter: responsavelSelecionado } })}
                >
                  <span className="font-normal">Vencidos</span>
                  <span className="font-medium">{totalVencidos}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <NotificationPanel
          isOpen={notificationsOpen}
          onToggle={() => setNotificationsOpen(!notificationsOpen)}
          filterBy={["all"]}
        />
      </div>
    </Layout>
  );
}
