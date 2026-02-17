
// Imports fixed below
import { scheduleOrder as schedule, getTodayScheduledOrders as getToday } from '@/services/schedulingService';
import { removeFromReadyForDelivery as remove, undoRemoveFromReady as undo } from '@/services/orderService';
import { db } from '@/lib/db';

export async function verifySchedulingLogic() {
    console.group('🧪 Verifying Scheduling Logic');
    try {
        // 1. Create a dummy order
        const orderId = `TEST-${Date.now()}`;
        await db.pedidosPreVenda.put({
            id: orderId,
            cliente_id: 'cust_123',
            status: 'pendente',
            data_pedido: new Date().toISOString(),
            itens: [],
            valor_total: 100,
            observacoes: 'Test Order'
        });
        console.log('✅ Created dummy order:', orderId);

        // 2. Schedule it
        const today = new Date().toISOString().split('T')[0];
        const resSchedule = await schedule(orderId, today, '14:00', { userId: 'tester' });
        if (!resSchedule.success) throw new Error(resSchedule.error);
        console.log('✅ Scheduled order:', resSchedule);

        // 3. Verify in DB
        const scheduled = await db.scheduledOrders.get(orderId);
        if (!scheduled) throw new Error('Scheduled order not found in DB');
        console.log('✅ Verified in DB');

        // 4. Test Remove from Ready (simulate move first)
        await db.pedidosPreVenda.update(orderId, { status: 'pronta_entrega' });
        const resRemove = await remove(orderId, 'tester', 'Testing removal');
        if (!resRemove.success) throw new Error(resRemove.error);
        console.log('✅ Removed from ready:', resRemove);

        // 5. Test Undo
        const resUndo = await undo(orderId);
        if (!resUndo.success) throw new Error(resUndo.error);
        console.log('✅ Undid removal:', resUndo);

        console.log('🎉 Scheduling Logic Verified!');
    } catch (err) {
        console.error('❌ Verification Failed:', err);
    } finally {
        console.groupEnd();
    }
}

// Attach to window
(window as any).verifyScheduling = verifySchedulingLogic;
