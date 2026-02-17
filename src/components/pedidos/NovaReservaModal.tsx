import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Package, X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming utils exists
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'; // Shadcn Dialog
import { Button } from '@/components/ui/button';
import { ClienteCombobox } from '@/components/pedidos/ClienteCombobox';
import { PedidoItemRow } from '@/components/pedidos/PedidoItemRow';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PedidoItem } from '@/types';

interface NovaReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  initialData?: any; // You might want to type this better if possible or use PedidoPreVenda
  onSuccess: () => void;
}

export const NovaReservaModal = ({ 
  open, 
  onOpenChange, 
  editId, 
  initialData, 
  onSuccess 
}: NovaReservaModalProps) => {
  const { addPreVenda, updatePreVenda, getProdutoNome } = useStore();
  const { toast } = useToast();
  
  const [cliente, setCliente] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [itens, setItens] = useState<PedidoItem[]>([{ 
    id: `init-${Date.now()}`, 
    produto_id: '', 
    produto_nome: '', 
    quantidade: 1, 
    preco_unitario: 0, 
    subtotal: 0 
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when opening/editing
  useEffect(() => {
    if (open) {
      if (editId && initialData) {
        setCliente(initialData.cliente_id);
        
        // Handle date
        if (initialData.data_entrega) {
             // Parse logic if needed, assumes string YYYY-MM-DD or ISO
             // If stored as "DD/MM/YYYY", need parsing. 
             // Looking at Pedidos.tsx, it seems data_pedido is what is used often, but for reservation we need a scheduled date.
             // The prompt asks for "Reservar para a data".
             // Let's assume we store this in `data_entrega` or `data_pedido`?
             // `PedidoPreVenda` has `data_entrega`.
             // If initialData has it, set it.
             try {
                // Try parsing standard formats
                const d = new Date(initialData.data_entrega); // or parse from string format
                if (!isNaN(d.getTime())) setDate(d);
             } catch (e) { console.error("Invalid date", e); }
        } else {
            setDate(undefined);
        }

        // Handle Itens
        if (initialData.itens && initialData.itens.length > 0) {
           setItens(initialData.itens.map((i: any) => ({...i})));
        } else if (initialData.produto_id) {
           // Legacy support
           setItens([{
               id: `legacy-${Date.now()}`,
               produto_id: initialData.produto_id,
               produto_nome: getProdutoNome(initialData.produto_id),
               quantidade: initialData.quantidade || 1,
               preco_unitario: initialData.valor_unitario || 0,
               subtotal: initialData.valor_total || 0
           }]);
        }
      } else {
        // Reset for new
        setCliente('');
        setDate(undefined);
        setItens([{ 
          id: `init-${Date.now()}`, 
          produto_id: '', 
          produto_nome: '', 
          quantidade: 1, 
          preco_unitario: 0, 
          subtotal: 0 
        }]);
      }
    }
  }, [open, editId, initialData, getProdutoNome]);

  const handleAddItem = () => {
    setItens([...itens, { 
      id: `new-${Date.now()}`, 
      produto_id: '', 
      produto_nome: '', 
      quantidade: 1, 
      preco_unitario: 0, 
      subtotal: 0 
    }]);
  };

  const handleRemoveItem = (id: string) => {
    if (itens.length <= 1) return;
    setItens(itens.filter(i => i.id !== id));
  };

  const handleUpdateItem = (updatedItem: PedidoItem) => {
    setItens(itens.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const total = itens.reduce((acc, item) => acc + item.subtotal, 0);

  const handleSubmit = async () => {
    const validItens = itens.filter(i => i.produto_id && i.quantidade > 0);
    
    if (!cliente) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (!date) {
        toast({ title: "Selecione uma data para a reserva", variant: "destructive" });
        return;
    }
    if (validItens.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }

    // Defensive Recalculation: Ensure subtotals are correct before saving
    // This fixes the issue where subtotal might be zero if not updated correctly
    const { produtos } = useStore.getState();
    const finalItens = validItens.map(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
            return {
                ...item,
                preco_unitario: produto.preco_unitario,
                subtotal: produto.preco_unitario * item.quantidade
            };
        }
        return item; // Fallback
    });

    setIsSubmitting(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd'); // Store as ISO date for sorting/filtering? 
      // Or if the app uses DD/MM/YYYY, we should stick to that?
      // Looking at `Pedidos.tsx`, `data_pedido` seems to be DD/MM/YYYY maybe?
      // `useStore` likely handles the format.
      // But `PedidoPreVenda` has `data_entrega`.
      // Let's pass the date object or formatted string to `addPreVenda`.
      // The `useStore` signature for `addPreVenda` is `(cliente_id: string, itens: PedidoItem[])`.
      // It DOES NOT accept a date currently! 
      // I WILL NEED TO UPDATE `useStore` to accept `data_entrega`.
      // For now, I will assume I can pass it or I will update `useStore` in the next step.
      
      // Let's check `useStore` first? 
      // I'll proceed assuming I need to update `useStore` and I will do it.
      
      const payload = {
          cliente_id: cliente,
          itens: finalItens,
          data_entrega: formattedDate 
      };

      let success = false;
      if (editId) {
          success = await updatePreVenda(editId, payload);
      } else {
          // I will need to modify addPreVenda to accept options or date
          // For now let's pass it, and I will fix useStore.
          success = await addPreVenda(cliente, finalItens, formattedDate); 
      }

      if (success) {
        toast({ 
            title: editId ? "Reserva atualizada!" : "Reserva criada!", 
            className: "bg-green-600 text-white border-none" 
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: "Erro ao salvar reserva", variant: "destructive" });
      }
    } catch (error) {
       console.error(error);
       toast({ title: "Erro inesperado", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] p-0 gap-0 overflow-hidden bg-white rounded-[16px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Package className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-bold text-gray-900">Nova Reserva</h2>
                </div>
                <p className="text-sm text-gray-500">Preencha os dados abaixo para criar uma reserva.</p>
            </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 h-0">
            {/* Cliente */}
            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Cliente</label>
                <ClienteCombobox 
                    value={cliente} 
                    onChange={setCliente} 
                />
            </div>

            {/* Data */}
            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Reservar para a data</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal h-11 border-gray-200 hover:bg-gray-50",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
                            {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione a data...</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            locale={ptBR}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Itens */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Itens do Pedido</label>
                    <button 
                        onClick={handleAddItem}
                        className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                    >
                        <Plus className="h-3 w-3" /> Adicionar
                    </button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {itens.map((item) => (
                        <PedidoItemRow
                            key={item.id}
                            item={item}
                            onUpdate={handleUpdateItem}
                            onRemove={() => handleRemoveItem(item.id)}
                            canRemove={itens.length > 1}
                        />
                    ))}
                </div>
            </div>

        </div>

        {/* Total Fixed */}
        <div className="px-6 py-3 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="bg-purple-50/80 rounded-xl p-3 flex items-center justify-between border border-purple-100">
                <span className="text-sm font-medium text-gray-600">Total a Pagar</span>
                <span className="text-xl font-bold text-purple-600">
                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 pt-2 bg-gray-50 flex gap-3">
            <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 border-gray-200 hover:bg-white text-gray-700 font-semibold"
            >
                Cancelar
            </Button>
            <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !cliente || !date}
                className="flex-1 h-11 bg-[#6366F1] hover:bg-[#4338CA] text-white font-bold shadow-md shadow-indigo-200"
            >
                {isSubmitting ? 'Salvando...' : 'Confirmar'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
