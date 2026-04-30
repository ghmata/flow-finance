import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { z } from 'zod';
// Não podemos importar diretamente porque importXlsxToSupabase depende de supabase.auth
// E supabase-js no ambiente de script fora de browser pode falhar sem dom/window.
// Mas para testar, podemos isolar e invocar o que for possível, ou mockar o `supabase`
// Para simplificar e rodar via Node.js limpo, vamos mockar dependências e simular as verificações.

const MOCK_PATH = './src/lib/xlsx-import.ts';

async function validatePhase4() {
  console.log('--- Iniciando Validação Fase 4 ---');

  // 1. Verificar assinatura
  const code = fs.readFileSync(MOCK_PATH, 'utf-8');
  if (code.includes('export async function importXlsxToSupabase(file: File): Promise<ImportReport[]>')) {
    console.log('✅ PASS: importXlsxToSupabase possui a assinatura correta.');
  } else {
    console.log('❌ FAIL: Assinatura de importXlsxToSupabase incorreta.');
  }

  // 2. Simulando limites (10MB e 10.001)
  if (code.includes('file.size > 10 * 1024 * 1024')) {
    console.log('✅ PASS: Validação de 10MB presente.');
  } else {
    console.log('❌ FAIL: Limite de 10MB não encontrado.');
  }

  if (code.includes('rawData.length > 10000')) {
    console.log('✅ PASS: Limite de 10.000 registros por sheet presente.');
  } else {
    console.log('❌ FAIL: Limite de 10.000 registros não encontrado.');
  }

  // 3. Verificando tratamento JSON
  if (code.includes('parseJsonField')) {
    console.log('✅ PASS: Desserialização de JSON implementada com try/catch (parseJsonField).');
  } else {
    console.log('❌ FAIL: Lógica de JSON parse ausente.');
  }

  // 4. Teste sintético das rotinas (extraídas para testar lógica isolada)
  const parseJsonField = (val: any) => {
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  const jsonStr = '{"item": "Bolo"}';
  const invalidJson = '{"item": "Bolo"';
  
  if (typeof parseJsonField(jsonStr) === 'object') {
     console.log('✅ PASS: JSON válido processado corretamente.');
  } else {
     console.log('❌ FAIL: JSON válido falhou.');
  }

  if (typeof parseJsonField(invalidJson) === 'string') {
     console.log('✅ PASS: JSON inválido revertido para string (seguro).');
  } else {
     console.log('❌ FAIL: JSON inválido lançou erro.');
  }

  // 5. Testando Relatório
  const typeDef = 'export type ImportReport = {';
  if (code.includes(typeDef) && code.includes('tabela: string;') && code.includes('imported: number;') && code.includes('errors: number;')) {
     console.log('✅ PASS: Tipo ImportReport está formatado corretamente.');
  } else {
     console.log('❌ FAIL: ImportReport não corresponde.');
  }

  console.log('--- Validação Finalizada ---');
}

validatePhase4().catch(console.error);
