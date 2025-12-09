/**
 * Utilitários para envio de notificações push
 * 
 * Este arquivo contém funções auxiliares para enviar notificações push
 * através do Firebase Cloud Messaging (FCM).
 * 
 * NOTA: As funções de envio devem ser executadas no backend/Cloud Functions
 * por questões de segurança. Este arquivo serve como referência.
 */

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
}

/**
 * Exemplo de como enviar notificação usando Firebase Admin SDK (Backend)
 * 
 * Este código deve rodar no backend (Node.js/Cloud Functions), não no frontend!
 * 
 * @example
 * ```typescript
 * // No backend (Cloud Functions ou Node.js)
 * import * as admin from 'firebase-admin';
 * 
 * admin.initializeApp();
 * 
 * async function enviarNotificacao(
 *   userToken: string,
 *   payload: NotificationPayload
 * ): Promise<string> {
 *   const message = {
 *     token: userToken,
 *     notification: {
 *       title: payload.title,
 *       body: payload.body,
 *     },
 *     data: {
 *       url: payload.url || '/',
 *       tag: payload.tag || 'default',
 *       ...payload.data,
 *     },
 *     webpush: {
 *       notification: {
 *         icon: payload.icon || '/logo.png',
 *         badge: payload.badge || '/favicon.ico',
 *       },
 *       fcmOptions: {
 *         link: payload.url || '/',
 *       },
 *     },
 *   };
 * 
 *   const response = await admin.messaging().send(message);
 *   return response;
 * }
 * ```
 */

/**
 * Templates de notificações para diferentes eventos do sistema
 */
export const NotificationTemplates = {
  /**
   * Notificação de certificado vencendo
   */
  certificadoVencendo: (clienteNome: string, diasRestantes: number): NotificationPayload => ({
    title: '⚠️ Certificado Vencendo',
    body: `O certificado de ${clienteNome} vence em ${diasRestantes} dias`,
    url: '/certificados',
    tag: 'certificado-vencendo',
  }),

  /**
   * Notificação de novo cliente cadastrado
   */
  novoCliente: (clienteNome: string): NotificationPayload => ({
    title: '🎉 Novo Cliente',
    body: `${clienteNome} foi cadastrado no sistema`,
    url: '/clientes',
    tag: 'novo-cliente',
  }),

  /**
   * Notificação de pagamento recebido
   */
  pagamentoRecebido: (clienteNome: string, valor: number): NotificationPayload => ({
    title: '💰 Pagamento Recebido',
    body: `Recebimento de R$ ${valor.toFixed(2)} de ${clienteNome}`,
    url: '/financeiro',
    tag: 'pagamento-recebido',
  }),

  /**
   * Notificação de pagamento vencido
   */
  pagamentoVencido: (clienteNome: string, valor: number): NotificationPayload => ({
    title: '🔴 Pagamento Vencido',
    body: `Pagamento de R$ ${valor.toFixed(2)} de ${clienteNome} está vencido`,
    url: '/financeiro',
    tag: 'pagamento-vencido',
  }),

  /**
   * Notificação de renovação pendente
   */
  renovacaoPendente: (clienteNome: string): NotificationPayload => ({
    title: '📋 Renovação Pendente',
    body: `Renovação de ${clienteNome} está pendente`,
    url: '/renovacao',
    tag: 'renovacao-pendente',
  }),

  /**
   * Notificação de sintegra pendente
   */
  sintegraPendente: (clienteNome: string): NotificationPayload => ({
    title: '📊 Sintegra Pendente',
    body: `Sintegra de ${clienteNome} está pendente`,
    url: '/sintegra',
    tag: 'sintegra-pendente',
  }),

  /**
   * Notificação de nova despesa
   */
  novaDespesa: (descricao: string, valor: number): NotificationPayload => ({
    title: '💸 Nova Despesa',
    body: `${descricao}: R$ ${valor.toFixed(2)}`,
    url: '/despesas',
    tag: 'nova-despesa',
  }),

  /**
   * Notificação personalizada
   */
  custom: (title: string, body: string, url?: string): NotificationPayload => ({
    title,
    body,
    url: url || '/',
    tag: 'custom',
  }),
};

/**
 * Função auxiliar para validar se o usuário tem notificações ativadas
 */
export function usuarioPodeReceberNotificacao(
  usuario: {
    notificacoesPush?: boolean;
    pushToken?: string;
  },
  tipoNotificacao?: 'renovacoes' | 'pagamentos' | 'clientes'
): boolean {
  // Verificar se tem notificações push ativadas e token válido
  if (!usuario.notificacoesPush || !usuario.pushToken) {
    return false;
  }

  // Verificar preferência específica se fornecida
  // (Aqui você pode adicionar lógica adicional baseada no tipo)

  return true;
}

/**
 * EXEMPLO DE CLOUD FUNCTION PARA ENVIAR NOTIFICAÇÕES
 * 
 * Crie este arquivo no seu backend (ex: functions/src/notifications.ts)
 * 
 * ```typescript
 * import * as functions from 'firebase-functions';
 * import * as admin from 'firebase-admin';
 * import { NotificationTemplates } from './notificacoes';
 * 
 * // Função para notificar certificados vencendo
 * export const notificarCertificadosVencendo = functions.pubsub
 *   .schedule('0 9 * * *') // Todos os dias às 9h
 *   .timeZone('America/Sao_Paulo')
 *   .onRun(async (context) => {
 *     const db = admin.firestore();
 *     const hoje = new Date();
 *     const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
 * 
 *     // Buscar certificados vencendo em 7 dias
 *     const certificados = await db
 *       .collection('certificados')
 *       .where('dataVencimento', '>=', hoje.toISOString().split('T')[0])
 *       .where('dataVencimento', '<=', em7Dias.toISOString().split('T')[0])
 *       .where('ativo', '==', true)
 *       .get();
 * 
 *     const envios: Promise<string>[] = [];
 * 
 *     for (const doc of certificados.docs) {
 *       const cert = doc.data();
 *       
 *       // Buscar usuário responsável
 *       const usuarios = await db
 *         .collection('usuarios')
 *         .where('ativo', '==', true)
 *         .where('notificacoesPush', '==', true)
 *         .where('notificacoesRenovacoes', '==', true)
 *         .get();
 * 
 *       for (const userDoc of usuarios.docs) {
 *         const usuario = userDoc.data();
 *         if (usuario.pushToken) {
 *           const diasRestantes = Math.ceil(
 *             (new Date(cert.dataVencimento).getTime() - hoje.getTime()) / 
 *             (1000 * 60 * 60 * 24)
 *           );
 * 
 *           const payload = NotificationTemplates.certificadoVencendo(
 *             cert.clienteNome,
 *             diasRestantes
 *           );
 * 
 *           const message = {
 *             token: usuario.pushToken,
 *             notification: {
 *               title: payload.title,
 *               body: payload.body,
 *             },
 *             data: {
 *               url: payload.url || '/',
 *               tag: payload.tag || 'default',
 *             },
 *             webpush: {
 *               fcmOptions: {
 *                 link: payload.url || '/',
 *               },
 *             },
 *           };
 * 
 *           envios.push(admin.messaging().send(message));
 *         }
 *       }
 *     }
 * 
 *     await Promise.all(envios);
 *     console.log(`Enviadas ${envios.length} notificações`);
 *   });
 * 
 * // Função acionada quando um novo cliente é criado
 * export const notificarNovoCliente = functions.firestore
 *   .document('clientes/{clienteId}')
 *   .onCreate(async (snap, context) => {
 *     const cliente = snap.data();
 *     const db = admin.firestore();
 * 
 *     // Buscar todos os usuários que querem ser notificados
 *     const usuarios = await db
 *       .collection('usuarios')
 *       .where('ativo', '==', true)
 *       .where('notificacoesPush', '==', true)
 *       .where('notificacoesClientes', '==', true)
 *       .get();
 * 
 *     const envios: Promise<string>[] = [];
 * 
 *     for (const doc of usuarios.docs) {
 *       const usuario = doc.data();
 *       if (usuario.pushToken) {
 *         const payload = NotificationTemplates.novoCliente(cliente.nome);
 * 
 *         const message = {
 *           token: usuario.pushToken,
 *           notification: {
 *             title: payload.title,
 *             body: payload.body,
 *           },
 *           data: {
 *             url: payload.url || '/',
 *             tag: payload.tag || 'default',
 *           },
 *           webpush: {
 *             fcmOptions: {
 *               link: payload.url || '/',
 *             },
 *           },
 *         };
 * 
 *         envios.push(admin.messaging().send(message));
 *       }
 *     }
 * 
 *     await Promise.all(envios);
 *   });
 * ```
 */

