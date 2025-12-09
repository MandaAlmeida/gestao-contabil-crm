### 4. Adicionar Campo `pushToken` ao Firestore

Atualize o tipo de usuário no Firestore para incluir o campo `pushToken`:

```typescript
// src/types/usuario.ts
export interface Usuario {
  // ... outros campos
  pushToken?: string; // Token FCM para notificações push
  notificacoesPush?: boolean;
}
```

### 5. Testar Notificações Localmente

1. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

2. Acesse a aplicação no navegador
3. Aguarde 5 segundos - um prompt de notificação aparecerá
4. Clique em "Ativar" para conceder permissão
5. O token FCM será gerado e salvo automaticamente

### 6. Verificar se Funciona

**Teste em Foreground (app aberto):**

1. Mantenha o navegador aberto com a aplicação
2. Envie uma notificação de teste (veja seção "Enviar Notificações")
3. Uma notificação deve aparecer no navegador

**Teste em Background (app minimizado/fechado):**

1. Minimize ou feche a aba do navegador
2. Envie uma notificação de teste
3. Uma notificação do sistema deve aparecer

## 📤 Como Enviar Notificações

### Método 1: Console do Firebase (Teste Rápido)

1. Vá para **Firebase Console** → **Cloud Messaging**
2. Clique em **Send your first message**
3. Configure:
   - **Notification title**: Título da notificação
   - **Notification text**: Corpo da notificação
   - **Target**: Selecione seu app web
4. Clique em **Send test message**
5. Cole o token FCM do usuário (disponível nas configurações do app)
6. Clique em **Test**

### Método 2: API Backend (Produção)

#### Usando Node.js com firebase-admin:

```javascript
const admin = require("firebase-admin");

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Enviar notificação
async function enviarNotificacao(userToken, titulo, corpo, url) {
  const message = {
    token: userToken,
    notification: {
      title: titulo,
      body: corpo,
    },
    data: {
      url: url || "/",
      tag: "default",
    },
    webpush: {
      fcmOptions: {
        link: url || "/",
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notificação enviada:", response);
    return response;
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    throw error;
  }
}

// Exemplo de uso
enviarNotificacao(
  "token_fcm_do_usuario",
  "Novo Cliente Cadastrado",
  "Um novo cliente foi adicionado ao sistema",
  "/clientes"
);
```

#### Usando REST API diretamente:

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/SEU_PROJECT_ID/messages:send \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "TOKEN_FCM_DO_USUARIO",
      "notification": {
        "title": "Título",
        "body": "Corpo da mensagem"
      },
      "webpush": {
        "fcmOptions": {
          "link": "https://seu-dominio.com/pagina"
        }
      }
    }
  }'
```

## 🎯 Casos de Uso Sugeridos

### 1. Notificar Vencimentos Próximos

```javascript
// Backend - verificar certificados vencendo em 7 dias
async function notificarVencimentos() {
  const certificadosVencendo = await buscarCertificadosVencendoEm7Dias();

  for (const cert of certificadosVencendo) {
    const usuario = await buscarUsuarioPorResponsavel(cert.responsavel);
    if (usuario.pushToken && usuario.notificacoesPush) {
      await enviarNotificacao(
        usuario.pushToken,
        "Certificado Vencendo",
        `O certificado de ${cert.clienteNome} vence em 7 dias`,
        `/certificados`
      );
    }
  }
}

// Agendar para rodar diariamente
// Ex: usando node-cron
cron.schedule("0 9 * * *", notificarVencimentos); // 9h todos os dias
```

### 2. Notificar Novos Clientes

```javascript
// Quando um novo cliente é cadastrado
async function aoAdicionarCliente(cliente) {
  const usuarios = await buscarUsuariosComNotificacoes();

  for (const usuario of usuarios) {
    if (usuario.notificacoesClientes && usuario.pushToken) {
      await enviarNotificacao(
        usuario.pushToken,
        "Novo Cliente Cadastrado",
        `${cliente.nome} foi adicionado ao sistema`,
        `/clientes`
      );
    }
  }
}
```

### 3. Notificar Pagamentos Recebidos

```javascript
// Quando um pagamento é confirmado
async function aoReceberPagamento(financeiro) {
  const usuario = await buscarUsuarioPorResponsavel(financeiro.responsavel);

  if (usuario.notificacoesPagamentos && usuario.pushToken) {
    await enviarNotificacao(
      usuario.pushToken,
      "Pagamento Recebido",
      `Recebimento de R$ ${financeiro.valorMensalidade} de ${financeiro.clienteNome}`,
      `/financeiro`
    );
  }
}
```

## 🔧 Solução de Problemas

### Notificações não aparecem

1. **Verifique permissões do navegador:**

   - Chrome: Configurações → Privacidade e segurança → Configurações do site → Notificações
   - Certifique-se de que o site está permitido

2. **Verifique o console do navegador:**

   - Procure por erros relacionados a Service Worker ou Firebase Messaging

3. **Verifique o token FCM:**

   - Vá em Configurações no app
   - Verifique se o token está sendo gerado e salvo

4. **Verifique a chave VAPID:**
   - Certifique-se de que a chave no `.env` está correta
   - Regenere a chave se necessário

### Service Worker não registra

1. **Limpe o cache:**

   - Chrome: DevTools → Application → Clear storage
   - Recarregue a página

2. **Verifique o arquivo:**

   - Certifique-se de que `public/firebase-messaging-sw.js` existe
   - Acesse diretamente: `http://localhost:5173/firebase-messaging-sw.js`

3. **Verifique credenciais:**
   - As credenciais no Service Worker devem ser as mesmas do `.env`

### Token não é salvo no Firestore

1. **Verifique regras do Firestore:**

   ```javascript
   // firestore.rules
   match /usuarios/{userId} {
     allow update: if request.auth != null && request.auth.uid == userId;
   }
   ```

2. **Verifique logs:**
   - Abra o console do navegador
   - Procure por erros ao salvar o token

## 📱 Suporte de Navegadores

| Navegador | Versão Mínima | Suporte     |
| --------- | ------------- | ----------- |
| Chrome    | 42+           | ✅ Completo |
| Firefox   | 44+           | ✅ Completo |
| Edge      | 17+           | ✅ Completo |
| Safari    | 16+           | ⚠️ Limitado |
| Opera     | 37+           | ✅ Completo |

**NOTA**: Safari no macOS 13+ e iOS 16.4+ tem suporte limitado a Web Push.

## 🔒 Segurança

1. **NUNCA** exponha suas credenciais do Firebase em repositórios públicos
2. Configure regras de segurança adequadas no Firestore
3. Use HTTPS em produção (obrigatório para Service Workers)
4. Rotacione as chaves VAPID periodicamente
5. Valide tokens no backend antes de enviar notificações

## 📚 Recursos Adicionais

- [Documentação Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## 💡 Dicas

1. **Solicite permissão no momento certo**: Não peça permissão logo ao abrir o app
2. **Seja específico**: Explique ao usuário por que as notificações são úteis
3. **Permita desativar**: Sempre dê a opção de desativar notificações
4. **Teste em diferentes dispositivos**: Comportamento pode variar entre navegadores
5. **Use títulos descritivos**: Ajuda o usuário a entender a notificação rapidamente

---

**Última atualização**: Dezembro 2024
**Versão do Firebase**: 11.10.0
