import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { FORMAS_PAGAMENTO } from '@/types';

interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  tipo: 'prevenda' | 'posvenda';
  referenciaId: string;
  clienteNome: string;
  valor: number;
}

const PagamentoModal = ({ open, onClose, tipo, referenciaId, clienteNome, valor }: PagamentoModalProps) => {
  const [forma, setForma] = useState('PIX');
  const registrarPagamento = useStore((s) => s.registrarPagamento);

  if (!open) return null;

  const handleConfirmar = () => {
    registrarPagamento(tipo, referenciaId, forma);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-1">💵 Receber Pagamento</h2>
        <p className="text-muted-foreground mb-6">
          Cliente: <strong>{clienteNome}</strong>
        </p>

        <div className="bg-accent rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">Valor</p>
          <p className="text-3xl font-bold text-primary">
            R$ {valor.toFixed(2).replace('.', ',')}
          </p>
        </div>

        <label className="block text-sm font-semibold mb-2">Forma de pagamento</label>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {FORMAS_PAGAMENTO.map((f) => (
            <button
              key={f}
              onClick={() => setForma(f)}
              className={`py-3 px-4 rounded-xl text-base font-medium transition-all ${
                forma === f
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleConfirmar} className="btn-success flex-1">
            ✓ Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PagamentoModal;
