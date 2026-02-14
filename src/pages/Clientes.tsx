import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useLocation } from 'react-router-dom';

const Clientes = () => {
  const { clientes, addCliente, updateCliente, deleteCliente } = useStore();
  const location = useLocation();
  const [showForm, setShowForm] = useState(location.state?.showForm || false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [busca, setBusca] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    addCliente(nome.trim(), telefone.trim() || undefined);
    setNome('');
    setTelefone('');
    setShowForm(false);
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

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">👥 Clientes</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-base py-3 px-5">
          + Novo
        </button>
      </div>

      {/* Search bar */}
      <input
        className="input-lg mb-4"
        placeholder="🔍 Buscar cliente..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="card-elevated p-5 mb-4 animate-slide-up space-y-3">
          <input className="input-lg" placeholder="Nome do cliente *" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required maxLength={100} />
          <input className="input-lg" placeholder="Telefone (opcional)" value={telefone} onChange={(e) => setTelefone(e.target.value)} type="tel" maxLength={20} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Salvar</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-lg font-semibold">{busca ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</p>
          <p className="text-muted-foreground">{busca ? 'Tente outro nome' : 'Toque em "+ Novo" para começar'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card-elevated p-4">
              {editId === c.id ? (
                <div className="space-y-3">
                  <input className="input-lg" value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome *" />
                  <input className="input-lg" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} placeholder="Telefone" type="tel" />
                  <div className="flex gap-3">
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
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(c)} className="text-primary text-xl p-2">✏️</button>
                    <button onClick={() => deleteCliente(c.id)} className="text-destructive text-xl p-2">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clientes;
