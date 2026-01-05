# 🚀 Client Sync Forge

Sistema completo de gestão empresarial (CRM/ERP) para controle de clientes, serviços, financeiro, certificados digitais e muito mais.

## 📋 Sobre o Projeto

Client Sync Forge é uma aplicação web moderna desenvolvida para facilitar a gestão de empresas de contabilidade e prestação de serviços. O sistema oferece controle completo sobre:

- **Gestão de Clientes**: Cadastro e gerenciamento de clientes
- **Gestão Financeira**: Controle de contas a pagar e receber
- **Serviços**: Acompanhamento de serviços prestados
- **Certificados Digitais**: Controle de validade e renovação
- **Renovações**: Gerenciamento de renovações de contratos
- **Sintegra**: Controle de taxas e vencimentos
- **Despesas**: Registro e controle de despesas
- **Dashboards**: Visualização de métricas e indicadores
- **Notificações**: Sistema de notificações automáticas e push notifications
- **Relatórios**: Geração de PDFs e exportação para Excel

## ✨ Funcionalidades Principais

### 📊 Dashboards Interativos
- Dashboard de Clientes com métricas e gráficos
- Dashboard Financeiro com análise de receitas e despesas
- Visualização de dados em tempo real
- Gráficos interativos com Recharts

### 💰 Gestão Financeira Completa
- Controle de contas a pagar e receber
- Registro de despesas
- Filtros por status, categoria e período
- Exportação de relatórios em PDF e Excel
- Cálculo automático de totais e saldos

### 🔔 Sistema de Notificações
- Notificações automáticas de vencimentos
- Push notifications no navegador
- Notificações de certificados a vencer
- Notificações de pagamentos pendentes
- Notificações de serviços a vencer
- Sistema de visualização de notificações

### 📄 Certificados Digitais
- Controle de validade de certificados
- Alertas de vencimento
- Gestão de renovações
- Histórico completo

### 🎨 Interface Moderna
- Design responsivo e intuitivo
- Tema claro/escuro
- Componentes UI de alta qualidade (shadcn/ui)
- Experiência de usuário otimizada

### 🔐 Autenticação e Segurança
- Sistema de login seguro com Firebase Authentication
- Recuperação de senha
- Proteção de rotas
- Controle de acesso por usuário

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool e dev server de alta performance
- **React Router DOM** - Roteamento de páginas
- **TanStack Query** - Gerenciamento de estado assíncrono

### UI/UX
- **shadcn/ui** - Componentes UI acessíveis e customizáveis
- **Radix UI** - Primitivos de UI sem estilo
- **Tailwind CSS** - Framework CSS utilitário
- **Lucide React** - Biblioteca de ícones
- **Recharts** - Biblioteca de gráficos para React

### Backend/Database
- **Firebase** - Plataforma completa de backend
  - Firestore - Banco de dados NoSQL em tempo real
  - Authentication - Sistema de autenticação
  - Cloud Messaging - Push notifications
  - Hosting - Hospedagem de aplicações web

### Utilitários
- **date-fns** - Manipulação de datas
- **jsPDF** - Geração de documentos PDF
- **XLSX** - Exportação para Excel
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

## 🚀 Começando

### Pré-requisitos

- Node.js 18+ instalado - [instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- NPM ou Yarn
- Conta no Firebase

### Instalação

1. **Clone o repositório**
   ```sh
   git clone <YOUR_GIT_URL>
   cd client-sync-forge
   ```

2. **Instale as dependências**
   ```sh
   npm install
   ```

3. **Configure as variáveis de ambiente**
   
   Copie o arquivo de exemplo e preencha com suas credenciais do Firebase:
   ```sh
   cp env.example .env
   ```
   
   Edite o arquivo `.env` e adicione suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=sua_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
   VITE_FIREBASE_PROJECT_ID=seu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id
   ```

   > 💡 **Como obter as credenciais do Firebase:**
   > 1. Acesse [Firebase Console](https://console.firebase.google.com/)
   > 2. Crie um novo projeto ou selecione um existente
   > 3. Vá em **Configurações do Projeto** > **Seus apps**
   > 4. Selecione ou adicione um app Web
   > 5. Copie as credenciais para o arquivo `.env`

4. **Configure o Firebase**
   
   No Firebase Console, habilite os seguintes serviços:
   - **Authentication** > Sign-in method > Email/Password
   - **Firestore Database** > Criar banco de dados
   - **Cloud Messaging** (para notificações push)

5. **Inicie o servidor de desenvolvimento**
   ```sh
   npm run dev
   ```
   
   A aplicação estará disponível em `http://localhost:5173`

## 📦 Scripts Disponíveis

```sh
# Desenvolvimento
npm run dev          # Inicia o servidor de desenvolvimento

# Build
npm run build        # Build de produção
npm run build:dev    # Build de desenvolvimento

# Outros
npm run preview      # Preview do build de produção
npm run lint         # Executa o linter
```

## 🗂️ Estrutura do Projeto

```
client-sync-forge/
├── public/
│   ├── firebase-messaging-sw.js    # Service Worker para push notifications
│   └── robots.txt
├── src/
│   ├── components/                  # Componentes React
│   │   ├── ui/                     # Componentes shadcn/ui
│   │   ├── Layout.tsx              # Layout principal
│   │   ├── NotificationSystem.tsx  # Sistema de notificações
│   │   └── ...
│   ├── contexts/                    # Contextos React
│   │   └── AuthContext.tsx         # Contexto de autenticação
│   ├── hooks/                       # Custom hooks
│   │   ├── useClientes.ts
│   │   ├── useFinanceiro.ts
│   │   ├── useServicos.ts
│   │   ├── useNotificationsData.ts
│   │   └── ...
│   ├── lib/                         # Bibliotecas e utilitários
│   │   ├── firebase.ts             # Configuração do Firebase
│   │   ├── firestore/              # Operações do Firestore
│   │   └── utils.ts
│   ├── pages/                       # Páginas da aplicação
│   │   ├── DashboardClientes.tsx
│   │   ├── DashboardFinanceiro.tsx
│   │   ├── Clientes.tsx
│   │   ├── Financeiro.tsx
│   │   ├── Servicos.tsx
│   │   ├── Certificados.tsx
│   │   └── ...
│   ├── types/                       # Definições de tipos TypeScript
│   ├── utils/                       # Funções utilitárias
│   │   └── notificacoes.ts
│   ├── App.tsx                      # Componente principal
│   └── main.tsx                     # Ponto de entrada
├── .env.example                     # Exemplo de variáveis de ambiente
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## 🔔 Sistema de Notificações

A aplicação possui um sistema completo de notificações que inclui:

- **Notificações Automáticas**: Verificação diária de vencimentos
- **Push Notifications**: Notificações no navegador mesmo com app fechado
- **Categorias**:
  - Certificados a vencer
  - Pagamentos pendentes
  - Serviços a vencer
  - Renovações pendentes
  - Taxas Sintegra
  - Despesas a vencer

### Configurando Push Notifications

Consulte o arquivo `INSTRUCOES_NOTIFICACOES_PUSH.md` para instruções detalhadas sobre como configurar as notificações push.

## 📊 Collections do Firestore

O sistema utiliza as seguintes collections no Firestore:

- `users` - Usuários do sistema
- `clientes` - Cadastro de clientes
- `servicos` - Serviços prestados
- `financeiro` - Contas a pagar/receber
- `certificados` - Certificados digitais
- `renovacoes` - Renovações de contratos
- `sintegra` - Taxas Sintegra
- `despesas` - Despesas da empresa
- `contabilidades` - Dados de contabilidade
- `notifications` - Notificações do sistema
- `notificationViews` - Visualizações de notificações

## 🚀 Deploy

### Build de Produção

```sh
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

### Opções de Hospedagem

#### Firebase Hosting (Recomendado)

```sh
# Instale o Firebase CLI
npm install -g firebase-tools

# Faça login no Firebase
firebase login

# Inicialize o projeto
firebase init hosting

# Deploy
firebase deploy
```

#### Outras Opções

- **Vercel**: Deploy automático via Git
- **Netlify**: Deploy contínuo
- **GitHub Pages**: Hospedagem gratuita
- **Render**: Deploy de aplicações web

## 🔒 Segurança

- Autenticação via Firebase Authentication
- Regras de segurança do Firestore configuradas
- Validação de dados no frontend e backend
- Proteção de rotas com componente `ProtectedRoute`
- Soft delete de registros (manutenção de histórico)

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado e proprietário.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através do repositório do projeto.

---

Desenvolvido com ❤️ usando React + TypeScript + Firebase
