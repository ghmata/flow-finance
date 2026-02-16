import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { FORMAS_PAGAMENTO } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, parseCurrency } from '@/utils/masks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { cn } from '@/lib/utils';

interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  tipo: 'prevenda' | 'posvenda';
  referenciaId: string;
  itemId?: string; // New granular ID
  clienteNome: string;
  valor: number;
  onConfirm?: (forma: string, valorPago?: number) => void;
}

const PagamentoModal = ({
  open,
  onClose,
  tipo,
  referenciaId,
  itemId,
  clienteNome,
  valor,
  onConfirm,
}: PagamentoModalProps) => {
  const [forma, setForma] = useState('PIX');
  const [valorStr, setValorStr] = useState('');
  const { registrarPagamento, registrarPagamentoReserva } = useStore();
  const isMobile = useIsMobile();

  const contentRef = useRef<HTMLDivElement>(null);

  // Reset form when opening and blur on close
  useEffect(() => {
    if (open) {
        setForma('PIX');
        setValorStr(valor.toFixed(2).replace('.', ','));
    } else {
        // Blur active element when closing to prevent aria-hidden issues
        const timer = setTimeout(() => {
            const activeElement = document.activeElement as HTMLElement;
            if (contentRef.current?.contains(activeElement)) {
                activeElement.blur();
            }
        }, 50);
        return () => clearTimeout(timer);
    }
  }, [open, valor]);

  const handleConfirmar = () => {
    const valorFinal = parseCurrency(valorStr);
    
    if (onConfirm) {
        onConfirm(forma, valorFinal);
    } else if (tipo === 'prevenda' && itemId) {
        // Granular payment
        registrarPagamentoReserva(tipo, referenciaId, itemId, forma);
    } else {
       registrarPagamento(tipo, referenciaId, forma);
    }
    onClose();
  };

  const PagamentoForm = (
    <div className={cn("grid gap-4 py-4", isMobile ? "px-4" : "")}>
      <div className="bg-muted/50 rounded-xl p-4 text-center border-2 border-muted flex flex-col items-center mb-2">
        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">Valor a Pagar</p>
        <div className="relative w-full max-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">R$</span>
            <Input 
                className="text-center text-3xl font-bold h-16 rounded-xl border-2 border-primary/20 focus-visible:ring-primary pl-8"
                value={valorStr}
                onChange={(e) => setValorStr(formatCurrency(e.target.value))}
                inputMode="decimal"
                autoFocus={false} // Prevent auto-scroll/zoom on mobile
            />
        </div>
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

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent 
        ref={contentRef}
        className="w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] rounded-2xl p-0 sm:max-w-md sm:rounded-2xl sm:p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Receber Pagamento</DialogTitle>
          <DialogDescription>
            Confirme o pagamento de <strong>{clienteNome}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6"> 
            {PagamentoForm}
        </div>

        <div className="p-4 pt-0 flex gap-3 justify-end bg-background z-10">
          <Button variant="outline" onClick={onClose} className="h-12 flex-1 sm:flex-none sm:h-11 px-6 rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} className="h-12 flex-1 sm:flex-none sm:h-11 px-6 rounded-xl text-base font-semibold">
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoModal;
