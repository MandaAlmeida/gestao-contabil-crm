import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Cliente, Financeiro, Certificado, Renovacao, Sintegra } from "@/types/crm";
import { Users, DollarSign, AlertCircle, FileCheck, Calendar } from "lucide-react";

export default function Dashboard() {
  const [clientes] = useLocalStorage<Cliente[]>('crm-clientes', []);
  const [financeiros] = useLocalStorage<Financeiro[]>('crm-financeiro', []);
  const [certificados] = useLocalStorage<Certificado[]>('crm-certificados', []);
  const [sintegras] = useLocalStorage<Sintegra[]>('crm-sintegra', []);

  const totalMensalidades = financeiros.reduce((sum, f) => sum + f.valorMensalidade, 0);
  
  const certificadosVencendo = certificados.filter(cert => {
    const dataVencimento = new Date(cert.dataVencimento);
    const hoje = new Date();
    const diff = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30 && diff >= 0;
  }).length;

  const sintegrasPendentes = sintegras.filter(s => s.status === 'Pendente').length;
  const financeirosPendentes = financeiros.filter(f => f.status === 'Pendente' || f.status === 'Atrasado').length;

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu CRM</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.length}</div>
              <p className="text-xs text-muted-foreground">clientes cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mensalidades</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalMensalidades.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">{financeirosPendentes} pagamentos pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificados a Vencer</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{certificadosVencendo}</div>
              <p className="text-xs text-muted-foreground">próximos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sintegra Pendentes</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sintegrasPendentes}</div>
              <p className="text-xs text-muted-foreground">aguardando conclusão</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Certificados Vencendo</CardTitle>
              <CardDescription>Certificados que vencem nos próximos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certificados
                  .filter(cert => {
                    const dataVencimento = new Date(cert.dataVencimento);
                    const hoje = new Date();
                    const diff = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                    return diff <= 30 && diff >= 0;
                  })
                  .slice(0, 5)
                  .map(cert => (
                    <div key={cert.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cert.clienteNome}</p>
                        <p className="text-sm text-muted-foreground">
                          Vence em {new Date(cert.dataVencimento).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                        {cert.tipoCertificado}
                      </span>
                    </div>
                  ))}
                {certificadosVencendo === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum certificado vencendo</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sintegra Pendentes</CardTitle>
              <CardDescription>Obrigações fiscais aguardando conclusão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sintegras
                  .filter(s => s.status === 'Pendente')
                  .slice(0, 5)
                  .map(sintegra => (
                    <div key={sintegra.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{sintegra.clienteNome}</p>
                        <p className="text-sm text-muted-foreground">
                          Prazo: {new Date(sintegra.dataPrazo).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                {sintegrasPendentes === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum Sintegra pendente</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
