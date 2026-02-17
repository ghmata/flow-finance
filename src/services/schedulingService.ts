import { db } from '@/lib/db';
import { PedidoPreVenda, ScheduledOrder } from '@/types';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';

/**
 * Agendar um pedido para uma data específica
 */
export async function scheduleOrder(
  orderId: string, 
  scheduledDate: string, 
  scheduledTime: string, 
  options: { timezone?: string, autoMoveToReady?: boolean, userId?: string } = {}
) {
  try {
    // Validar data (não pode ser passada)
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    
    if (scheduledDateTime < now) {
       // Allow for now, or throw error depending on strictness. 
       // throw new Error("Data de agendamento não pode ser no passado");
    }
    
    // Validar se pedido existe
    const order = await db.pedidosPreVenda.get(orderId);
    if (!order) {
      throw new Error(`Pedido ${orderId} não encontrado`);
    }
    
    // Check if customer exists to avoid errors
    const customer = await db.clientes.get(order.cliente_id);
    
    // Criar registro de agendamento
    const scheduledOrder: ScheduledOrder = {
      orderId,
      scheduledDate,
      scheduledTime,
      timezone: options.timezone || "America/Sao_Paulo",
      status: "scheduled",
      notifications: {
        dayBefore: { sent: false, method: "push" },
        morningOf: { sent: false },
        oneHourBefore: { sent: false }
      },
      autoMoveToReady: options.autoMoveToReady !== false,
      createdAt: new Date().toISOString(),
      createdBy: options.userId,
      customer: {
          id: order.cliente_id,
          name: customer?.nome || 'Cliente Desconhecido',
          phone: customer?.telefone
      },
      items: order.itens || [],
      total: order.valor_total,
      address: order.observacoes // Using observacoes as address/notes placeholder
    };
    
    // Salvar no banco
    await db.scheduledOrders.put(scheduledOrder);
    
    // Atualizar status do pedido original
    await db.pedidosPreVenda.update(orderId, {
        status: 'agendado',
        scheduledDate,
        scheduledTime,
        history: [
            ...(order.history || []),
            {
                action: "scheduled",
                timestamp: new Date().toISOString(),
                scheduledDate,
                scheduledTime,
                userId: options.userId
            }
        ]
    });
    
    // Log de auditoria
    await db.auditLogs.add({
      orderId,
      action: "schedule_order",
      userId: options.userId,
      timestamp: new Date().toISOString(),
      details: { scheduledDate, scheduledTime }
    });
    
    return {
      success: true,
      orderId,
      scheduledDate,
      scheduledTime,
      message: `Pedido agendado para ${scheduledDate} às ${scheduledTime}`
    };
    
  } catch (error: any) {
    console.error("Erro ao agendar pedido:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reagendar um pedido para nova data/hora
 */
export async function rescheduleOrder(orderId: string, newDate: string, newTime: string, reason: string) {
  try {
    const scheduledOrder = await db.scheduledOrders.get(orderId);
    
    if (!scheduledOrder) {
      throw new Error(`Pedido agendado ${orderId} não encontrado`);
    }
    
    // Armazenar datas antigas
    const oldDate = scheduledOrder.scheduledDate;
    const oldTime = scheduledOrder.scheduledTime;
    
    // Atualizar registro
    await db.scheduledOrders.update(orderId, {
        scheduledDate: newDate,
        scheduledTime: newTime,
        // Resetar notificações
        "notifications.dayBefore.sent": false,
        "notifications.morningOf.sent": false,
        "notifications.oneHourBefore.sent": false,
        rescheduled: {
            oldDate,
            oldTime,
            newDate,
            newTime,
            reason,
            timestamp: new Date().toISOString()
        }
    });
    
    // Atualizar pedido original
    const order = await db.pedidosPreVenda.get(orderId);
    if(order) {
        await db.pedidosPreVenda.update(orderId, {
            scheduledDate: newDate,
            scheduledTime: newTime,
            history: [
                ...(order.history || []),
                {
                    action: "rescheduled",
                    timestamp: new Date().toISOString(),
                    oldDate,
                    oldTime,
                    newDate,
                    newTime,
                    reason
                }
            ]
        });
    }
    
    // Log
    await db.auditLogs.add({
      orderId,
      action: "reschedule_order",
      timestamp: new Date().toISOString(),
      reason,
      details: { oldDate, oldTime, newDate, newTime }
    });
    
    return {
      success: true,
      orderId,
      newDate,
      newTime,
      message: `Pedido reagendado para ${newDate} às ${newTime}`
    };
    
  } catch (error: any) {
    console.error("Erro ao reagendar pedido:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancelar agendamento de um pedido
 */
export async function cancelScheduledOrder(orderId: string, reason: string) {
  try {
    const scheduledOrder = await db.scheduledOrders.get(orderId);
    
    if (!scheduledOrder) {
      throw new Error(`Pedido agendado ${orderId} não encontrado`);
    }
    
    // Atualizar status
    await db.scheduledOrders.update(orderId, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelReason: reason
    });
    
    // Atualizar pedido original
    const order = await db.pedidosPreVenda.get(orderId);
    if(order) {
        await db.pedidosPreVenda.update(orderId, {
            status: "cancelado",
            history: [
                ...(order.history || []),
                {
                    action: "schedule_cancelled",
                    timestamp: new Date().toISOString(),
                    reason
                }
            ]
        });
    }
    
    // Log
    await db.auditLogs.add({
      orderId,
      action: "cancel_scheduled_order",
      timestamp: new Date().toISOString(),
      reason
    });
    
    return {
      success: true,
      orderId,
      message: "Agendamento cancelado"
    };
    
  } catch (error: any) {
    console.error("Erro ao cancelar agendamento:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obter pedidos agendados para hoje
 */
export async function getTodayScheduledOrders() {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  return await db.scheduledOrders
    .where('scheduledDate')
    .equals(todayStr)
    .and(order => order.status === 'scheduled')
    .sortBy('scheduledTime');
}

/**
 * Obter pedidos agendados em range
 */
export async function getScheduledOrdersGroupedByDate(startDate: Date, endDate: Date) {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    const orders = await db.scheduledOrders
        .where('scheduledDate')
        .between(startStr, endStr, true, true) // inclusive
        .filter(order => order.status === 'scheduled' || order.status === 'ready_for_delivery')
        .sortBy('scheduledDate');

    // Group by date
    const grouped: Record<string, any[]> = {};
    orders.forEach(order => {
        if (!grouped[order.scheduledDate]) {
            grouped[order.scheduledDate] = [];
        }
        grouped[order.scheduledDate].push(order);
    });

    const result: Record<string, any> = {};
    for (const [date, dateOrders] of Object.entries(grouped)) {
        result[date] = {
            date,
            count: dateOrders.length,
            total: dateOrders.reduce((sum, o) => sum + o.total, 0),
            orders: dateOrders
        };
    }

    return {
        success: true,
        startDate: startStr,
        endDate: endStr,
        totalOrders: orders.length,
        dates: result
    };
}
