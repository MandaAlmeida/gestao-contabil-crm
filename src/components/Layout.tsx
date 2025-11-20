import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "./NavLink";
import {
  Users,
  DollarSign,
  FileCheck,
  RefreshCw,
  FileText,
  Wallet,
  BarChart3,
  UserCog,
  ChevronLeft,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
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
  const [collapsed, setCollapsed] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
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
    }
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
              onClick={() => setCollapsed(!collapsed)}
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
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <UserCog className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Dashboard Clientes</span>}
            </NavLink>
            <NavLink
              to="/dashboard-financeiro"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Dashboard Financeiro</span>}
            </NavLink>
            <NavLink
              to="/clientes"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Clientes</span>}
            </NavLink>
            <NavLink
              to="/financeiro"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <DollarSign className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Financeiro</span>}
            </NavLink>
            <NavLink
              to="/despesas"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Wallet className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Despesas</span>}
            </NavLink>
            <NavLink
              to="/certificados"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <FileCheck className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Certificados</span>}
            </NavLink>
            <NavLink
              to="/renovacao"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <RefreshCw className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Renovação</span>}
            </NavLink>
            <NavLink
              to="/sintegra"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Sintegra</span>}
            </NavLink>
            <NavLink
              to="/configuracoes"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Configurações</span>}
            </NavLink>
          </nav>

          {/* Footer Navigation */}
          <div className="border-t border-border p-4 space-y-1">
            <ThemeToggle collapsed={collapsed} />
            {/* <Button
              variant="ghost"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full justify-start"
            >
              <HelpCircle className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Ajuda</span>}
            </Button> */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive w-full justify-start"
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
    </div>
  );
}
