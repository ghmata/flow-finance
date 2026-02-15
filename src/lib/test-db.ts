import { db } from './db';
import { dbAdd, dbGetAll, dbUpdate, dbDelete } from './db-operations';
import { migrateFromLocalStorage } from './db-migration';
import { useStore } from '../store/useStore';

export async function testDatabase() {
  console.group('🧪 Testing Database Foundation');

  try {
    // 1. Check Database Instance
    console.log('Checking DB instance...', db.isOpen() ? 'Open' : 'Closed (will open on access)');
    
    // 2. Test Migration (Idempotent)
    console.log('Testing Migration...');
    await migrateFromLocalStorage();
    
    // 3. Test CRUD on Clientes
    console.log('Testing CRUD: Clientes...');
    
    // Create
    const newCliente = {
      id: crypto.randomUUID(),
      nome: 'Test Cliente ' + Date.now(),
      created_at: new Date().toISOString().split('T')[0]
    };
    await dbAdd('clientes', newCliente);
    console.log('✅ Added cliente:', newCliente.id);

    // Read
    const clientes = await dbGetAll('clientes');
    console.log('✅ Fetched clientes:', clientes.length);
    const fetched = clientes.find(c => c.id === newCliente.id);
    if (!fetched) throw new Error('Cliente not found');

    // Update
    await dbUpdate('clientes', newCliente.id, { nome: newCliente.nome + ' (Updated)' });
    console.log('✅ Updated cliente');

    // Delete
    await dbDelete('clientes', newCliente.id);
    console.log('✅ Deleted cliente');

    console.log('🎉 Database Tests Completed Successfully!');
  } catch (err) {
    console.error('❌ Database Test Failed:', err);
  } finally {
    console.groupEnd();
  }
}

export async function testStoreIntegration() {
  console.group('🧪 Testing Store Integration');
  try {
    const store = useStore.getState();
    
    // 1. Init
    console.log('Initializing Store...');
    await store.init();
    console.log('✅ Store Initialized. Clientes count:', store.clientes.length);

    // 2. Add Cliente via Store
    const nome = 'Store Test Client ' + Date.now();
    console.log('Adding cliente via store:', nome);
    await store.addCliente(nome, '123456789', 'Obs');
    
    // Verify in Store
    const updatedStore = useStore.getState();
    const foundInStore = updatedStore.clientes.find(c => c.nome === nome);
    if (!foundInStore) throw new Error('Cliente not found in Store after add');
    console.log('✅ Found in Store:', foundInStore.id);

    // Verify in DB
    const foundInDb = await db.clientes.get(foundInStore.id);
    if (!foundInDb) throw new Error('Cliente not found in DB after store add');
    console.log('✅ Found in DB:', foundInDb.id);

    // 3. Delete via Store
    console.log('Deleting cliente via store...');
    await store.deleteCliente(foundInStore.id);
    
    // Verify
    const finalStore = useStore.getState();
    if (finalStore.clientes.find(c => c.id === foundInStore.id)) throw new Error('Cliente still in Store');
    const finalDb = await db.clientes.get(foundInStore.id);
    if (finalDb) throw new Error('Cliente still in DB');
    console.log('✅ Deleted successfully from both Store and DB');

    console.log('🎉 Store Integration Tests Completed Successfully!');
  } catch (err) {
    console.error('❌ Store Integration Test Failed:', err);
  } finally {
    console.groupEnd();
  }
}

// Attach to window for manual execution in console
(window as any).testFlowFinanceDB = testDatabase;
(window as any).testFlowFinanceStore = testStoreIntegration;
