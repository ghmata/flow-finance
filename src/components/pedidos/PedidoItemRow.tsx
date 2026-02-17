import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { ProdutoCombobox } from '@/components/pedidos/ProdutoCombobox';
import { PedidoItem } from '@/types';
import { useStore } from '@/store/useStore';

interface PedidoItemRowProps {
  item: PedidoItem;
  onUpdate: (item: PedidoItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const PedidoItemRow = ({ 
  item, 
  onUpdate, 
  onRemove, 
  canRemove 
}: PedidoItemRowProps) => {
  const produtos = useStore((s) => s.produtos);

  // Local state for quantity input to allow empty string during typing
  const [qtdInput, setQtdInput] = useState(item.quantidade.toString());

  // Sync local state when item.quantidade changes externally (e.g. initial load or verification)
  // But be careful not to override typing if this updates too often. 
  // Ideally, only update if item.quantidade is different from parsed stored value.
  if (parseInt(qtdInput) !== item.quantidade && qtdInput !== '') {
       // Loop break? No, if external update happens, we sync.
       // But typically item.quantidade comes from parent which we update via onUpdate.
       // So we don't strictly need useEffect sync unless parent changes it independently.
       // For now, let's just initialize.
  }

  const handleProdutoChange = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const novoItem: PedidoItem = {
      ...item,
      produto_id: produto.id,
      produto_nome: produto.nome_sabor,
      preco_unitario: produto.preco_unitario,
      subtotal: produto.preco_unitario * item.quantidade,
    };
    onUpdate(novoItem);
  };

  const handleBlur = () => {
      let val = parseInt(qtdInput);
      if (isNaN(val) || val < 1) val = 1;
      setQtdInput(val.toString());
      if (val !== item.quantidade) {
          onUpdate({
              ...item,
              quantidade: val,
              subtotal: item.preco_unitario * val
          });
      }
  };

  return (
    <div className="p-3 border rounded-xl bg-card shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Seletor de Produto (Combobox) */}
        <div className="flex-1 min-w-0">
          <Label htmlFor={`produto-${item.id}`} className="text-xs mb-1.5 block font-semibold text-muted-foreground">
            Produto
          </Label>
          <ProdutoCombobox
            value={item.produto_id}
            onChange={(val) => {
                const produto = produtos.find(p => p.id === val);
                if (produto) {
                    onUpdate({
                        ...item,
                        produto_id: produto.id,
                        produto_nome: produto.nome_sabor,
                        preco_unitario: produto.preco_unitario,
                        subtotal: produto.preco_unitario * item.quantidade,
                    });
                }
            }}
          />
        </div>

        {/* Quantidade */}
        <div className="w-full sm:w-24">
          <Label htmlFor={`qtd-${item.id}`} className="text-xs mb-1.5 block font-semibold text-muted-foreground">
            Qtd
          </Label>
          <div className="flex items-center">
            <Input
                id={`qtd-${item.id}`}
                type="number"
                min="1"
                value={qtdInput}
                onChange={(e) => {
                    setQtdInput(e.target.value);
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                        onUpdate({
                            ...item,
                            quantidade: val,
                            subtotal: item.preco_unitario * val
                        });
                    }
                }}
                onBlur={handleBlur}
                className="text-center h-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Footer: Subtotal & Remove Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Subtotal</span>
            <span className="text-lg font-bold text-primary">
                {/* Fallback calculation if subtotal is 0 but price/qty are set */}
                {(() => {
                    const val = item.subtotal || (item.preco_unitario * item.quantidade);
                    return `R$ ${val.toFixed(2).replace('.', ',')}`;
                })()}
            </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remover item"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-3"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          <span className="text-xs font-semibold">Remover</span>
        </Button>
      </div>
    </div>
  );
};
