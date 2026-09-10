# Design: Case study de portfólio — Client Sync Forge

## Objetivo

Escrever um case study de portfólio para o projeto Client Sync Forge, provando em entrevista/proposta freelance que a autora entende o "porquê" de suas escolhas técnicas, não só o "como".

## Contexto do pedido original vs. este repositório

O pedido original menciona 2 projetos (CRM + app de clínica odontológica em React Native). Este repositório é apenas o **Client Sync Forge**: um CRM/ERP web (React + Firebase) para escritórios de contabilidade — não um app mobile. O case study do app da clínica fica para outra sessão/repo. As perguntas sobre "por que React Native e não nativo" foram substituídas por perguntas equivalentes reais deste stack (por que Firebase/Firestore, por que migrar de localStorage).

## Formato de entrega

Markdown em `docs/case-studies/client-sync-forge.md`, dentro deste repositório. Pode ser portado depois para uma página de portfólio própria.

## Estrutura do case study

1. **Contexto** — problema do cliente (escritório de contabilidade) antes do sistema: controle manual/planilhas de clientes, certificados digitais, vencimentos de Sintegra e financeiro, com risco de perder prazos.

2. **Decisões técnicas** — 3 decisões reais, ancoradas em evidência do histórico de commits:
   - Prototipagem com Lovable/localStorage → migração deliberada para Firebase/Firestore (commits `9a9520a`, `35a075c`) quando o projeto precisou de dado persistente real, autenticação e múltiplos usuários.
   - Exclusão lógica (soft delete) em cascata (`src/lib/firestore/deleteClienteWithRelations.ts`, commit `09ed998`): ao desativar um cliente, propaga `ativo:false` para financeiro, renovação, despesas, serviços, sintegra, usuários e tarefas vinculadas. Decisão de negócio (auditoria/histórico contábil) que virou arquitetura.
   - Sistema de notificações automáticas próprio (vencimento de certificado em 3/7 dias, pagamentos pendentes), construído com Context + hooks dedicados (`NotificationContext`, `useNotificacoesAutomaticas`, `useNotificationsAuto`), iterado em várias rodadas reais (bugs corrigidos e depois exportação PDF/Excel adicionada).

3. **Arquitetura** — descrição textual do diagrama para a autora desenhar no Excalidraw: React SPA → Contexts/hooks → camada `src/lib/firestore/*` (acesso a dados) → Firestore / Firebase Auth / Cloud Messaging → Firebase Hosting.

4. **Resultado** — em produção há ~2-3 meses, sem incidentes graves; eliminou controle manual de vencimentos de certificados/Sintegra e centralizou financeiro + clientes em um painel único.

5. **Roteiro de vídeo Loom (1-2 min)** — sequência sugerida de telas para gravar: login → dashboard de clientes → cadastro de cliente → certificados com alerta de vencimento → financeiro → notificação automática.

## Fora de escopo

- Case study do segundo projeto (app da clínica odontológica) — outro repositório, outra sessão.
- Gravação do vídeo em si e o diagrama no Excalidraw — ficam como tarefa manual da autora, o documento apenas fornece o roteiro/estrutura.
- Página de portfólio publicada — este documento é a matéria-prima em Markdown, não a página final.
