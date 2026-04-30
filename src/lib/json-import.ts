import { z } from 'zod';
import { supabase } from './supabase';
import { sbInsert, sbGetAll, sbUpdate } from './supabase-operations';
import { syncEngine } from './sync-engine';
import { ImportReport } from './xlsx-import';
import DOMPurify from 'dompurify';

// --- Schemas Zod ---
const clienteSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1),
  telefone: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  created_at: z.string().optional()
});

const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  nome_sabor: z.string().min(1),
  preco_unitario: z.number(),
  ativo: z.boolean(),
  created_at: z.string().optional()
});

const pedidoItemSchema = z.object({
  produto_id: z.string().catch('unknown'),
  produto_nome: z.string().catch('Produto'),
  quantidade: z.number().catch(1),
  preco_unitario: z.number().catch(0),
  subtotal: z.number().catch(0)
}).passthrough();

const pedidoSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid(),
  produto_id: z.string().optional().nullable(),
  quantidade: z.number().optional().nullable(),
  valor_unitario: z.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  itens: z.any().default([]),
  valor_total: z.number().catch(0),
  valor_pago: z.number().optional().nullable(),
  status: z.string().catch('pendente'),
  data_pedido: z.string(),
  data_entrega: z.string().optional().nullable(),
  data_pagamento: z.string().optional().nullable(),
  forma_pagamento: z.string().optional().nullable(),
  history: z.any().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  removedFromReady: z.boolean().optional().nullable()
}).passthrough();

const registroSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid(),
  descricao: z.string().catch('Registro Importado'),
  quantidade: z.number().catch(1),
  itens: z.any().default([]),
  valor_total: z.number().catch(0),
  valor_pago: z.number().optional().nullable(),
  status: z.string().catch('concluido'),
  data_registro: z.string(),
  data_pagamento: z.string().optional().nullable(),
  forma_pagamento: z.string().optional().nullable()
}).passthrough();

const pagamentoSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.string(),
  referencia_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  // Retrocompatibilidade: backups antigos usam "valor", novos usam "valor_pago".
  // O transform normaliza a saída sempre para "valor_pago".
  valor_pago: z.number().optional(),
  valor: z.number().optional(),
  forma_pagamento: z.string(),
  data_pagamento: z.string()
}).transform((data) => {
  const valorFinal = data.valor_pago ?? data.valor ?? 0;
  const { valor: _v, ...rest } = data;
  return { ...rest, valor_pago: valorFinal };
});

const despesaReceitaSchema = z.object({
  id: z.string().uuid().optional(),
  categoria: z.string(),
  descricao: z.string(),
  valor: z.number(),
  data_despesa: z.string().optional(),
  data_receita: z.string().optional(),
  origem: z.string().optional(),
  status: z.string().optional()
});

const scheduledOrderSchema = z.object({
  orderId: z.string().uuid(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  timezone: z.string(),
  status: z.string(),
  notifications: z.any().optional(),
  autoMoveToReady: z.boolean().optional(),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  customer: z.any().optional(),
  items: z.any().optional(),
  total: z.number().optional(),
  address: z.string().optional(),
  rescheduled: z.any().optional(),
  cancelledAt: z.string().optional(),
  cancelReason: z.string().optional(),
  movedToReadyAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  deliveredBy: z.string().optional()
});

const auditLogSchema = z.object({
  id: z.number().optional(),
  orderId: z.string().optional(),
  action: z.string(),
  userId: z.string().optional(),
  timestamp: z.string(),
  reason: z.string().optional(),
  details: z.any().optional()
});

const notificationLogSchema = z.object({
  id: z.number().optional(),
  orderId: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  priority: z.string(),
  data: z.any().optional(),
  sentAt: z.string(),
  status: z.string(),
  error: z.string().optional(),
  retryCount: z.number().optional(),
  externalId: z.string().optional()
});

const configuracaoSchema = z.object({
  id: z.string().uuid().optional(),
  chave: z.string(),
  valor: z.string(),
  created_at: z.string().optional()
});

const sanitizeString = (str: string) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '');
};

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

export async function importJsonToSupabase(file: File): Promise<ImportReport[]> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("O arquivo JSON excede o limite de 20MB.");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");

  const text = await file.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error("Arquivo JSON inválido ou corrompido.");
  }

  if (!data.tables || typeof data.tables !== 'object') {
    throw new Error("Formato de backup JSON não reconhecido. Certifique-se de que é um arquivo exportado pelo sistema.");
  }

  const reports: ImportReport[] = [];

  // Mapa de IDs antigos → novos para remapear foreign keys entre tabelas.
  // Quando um registro é importado para uma conta diferente da original,
  // o ID é regenerado e o mapeamento é armazenado aqui.
  const idMap = new Map<string, string>();

  const processTable = async (
    tableName: string, 
    schema: z.ZodTypeAny,
    fkFields: string[] = [],
    nestedFkFields?: Record<string, string[]>,
    pkField: string = 'id'
  ) => {
    const rawData = data.tables[tableName];
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return;

    if (rawData.length > 20000) {
      throw new Error(`A tabela ${tableName} excede o limite de 20.000 registros.`);
    }

    let imported = 0;
    let errors = 0;
    let skipped = 0;

    // sbGetAll retorna apenas registros do usuário atual (filtrado por RLS)
    let existingRecords: any[] = [];
    try {
      existingRecords = await sbGetAll(tableName);
    } catch(e) {
      // ignore - tabela pode estar vazia
    }
    const existingIds = new Set(existingRecords.map(r => r[pkField]));

    const batchSize = 50;
    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      
      for (const rawRow of batch) {
        try {
          const mappedRow = { ...rawRow };

          for (const key of Object.keys(mappedRow)) {
            if (typeof mappedRow[key] === 'string') {
              mappedRow[key] = sanitizeString(mappedRow[key]);
            }
            mappedRow[key] = parseJsonField(mappedRow[key]);
          }

          const validData = schema.parse(mappedRow);
          
          // Garantir que existe um PK
          if (!validData[pkField] && !['scheduledOrders', 'auditLogs', 'notificationLogs'].includes(tableName)) {
            validData[pkField] = crypto.randomUUID();
          }

          const originalPk = validData[pkField];

          // Remapear campos FK usando o mapa de IDs (cross-user)
          for (const fk of fkFields) {
            if (validData[fk] && idMap.has(validData[fk])) {
              validData[fk] = idMap.get(validData[fk])!;
            }
          }

          // Remapear FKs dentro de arrays aninhados (ex: itens[].produto_id)
          if (nestedFkFields) {
            for (const [arrayField, fields] of Object.entries(nestedFkFields)) {
              if (Array.isArray(validData[arrayField])) {
                validData[arrayField] = validData[arrayField].map((item: any) => {
                  const remapped = { ...item };
                  for (const fk of fields) {
                    if (remapped[fk] && idMap.has(remapped[fk])) {
                      remapped[fk] = idMap.get(remapped[fk])!;
                    }
                  }
                  return remapped;
                });
              }
            }
          }

          // Decisão: manter ID original (same-user) ou gerar novo (cross-user)
          if (originalPk && existingIds.has(originalPk)) {
            // O registro pertence ao usuário atual → atualizar
            await sbUpdate(tableName, originalPk, validData);
            imported++;
          } else {
            // Registro de outro usuário ou novo → gerar novo ID
            // Se o PK já foi remapeado como FK (ex: scheduledOrders.orderId),
            // usar o valor remapeado em vez de gerar outro
            if (validData[pkField] === originalPk) {
              const newPk = crypto.randomUUID();
              if (originalPk) idMap.set(originalPk, newPk);
              validData[pkField] = newPk;
            } else if (originalPk) {
              // PK foi alterado pelo remapeamento de FK → usar valor remapeado
              idMap.set(originalPk, validData[pkField]);
            }

            await sbInsert(tableName, validData);
            imported++;
            existingIds.add(validData[pkField]);
          }
        } catch (error) {
          errors++;
        }
      }
    }

    reports.push({ tabela: tableName, imported, errors, skipped });
  };

  // Processamento SEQUENCIAL respeitando dependências de FK
  // Fase 1: Tabelas raiz (sem FK)
  await processTable('clientes', clienteSchema);
  await processTable('produtos', produtoSchema);

  // Fase 2: Tabelas com FK para clientes/produtos
  await processTable('pedidosPreVenda', pedidoSchema,
    ['cliente_id'],
    { 'itens': ['produto_id'] }
  );
  await processTable('registrosPosVenda', registroSchema,
    ['cliente_id'],
    { 'itens': ['produto_id'] }
  );

  // Fase 3: Tabelas com FK para pedidos/registros
  await processTable('pagamentos', pagamentoSchema,
    ['cliente_id', 'referencia_id']
  );

  // Fase 4: Tabelas financeiras
  await processTable('despesas', despesaReceitaSchema);
  await processTable('receitas', despesaReceitaSchema,
    ['referencia_pagamento_id']
  );

  // Fase 5: Tabelas de agendamento (orderId é FK para pedidosPreVenda.id)
  await processTable('scheduledOrders', scheduledOrderSchema,
    ['orderId'], undefined, 'orderId'
  );
  await processTable('auditLogs', auditLogSchema,
    ['orderId']
  );
  await processTable('notificationLogs', notificationLogSchema,
    ['orderId']
  );

  // Fase 6: Configurações
  await processTable('configuracoes', configuracaoSchema);

  if (navigator.onLine) {
    try {
      await syncEngine.pullFromCloud();
    } catch(e) {
      console.warn("Falha no pullFromCloud");
    }
  }

  return reports;
}
