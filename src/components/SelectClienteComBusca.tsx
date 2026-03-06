import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
}

interface SelectClienteComBuscaProps {
  clientes: Cliente[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function SelectClienteComBusca({ clientes, value, onValueChange, placeholder }: SelectClienteComBuscaProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const clientesFiltrados = useMemo(() => {
    if (!search) return clientes;
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(search))
    );
  }, [clientes, search]);

  // Ao abrir o select, limpa a busca
  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) setSearch("");
  }

  return (
    <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={handleOpenChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || "Selecione um cliente"} />
      </SelectTrigger>
      <SelectContent>
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            // As três linhas abaixo resolvem o problema do foco:
            onKeyDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          />
        </div>
        {clientesFiltrados.length === 0 ? (
          <SelectItem value="_empty" disabled>Nenhum cliente encontrado</SelectItem>
        ) : (
          clientesFiltrados.map(cliente => (
            <SelectItem key={cliente.id} value={cliente.id}>
              {cliente.nome} {cliente.cnpj ? `- ${cliente.cnpj}` : ""}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}