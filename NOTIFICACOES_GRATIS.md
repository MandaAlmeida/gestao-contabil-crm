# 🆓 Sistema de Notificações Push - Versão Gratuita

## ✅ Como Funciona

Este sistema é **100% gratuito** e funciona direto no navegador do usuário, sem precisar de servidor!

### 🔔 Quando as Notificações São Enviadas

**Toda vez que o usuário abre o sistema**, ele verifica automaticamente:

1. **Certificados** vencendo nos próximos 7 dias
2. **Pagamentos** vencendo nos próximos 7 dias ou já vencidos
3. **Serviços** vencendo nos próximos 7 dias ou já vencidos
4. **Renovações** pendentes nos próximos 7 dias
5. **Sintegra** pendente nos próximos 7 dias

### 🎯 Exemplo de Uso

**Cenário**: Certificado vence em 5 dias

1. **Hoje** (1º dia): Usuário abre o sistema → 🔔 "Vence em 5 dias"
2. **Amanhã** (2º dia): Usuário abre o sistema → 🔔 "Vence em 4 dias"
3. **Depois de amanhã** (3º dia): Abre o sistema → 🔔 "Vence em 3 dias"
4. **4º dia**: Abre o sistema → 🔔 "Vence em 2 dias"
5. **5º dia**: Abre o sistema → 🔔 "Vence amanhã!"
6. **6º dia**: Abre o sistema → 🔔 "Vence hoje!"

## 💡 Inteligência Anti-Spam

- ✅ **Máximo de 1 notificação por item por dia**
- ✅ Usa localStorage para controlar
- ✅ Não envia a mesma notificação várias vezes
- ✅ Respeita as preferências do usuário

## ⚙️ Como Ativar

1. **Ir em Configurações**
2. **Ativar "Notificações Push"** (conceder permissão ao navegador)
3. **Escolher quais tipos de notificação quer receber:**
   - ✅ Renovações (certificados, renovações, sintegra)
   - ✅ Pagamentos (financeiro, serviços)

## 📱 Tipos de Notificações

### 1. Certificados Vencendo
- **Quando**: Vence nos próximos 7 dias
- **Mensagens**:
  - "Vence hoje!"
  - "Vence amanhã!"
  - "Vence em X dias"

### 2. Pagamentos
- **Quando**: Já vencido ou vence nos próximos 7 dias
- **Mensagens**:
  - 🔴 "Vencido há X dias"
  - ⚠️ "Vence hoje!"
  - ⚠️ "Vence amanhã"
  - 💰 "Vence em X dias"

### 3. Serviços
- Igual aos pagamentos
- Inclui responsável e valor

### 4. Renovações
- **Quando**: Pendente e nos próximos 7 dias
- **Status**: Pendente, Avisado, Em Negociação

### 5. Sintegra
- **Quando**: Pendente e nos próximos 7 dias

## 🚀 Vantagens desta Solução

| Característica | Gratuita (Frontend) | Cloud Functions (Pago) |
|----------------|---------------------|------------------------|
| **Custo** | R$ 0,00 | R$ 5-20/mês |
| **Configuração** | Já funciona | Precisa deploy |
| **Frequência** | Quando abre o app | Horários fixos |
| **Independente** | Sim | Sim |
| **Limite** | Ilimitado | Ilimitado |
| **Offline** | Precisa abrir app | Funciona fechado |

## 🎓 Como Usar no Dia a Dia

### Cenário 1: Primeira vez no dia
```
09:00 - Você abre o sistema
→ 🔔 3 notificações aparecem:
   - Certificado de Cliente A vence em 3 dias
   - Pagamento de Cliente B vence amanhã
   - Renovação de Cliente C é hoje
```

### Cenário 2: Segunda vez no dia
```
15:00 - Você abre o sistema novamente
→ ✅ Nenhuma notificação (já foram enviadas hoje)
```

### Cenário 3: Próximo dia
```
09:00 - Você abre o sistema
→ 🔔 Notificações atualizadas:
   - Certificado de Cliente A vence em 2 dias (atualizado!)
   - Pagamento de Cliente B vence hoje! (atualizado!)
   - Renovação de Cliente C venceu! (atualizado!)
```

## 🔧 Personalização

Para mudar a frequência, edite em `src/hooks/useNotificacoesAutomaticas.ts`:

```typescript
// Linha 192: Tempo de espera antes de verificar
const timer = setTimeout(() => {
  verificarNotificacoes();
}, 3000); // 3 segundos após abrir

// Para verificar a cada 5 minutos (opcional):
const interval = setInterval(() => {
  verificarNotificacoes();
}, 5 * 60 * 1000); // 5 minutos
```

## ⚠️ Limitações

1. **Precisa abrir o sistema**: Notificações só são enviadas quando o usuário abre o app
2. **Por usuário**: Cada usuário vê notificações apenas quando ele acessa
3. **Não funciona offline**: Precisa estar conectado à internet

## 💪 Solução para Receber Diariamente

**Dica**: Configure o sistema para abrir automaticamente ao ligar o PC:

### Windows:
1. Pressione `Win + R`
2. Digite: `shell:startup`
3. Crie um atalho para abrir o navegador com o sistema
4. Cole: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://seu-dominio.com`

### macOS:
1. System Preferences → Users & Groups
2. Login Items → Add
3. Adicione script para abrir o navegador

Assim, **toda manhã quando ligar o PC, o sistema abrirá e enviará as notificações! 🎉**

## 🎯 Resultado Final

- ✅ **100% gratuito**
- ✅ **Sem configuração de servidor**
- ✅ **Sem custos mensais**
- ✅ **Funciona em qualquer hospedagem**
- ✅ **Notificações durante 7 dias antes do vencimento**
- ✅ **Anti-spam integrado**
- ✅ **Respeita preferências do usuário**

## 🆚 Comparação

### Solução Gratuita (Atual)
- **Custo**: R$ 0,00
- **Como funciona**: Verifica ao abrir o app
- **Ideal para**: Uso pessoal, pequenos times que abrem o sistema diariamente

### Cloud Functions (Anterior - Removida)
- **Custo**: ~R$ 5-20/mês
- **Como funciona**: Roda automaticamente em horários fixos
- **Ideal para**: Empresas grandes, múltiplos usuários que podem não abrir o sistema

## 🎊 Está Pronto!

O sistema já está funcionando! Basta:

1. Fazer login
2. Conceder permissão para notificações (popup que aparece)
3. Ir em Configurações e ativar as preferências

**Pronto! Toda vez que abrir o sistema, receberá notificações sobre vencimentos! 🔔**

---

**Versão**: 2.0 - Gratuita  
**Última atualização**: Dezembro 2024

