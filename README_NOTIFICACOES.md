# 🔔 Sistema de Notificações Push - Guia Rápido

## ✅ O que foi implementado

### 1. Arquivos Criados

- **`public/firebase-messaging-sw.js`** - Service Worker para receber notificações em background
- **`src/hooks/usePushNotifications.ts`** - Hook React para gerenciar permissões e tokens
- **`src/components/PushNotificationPrompt.tsx`** - UI para solicitar permissão ao usuário
- **`src/utils/notificacoes.ts`** - Templates e utilitários para notificações
- **`INSTRUCOES_NOTIFICACOES_PUSH.md`** - Documentação completa

### 2. Arquivos Modificados

- **`src/lib/firebase.ts`** - Adicionado Firebase Messaging
- **`src/types/usuario.ts`** - Adicionado campo `pushToken`
- **`src/pages/Configuracoes.tsx`** - Integrado gerenciamento de notificações
- **`src/App.tsx`** - Adicionado prompt automático de notificações

## 🚀 Como Usar

### Para o Usuário Final

1. **Ativar Notificações:**
   - Aguarde 5 segundos após fazer login
   - Um card aparecerá no canto inferior direito
   - Clique em "Ativar" para conceder permissão

2. **Gerenciar Preferências:**
   - Vá em **Configurações** no menu lateral
   - Na seção "Preferências", você verá:
     - Status das notificações push
     - Token FCM (para desenvolvedores)
   - Ative/desative tipos específicos de notificação:
     - Renovações de certificados
     - Pagamentos e recebimentos
     - Novos clientes

3. **Receber Notificações:**
   - Com o navegador aberto: Notificações aparecem como toast
   - Com o navegador fechado/minimizado: Notificações do sistema
   - Clicar na notificação abre a página relevante

### Para Desenvolvedores

#### Configuração Inicial (OBRIGATÓRIO)

1. **Gerar Chave VAPID:**
   ```
   Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
   → Generate key pair
   ```

2. **Adicionar ao `.env`:**
   ```env
   VITE_FIREBASE_VAPID_KEY=sua_chave_vapid_aqui
   ```

3. **Atualizar Service Worker:**
   Edite `public/firebase-messaging-sw.js` com suas credenciais reais:
   ```javascript
   const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "SEU_PROJECT_ID.firebaseapp.com",
     // ... resto da config
   };
   ```

#### Enviar Notificações

**Método 1: Console do Firebase (Teste)**
```
Firebase Console → Cloud Messaging → Send test message
→ Cole o token do usuário (disponível em Configurações)
```

**Método 2: Backend com Firebase Admin (Produção)**
```javascript
const admin = require('firebase-admin');

async function enviarNotificacao(userToken) {
  const message = {
    token: userToken,
    notification: {
      title: 'Certificado Vencendo',
      body: 'O certificado do cliente X vence em 7 dias'
    },
    data: {
      url: '/certificados'
    }
  };

  await admin.messaging().send(message);
}
```

## 📋 Checklist de Implementação

- [x] Service Worker configurado
- [x] Hook `usePushNotifications` criado
- [x] UI para solicitar permissão
- [x] Integração com página de Configurações
- [x] Prompt automático após 5 segundos
- [x] Armazenamento de token no Firestore
- [x] Tratamento de notificações em foreground
- [x] Tratamento de notificações em background
- [x] Templates de notificações prontos
- [ ] **PENDENTE:** Configurar chave VAPID
- [ ] **PENDENTE:** Atualizar Service Worker com credenciais
- [ ] **PENDENTE:** Implementar Cloud Functions para envio automático

## 🎯 Próximos Passos Recomendados

### 1. Configurar Chave VAPID (Urgente)
Sem isso, as notificações não funcionarão!

### 2. Criar Cloud Functions para Automação

Exemplos sugeridos:

**a) Notificar certificados vencendo:**
```javascript
// functions/src/index.ts
exports.notificarCertificadosVencendo = functions.pubsub
  .schedule('0 9 * * *') // 9h todos os dias
  .onRun(async () => {
    // Buscar certificados vencendo em 7 dias
    // Enviar notificação para usuários com notificacoesRenovacoes ativadas
  });
```

**b) Notificar ao cadastrar cliente:**
```javascript
exports.notificarNovoCliente = functions.firestore
  .document('clientes/{id}')
  .onCreate(async (snap) => {
    const cliente = snap.data();
    // Enviar notificação para usuários com notificacoesClientes ativadas
  });
```

**c) Notificar pagamentos vencidos:**
```javascript
exports.notificarPagamentosVencidos = functions.pubsub
  .schedule('0 10 * * *') // 10h todos os dias
  .onRun(async () => {
    // Buscar pagamentos vencidos
    // Enviar notificação para responsáveis
  });
```

### 3. Adicionar Botões de Teste

Adicione botões no painel de administração para testar notificações:

```typescript
// src/pages/Configuracoes.tsx
<Button onClick={async () => {
  // Enviar notificação de teste via API
  await fetch('/api/test-notification', {
    method: 'POST',
    body: JSON.stringify({ 
      token: pushToken,
      type: 'test' 
    })
  });
}}>
  Testar Notificação
</Button>
```

## 🐛 Solução de Problemas Comuns

### ❌ "VAPID key not configured"
**Solução:** Configure `VITE_FIREBASE_VAPID_KEY` no `.env`

### ❌ Service Worker não registra
**Solução:** 
1. Limpe o cache do navegador
2. Verifique se o arquivo está em `public/`
3. Acesse `/firebase-messaging-sw.js` para testar

### ❌ Token não salva no Firestore
**Solução:** Verifique regras de segurança do Firestore:
```javascript
match /usuarios/{userId} {
  allow update: if request.auth.uid == userId;
}
```

### ❌ Notificações não aparecem
**Solução:**
1. Verifique permissões do navegador
2. Teste em aba anônima
3. Verifique console para erros

## 📚 Documentação Completa

Para informações detalhadas, consulte:
- **`INSTRUCOES_NOTIFICACOES_PUSH.md`** - Guia completo de configuração
- **`src/utils/notificacoes.ts`** - Templates e exemplos de código

## 🎉 Benefícios

- ✅ Usuários ficam informados em tempo real
- ✅ Maior engajamento com o sistema
- ✅ Reduz risco de perder prazos importantes
- ✅ Experiência similar a apps nativos
- ✅ Funciona mesmo com navegador fechado

---

**Desenvolvido com ❤️ usando Firebase Cloud Messaging**

