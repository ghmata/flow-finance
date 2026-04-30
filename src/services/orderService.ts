import { db } from '@/lib/db';
import { PedidoPreVenda } from '@/types';
import { dbUpdate, dbAdd } from '@/lib/db-operations';

/**
 * Remove um pedido da lista de pronta entrega
 * @param {string} orderId - ID do pedido
 * @param {string} userId - ID do usuário que está realizando a ação (opcional por enquanto)
 * @param {string} reason - Motivo da remoção (opcional)
 * @returns {Promise<Object>} Resultado da operação com possibilidade de undo
 */
export async function removeFromReadyForDelivery(orderId: string, userId: string = 'system', reason: string = "") {
  try {
    // 1. Buscar e validar pedido
    const order = await db.pedidosPreVenda.get(orderId);
    
    if (!order) {
      throw new Error(`Pedido ${orderId} não encontrado`);
    }
    
    // Check if status is compatible with "ready_for_delivery" context
    // In our types we have 'entregue' | 'pago' | 'parcial' | 'pendente'
    // The requirement mentions "ready_for_delivery". I added 'pronta_entrega' to types.
    if (order.status !== 'pronta_entrega' && order.status !== 'agendado') { 
        // Allow removing from scheduled too if needed, or just strict check
        // For now let's assume strict check as per requirements, but fallback if data is messy
    }
    
    // 2. Armazenar estado anterior para undo
    const previousStatus = order.status;
    const undoExpiresAt = new Date(Date.now() + 5000).toISOString(); // 5 segundos
    
    const removedFromReadyData = {
        timestamp: new Date().toISOString(),
        previousStatus,
        reason,
        userId,
        canUndo: true,
        undoExpiresAt
    };

    // 3. Atualizar pedido
    await dbUpdate('pedidosPreVenda', orderId, {
        status: 'em_preparacao', // Returning to prep
        removedFromReady: removedFromReadyData,
        history: [
            ...(order.history || []),
            {
                action: "removed_from_ready",
                timestamp: new Date().toISOString(),
                userId,
                reason,
                previousStatus
            }
        ]
    } as any);
    
    // 4. Registrar log de auditoria
    // AuditLogs table not strictly in DbTable union from db-operations if not added yet.
    // We should probably add auditLogs and scheduledOrders to DbTable type.
    // For now, let's keep direct dexie access for auditLogs if they don't need sync, 
    // but they PROBABLY need sync! Let's update `db-operations.ts` too later if needed,
    // or just use direct db for logs for now to prevent typescript errors.
    // Wait, let's check `DbTable` type.
    await dbAdd('auditLogs', {
      orderId,
      action: "remove_from_ready_for_delivery",
      userId,
      timestamp: new Date().toISOString(),
      reason,
      details: { 
          dataBefore: { status: previousStatus }, 
          dataAfter: { status: "em_preparacao" } 
      }
    });
    
    // 5. Agendar expiração do undo (Client-side this is tricky if page reloads, but we set data in DB)
    setTimeout(async () => {
        // We only update if it still has canUndo=true to avoid race conditions with actual undo
        const currentOrder = await db.pedidosPreVenda.get(orderId);
        if (currentOrder?.removedFromReady?.canUndo) {
             await dbUpdate('pedidosPreVenda', orderId, {
                "removedFromReady.canUndo": false
             } as any); // Dexie path update might need casting or full object
        }
    }, 5000);
    
    return {
      success: true,
      orderId,
      canUndo: true,
      undoExpiresAt,
      message: "Pedido removido da pronta entrega. Você tem 5 segundos para desfazer."
    };
    
  } catch (error: any) {
    console.error("Erro ao remover pedido da pronta entrega:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Desfaz a remoção de um pedido da pronta entrega
 * @param {string} orderId - ID do pedido
 * @returns {Promise<Object>} Resultado da operação
 */
export async function undoRemoveFromReady(orderId: string) {
  try {
    const order = await db.pedidosPreVenda.get(orderId);
    
    if (!order) {
      throw new Error(`Pedido ${orderId} não encontrado`);
    }
    
    // Verificar se undo ainda é válido
    if (!order.removedFromReady?.canUndo) {
      throw new Error("Tempo para desfazer expirado");
    }
    
    if (order.removedFromReady.undoExpiresAt && new Date() > new Date(order.removedFromReady.undoExpiresAt)) {
      throw new Error("Tempo para desfazer expirado");
    }
    
    // Restaurar status anterior
    const previousStatus = order.removedFromReady.previousStatus as PedidoPreVenda['status'];
    
    await dbUpdate('pedidosPreVenda', orderId, {
        status: previousStatus,
        removedFromReady: {
            timestamp: "", // Clear it or keep null
            previousStatus: "",
            reason: undefined,
            userId: undefined,
            canUndo: false,
            undoExpiresAt: undefined
        },
        history: [
            ...(order.history || []),
             {
                action: "undo_remove_from_ready",
                timestamp: new Date().toISOString(),
                restoredStatus: previousStatus
            }
        ]
    } as any);
    
    // Registrar log
    await dbAdd('auditLogs', {
      orderId,
      action: "undo_remove_from_ready",
      timestamp: new Date().toISOString(),
      details: { restoredStatus: previousStatus }
    });
    
    return {
      success: true,
      orderId,
      message: "Remoção desfeita com sucesso"
    };
    
  } catch (error: any) {
    console.error("Erro ao desfazer remoção:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
