import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useLocation } from 'react-router-dom';
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
import { formatPhone } from '@/utils/masks';
import { Users, Plus } from 'lucide-react';

const Clientes = () => {
  const { clientes, addCliente, updateCliente, deleteCliente } = useStore();
  const { toast } = useToast();
  const location = useLocation();
  const [showForm, setShowForm] = useState(location.state?.showForm || false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [busca, setBusca] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = await addCliente(nome.trim(), telefone.trim() || undefined);
      if (success) {
        toast({ title: "Cliente adicionado com sucesso!", className: "bg-success text-white border-none" });
        setNome('');
        setTelefone('');
        setShowForm(false);
      } else {
        toast({ title: "Erro ao adicionar cliente", description: "Tente novamente.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('[Clientes] Erro fatal no submit:', error);
      toast({ title: "Erro inesperado", description: error?.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (c: { id: string; nome: string; telefone?: string }) => {
    setEditId(c.id);
    setEditNome(c.nome);
    setEditTelefone(c.telefone || '');
  };

  const saveEdit = () => {
    if (!editId || !editNome.trim()) return;
    updateCliente(editId, { nome: editNome.trim(), telefone: editTelefone.trim() || undefined });
    setEditId(null);
  };

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const [itemToDelete, setItemToDelete] = useState<{ id: string; nome: string } | null>(null);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const success = await deleteCliente(itemToDelete.id);
    if (success) {
      toast({ title: "Cliente excluído com sucesso!" });
    } else {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    }
    setItemToDelete(null);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">👥 Clientes</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-base py-3 px-5">
          <Plus className="mr-2 h-5 w-5" />
          Novo
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <Label htmlFor="buscar-cliente" className="sr-only">Buscar cliente</Label>
        <Input
          id="buscar-cliente"
          className="input-lg"
          placeholder="🔍 Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card-elevated p-5 mb-4 animate-slide-up space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-novo" className="text-base">Nome do cliente <span className="text-destructive">*</span></Label>
            <Input 
              id="nome-novo"
              className="input-lg" 
              placeholder="Ex: Maria Silva" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              autoFocus 
              required 
              maxLength={100} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone-novo" className="text-base">Telefone (opcional)</Label>
            <Input 
              id="telefone-novo"
              className="input-lg" 
              placeholder="Ex: (11) 99999-9999" 
              value={telefone} 
              onChange={(e) => setTelefone(formatPhone(e.target.value))} 
              type="tel" 
              maxLength={20} 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1" disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? <span className="animate-spin mr-2">⏳</span> : null}
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={busca ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado'}
          description={busca ? 'Tente buscar por outro nome.' : 'Comece adicionando seu primeiro cliente para gerenciar vendas.'}
          actionLabel={!busca ? "Adicionar Cliente" : undefined}
          onAction={!busca ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card-elevated p-4">
              {editId === c.id ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`edit-nome-${c.id}`} className="text-base">Nome <span className="text-destructive">*</span></Label>
                    <Input id={`edit-nome-${c.id}`} className="input-lg" value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-tel-${c.id}`} className="text-base">Telefone</Label>
                    <Input id={`edit-tel-${c.id}`} className="input-lg" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} placeholder="Telefone" type="tel" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditId(null)} className="btn-secondary flex-1 py-2 text-sm">Cancelar</button>
                    <button onClick={saveEdit} className="btn-primary flex-1 py-2 text-sm">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{c.nome}</p>
                    {c.telefone && <p className="text-muted-foreground text-sm">📱 {c.telefone}</p>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={() => startEdit(c)} 
                      className="text-primary text-xl p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                      aria-label={`Editar cliente ${c.nome}`}
                    >
                      <span aria-hidden="true">✏️</span>
                    </button>
                    <button 
                      onClick={() => setItemToDelete({ id: c.id, nome: c.nome })} 
                      className="text-destructive text-xl p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                      aria-label={`Excluir cliente ${c.nome}`}
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{itemToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;
