import { db } from './db';
import { Table } from 'dexie';
import { syncEngine } from './sync-engine';

export type DbTable = 
  | 'clientes' 
  | 'produtos' 
  | 'pedidosPreVenda' 
  | 'registrosPosVenda' 
  | 'pagamentos' 
  | 'despesas' 
  | 'receitas'
  | 'scheduledOrders'
  | 'auditLogs'
  | 'notificationLogs'
  | 'configuracoes';

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic Helper to safely add an item to a table.
 * Agora implementa Dual-Write: salva localmente e enfileira para nuvem.
 */
export async function dbAdd<T extends { id: string | number }>(tableName: DbTable, data: T): Promise<OperationResult<T>> {
  try {
    const table = db[tableName] as Table<T, any>;
    await table.add(data);
    
    // Enfileira para a nuvem
    await syncEngine.enqueue('INSERT', tableName, data.id, data);
    
    return { success: true, data };
  } catch (error: any) {
    console.error(`[dbAdd] Error adding to ${tableName}:`, error);
    return { success: false, error: error.message || 'Unknown DB Error' };
  }
}

/**
 * Generic Helper to safely update an item.
 * Agora implementa Dual-Write: salva localmente e enfileira para nuvem.
 */
export async function dbUpdate<T>(tableName: DbTable, id: string | number, data: Partial<T>): Promise<OperationResult<null>> {
  try {
    const table = db[tableName] as Table<T, any>;
    await table.update(id, data);
    
    // Recupera o item inteiro para mandar pra nuvem (o supabase update com o JS client geralmente quer os campos mudados, 
    // mas o ideal é mandar o registro para facilitar. Aqui vamos mandar só os dados que mudaram, ou buscar completo.)
    // Para simplificar, como o supabase aceita partial no update, passamos o 'data' partial.
    await syncEngine.enqueue('UPDATE', tableName, id, data);

    return { success: true };
  } catch (error: any) {
    console.error(`[dbUpdate] Error updating ${tableName} with id ${id}:`, error);
    return { success: false, error: error.message || 'Unknown DB Error' };
  }
}

/**
 * Generic Helper to safely delete an item.
 * Agora implementa Dual-Write: apaga localmente e enfileira deleção para nuvem.
 */
export async function dbDelete(tableName: DbTable, id: string | number): Promise<OperationResult<null>> {
  try {
    const table = db[tableName];
    await table.delete(id);
    
    // Enfileira exclusão para a nuvem
    await syncEngine.enqueue('DELETE', tableName, id);
    
    return { success: true };
  } catch (error: any) {
    console.error(`[dbDelete] Error deleting from ${tableName} with id ${id}:`, error);
    return { success: false, error: error.message || 'Unknown DB Error' };
  }
}

/**
 * Bulk Add safely
 * Atenção: Em modo dual-write, se o bulkAdd não passar pela fila individualmente, pode dar inconsistência se a nuvem não tiver endpoint bulk.
 * Idealmente, deveríamos enfileirar um a um ou ter operação BULK_CREATE.
 * Por ora, vamos enfileirar um a um.
 */
export async function dbBulkAdd<T extends { id: string | number }>(tableName: DbTable, items: T[]): Promise<OperationResult<null>> {
  try {
    const table = db[tableName] as Table<T, any>;
    await table.bulkAdd(items);
    
    for (const item of items) {
      await syncEngine.enqueue('INSERT', tableName, item.id, item);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`[dbBulkAdd] Error in ${tableName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all items from a table safely
 */
export async function dbGetAll<T>(tableName: DbTable): Promise<T[]> {
  try {
    const table = db[tableName] as Table<T, any>;
    return await table.toArray();
  } catch (error) {
    console.error(`[dbGetAll] Error fetching ${tableName}:`, error);
    return [];
  }
}
