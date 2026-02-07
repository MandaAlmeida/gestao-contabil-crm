import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FiltersOption = {
  value: string;
  label: string;
};

interface FiltersBarProps {
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;

  responsavelOptions?: string[];
  responsavelValue?: string;
  onResponsavelChange?: (value: string) => void;
  responsavelLabel?: string;
  responsavelPlaceholder?: string;
  showResponsavel?: boolean;

  dateStartLabel?: string;
  dateEndLabel?: string;
  dateStartValue?: string;
  dateEndValue?: string;
  onDateStartChange?: (value: string) => void;
  onDateEndChange?: (value: string) => void;
  showDateRange?: boolean;

  statusLabel?: string;
  statusValue?: string;
  statusOptions?: FiltersOption[];
  onStatusChange?: (value: string) => void;
  showStatus?: boolean;

  orderLabel?: string;
  orderValue?: string;
  orderOptions?: FiltersOption[];
  onOrderChange?: (value: string) => void;
  showOrder?: boolean;

  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (value: number) => void;
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];

  showClear?: boolean;
  onClear?: () => void;
  clearLabel?: string;
}

export function FiltersBar({
  searchTerm = "",
  onSearchTermChange,
  searchPlaceholder = "Buscar por cliente...",
  showSearch = true,

  responsavelOptions = [],
  responsavelValue = "todos",
  onResponsavelChange,
  responsavelLabel = "Responsável",
  responsavelPlaceholder = "Selecione o responsável",
  showResponsavel = true,

  dateStartLabel = "Data Início",
  dateEndLabel = "Data Fim",
  dateStartValue = "",
  dateEndValue = "",
  onDateStartChange,
  onDateEndChange,
  showDateRange = true,

  statusLabel = "Status",
  statusValue = "todos",
  statusOptions = [],
  onStatusChange,
  showStatus = false,

  orderLabel = "Ordenar por",
  orderValue = "",
  orderOptions = [],
  onOrderChange,
  showOrder = true,

  totalItems = 0,
  itemsPerPage = 10,
  onItemsPerPageChange,
  showItemsPerPage = true,
  itemsPerPageOptions = [5, 10, 20, 50, 100],

  showClear = false,
  onClear,
  clearLabel = "Limpar Filtros",
}: FiltersBarProps) {
  const shouldShowItemsPerPage = showItemsPerPage && totalItems > 11;

  return (
    <div className="mb-4 space-y-4">
      <div className="flex gap-4 items-end">
        {showSearch && (
          <div className="flex-1 space-y-1">
            <Label htmlFor="filtro-busca" className="text-xs text-muted-foreground">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filtro-busca"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchTermChange?.(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {showResponsavel && (
          <div className="w-64 space-y-1">
            <Label htmlFor="filtro-responsavel" className="text-xs text-muted-foreground">
              {responsavelLabel}
            </Label>
            <Select
              value={responsavelValue}
              onValueChange={(value) => onResponsavelChange?.(value)}
            >
              <SelectTrigger id="filtro-responsavel">
                <SelectValue placeholder={responsavelPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {responsavelOptions.map((responsavel, index) => (
                  <SelectItem
                    key={`responsavel-${index}-${responsavel}`}
                    value={responsavel}
                  >
                    {responsavel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {showDateRange && (
          <>
            <div className="space-y-1">
              <Label htmlFor="filtro-data-inicio" className="text-xs text-muted-foreground">
                {dateStartLabel}
              </Label>
              <Input
                id="filtro-data-inicio"
                type="date"
                value={dateStartValue}
                onChange={(e) => onDateStartChange?.(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filtro-data-fim" className="text-xs text-muted-foreground">
                {dateEndLabel}
              </Label>
              <Input
                id="filtro-data-fim"
                type="date"
                value={dateEndValue}
                onChange={(e) => onDateEndChange?.(e.target.value)}
                className="w-40"
              />
            </div>
          </>
        )}

        {showStatus && (
          <div className="space-y-1">
            <Label htmlFor="filtro-status" className="text-xs text-muted-foreground">
              {statusLabel}
            </Label>
            <Select
              value={statusValue}
              onValueChange={(value) => onStatusChange?.(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showOrder && (
          <div className="space-y-1">
            <Label htmlFor="ordenacao" className="text-xs text-muted-foreground">
              {orderLabel}
            </Label>
            <Select
              value={orderValue}
              onValueChange={(value) => onOrderChange?.(value)}
            >
              <SelectTrigger id="ordenacao" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {shouldShowItemsPerPage && (
          <div className="space-y-1">
            <Label htmlFor="items-per-page" className="text-xs text-muted-foreground">
              Itens por página
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange?.(Number(value))}
            >
              <SelectTrigger id="items-per-page" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showClear && (
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={onClear}>
              {clearLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
