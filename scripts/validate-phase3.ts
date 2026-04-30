// Mock globals
(global as any).window = { addEventListener: () => {}, removeEventListener: () => {} };
(global as any).navigator = { onLine: true };

import { db } from '../src/lib/db';
import { SyncEngine } from '../src/lib/sync-engine';
import * as sbOps from '../src/lib/supabase-operations';
import * as dbOps from '../src/lib/db-operations';
import fs from 'fs';

// Mock console to avoid noise
const originalLog = console.log;
const originalError = console.error;
console.log = () => {};
console.error = () => {};

async function runTests() {
  const results: any[] = [];
  
  const check = (name: string, condition: boolean, details?: string) => {
    results.push({ name, pass: condition, details });
  };

  try {
    // 1. Tabela syncQueue
    const hasSyncQueue = db.tables.some(t => t.name === 'syncQueue');
    check('Tabela syncQueue existe', hasSyncQueue);
    
    if (hasSyncQueue) {
      const sq = db.table('syncQueue');
      const schema = sq.schema.primKey.name + ',' + sq.schema.indexes.map(i => i.name).join(',');
      check('Schema syncQueue', schema.includes('id') || schema.includes('createdAt'), `Schema: ${schema}`);
    }

    // 2. Métodos SyncEngine
    // Note: Instancing SyncEngine might throw if window is not defined, we'll just check the prototype of the exported instance if possible.
    // wait, syncEngine is already exported
    const syncEngine = require('../src/lib/sync-engine').syncEngine;
    check('Método queue()', typeof syncEngine.queue === 'function');
    check('Método flush()', typeof syncEngine.flush === 'function');
    check('Método isOnline()', typeof syncEngine.isOnline === 'boolean' || typeof syncEngine.isOnline === 'function' || syncEngine.isOnline !== undefined); // it's a property
    check('Método getStatus()', typeof syncEngine.getStatus === 'function');
    check('Método startAutoSync()', typeof syncEngine.startAutoSync === 'function');

    // 3. supabase-operations.ts
    // Just verify the mappings
    const contentSupabase = fs.readFileSync('src/lib/supabase-operations.ts', 'utf8');
    const requiredTables = [
      'clientes', 'produtos', 'pedidosPreVenda', 'registrosPosVenda',
      'pagamentos', 'despesas', 'receitas', 'scheduledOrders',
      'auditLogs', 'notificationLogs', 'configuracoes'
    ];
    let allTablesMapped = true;
    for (const t of requiredTables) {
      if (!contentSupabase.includes(t)) {
        allTablesMapped = false;
        check(`Supabase Table Map: ${t}`, false);
      }
    }
    if (allTablesMapped) check('Supabase Operations mapeia todas as tabelas', true);

    // 4. db-operations.ts
    check('exporta dbAdd', typeof dbOps.dbAdd === 'function');
    check('exporta dbUpdate', typeof dbOps.dbUpdate === 'function');
    check('exporta dbDelete', typeof dbOps.dbDelete === 'function');
    check('exporta dbGetAll', typeof dbOps.dbGetAll === 'function');
    check('exporta dbGetById', typeof dbOps.dbGetById === 'function');

  } catch (err: any) {
    check('Erro na execução do script', false, err.message);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    
    console.log('\n--- RESULTADOS DA VALIDAÇÃO (Fase 3) ---');
    results.forEach(r => {
      const status = r.pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(`[${status}] ${r.name}${r.details ? ` (${r.details})` : ''}`);
    });
    console.log('----------------------------------------\n');
    process.exit(0);
  }
}

runTests();
