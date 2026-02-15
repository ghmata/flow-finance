
import { db } from './db';

const STORAGE_KEY = 'pedidos-app-storage';

export async function migrateFromLocalStorage() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) return;

  try {
    const parsed = JSON.parse(rawData);
    // Zustand persists state inside a 'state' object
    const state = parsed.state;

    if (!state) return;

    // Check if migration already happened (or if DB is not empty)
    const count = await db.clientes.count();
    if (count > 0) {
      console.log('[Migration] Database already populated. Skipping migration.');
      return;
    }

    console.log('[Migration] Starting migration from localStorage...');

    await db.transaction('rw', db.clientes, db.produtos, db.pedidosPreVenda, db.registrosPosVenda, db.pagamentos, db.despesas, db.receitas, async () => {
      // Migrate Clientes
      if (state.clientes?.length > 0) {
        await db.clientes.bulkAdd(state.clientes);
        console.log(`[Migration] Migrated ${state.clientes.length} clientes`);
      }

      // Migrate Produtos
      if (state.produtos?.length > 0) {
        await db.produtos.bulkAdd(state.produtos);
        console.log(`[Migration] Migrated ${state.produtos.length} produtos`);
      }

      // Migrate Pedidos PreVenda
      if (state.pedidosPreVenda?.length > 0) {
        await db.pedidosPreVenda.bulkAdd(state.pedidosPreVenda);
        console.log(`[Migration] Migrated ${state.pedidosPreVenda.length} pedidosPreVenda`);
      }

      // Migrate Registros PosVenda
      if (state.registrosPosVenda?.length > 0) {
        await db.registrosPosVenda.bulkAdd(state.registrosPosVenda);
        console.log(`[Migration] Migrated ${state.registrosPosVenda.length} registrosPosVenda`);
      }

      // Migrate Pagamentos
      if (state.pagamentos?.length > 0) {
        await db.pagamentos.bulkAdd(state.pagamentos);
        console.log(`[Migration] Migrated ${state.pagamentos.length} pagamentos`);
      }

      // Migrate Despesas
      if (state.despesas?.length > 0) {
        await db.despesas.bulkAdd(state.despesas);
        console.log(`[Migration] Migrated ${state.despesas.length} despesas`);
      }

      // Migrate Receitas
      if (state.receitas?.length > 0) {
        await db.receitas.bulkAdd(state.receitas);
        console.log(`[Migration] Migrated ${state.receitas.length} receitas`);
      }
    });

    console.log('[Migration] Completed successfully.');
    // Keep localStorage as backup for Phase 1
    // localStorage.removeItem(STORAGE_KEY); 

  } catch (error) {
    console.error('[Migration] Failed:', error);
    // Transaction rollback handles data cleanup
  }
}
