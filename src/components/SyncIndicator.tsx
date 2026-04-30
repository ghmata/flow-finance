import { useStore } from '@/store/useStore';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { syncEngine } from '@/lib/sync-engine';

export function SyncIndicator() {
  const syncStatus = useStore((state) => state.syncStatus);

  const handleManualSync = () => {
    if (syncStatus === 'online' || syncStatus === 'error') {
      syncEngine.flush();
    }
  };

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-500 font-medium px-2 py-1 rounded-full bg-blue-50/50">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">Sincronizando...</span>
      </div>
    );
  }

  if (syncStatus === 'offline') {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600 font-medium px-2 py-1 rounded-full bg-amber-50/50">
        <CloudOff className="h-3 w-3" />
        <span className="hidden sm:inline">Modo Offline</span>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <button 
        onClick={handleManualSync}
        className="flex items-center gap-2 text-xs text-red-500 font-medium px-2 py-1 rounded-full bg-red-50/50 hover:bg-red-100 transition-colors"
        title="Erro na sincronização. Clique para tentar novamente."
      >
        <AlertCircle className="h-3 w-3" />
        <span className="hidden sm:inline">Erro de Sync</span>
      </button>
    );
  }

  // Online (Idle)
  return (
    <button 
      onClick={handleManualSync}
      className="flex items-center gap-2 text-xs text-emerald-600 font-medium px-2 py-1 rounded-full bg-emerald-50/50 hover:bg-emerald-100 transition-colors"
      title="Conectado à nuvem. Clique para forçar sincronização."
    >
      <Cloud className="h-3 w-3" />
      <span className="hidden sm:inline">Online</span>
    </button>
  );
}
