import { useState } from 'react';
import { useStore } from '@/store/useStore';

const Clientes = () => {
  const { clientes, addCliente, deleteCliente } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    addCliente(nome.trim(), telefone.trim() || undefined);
    setNome('');
    setTelefone('');
    setShowForm(false);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">👥 Clientes</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-base py-3 px-5">
          + Novo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card-elevated p-5 mb-4 animate-slide-up space-y-3">
          <input
            className="input-lg"
            placeholder="Nome do cliente *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            required
            maxLength={100}
          />
          <input
            className="input-lg"
            placeholder="Telefone (opcional)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            type="tel"
            maxLength={20}
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1">
              Salvar
            </button>
          </div>
        </form>
      )}

      {clientes.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-lg font-semibold">Nenhum cliente cadastrado</p>
          <p className="text-muted-foreground">Toque em "+ Novo" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map((c) => (
            <div key={c.id} className="card-elevated p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{c.nome}</p>
                {c.telefone && <p className="text-muted-foreground text-sm">📱 {c.telefone}</p>}
              </div>
              <button
                onClick={() => deleteCliente(c.id)}
                className="text-destructive text-xl p-2"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clientes;
