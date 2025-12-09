import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DashboardClientes from "./pages/DashboardClientes";
import DashboardFinanceiro from "./pages/DashboardFinanceiro";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import Servicos from "./pages/Servicos";
import Despesas from "./pages/Despesas";
import Certificados from "./pages/Certificados";
import Renovacao from "./pages/Renovacao";
import Sintegra from "./pages/Sintegra";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
// import Registro from "./pages/Registro";
import EsqueciSenha from "./pages/EsqueciSenha";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import { NotificationSystem } from "@/components/NotificationSystem";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { useNotificacoesAutomaticas } from "@/hooks/useNotificacoesAutomaticas";

const queryClient = new QueryClient();

// Componente wrapper para usar hooks
function AppContent() {
  // Hook que verifica e envia notificações automaticamente
  useNotificacoesAutomaticas();

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        {/* Rota de registro comentada */}
        {/* <Route
          path="/registro"
          element={
            <PublicRoute>
              <Registro />
            </PublicRoute>
          }
        /> */}
        <Route
          path="/esqueci-senha"
          element={
            <PublicRoute>
              <EsqueciSenha />
            </PublicRoute>
          }
        />

        {/* Rotas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardClientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-financeiro"
          element={
            <ProtectedRoute>
              <DashboardFinanceiro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute>
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute>
              <Financeiro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/servicos"
          element={
            <ProtectedRoute>
              <Servicos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/despesas"
          element={
            <ProtectedRoute>
              <Despesas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificados"
          element={
            <ProtectedRoute>
              <Certificados />
            </ProtectedRoute>
          }
        />
        <Route
          path="/renovacao"
          element={
            <ProtectedRoute>
              <Renovacao />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sintegra"
          element={
            <ProtectedRoute>
              <Sintegra />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute>
              <Configuracoes />
            </ProtectedRoute>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <NotificationSystem />
          <PushNotificationPrompt
            autoShowDelay={5000}
            onTokenReceived={(token) => {
              console.log("[App] Token FCM recebido:", token);
            }}
          />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
