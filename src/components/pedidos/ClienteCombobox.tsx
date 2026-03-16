import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface ClienteComboboxProps {
  value: string;
  onChange: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ClienteCombobox = ({ value, onChange, open: externalOpen, onOpenChange: externalOnOpenChange }: ClienteComboboxProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const clientes = useStore((state) => state.clientes);
  const addCliente = useStore((state) => state.addCliente);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const selectedCliente = clientes.find((c) => c.id === value);

  // Update input text when external value changes
  useEffect(() => {
    if (selectedCliente) {
      setInputValue(selectedCliente.nome);
    } else {
        if (!value) setInputValue("");
    }
  }, [value, selectedCliente]);

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (id: string, nome: string) => {
      onChange(id);
      setInputValue(nome);
      setOpen(false);
  };

  const handleCreateCliente = async () => {
    const nome = inputValue.trim();
    if (!nome || isCreating) return;

    setIsCreating(true);
    try {
      const success = await addCliente(nome);
      if (success) {
        // Buscar o cliente recém-criado no store atualizado
        const state = useStore.getState();
        const novoCliente = state.clientes.find(c => c.nome === nome);
        if (novoCliente) {
          onChange(novoCliente.id);
          setInputValue(novoCliente.nome);
        }
        setOpen(false);
        toast({
          title: "Cliente criado!",
          description: `"${nome}" adicionado com sucesso.`,
        });
      } else {
        toast({
          title: "Erro ao criar cliente",
          description: "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Verifica se o termo buscado já não é um cliente existente (para não exibir botão desnecessário)
  const showCreateButton = inputValue.trim().length > 0 && filteredClientes.length === 0;

  const CreateClienteButton = () => (
    <button
      type="button"
      onClick={handleCreateCliente}
      disabled={isCreating}
      className="flex items-center gap-2 w-full px-2 py-2.5 text-sm text-primary hover:bg-accent rounded-sm cursor-pointer transition-colors disabled:opacity-50"
    >
      <UserPlus className="h-4 w-4" />
      <span>{isCreating ? 'Criando...' : `Criar "${inputValue.trim()}"`}</span>
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <div className="relative">
             <div
                className="flex items-center w-full h-10 px-3 py-2 text-base border border-input rounded-md bg-background text-foreground"
                onClick={() => setOpen(true)}
             >
                {selectedCliente ? selectedCliente.nome : <span className="text-muted-foreground">Selecione o cliente...</span>}
             </div>
             <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
          </div>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mt-4 border-t">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Buscar cliente..." 
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {filteredClientes.length === 0 && !showCreateButton && (
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                )}
                <CommandGroup>
                  {filteredClientes.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.nome}
                      onSelect={() => handleSelect(c.id, c.nome)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.nome}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              {showCreateButton && (
                <div className="border-t p-1">
                  <CreateClienteButton />
                </div>
              )}
            </Command>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
             <input
                ref={inputRef}
                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Selecione ou digite o cliente..."
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!open) setOpen(true);
                    if (e.target.value === '') {
                        onChange('');
                    }
                }}
                onClick={() => setOpen(true)}
             />
             <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
        </div>
      </PopoverAnchor>
      <PopoverContent 
        className="w-[--radix-popover-anchor-width] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()} 
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filteredClientes.length === 0 && !showCreateButton && (
              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredClientes.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.nome}
                  onSelect={() => handleSelect(c.id, c.nome)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {c.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {showCreateButton && (
            <div className="border-t p-1">
              <CreateClienteButton />
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
