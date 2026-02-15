import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProdutoComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export const ProdutoCombobox = ({ value, onChange }: ProdutoComboboxProps) => {
  const [open, setOpen] = useState(false);
  const produtos = useStore((state) => state.produtos);
  const isMobile = useIsMobile();

  const selectedProduto = produtos.find((p) => p.id === value);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="w-full justify-between flex items-center px-3 py-2 text-base md:text-sm border rounded-md bg-background text-foreground h-10"
          >
            <span className="truncate">
              {selectedProduto ? selectedProduto.nome_sabor : "Selecione o produto..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mt-4 border-t">
            <Command>
              <CommandInput placeholder="Buscar produto..." />
              <CommandList>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {produtos.filter((p) => p.ativo).map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.nome_sabor}
                      onSelect={() => {
                        onChange(p.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === p.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {p.nome_sabor}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between flex items-center px-3 py-2 text-sm border rounded-md bg-background text-foreground h-10"
        >
          <span className="truncate">
            {selectedProduto ? selectedProduto.nome_sabor : "Selecione..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" side="bottom" align="start">
        <Command>
          <CommandInput placeholder="Buscar produto..." />
          <CommandList>
            <CommandEmpty>Nenhum produto.</CommandEmpty>
            <CommandGroup>
              {produtos.filter((p) => p.ativo).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.nome_sabor}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {p.nome_sabor}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
