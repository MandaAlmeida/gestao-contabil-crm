import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirmationDialog } from "@/components/ConfirmationDialog";
import { NavLink } from "./NavLink";
import {
  Users,
  DollarSign,
  FileCheck,
  RefreshCw,
  Wallet,
  BarChart3,
  LayoutDashboard,
  TrendingUp,
  ChevronLeft,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  Wrench,
  FileText,
  StickyNote,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";


interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const { resolvedTheme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showConfirmation, ConfirmationDialogComponent } = useConfirmationDialog();


  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const isDark = resolvedTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleLogout = async () => {
    showConfirmation(
      "Sair do Sistema",
      "Tem certeza que deseja sair da sua conta?",
      async () => {
        try {
          await logout();
          toast({ title: "Logout realizado com sucesso!" });
          navigate("/login");
        } catch (error) {
          toast({
            title: "Erro ao fazer logout",
            variant: "destructive",
          });
        }
      },
      {
        confirmText: "Sair",
        cancelText: "Cancelar",
        variant: "warning"
      }
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } fixed left-0 top-0 h-screen border-r border-border bg-card transition-all duration-200 flex flex-col z-10`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border p-3">
            {!collapsed && (
              <img src="/logo.png" alt="Logo" className="flex-1 min-w-0" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((prev) => !prev)}
              className="h-8 w-8 flex-shrink-0"
            >
              <ChevronLeft
                className={`h-4 w-4 transition-transform ${
                  collapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            <NavLink
              to="/"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Dashboard Clientes</span>}
            </NavLink>
            <NavLink
              to="/dashboard-financeiro"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <TrendingUp className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Dashboard Financeiro</span>}
            </NavLink>
            <NavLink
              to="/clientes"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Clientes</span>}
            </NavLink>
            <NavLink
              to="/financeiro"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <DollarSign className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Financeiro</span>}
            </NavLink>
            <NavLink
              to="/servicos"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Wrench className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Serviços</span>}
            </NavLink>
            <NavLink
              to="/despesas"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Wallet className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Despesas</span>}
            </NavLink>
            <NavLink
              to="/certificados"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <FileCheck className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Certificados</span>}
            </NavLink>
            <NavLink
              to="/renovacao"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <RefreshCw className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Renovação</span>}
            </NavLink>
                  <NavLink
              to="/sintegra"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Sintegra</span>}
            </NavLink>
             <NavLink
               to="/anotacoes"
               className={collapsed ? "justify-center" : ""}
               activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
             >
               <StickyNote className="h-5 w-5 flex-shrink-0" />
               {!collapsed && <span>Anotações</span>}
             </NavLink>
            <NavLink
              to="/calendario"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Calendário</span>}
            </NavLink>
     
            <NavLink
              to="/configuracoes"
              className={collapsed ? "justify-center" : ""}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Configurações</span>}
            </NavLink>
          </nav>

          {/* Footer Navigation */}
          <div className="border-t border-border p-4 space-y-1">
            <ThemeToggle collapsed={collapsed} />
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive w-full ${
                collapsed ? "justify-center" : "justify-start"
              }`}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-200 ${
          collapsed ? "ml-16" : "ml-64"
        }`}
      >
        {children}
      </main>
      {ConfirmationDialogComponent}
    </div>
  );
}
