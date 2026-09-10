# Case Study: Client Sync Forge

**CRM/ERP interno para gestão contábil e financeira — clientes, financeiro, certificados digitais e Sintegra em um único painel.**

Stack: React 18 + TypeScript + Vite · Firebase (Firestore, Authentication, Cloud Messaging, Hosting) · TanStack Query · shadcn/ui + Tailwind · Recharts · jsPDF/XLSX

---

## 1. Contexto

O cliente contratante é uma empresa que vende sistemas de gerenciamento de produtos para outras empresas — esse é o negócio principal dela. O Client Sync Forge é o sistema interno que essa empresa usa para resolver a própria gestão contábil e financeira, incluindo cadastro dos seus clientes, contas a pagar/receber, validade de certificados digitais, taxas de Sintegra e renovações de contrato.

Antes do sistema, esse controle era feito manualmente ou em planilhas soltas, gerando dois riscos recorrentes para a própria empresa:

- **Perder prazo** — certificado digital vencido ou taxa de Sintegra não paga a tempo gera multa e retrabalho.
- **Falta de visão consolidada** — sem dashboard, era preciso cruzar várias planilhas para responder "quanto temos a receber este mês" ou "quais certificados vencem essa semana".

O pedido foi um sistema único e interno que centralizasse cadastro de clientes, financeiro, certificados, renovações, Sintegra e despesas, com alertas automáticos de vencimento.

## 2. Decisões técnicas

### De protótipo com localStorage para Firebase real

O projeto nasceu como protótipo (MVP), inicialmente cogitando Supabase como backend. Essa integração foi recusada no início, e a primeira versão funcional rodava inteiramente com Vercel — suficiente para validar telas e fluxos, mas incompatível com o requisito real do cliente: múltiplos usuários acessando os mesmos dados, com login e persistência de verdade.

A decisão foi migrar para Firebase: Firestore para dados, Firebase Authentication para login, rotas protegidas (`ProtectedRoute`/`PublicRoute`) e Cloud Messaging para push notifications. Firebase venceu frente a um backend próprio (Node/Postgres, por exemplo) pelo custo-benefício do prazo: banco em tempo real, autenticação pronta e hosting integrado, sem precisar manter servidor próprio — adequado ao porte do projeto (uso interno de uma empresa, não uma operação com escala que justificasse infraestrutura própria).

### Exclusão lógica em cascata, não exclusão física

Esse requisito veio depois de perceber que apagar um cliente cadastrado no CRM também apagava o rastro de tudo que já tinha sido faturado ou pago dele — inaceitável em um contexto contábil, onde histórico é auditável.

A solução trocou `deleteDoc` por um padrão de soft delete: cada coleção ganhou um campo `ativo`, e "excluir" um cliente passou a propagar `ativo: false` em cascata por todas as coleções relacionadas — financeiro, renovação, despesas, serviços, sintegra, usuários e tarefas — mantendo o nome do cliente até localizar e remover apenas as notificações associadas a ele. As telas de listagem simplesmente filtram por `ativo !== false`. O trade-off assumido: mais escrita no banco (várias queries e updates por uma "exclusão"), em troca de nunca perder histórico financeiro por engano.

### Notificações automáticas como sistema próprio, não só um alerta

Certificados vencendo e pagamentos pendentes precisavam avisar o usuário antes do prazo, não só listar dados. Em vez de checar vencimentos sob demanda em cada tela, o sistema centraliza a lógica em `NotificationContext` e hooks dedicados (`useNotificacoesAutomaticas`, `useNotificationsAuto`), que geram notificações de 3 e 7 dias antes do vencimento e alimentam um painel (`NotificationPanel`) e push notifications via Cloud Messaging.

## 3. Arquitetura

Fluxo de dados, ponta a ponta:

```
React SPA (Vite)
   │
   ├─ Contexts: AuthContext, NotificationContext
   ├─ Hooks: useNotificacoesAutomaticas, useNotificationsAuto, TanStack Query
   │
   ▼
src/lib/firestore/*  (camada de acesso a dados por domínio:
   clientes, financeiro, certificados, renovacao, sintegra, despesas, usuarios)
   │
   ▼
Firebase
   ├─ Firestore (dados, com soft delete via campo `ativo`)
   ├─ Authentication (login/rotas protegidas)
   └─ Cloud Messaging (push notifications)
   │
   ▼
Firebase Hosting (deploy)
```

Cada domínio (clientes, financeiro, certificados...) tem seu próprio módulo em `src/lib/firestore/`, isolando queries e regras de negócio (como o soft delete) da camada de UI — as páginas em `src/pages` não sabem como o dado é persistido, apenas chamam funções como `getClientes()` ou `deleteClienteWithRelations()`.

_(Diagrama visual a ser desenhado no Excalidraw a partir desse fluxo, para incluir na página do portfólio.)_

## 4. Resultado

Em uso ativo há aproximadamente 2-3 meses dentro da empresa contratante, sem incidentes graves. Substituiu o controle manual de vencimentos de certificados digitais e taxas de Sintegra por alertas automáticos, e centralizou cadastro de clientes, financeiro e serviços prestados em um painel único com dashboards de clientes e financeiro.

## 5. Roteiro do vídeo (Loom, 1-2 min)

Sequência sugerida para gravar navegando pelo sistema real:

1. Login (Firebase Authentication).
2. Dashboard de Clientes — visão geral e gráficos.
3. Cadastro de um cliente novo.
4. Tela de Certificados — mostrar um certificado próximo do vencimento e o alerta gerado.
5. Financeiro — contas a pagar/receber e exportação de relatório (PDF ou Excel).
6. Painel de notificações — notificação automática de vencimento aparecendo.

---

_Publicar como página própria no portfólio, com link direto para candidaturas._
