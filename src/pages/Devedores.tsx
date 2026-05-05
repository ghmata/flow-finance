import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import PagamentoModal from '@/components/PagamentoModal';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PartyPopper, PackageCheck, CheckCircle, ChevronDown, ChevronUp, CircleDollarSign, Copy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isToday, isTomorrow, isYesterday, isValid, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AbaReceber = 'areceber' | 'pagos';

const Devedores = () => {
  const { pedidosPreVenda, getDevedores, getClienteNome, getProdutoNome, registrarPagamentoReserva, registrarPagamentoEmLote } = useStore();
  const devedores = getDevedores();
  const isLoading = useStore((s) => s.isLoading);
  const totalGeral = devedores.reduce((acc, d) => acc + d.total, 0);

  const [aba, setAba] = useState<AbaReceber>('areceber');
  const [busca, setBusca] = useState('');
  const { toast } = useToast();

  // Payment Modal State
  const [pagModal, setPagModal] = useState<{
    tipo: 'prevenda' | 'posvenda';
    referenciaId: string;
    itemId: string; // Granular item ID
    clienteNome: string;
    valor: number;
    isBatch?: boolean; // New flag
    batchItemIds?: string[];
  } | null>(null);

  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const toggleClient = useCallback((id: string) => {
      setExpandedClients(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }, []);
  
  // Helper to handle batch payment logic
  const processBatchPayment = (clienteId: string, formaPagamento: string, valorPago?: number) => {
      // Find the client data
      const dev = devedores.find(d => d.cliente.id === clienteId);
      if (!dev) return;

      const unpaidItems = dev.itens.filter((i: any) => !i.paidAt);
      
      // Calculate total debt for proportional distribution if valorPago is present
      const totalDebt = unpaidItems.reduce((acc: number, i: any) => acc + i.valor, 0);

      // Group by Order ID (referenciaId)
      const ordersMap = new Map<string, { itemIds: string[], total: number }>();
      unpaidItems.forEach((i: any) => {
          const refId = i.id; // Order ID
          if (!ordersMap.has(refId)) {
                ordersMap.set(refId, { itemIds: [], total: 0 });
          }
          const entry = ordersMap.get(refId)!;
          entry.itemIds.push(i.itemId);
          entry.total += i.valor;
      });
      
      const { registrarPagamentoEmLote } = useStore.getState();
      
      ordersMap.forEach(({ itemIds, total }, orderId) => {
          const tipo = unpaidItems.find((i: any) => i.id === orderId)?.tipo || 'prevenda';
          
          let orderPaymentValue: number | undefined = undefined;
          if (valorPago !== undefined && totalDebt > 0) {
              // Proportional payment: (OrderTotal / TotalDebt) * GlobalPayment
              orderPaymentValue = (total / totalDebt) * valorPago;
          }

          registrarPagamentoEmLote(tipo as any, orderId, itemIds, formaPagamento, orderPaymentValue);
      });
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const handleCopyChargeMessage = useCallback(async (clienteNome: string, valor: number) => {
    const defaultTemplate = `Estimado cliente [CLIENTE], boa tarde!\n\nA equipe da Theus Doces agradece imensamente pela sua parceria. Gostaríamos de lembrá-lo, de forma gentil, sobre o pagamento de [VALOR] referente aos doces.\n\nSegue a chave Pix para sua comodidade: 31920067388.`;
    
    const finalMessage = defaultTemplate
        .replace('[CLIENTE]', clienteNome.split(' ')[0])
        .replace('[VALOR]', fmt(valor));
    
    try {
        await navigator.clipboard.writeText(finalMessage);
        toast({
            title: "Mensagem copiada!",
            description: "Texto pronto para colar no WhatsApp.",
            variant: "default",
        })
    } catch(err) {
         toast({
            title: "Erro ao copiar",
            description: "Não foi possível copiar o texto para a área de transferência.",
            variant: "destructive",
        })
    }
  }, [fmt, toast]);

  // Filter devedores
  const filteredDevedores = devedores.filter((d) =>
    d.cliente.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Group devedores by the earliest item date (Correção 3)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const toggleDate = (dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredDevedores> = {};

    filteredDevedores.forEach(dev => {
      // Pegar a data mais antiga dos itens do devedor
      const earliestDate = dev.itens.reduce((oldest, item) => {
        if (!item.data) return oldest;
        if (!oldest) return item.data;
        return item.data < oldest ? item.data : oldest;
      }, '' as string);
      const dateKey = earliestDate || 'sem_data';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(dev);
    });

    // Ordenar: datas mais recentes primeiro, sem_data no final
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'sem_data') return 1;
      if (b === 'sem_data') return -1;
      return b.localeCompare(a); // Mais recente primeiro
    });

    return keys.map(key => ({
      dateKey: key,
      devedores: groups[key],
      total: groups[key].reduce((sum, d) => sum + d.total, 0),
    }));
  }, [filteredDevedores]);

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === 'sem_data') return '📅 Sem Data';
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return 'Data Inválida';
      let prefix = '';
      if (isToday(date)) prefix = 'Hoje, ';
      else if (isTomorrow(date)) prefix = 'Amanhã, ';
      else if (isYesterday(date)) prefix = 'Ontem, ';
      return `${prefix}${format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}`;
    } catch {
      return dateStr;
    }
  };

  // Group Pagos/Não Entregues by Client like Devedores
  const groupedPagosNE = useMemo(() => {
      const map = new Map<string, { cliente: any, itens: any[], total: number }>();
      
      // Filter PreVenda items that are paid but not delivered
      pedidosPreVenda.forEach(p => {
          // Logic: An item is "Paid/Not Delivered" if:
          // 1. The whole order is NOT 'entregue' (completed)
          // 2. The item has been paid OR the whole order is 'pago' (legacy)
          
          if (p.status === 'entregue') return; // If order is fully delivered/completed, skip.

          // Legacy check: if entire order is 'pago' 
          // Note: We used to check !p.data_entrega, but if data_entrega is used for scheduling, that's wrong.
          // We rely on status !== 'entregue'. 
          const isLegacyPaid = p.status === 'pago';
          
          const cliente = useStore.getState().clientes.find(c => c.id === p.cliente_id);
          if (!cliente) return;

          if (!map.has(p.cliente_id)) {
              map.set(p.cliente_id, { cliente, itens: [], total: 0 });
          }
          const entry = map.get(p.cliente_id)!;

          const itens = p.itens || [];
          
          if (itens.length === 0 && p.produto_id && isLegacyPaid) {
               // Legacy item
               entry.itens.push({
                   id: p.id,
                   itemId: p.id,
                   descricao: getProdutoNome(p.produto_id),
                   valor: p.valor_total,
                   data: p.data_pagamento || p.data_pedido,
                   quantidade: p.quantidade || 1
               });
               entry.total += p.valor_total;
          } else {
               // Granular items
               itens.forEach(item => {
                   // Item is paid AND NOT delivered
                   // Check if item specific delivery exists (not implemented yet, fallback to order delivery)
                   // If order has no data_entrega, we assume items are not delivered.
                   
                   // Logic: Show item if it has paidAt AND NOT deliveredAt
                   if (item.paidAt && !item.deliveredAt) {
                       entry.itens.push({
                           id: p.id,
                           itemId: item.id,
                           descricao: item.produto_nome,
                           valor: item.subtotal,
                           data: item.paidAt,
                           quantidade: item.quantidade
                       });
                       entry.total += item.subtotal;
                   } else if (isLegacyPaid && !item.deliveredAt) {
                        // Fallback: Order is marked paid, but items might not have paidAt if they are old?
                        // If order is 'pago', all items should be considered paid.
                       entry.itens.push({
                           id: p.id,
                           itemId: item.id,
                           descricao: item.produto_nome,
                           valor: item.subtotal,
                           data: p.data_pagamento || p.data_pedido,
                           quantidade: item.quantidade
                       });
                       entry.total += item.subtotal;
                   }
               });
          }
      });

      return Array.from(map.values())
        .filter(g => g.itens.length > 0)
        .sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome));

  }, [pedidosPreVenda, busca]); // Add dependencies

  const filteredPagosNE = groupedPagosNE.filter((g) =>
    g.cliente.nome.toLowerCase().includes(busca.toLowerCase())
  );
  
  const totalPagosNE = groupedPagosNE.reduce((acc, g) => acc + g.total, 0);

  const abas = [
    { key: 'areceber' as const, label: '💰 A Receber' },
    { key: 'pagos' as const, label: '✅ Pagos/Não Entregues' },
  ];

  return (
    <div className="page-container pb-24 md:pb-6 !pt-0 !px-0">
      {/* === HERO ZONE === */}
      <div className="relative bg-gradient-to-br from-[#1e1b5e] via-[#2d2a8a] to-[#4338ca] px-5 pt-8 pb-6 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-16 -left-6 w-28 h-28 rounded-full bg-white/5" />

        <h1 className="relative text-2xl font-bold text-white mb-4">
          {aba === 'areceber' ? '💰 A Receber' : '✅ Pagos / Não Entregues'}
        </h1>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
          <input
            className="w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Buscar cliente..."
            aria-label="Buscar devedor por nome do cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Tabs — Glassmorphism */}
        <div className="relative flex gap-1.5 mb-5 backdrop-blur-xl bg-white/10 rounded-xl p-1 border border-white/15">
          {abas.map((a) => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                aba === a.key
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Summary Card — Glassmorphism (mudar conforme aba) */}
        {aba === 'areceber' ? (
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-5">
            <p className="text-sm text-white/70">Total a Receber</p>
            <p className="text-3xl font-bold text-white mt-1">{fmt(totalGeral)}</p>
            <p className="text-sm text-white/50 mt-1">{devedores.length} pessoa(s) devendo</p>
          </div>
        ) : (
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-5">
            <p className="text-sm text-white/70">Valor Pago / Não Entregue</p>
            <p className="text-3xl font-bold text-white mt-1">{fmt(totalPagosNE)}</p>
            <p className="text-sm text-white/50 mt-1">{groupedPagosNE.length} cliente(s) aguardando entrega</p>
          </div>
        )}
      </div>

      {/* === CONTENT ZONE === */}
      <div className="px-5 pt-5 space-y-5">

        {/* ABA: A RECEBER */}
        {aba === 'areceber' && (
          <>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDevedores.length === 0 ? (
              <EmptyState
                icon={PartyPopper}
                title="Ninguém devendo!"
                description="Todos os pagamentos estão em dia."
              />
            ) : (
              <div className="space-y-6">
                {groupedByDate.map((group) => (
                  <div key={group.dateKey}>
                    {/* Date Header */}
                    <button
                      onClick={() => toggleDate(group.dateKey)}
                      className="flex items-center justify-between w-full mb-3 px-1 group"
                      aria-expanded={!collapsedDates.has(group.dateKey)}
                      aria-label={`Grupo de devedores: ${formatDateHeader(group.dateKey)}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                        <h2 className="text-sm font-bold text-foreground capitalize">
                          {formatDateHeader(group.dateKey)}
                        </h2>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {group.devedores.length} cliente(s) • {fmt(group.total)}
                        </span>
                      </div>
                      {collapsedDates.has(group.dateKey) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Devedores dentro da data */}
                    {!collapsedDates.has(group.dateKey) && (
                      <div className="space-y-4">
                        {group.devedores.map((dev) => {
                          const hasAtraso = dev.itens.some(i => i.dias > 10);
                          return (
                          <div key={dev.cliente.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${hasAtraso ? 'border-red-300 ring-1 ring-red-100' : 'border-border/50'}`}>
                            {hasAtraso && (
                              <div className="bg-red-50 text-red-600 text-xs font-bold px-3 py-2 text-center border-b border-red-100">
                                ⚠️ Pagamento Atrasado (Mais de 10 dias)
                              </div>
                            )}
                            {/* Client Header */}
                            <div
                              className={`p-4 text-white cursor-pointer ${hasAtraso ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-gradient-to-r from-[#1e1b5e] to-[#4338ca]'}`}
                              onClick={() => toggleClient(dev.cliente.id)}
                              role="button"
                              tabIndex={0}
                              aria-expanded={expandedClients.includes(dev.cliente.id)}
                              aria-label={`Expandir detalhes de ${dev.cliente.nome}`}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClient(dev.cliente.id); } }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="bg-white/15 rounded-full p-2 flex-shrink-0">
                                    <span className="text-lg">👤</span>
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="text-base font-bold truncate">{dev.cliente.nome}</h3>
                                    {dev.cliente.telefone && (
                                      <p className="text-xs text-white/60">📱 {dev.cliente.telefone}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-1.5 flex-shrink-0">
                                  <div>
                                    <p className="text-[10px] text-white/60 uppercase tracking-wide">Deve</p>
                                    <p className="text-lg font-bold">{fmt(dev.total)}</p>
                                  </div>
                                  {expandedClients.includes(dev.cliente.id) ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Items */}
                            {expandedClients.includes(dev.cliente.id) && (
                            <div className="p-3 space-y-2 bg-gray-50/50">
                              {dev.itens.map((item) => (
                                <div key={`${item.id}-${item.itemId}`} className={`bg-white border rounded-xl p-3 shadow-sm space-y-2 ${item.dias > 10 ? 'border-red-300 bg-red-50/30' : 'border-border/60'}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-semibold text-sm">{item.descricao}</p>
                                        {item.dias > 10 && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full flex-shrink-0">
                                            ⚠️ Atrasado
                                          </span>
                                        )}
                                        {item.deliveredAt && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0">
                                            ✅ Entregue
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        📅 {item.data && isValid(parseISO(item.data)) ? format(parseISO(item.data), 'dd/MM/yyyy') : 'S/D'} (há {item.dias} dias) • {item.tipo === 'prevenda' ? '📦 Reserva' : '🛒 Pronta Entrega'}
                                      </p>
                                    </div>
                                    <p className="font-bold text-lg text-indigo-600 flex-shrink-0">{fmt(item.valor)}</p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setPagModal({
                                        tipo: item.tipo,
                                        referenciaId: item.id,
                                        itemId: item.itemId || item.id,
                                        clienteNome: dev.cliente.nome,
                                        valor: item.valor,
                                      })
                                    }
                                    className="w-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2.5 min-h-[44px] rounded-xl hover:bg-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                    aria-label={`Pagar ${item.descricao} de ${dev.cliente.nome}`}
                                  >
                                    💵 Pagar Item
                                  </button>
                                </div>
                              ))}
                            </div>
                            )}
                            
                            {/* Footer Actions */}
                            <div className="px-3 py-3 bg-gray-50 border-t border-border/30 space-y-2">
                                <button
                                  onClick={() => toggleClient(dev.cliente.id)}
                                  className="text-xs text-muted-foreground underline"
                                >
                                  {expandedClients.includes(dev.cliente.id) ? 'Ocultar itens' : `Ver ${dev.itens.length} itens`}
                                </button>
                                
                                <div className="flex gap-2 w-full">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleCopyChargeMessage(dev.cliente.nome, dev.total)}
                                    className="text-muted-foreground border-border px-3 rounded-xl shadow-sm transition-all min-h-[44px] flex-1"
                                  >
                                    <Copy className="h-4 w-4 flex-shrink-0 mr-1.5" />
                                    Cobrar
                                  </Button>

                                  <Button
                                    onClick={() => {
                                        setPagModal({
                                            tipo: 'prevenda',
                                            referenciaId: dev.cliente.id,
                                            itemId: '', 
                                            clienteNome: dev.cliente.nome,
                                            valor: dev.total,
                                            isBatch: true
                                        });
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl shadow-sm transition-all min-h-[44px] flex-1"
                                  >
                                    <CircleDollarSign className="h-4 w-4 flex-shrink-0 mr-1.5" />
                                    <span className="truncate">Receber {fmt(dev.total)}</span>
                                  </Button>
                                </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA: PAGOS / NÃO ENTREGUES */}
        {aba === 'pagos' && (
          <>
            {filteredPagosNE.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="Nenhum pedido aguardando"
                description="Todos os pedidos pagos foram entregues."
              />
            ) : (
              <div className="space-y-4">
                {filteredPagosNE.map((group) => (
                  <div key={group.cliente.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
                    {/* Client Header — Orange theme */}
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white cursor-pointer"
                      onClick={() => toggleClient(group.cliente.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expandedClients.includes(group.cliente.id)}
                      aria-label={`Expandir detalhes de ${group.cliente.nome}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClient(group.cliente.id); } }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-white/15 rounded-full p-2 flex-shrink-0">
                            <span className="text-lg">📦</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold truncate">{group.cliente.nome}</h3>
                            <p className="text-xs text-white/70">{group.itens.length} item(s) pago(s)</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-1.5 flex-shrink-0">
                          <div>
                            <p className="text-[10px] text-white/70 uppercase tracking-wide">Pago</p>
                            <p className="text-lg font-bold">{fmt(group.total)}</p>
                          </div>
                          {expandedClients.includes(group.cliente.id) ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Items */}
                    {expandedClients.includes(group.cliente.id) && (
                    <div className="p-3 space-y-2 bg-gray-50/50">
                      {group.itens.map((item) => (
                        <div key={`${item.id}-${item.itemId}`} className="bg-white border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm">{item.descricao}</p>
                              <p className="text-xs text-muted-foreground">
                                📅 Pago em {new Date(item.data).toLocaleDateString('pt-BR')} • {item.quantidade}x
                              </p>
                            </div>
                            <p className="font-bold text-lg text-orange-600 flex-shrink-0">{fmt(item.valor)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const { entregarItem, entregarPreVenda } = useStore.getState();
                              if (item.itemId === item.id) {
                                entregarPreVenda(item.id);
                              } else {
                                entregarItem(item.id, item.itemId);
                              }
                            }}
                            className="w-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2.5 min-h-[44px] rounded-xl hover:bg-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                            aria-label={`Entregar ${item.descricao}`}
                          >
                            <CheckCircle className="h-4 w-4" /> Entregar
                          </button>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {pagModal && (
        <PagamentoModal
          open
          onClose={() => setPagModal(null)}
          tipo={pagModal.tipo}
          referenciaId={pagModal.referenciaId}
          clienteNome={pagModal.clienteNome}
          valor={pagModal.valor}
          itemId={pagModal.itemId}
          onConfirm={pagModal.isBatch 
            ? (forma, valor) => processBatchPayment(pagModal.referenciaId, forma, valor) 
            : undefined
          }
        />
      )}
    </div>
  );
};


export default Devedores;
