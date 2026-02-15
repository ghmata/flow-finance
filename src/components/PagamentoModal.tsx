import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { FORMAS_PAGAMENTO } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  tipo: 'prevenda' | 'posvenda';
  referenciaId: string;
  itemId?: string; // New granular ID
  clienteNome: string;
  valor: number;
}

const PagamentoModal = ({
  open,
  onClose,
  tipo,
  referenciaId,
  itemId,
  clienteNome,
  valor,
}: PagamentoModalProps) => {
  const [forma, setForma] = useState('PIX');
  const { registrarPagamento, registrarPagamentoReserva } = useStore();
  const isMobile = useIsMobile();

  // Reset form when opening
  useEffect(() => {
    if (open) setForma('PIX');
  }, [open]);

  const handleConfirmar = () => {
    if (tipo === 'prevenda' && itemId) {
        // Granular payment
        registrarPagamentoReserva(tipo, referenciaId, itemId, forma);
    } else {
        // Legacy/Full payment or PosVenda (which is usually single item but stored as order)
        // Check if PosVenda also needs granular? PosVenda usually has 1 item per record in `registrosPosVenda` array exposed by store?
        // Actually `registrosPosVenda` are individual records?
        // Let's check store... `addPosVenda` creates a record. `registrosPosVenda` is an array of these.
        // So for posvenda, referenciaId is the ID of the record itself.
        // So `registrarPagamento` works if it takes ID.
        // Note: registrarPagamento(tipo, id, ...)
        
        // Wait, `registrarPagamento` in store:
        // if (tipo === 'prevenda') ...
        // if (tipo === 'posvenda') ... uses find(r => r.id === id)
        
        // So for PosVenda, referencing the ID is enough.
        // For PreVenda, we now prefer `registrarPagamentoReserva` if itemId is present.
        // If itemId is NOT present (legacy call), we use `registrarPagamento` which now does batch all.
       
       registrarPagamento(tipo, referenciaId, forma);
    }
    onClose();
  };

  const PagamentoForm = (
    <div className={cn("grid gap-4 py-4", isMobile ? "px-4" : "")}>
      <div className="bg-muted/50 rounded-xl p-4 text-center border-2 border-muted">
        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Valor Total</p>
        <p className="text-3xl font-bold text-primary mt-1">
          R$ {valor.toFixed(2).replace('.', ',')}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Forma de Pagamento
        </label>
        <div className="grid grid-cols-2 gap-3">
          {FORMAS_PAGAMENTO.map((f) => (
            <button
              key={f}
              onClick={() => setForma(f)}
              className={cn(
                "py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border-2",
                forma === f
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(val) => !val && onClose()}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Receber Pagamento</DrawerTitle>
            <DrawerDescription>
              Confirme o pagamento de <strong>{clienteNome}</strong>.
            </DrawerDescription>
          </DrawerHeader>
          {PagamentoForm}
          <DrawerFooter className="pt-2">
            <Button onClick={handleConfirmar} className="w-full text-lg h-12 rounded-xl" size="lg">
              Confirmar Recebimento
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-12 rounded-xl text-base">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receber Pagamento</DialogTitle>
          <DialogDescription>
            Confirme o pagamento de <strong>{clienteNome}</strong>.
          </DialogDescription>
        </DialogHeader>
        {PagamentoForm}
        <div className="flex gap-3 justify-end mt-2">
          <Button variant="outline" onClick={onClose} className="h-11 px-6 rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} className="h-11 px-6 rounded-xl">
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoModal;
