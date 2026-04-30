import { db } from '@/lib/db';
import { ScheduledOrder } from '@/types';
import { differenceInMinutes, parseISO, startOfDay, addDays, isSameDay, setHours, setMinutes, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner'; // Using sonner for UI notifications since we are frontend-only
import { dbUpdate, dbAdd } from '@/lib/db-operations';

/**
 * Serviço de verificação periódica
 * Checks scheduled orders and sends notifications/updates status
 */
export async function checkScheduledOrders() {
  try {
    const now = new Date();
    
    // Buscar pedidos que ainda estão agendados
    // In Dexie we can't filter by multiple fields easily without compound index, but we have [scheduledDate+status]
    // Or just iterate all 'scheduled' orders. If volume is low, it's fine.
    const scheduledOrders = await db.scheduledOrders
        .filter(order => order.status === 'scheduled' || order.status === 'ready_for_delivery')
        .toArray();
    
    let processedCount = 0;

    for (const order of scheduledOrders) {
      // Processar notificações
      await processNotifications(order, now);
      
      // Auto-mover para pronta entrega se chegou o dia
      if (shouldMoveToReady(order, now)) {
        await moveToReadyForDelivery(order.orderId);
      }
      processedCount++;
    }
    
    return processedCount;
    
  } catch (error) {
    console.error('[CheckScheduled] Erro ao verificar pedidos:', error);
  }
}

/**
 * Processar notificações para um pedido
 */
async function processNotifications(order: ScheduledOrder, currentTime: Date) {
  const scheduledDateTime = parseISO(`${order.scheduledDate}T${order.scheduledTime}`);
  
  // Notificação 1 dia antes
  if (isDayBefore(scheduledDateTime, currentTime) && !order.notifications.dayBefore.sent) {
    sendNotification({
      type: "day_before",
      orderId: order.orderId,
      title: "Pedido para amanhã",
      body: `Pedido #${order.orderId} deve ser entregue amanhã às ${order.scheduledTime}`,
      priority: "normal"
    });
    
    await markNotificationSent(order.orderId, "dayBefore");
  }
  
  // Notificação no dia (manhã - 8h as 9h)
  if (isMorningOf(scheduledDateTime, currentTime) && !order.notifications.morningOf.sent) {
    sendNotification({
      type: "morning_of",
      orderId: order.orderId,
      title: "📦 HOJE: Pedido para entregar",
      body: `Pedido #${order.orderId} - ${order.customer.name} às ${order.scheduledTime}`,
      priority: "high"
    });
    
    await markNotificationSent(order.orderId, "morningOf");
  }
  
  // Notificação 1 hora antes
  if (isOneHourBefore(scheduledDateTime, currentTime) && !order.notifications.oneHourBefore.sent) {
    sendNotification({
      type: "one_hour_before",
      orderId: order.orderId,
      title: "⏰ URGENTE: Entrega em 1 hora",
      body: `Pedido #${order.orderId} - ${order.customer.name}`,
      priority: "urgent"
    });
    
    await markNotificationSent(order.orderId, "oneHourBefore");
  }
}

function isDayBefore(scheduledDateTime: Date, currentTime: Date) {
  const dayBefore = startOfDay(addDays(scheduledDateTime, -1));
  const dayBeforeEnd = setMinutes(setHours(dayBefore, 23), 59);
  return currentTime >= dayBefore && currentTime <= dayBeforeEnd;
}

function isMorningOf(scheduledDateTime: Date, currentTime: Date) {
  const scheduledDay = startOfDay(scheduledDateTime);
  const morningStart = setHours(scheduledDay, 7);
  const morningEnd = setHours(scheduledDay, 9);
  
  return currentTime >= morningStart && 
         currentTime <= morningEnd && 
         isSameDay(currentTime, scheduledDateTime);
}

function isOneHourBefore(scheduledDateTime: Date, currentTime: Date) {
  const diff = differenceInMinutes(scheduledDateTime, currentTime);
  // Entre 55 e 65 minutos antes
  return diff >= 55 && diff <= 65;
}

function shouldMoveToReady(order: ScheduledOrder, currentTime: Date) {
  if (!order.autoMoveToReady) return false;
  
  const scheduledDateTime = parseISO(`${order.scheduledDate}T${order.scheduledTime}`);
  
  // Mover na manhã do dia (a partir das 6h)
  const scheduledDay = startOfDay(scheduledDateTime);
  const moveTime = setHours(scheduledDay, 6);
  
  return isAfter(currentTime, moveTime) && 
         isSameDay(currentTime, scheduledDateTime) &&
         order.status === "scheduled";
}

async function moveToReadyForDelivery(orderId: string) {
  try {
    await dbUpdate('scheduledOrders', orderId, {
        status: "ready_for_delivery",
        movedToReadyAt: new Date().toISOString()
    } as any);
    
    // Also update main table
    // Note: status 'pronta_entrega' must be supported by types
    // We update below with read-modify-write
    
     // Easier to read-modify-write for nested 'history'
    const order = await db.pedidosPreVenda.get(orderId);
    if(order) {
        await dbUpdate('pedidosPreVenda', orderId, {
             status: 'pronta_entrega',
             history: [
                ...(order.history || []),
                {
                    action: "auto_moved_to_ready",
                    timestamp: new Date().toISOString()
                }
             ]
        } as any);
    }
    
    sendNotification({
        type: "moved_to_ready",
        orderId,
        title: "Pedido movido para Pronta Entrega",
        body: `Pedido #${orderId} está pronto para entrega.`,
        priority: "normal"
    });

    console.log(`[Auto] Pedido ${orderId} movido para pronta entrega`);
    
  } catch (error) {
    console.error(`Erro ao mover pedido ${orderId} para pronta entrega:`, error);
  }
}

async function markNotificationSent(orderId: string, notificationType: 'dayBefore' | 'morningOf' | 'oneHourBefore') {
  // Dexie update for nested properties
  const key1 = `notifications.${notificationType}.sent`;
  const key2 = `notifications.${notificationType}.sentAt`;

  await dbUpdate('scheduledOrders', orderId, {
      [key1]: true,
      [key2]: new Date().toISOString()
  } as any);
}

/**
 * Enviar notificação (Simulated with Toast/Sonner + Browser Notification DB Log)
 */
async function sendNotification(data: { type: string, orderId: string, title: string, body: string, priority: string }) {
  const { type, orderId, title, body, priority } = data;
  
  try {
    // 1. Show UI Toast
    if (priority === 'urgent') {
        toast.error(`${title}: ${body}`, { duration: 10000 });
    } else if (priority === 'high') {
        toast.warning(`${title}: ${body}`, { duration: 8000 });
    } else {
        toast.info(`${title}: ${body}`);
    }

    // 2. Request Browser Notification (optional, if user granted permission)
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, tag: orderId });
    }

    // 3. Log to DB
    await dbAdd('notificationLogs', {
      orderId,
      type,
      title,
      body,
      priority,
      sentAt: new Date().toISOString(),
      status: "sent"
    });
    
    console.log(`[Notification] ${type} enviada para pedido ${orderId}`);
    
  } catch (error: any) {
    console.error(`Erro ao enviar notificação para ${orderId}:`, error);
  }
}
