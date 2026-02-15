import seedData from '@/data/seed-data.json';
import { db } from '@/lib/db';

/**
 * Verifica se o banco já foi inicializado (seed executado)
 */
async function isDatabaseSeeded(): Promise<boolean> {
  try {
    // Verifica se existe uma flag de inicialização
    const config = await db.configuracoes.where('chave').equals('database_seeded').first();
    return config?.valor === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Marca o banco como inicializado
 */
async function markDatabaseAsSeeded(): Promise<void> {
  try {
    const configId = generateUUID();
    await db.configuracoes.put({
      id: configId,
      chave: 'database_seeded',
      valor: 'true',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[markDatabaseAsSeeded] Erro:', error);
  }
}

/**
 * Gera UUID v4 (compatível com qualquer ambiente)
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes sem crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Executa o seed do banco de dados (importa dados iniciais)
 */
export async function seedDatabase(): Promise<void> {
  try {
    console.log('[seedDatabase] Verificando se seed é necessário...');

    // Verifica se já foi executado
    const alreadySeeded = await isDatabaseSeeded();
    if (alreadySeeded) {
      console.log('[seedDatabase] Banco já inicializado. Seed não necessário.');
      return;
    }

    console.log('[seedDatabase] Iniciando importação de dados...');

    const now = new Date().toISOString();

    // ============================================
    // IMPORTAR PRODUTOS
    // ============================================
    const produtosComId = seedData.produtos.map((produto) => ({
      ...produto,
      id: generateUUID(),
      nome_sabor: produto.nome, // Mapeando 'nome' do JSON para 'nome_sabor' do banco
      created_at: now
    }));

    // Remove 'nome' já que o banco usa 'nome_sabor'
    const produtosProntos = produtosComId.map(({ nome, ...rest }) => rest);

    await db.produtos.bulkAdd(produtosProntos as any);
    console.log(`[seedDatabase] ✅ ${produtosProntos.length} produtos importados`);

    // ============================================
    // IMPORTAR CLIENTES
    // ============================================
    const clientesComId = seedData.clientes.map((cliente) => ({
      ...cliente,
      id: generateUUID(),
      created_at: now
    }));

    await db.clientes.bulkAdd(clientesComId as any);
    console.log(`[seedDatabase] ✅ ${clientesComId.length} clientes importados`);

    // ============================================
    // MARCAR COMO INICIALIZADO
    // ============================================
    await markDatabaseAsSeeded();
    console.log('[seedDatabase] ✅ Banco de dados inicializado com sucesso!');

  } catch (error) {
    console.error('[seedDatabase] ❌ Erro ao executar seed:', error);
    throw error;
  }
}

/**
 * Limpa todos os dados e executa seed novamente (uso: desenvolvimento/testes)
 */
export async function resetAndSeedDatabase(): Promise<void> {
  try {
    console.log('[resetAndSeedDatabase] Limpando banco...');
    
    await db.produtos.clear();
    await db.clientes.clear();
    await db.configuracoes.clear();
    
    console.log('[resetAndSeedDatabase] Executando seed...');
    await seedDatabase();
    
  } catch (error) {
    console.error('[resetAndSeedDatabase] Erro:', error);
    throw error;
  }
}
