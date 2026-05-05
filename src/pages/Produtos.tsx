import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, parseCurrency } from '@/utils/masks';

import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Produtos = () => {
  const { produtos, addProduto, updateProduto, deleteProduto } = useStore();
  const { toast } = useToast();

  const [showProdForm, setShowProdForm] = useState(false);
  const [prodNome, setProdNome] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [busca, setBusca] = useState('');
  const [deleteState, setDeleteState] = useState<{ id: string; nome: string } | null>(null);
  const [editPId, setEditPId] = useState<string | null>(null);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products
  const filteredProdutos = produtos.filter((p) =>
    p.nome_sabor.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAddProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const preco = parseCurrency(prodPreco);
    if (!prodNome.trim() || isNaN(preco) || preco <= 0) return;
    
    setIsSubmitting(true);
    try {
      let success = false;
      if (editPId) {
          success = await updateProduto(editPId, { nome_sabor: prodNome.trim(), preco_unitario: preco });
      } else {
          success = await addProduto(prodNome.trim(), preco);
      }

      if (success) {
        toast({ title: editPId ? "Produto atualizado!" : "Produto cadastrado!", className: "bg-success text-white border-none" });
        setProdNome('');
        setProdPreco('');
        setShowProdForm(false);
        setEditPId(null);
      } else {
        toast({ title: "Erro ao salvar produto", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('[Produtos] Erro fatal:', error);
      toast({ title: "Erro inesperado", description: error?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduto = (p: any) => {
      setProdNome(p.nome_sabor);
      setProdPreco(p.preco_unitario.toFixed(2).replace('.', ','));
      setEditPId(p.id);
      setShowProdForm(true);
  };

  const handleCloseForm = () => {
      setShowProdForm(false);
      setProdNome('');
      setProdPreco('');
      setEditPId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteState) return;
    const success = await deleteProduto(deleteState.id);

    if (success) {
      toast({ title: "Produto excluído com sucesso!" });
    } else {
      toast({ title: "Erro ao excluir produto", variant: "destructive" });
    }
    setDeleteState(null);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">🍰 Produtos</h1>
        <button onClick={() => { handleCloseForm(); setShowProdForm(!showProdForm); }} className="btn-primary text-base py-3 px-5">
          <Plus className="mr-2 h-5 w-5" />
          Novo
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <Label htmlFor="buscar-produto" className="sr-only">Buscar produto</Label>
        <Input
          id="buscar-produto"
          className="input-lg"
          placeholder="🔍 Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {showProdForm && (
        <form onSubmit={handleAddProduto} className="card-elevated p-5 mb-4 animate-slide-up space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-prod" className="text-base font-semibold">Nome / Sabor <span className="text-destructive">*</span></Label>
            <Input 
              id="nome-prod" 
              className="input-lg" 
              placeholder="Ex: Brigadeiro Tradicional" 
              value={prodNome} 
              onChange={(e) => setProdNome(e.target.value)} 
              required 
              maxLength={100} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preco-prod" className="text-base font-semibold">Preço unitário (R$) <span className="text-destructive">*</span></Label>
            <Input 
              id="preco-prod" 
              className="input-lg" 
              placeholder="Ex: 5,50" 
              value={prodPreco} 
              onChange={(e) => setProdPreco(formatCurrency(e.target.value))} 
              required 
              inputMode="decimal" 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleCloseForm} className="btn-secondary flex-1" disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? <span className="animate-spin mr-2">⏳</span> : null}
              {isSubmitting ? 'Salvando...' : (editPId ? 'Salvar Alterações' : 'Salvar')}
            </button>
          </div>
        </form>
      )}

      {filteredProdutos.length === 0 ? (
        <EmptyState
          icon={Package}
          title={busca ? "Nenhum resultado encontrado" : "Nenhum produto cadastrado"}
          description={busca ? "Tente buscar por outro nome." : "Adicione seus produtos para facilitar as vendas."}
          actionLabel={!busca ? "Adicionar Produto" : undefined}
          onAction={!busca ? () => { handleCloseForm(); setShowProdForm(true); } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {[...filteredProdutos]
            .sort((a, b) => a.preco_unitario - b.preco_unitario)
            .map((p) => (
            <div key={p.id} className="card-elevated p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{p.nome_sabor}</p>
                <p className="text-success font-semibold">{fmt(p.preco_unitario)}</p>
              </div>
              <div className="flex items-center gap-1">
                 <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditProduto(p)}
                    className="text-primary hover:text-primary hover:bg-primary/10 h-11 w-11"
                    aria-label={`Editar produto ${p.nome_sabor}`}
                 >
                    <Pencil className="h-4 w-4" />
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setDeleteState({ id: p.id, nome: p.nome_sabor })} 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-11 w-11"
                    aria-label={`Excluir produto ${p.nome_sabor}`}
                 >
                    <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={!!deleteState} onOpenChange={() => setDeleteState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteState?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Produtos;
