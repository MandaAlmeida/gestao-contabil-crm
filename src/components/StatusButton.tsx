import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

interface StatusButtonProps<T extends string> {
  status: T;
  statusMeta: Record<T, StatusMeta>;
  onClick: () => void;
  title?: string;
}

export function StatusButton<T extends string>({
  status,
  statusMeta,
  onClick,
  title
}: StatusButtonProps<T>) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        "border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        meta.className
      )}
    >
      <Icon className="h-4 w-4" />
      {meta.label}
    </button>
  );
}

