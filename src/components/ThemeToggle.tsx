import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size={undefined}
      onClick={handleToggle}
      title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
      className={`!text-base flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full ${
        collapsed ? "justify-center" : "justify-start"
      } h-auto font-normal [&_svg]:!size-5 [&_svg]:!h-5 [&_svg]:!w-5`}
      aria-label={
        isDark ? "Alternar para tema claro" : "Alternar para tema escuro"
      }
    >
      {mounted ? (
        isDark ? (
          <>
            <Sun className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Tema Claro</span>}
          </>
        ) : (
          <>
            <Moon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Tema Escuro</span>}
          </>
        )
      ) : (
        <>
          <Sun className="h-5 w-5 flex-shrink-0 opacity-0" />
          {!collapsed && <span>Tema Claro</span>}
        </>
      )}
    </Button>
  );
}
