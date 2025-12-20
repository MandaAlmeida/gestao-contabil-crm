import { useEffect } from "react";
import { useCertificados } from "./useCertificados";
import { useFinanceiro } from "./useFinanceiro";
import { useRenovacao } from "./useRenovacao";
import { useSintegra } from "./useSintegra";
import { useServicos } from "./useServicos";
import { useAuth } from "@/contexts/AuthContext";
import { getUsuarioByEmail } from "@/lib/firestore/usuarios";

/**
 * Hook para verificar e enviar notificações automáticas de vencimentos
 * Verifica ao carregar a página e envia notificações do navegador
 *
 * FUNCIONAMENTO:
 * - Verifica itens vencendo nos próximos 30, 15, 7 e 3 dias
 * - Envia notificações do navegador (Browser Notifications)
 * - Usa localStorage para evitar spam (1 notificação por item por dia)
 * - 100% gratuito - roda no navegador do usuário
 */
export function useNotificacoesAutomaticas() {
  const { user } = useAuth();
  const { certificados } = useCertificados();
  const { financeiros } = useFinanceiro();
  const { renovacoes } = useRenovacao();
  const { sintegras } = useSintegra();
  const { servicos } = useServicos();

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const verificarNotificacoes = async () => {
      try {
        // Buscar preferências do usuário
        const usuario = await getUsuarioByEmail(user.email);
        if (!usuario) return;

        // Verificar se usuário quer receber notificações
        if (!usuario.notificacoesPush) return;

        // Verificar permissão do navegador
        if (Notification.permission !== "granted") return;

        // Data de hoje e prazos de notificação (horário brasileiro)
        const hoje = new Date();
        hoje.setHours(hoje.getHours() - 3); // Ajusta para horário brasileiro
        hoje.setHours(0, 0, 0, 0);
        const prazosNotificacao = [3, 7, 15, 30].map(dias => {
          const data = new Date(hoje);
          data.setDate(hoje.getDate() + dias);
          return data;
        });

        const hojeStr = hoje.toISOString().split("T")[0];

        // Função helper para verificar se data está nos prazos
        const deveNotificar = (dataItem: Date) => {
          dataItem.setHours(0, 0, 0, 0);
          return prazosNotificacao.some(prazo => dataItem.getTime() === prazo.getTime());
        };

        // Função helper para calcular dias restantes
        const calcularDiasRestantes = (dataItem: Date) => {
          dataItem.setHours(0, 0, 0, 0);
          return Math.ceil((dataItem.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        };

        // Verificar se já enviou notificações hoje
        const ultimoEnvio = localStorage.getItem("ultimoEnvioNotificacoes");
        if (ultimoEnvio === hojeStr) {
          console.log("[Notificações] Já enviadas hoje");
          return;
        }

        const notificacoesEnviadas: string[] = [];

        // 1. CERTIFICADOS VENCENDO
        if (usuario.notificacoesRenovacoes && certificados.length > 0) {
          certificados.forEach((cert) => {
            if (!cert.ativo) return;

            const dataVenc = new Date(cert.dataVencimento);
            if (deveNotificar(dataVenc)) {
              const diasRestantes = calcularDiasRestantes(dataVenc);

              const key = `cert-${cert.id}-${hojeStr}`;
              if (!notificacoesEnviadas.includes(key)) {
                let mensagem = "";
                if (diasRestantes === 0) {
                  mensagem = `O certificado de ${cert.clienteNome} vence hoje!`;
                } else if (diasRestantes === 1) {
                  mensagem = `O certificado de ${cert.clienteNome} vence amanhã!`;
                } else {
                  mensagem = `O certificado de ${cert.clienteNome} vence em ${diasRestantes} dias`;
                }

                new Notification("⚠️ Certificado Vencendo", {
                  body: mensagem,
                  icon: "/logo.png",
                  badge: "/favicon.ico",
                  tag: `cert-${cert.id}`,
                });

                notificacoesEnviadas.push(key);
              }
            }
          });
        }

        // 2. PAGAMENTOS VENCENDO/VENCIDOS
        if (usuario.notificacoesPagamentos && financeiros.length > 0) {
          financeiros.forEach((pag) => {
            if (!pag.ativo || pag.status === "Recebido") return;

            const dataVenc = new Date(pag.dataVencimento);
            dataVenc.setHours(0, 0, 0, 0);

            const diasDiferenca = Math.ceil(
              (dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Mostrar se já venceu ou vence nos prazos de notificação (3, 7, 15, 30 dias)
            if (diasDiferenca === 3 || diasDiferenca === 7 || diasDiferenca === 15 || diasDiferenca === 30) {
              const key = `fin-${pag.id}-${hojeStr}`;
              if (!notificacoesEnviadas.includes(key)) {
                let titulo = "";
                let mensagem = "";

                if (diasDiferenca < 0) {
                  const diasVencidos = Math.abs(diasDiferenca);
                  titulo = "🔴 Pagamento Vencido";
                  mensagem = `${
                    pag.clienteNome
                  }: R$ ${pag.valorMensalidade.toFixed(
                    2
                  )} - Vencido há ${diasVencidos} dia${
                    diasVencidos > 1 ? "s" : ""
                  }`;
                } else if (diasDiferenca === 3) {
                  titulo = "⚠️ Pagamento Vence Hoje";
                  mensagem = `${
                    pag.clienteNome
                  }: R$ ${pag.valorMensalidade.toFixed(2)}`;
                } else if (diasDiferenca === 7) {
                  titulo = "⚠️ Pagamento Vence Amanhã";
                  mensagem = `${
                    pag.clienteNome
                  }: R$ ${pag.valorMensalidade.toFixed(2)}`;
                } else {
                  titulo = "💰 Pagamento a Vencer";
                  mensagem = `${
                    pag.clienteNome
                  }: R$ ${pag.valorMensalidade.toFixed(
                    2
                  )} - Vence em ${diasDiferenca} dias`;
                }

                new Notification(titulo, {
                  body: mensagem,
                  icon: "/logo.png",
                  badge: "/favicon.ico",
                  tag: `fin-${pag.id}`,
                });

                notificacoesEnviadas.push(key);
              }
            }
          });
        }

        // 3. SERVIÇOS VENCENDO/VENCIDOS
        if (usuario.notificacoesPagamentos && servicos.length > 0) {
          servicos.forEach((serv) => {
            if (!serv.ativo || serv.status === "Recebido") return;

            const dataVenc = new Date(serv.dataVencimento);
            dataVenc.setHours(0, 0, 0, 0);

            const diasDiferenca = Math.ceil(
              (dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (diasDiferenca <= 30) {
              const key = `serv-${serv.id}-${hojeStr}`;
              if (!notificacoesEnviadas.includes(key)) {
                let titulo = "";
                let mensagem = "";

                if (diasDiferenca < 0) {
                  titulo = "🔴 Serviço Vencido";
                  mensagem = `${
                    serv.clienteNome
                  }: R$ ${serv.valorMensalidade.toFixed(
                    2
                  )} - Vencido há ${Math.abs(diasDiferenca)} dias`;
                } else if (diasDiferenca === 0) {
                  titulo = "⚠️ Serviço Vence Hoje";
                  mensagem = `${
                    serv.clienteNome
                  }: R$ ${serv.valorMensalidade.toFixed(2)}`;
                } else if (diasDiferenca === 1) {
                  titulo = "⚠️ Serviço Vence Amanhã";
                  mensagem = `${
                    serv.clienteNome
                  }: R$ ${serv.valorMensalidade.toFixed(2)}`;
                } else {
                  titulo = "💼 Serviço a Vencer";
                  mensagem = `${
                    serv.clienteNome
                  }: R$ ${serv.valorMensalidade.toFixed(
                    2
                  )} - Vence em ${diasDiferenca} dias`;
                }

                new Notification(titulo, {
                  body: mensagem,
                  icon: "/logo.png",
                  badge: "/favicon.ico",
                  tag: `serv-${serv.id}`,
                });

                notificacoesEnviadas.push(key);
              }
            }
          });
        }

        // 4. RENOVAÇÕES PENDENTES
        if (usuario.notificacoesRenovacoes && renovacoes.length > 0) {
          renovacoes.forEach((ren) => {
            if (
              !ren.ativo ||
              !["Pendente", "Avisado", "Em Negociação"].includes(ren.status)
            )
              return;

            const dataRen = new Date(ren.dataRenovacao);
            if (deveNotificar(dataRen)) {
              const diasRestantes = calcularDiasRestantes(dataRen);

              const key = `ren-${ren.id}-${hojeStr}`;
              if (!notificacoesEnviadas.includes(key)) {
                let mensagem = "";
                if (diasRestantes === 0) {
                  mensagem = `Renovação de ${ren.clienteNome} é hoje! Status: ${ren.status}`;
                } else if (diasRestantes === 1) {
                  mensagem = `Renovação de ${ren.clienteNome} é amanhã! Status: ${ren.status}`;
                } else {
                  mensagem = `Renovação de ${ren.clienteNome} em ${diasRestantes} dias - Status: ${ren.status}`;
                }

                new Notification("📋 Renovação Pendente", {
                  body: mensagem,
                  icon: "/logo.png",
                  badge: "/favicon.ico",
                  tag: `ren-${ren.id}`,
                });

                notificacoesEnviadas.push(key);
              }
            }
          });
        }

        // 5. SINTEGRA PENDENTE
        if (usuario.notificacoesRenovacoes && sintegras.length > 0) {
          sintegras.forEach((sin) => {
            if (!sin.ativo || sin.status !== "Pendente") return;

            const dataPrazo = new Date(sin.dataPrazo);
            if (deveNotificar(dataPrazo)) {
              const diasRestantes = calcularDiasRestantes(dataPrazo);

              const key = `sin-${sin.id}-${hojeStr}`;
              if (!notificacoesEnviadas.includes(key)) {
                let mensagem = "";
                if (diasRestantes === 0) {
                  mensagem = `Sintegra de ${sin.clienteNome} vence hoje!`;
                } else if (diasRestantes === 1) {
                  mensagem = `Sintegra de ${sin.clienteNome} vence amanhã!`;
                } else {
                  mensagem = `Sintegra de ${sin.clienteNome} vence em ${diasRestantes} dias`;
                }

                new Notification("📊 Sintegra Pendente", {
                  body: mensagem,
                  icon: "/logo.png",
                  badge: "/favicon.ico",
                  tag: `sin-${sin.id}`,
                });

                notificacoesEnviadas.push(key);
              }
            }
          });
        }

        // Marcar como enviado hoje
        if (notificacoesEnviadas.length > 0) {
          localStorage.setItem("ultimoEnvioNotificacoes", hojeStr);
          console.log(
            `[Notificações] ${notificacoesEnviadas.length} notificações enviadas`
          );
        }
      } catch (error) {
        console.error("[Notificações] Erro ao verificar:", error);
      }
    };

    // Verificar após 3 segundos (dar tempo para carregar dados)
    const timer = setTimeout(() => {
      if (mounted) {
        verificarNotificacoes();
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [user, certificados, financeiros, renovacoes, sintegras, servicos]);
}
