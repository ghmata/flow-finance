import { supabase } from './supabase';
import { SyncQueueItem } from './db';
import { 
  Cliente, 
  Produto, 
  PedidoPreVenda, 
  RegistroPosVenda, 
  Pagamento, 
  Despesa, 
  Receita, 
  ScheduledOrder, 
  AuditLog, 
  NotificationLog 
} from '@/types';
import { Configuracao } from './db';

// Mapeamento de tabelas camelCase para snake_case no Supabase
const tableMap: Record<string, string> = {
  clientes: 'clientes',
  produtos: 'produtos',
  pedidosPreVenda: 'pedidos_pre_venda',
  registrosPosVenda: 'registros_pos_venda',
  pagamentos: 'pagamentos',
  despesas: 'despesas',
  receitas: 'receitas',
  scheduledOrders: 'scheduled_orders',
  auditLogs: 'audit_logs',
  notificationLogs: 'notification_logs',
  configuracoes: 'configuracoes'
};

// Converte um objeto do frontend (camelCase ou snake_case) para o formato do Supabase (snake_case)
// Mantém JSON como está, a menos que precise de mapeamento específico.
export function toSupabaseFormat(table: string, data: any, userId: string) {
  const result = { ...data, user_id: userId };
  
  if (table === 'pedidosPreVenda') {
    if (result.valor_total === undefined && result.valorTotal !== undefined) result.valor_total = result.valorTotal;
    if (result.valor_pago === undefined && result.valorPago !== undefined) result.valor_pago = result.valorPago;
    if (result.data_pedido === undefined && result.dataPedido !== undefined) result.data_pedido = result.dataPedido;
    if (result.data_entrega === undefined && result.dataEntrega !== undefined) result.data_entrega = result.dataEntrega;
    if (result.data_pagamento === undefined && result.dataPagamento !== undefined) result.data_pagamento = result.dataPagamento;
    if (result.forma_pagamento === undefined && result.formaPagamento !== undefined) result.forma_pagamento = result.formaPagamento;
    
    // Mapeamento de campos novos
    if (result.scheduledDate !== undefined) { result.scheduled_date = result.scheduledDate; delete result.scheduledDate; }
    if (result.scheduledTime !== undefined) { result.scheduled_time = result.scheduledTime; delete result.scheduledTime; }
    if (result.removedFromReady !== undefined) { result.removed_from_ready = result.removedFromReady; delete result.removedFromReady; }
    
    // Limpar camelCase
    delete result.valorTotal;
    delete result.valorPago;
    delete result.dataPedido;
    delete result.dataEntrega;
    delete result.dataPagamento;
    delete result.formaPagamento;
  }

  if (table === 'registrosPosVenda') {
    if (result.valor_total === undefined && result.valorTotal !== undefined) result.valor_total = result.valorTotal;
    if (result.valor_pago === undefined && result.valorPago !== undefined) result.valor_pago = result.valorPago;
    if (result.data_registro === undefined && result.dataRegistro !== undefined) result.data_registro = result.dataRegistro;
    if (result.data_pagamento === undefined && result.dataPagamento !== undefined) result.data_pagamento = result.dataPagamento;
    if (result.forma_pagamento === undefined && result.formaPagamento !== undefined) result.forma_pagamento = result.formaPagamento;
    
    // Limpar camelCase
    delete result.valorTotal;
    delete result.valorPago;
    delete result.dataRegistro;
    delete result.dataPagamento;
    delete result.formaPagamento;
  }

  if (table === 'pagamentos') {
    if (result.valor !== undefined) {
      result.valor_pago = result.valor;
      delete result.valor;
    }
    // Caso a sujeira do frontend insista em usar type ao invés de tipo (mesmo pós Zod)
    if (result.type !== undefined) {
      if (result.tipo === undefined) result.tipo = result.type;
      delete result.type;
    }
  }

  if (table === 'scheduledOrders') {
    if (result.orderId) { result.order_id = result.orderId; delete result.orderId; }
    if (result.scheduledDate) { result.scheduled_date = result.scheduledDate; delete result.scheduledDate; }
    if (result.scheduledTime) { result.scheduled_time = result.scheduledTime; delete result.scheduledTime; }
    if (result.autoMoveToReady !== undefined) { result.auto_move_to_ready = result.autoMoveToReady; delete result.autoMoveToReady; }
    if (result.createdAt) { result.created_at = result.createdAt; delete result.createdAt; }
    if (result.createdBy) { result.created_by = result.createdBy; delete result.createdBy; }
    if (result.cancelledAt) { result.cancelled_at = result.cancelledAt; delete result.cancelledAt; }
    if (result.cancelReason) { result.cancel_reason = result.cancelReason; delete result.cancelReason; }
    if (result.movedToReadyAt) { result.moved_to_ready_at = result.movedToReadyAt; delete result.movedToReadyAt; }
    if (result.deliveredAt) { result.delivered_at = result.deliveredAt; delete result.deliveredAt; }
    if (result.deliveredBy) { result.delivered_by = result.deliveredBy; delete result.deliveredBy; }
  }

  if (table === 'auditLogs') {
    if (result.orderId) { result.order_id = result.orderId; delete result.orderId; }
    if (result.userId) { result.user_id_actor = result.userId; delete result.userId; }
  }

  if (table === 'notificationLogs') {
    if (result.orderId) { result.order_id = result.orderId; delete result.orderId; }
    if (result.sentAt) { result.sent_at = result.sentAt; delete result.sentAt; }
    if (result.retryCount !== undefined) { result.retry_count = result.retryCount; delete result.retryCount; }
    if (result.externalId) { result.external_id = result.externalId; delete result.externalId; }
  }

  return result;
}

// Converte dados do Supabase (snake_case) para o frontend (camelCase/mixed)
export function fromSupabaseFormat(table: string, data: any) {
  const result = { ...data };
  delete result.user_id; // Removemos o user_id para o frontend local

  if (table === 'pedidos_pre_venda') {
    if (result.scheduled_date) { result.scheduledDate = result.scheduled_date; delete result.scheduled_date; }
    if (result.scheduled_time) { result.scheduledTime = result.scheduled_time; delete result.scheduled_time; }
    if (result.removed_from_ready) { result.removedFromReady = result.removed_from_ready; delete result.removed_from_ready; }
  }

  if (table === 'scheduled_orders') {
    if (result.order_id) { result.orderId = result.order_id; delete result.order_id; }
    if (result.scheduled_date) { result.scheduledDate = result.scheduled_date; delete result.scheduled_date; }
    if (result.scheduled_time) { result.scheduledTime = result.scheduled_time; delete result.scheduled_time; }
    if (result.auto_move_to_ready !== undefined) { result.autoMoveToReady = result.auto_move_to_ready; delete result.auto_move_to_ready; }
    if (result.created_at) { result.createdAt = result.created_at; delete result.created_at; }
    if (result.created_by) { result.createdBy = result.created_by; delete result.created_by; }
    if (result.cancelled_at) { result.cancelledAt = result.cancelled_at; delete result.cancelled_at; }
    if (result.cancel_reason) { result.cancelReason = result.cancel_reason; delete result.cancel_reason; }
    if (result.moved_to_ready_at) { result.movedToReadyAt = result.moved_to_ready_at; delete result.moved_to_ready_at; }
    if (result.delivered_at) { result.deliveredAt = result.delivered_at; delete result.delivered_at; }
    if (result.delivered_by) { result.deliveredBy = result.delivered_by; delete result.delivered_by; }
  }

  if (table === 'audit_logs') {
    if (result.order_id) { result.orderId = result.order_id; delete result.order_id; }
    if (result.user_id_actor) { result.userId = result.user_id_actor; delete result.user_id_actor; }
  }

  if (table === 'notification_logs') {
    if (result.order_id) { result.orderId = result.order_id; delete result.order_id; }
    if (result.sent_at) { result.sentAt = result.sent_at; delete result.sent_at; }
    if (result.retry_count !== undefined) { result.retryCount = result.retry_count; delete result.retry_count; }
    if (result.external_id) { result.externalId = result.external_id; delete result.external_id; }
  }

  return result;
}

export async function sbInsert(table: string, data: any) {
  const sbTable = tableMap[table] || table;
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id;

  if (!userId) throw new Error("Usuário não autenticado");

  const payload = toSupabaseFormat(table, data, userId);

  // Usa upsert em vez de insert: se o registro já existe (mesmo id), atualiza em vez de falhar com 409.
  const { error } = await supabase
    .from(sbTable)
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;
  return true;
}

export async function sbUpdate(table: string, id: string | number, data: any) {
  const sbTable = tableMap[table] || table;
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id;

  if (!userId) throw new Error("Usuário não autenticado");

  const payload = toSupabaseFormat(table, data, userId);

  const { error } = await supabase
    .from(sbTable)
    .update(payload)
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function sbDelete(table: string, id: string | number) {
  const sbTable = tableMap[table] || table;
  
  const { error } = await supabase
    .from(sbTable)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function sbGetAll(table: string) {
  const sbTable = tableMap[table] || table;
  
  const { data, error } = await supabase
    .from(sbTable)
    .select('*');

  if (error) throw error;
  
  // Converter de volta pro formato do frontend
  return data.map(item => fromSupabaseFormat(sbTable, item));
}
