import { db } from './db';
import { Table } from 'dexie';

export type DbTable = 
  | 'clientes' 
  | 'produtos' 
  | 'pedidosPreVenda' 
  | 'registrosPosVenda' 
  | 'pagamentos' 
  | 'despesas' 
  | 'receitas';

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic Helper to safely add an item to a table.
 */
export async function dbAdd<T>(tableName: DbTable, data: T): Promise<OperationResult<T>> {
  try {
    const table = db[tableName] as Table<T, any>;
    await table.add(data);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[dbAdd] Error adding to ${tableName}:`, error);
    return { success: false, error: error.message || 'Unknown DB Error' };
  }
}

/**
 * Generic Helper to safely update an item.
 */
export async function dbUpdate<T>(tableName: DbTable, id: string, data: Partial<T>): Promise<OperationResult<null>> {
  try {
    const table = db[tableName] as Table<T, any>;
    await table.update(id, data);
    return { success: true };
  } catch (error: any) {
    console.error(`[dbUpdate] Error updating ${tableName} with id ${id}:`, error);
    return { success: false, error: error.message || 'Unknown DB Error' };
  }
}

/**
 * Generic Helper to safely delete an item.
 */
export async function dbDelete(tableName: DbTable, id: string): Promise<OperationResult<null>> {
  try {
    const table = db[tableName];
    await table.delete(id);
    return { success: true };
  } catch (error: any) {
    console.error(`[dbDelete] Error deleting from ${tableName} with id ${id}:`, error);
    return { success: false, error: error.message || 'Unknown DB Error' };
  }
}

/**
 * Bulk Add safely
 */
export async function dbBulkAdd<T>(tableName: DbTable, items: T[]): Promise<OperationResult<null>> {
  try {
    const table = db[tableName] as Table<T, any>;
    await table.bulkAdd(items);
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
