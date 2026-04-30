import * as xlsx from 'xlsx';
import { z } from 'zod';
import { supabase } from './supabase';
import { sbInsert, sbGetAll, sbUpdate } from './supabase-operations';
import { syncEngine } from './sync-engine';
import DOMPurify from 'dompurify'; // Usaremos para sanitizar

export type ImportReport = {
  tabela: string;
  imported: number;
  errors: number;
  skipped: number;
};

// --- Schemas Zod para TODAS as tabelas ---

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
  produto_id: z.string(),
  produto_nome: z.string(),
  quantidade: z.number(),
  preco_unitario: z.number(),
  subtotal: z.number()
});

const pedidoSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid(),
  itens: z.array(pedidoItemSchema).optional().nullable(),
  valor_total: z.number(),
  valor_pago: z.number().optional().nullable(),
  status: z.string(),
  data_pedido: z.string(),
  data_entrega: z.string().optional().nullable(),
  data_pagamento: z.string().optional().nullable(),
  forma_pagamento: z.string().optional().nullable(),
  history: z.any().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  removedFromReady: z.boolean().optional().nullable()
});

const registroSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid(),
  itens: z.array(pedidoItemSchema).optional().nullable(),
  valor_total: z.number(),
  valor_pago: z.number().optional().nullable(),
  status: z.string(),
  data_registro: z.string(),
  data_pagamento: z.string().optional().nullable(),
  forma_pagamento: z.string().optional().nullable()
});

const pagamentoSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.string(),
  referencia_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  // Retrocompatibilidade: planilhas antigas exportam "valor", novas exportam "valor_pago".
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
  autoMoveToReady: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  customer: z.any().optional(),
  items: z.any().optional(),
  total: z.number(),
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

// Sanitização básica XSS
const sanitizeString = (str: string) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '');
};

// Funções utilitárias

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function importXlsxToSupabase(file: File): Promise<ImportReport[]> {
  // Limite de 10MB
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("O arquivo excede o limite de 10MB.");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");

  const arrayBuffer = await file.arrayBuffer();
  let workbook: xlsx.WorkBook;
  try {
    workbook = xlsx.read(arrayBuffer, { type: 'array' });
  } catch (err) {
    throw new Error("Arquivo corrompido ou formato inválido.");
  }

  const reports: ImportReport[] = [];

  const processSheet = async (
    sheetName: string, 
    tableName: string, 
    schema: z.ZodTypeAny,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapperFn?: (row: any) => any
  ) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    const rawData = xlsx.utils.sheet_to_json(ws);
    if (!rawData || rawData.length === 0) return;

    if (rawData.length > 10000) {
      throw new Error(`A planilha ${sheetName} excede o limite de 10.000 registros.`);
    }

    let imported = 0;
    let errors = 0;
    let skipped = 0;

    // Buscar IDs existentes para deduplicação (usando sbGetAll)
    let existingRecords: any[] = [];
    try {
      existingRecords = await sbGetAll(tableName);
    } catch(e) {
      // Ignorar caso a tabela esteja vazia ou erro
    }
    const existingIds = new Set(existingRecords.map(r => r.id || r.orderId));

    const batchSize = 50;
    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const rawRow of batch as any[]) {
        try {
          let mappedRow = mapperFn ? mapperFn(rawRow) : { ...rawRow };

          // Sanitização XSS e JSON parse
          for (const key of Object.keys(mappedRow)) {
            if (typeof mappedRow[key] === 'string') {
              mappedRow[key] = sanitizeString(mappedRow[key]);
            }
            mappedRow[key] = parseJsonField(mappedRow[key]);
          }

          const validData = schema.parse(mappedRow);
          
          if (!validData.id && tableName !== 'scheduled_orders' && tableName !== 'audit_logs' && tableName !== 'notification_logs') {
             validData.id = crypto.randomUUID();
          }

          const pk = validData.id || validData.orderId;

          if (pk && existingIds.has(pk)) {
            // Deduplicado: Faz update se já existir
            await sbUpdate(tableName, pk, validData);
            imported++;
          } else {
            await sbInsert(tableName, validData);
            imported++;
            if (pk) existingIds.add(pk);
          }
        } catch (error) {
          errors++;
        }
      }
    }

    reports.push({ tabela: tableName, imported, errors, skipped });
  };

  // Mapeadores para os cabeçalhos humanos gerados no backup da Fase 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapClientes = (r: any) => ({
    id: r.id,
    nome: r['Nome'] || r.nome,
    telefone: r['Telefone'] || r.telefone,
    observacoes: r['Observacoes'] || r.observacoes,
    created_at: r['Data Cadastro'] || r.created_at
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapProdutos = (r: any) => ({
    id: r.id,
    nome_sabor: r['Sabor'] || r.nome_sabor,
    preco_unitario: typeof r['Preço Unitário'] === 'number' ? r['Preço Unitário'] : (parseFloat(String(r['Preço Unitário'] || r.preco_unitario).replace('R$', '').trim().replace(',', '.')) || 0),
    ativo: r['Ativo'] === 'Sim' || r.ativo === true,
    created_at: r['Data Cadastro'] || r.created_at
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapPedidos = (r: any) => ({
    id: r.Pedido || r.id,
    cliente_id: r.cliente_id || crypto.randomUUID(), // Falha aqui no mock sem cliente_id, mas para compatibilidade
    valor_total: r['Valor Total Pedido'] || r.valor_total || 0,
    status: r.Status || r.status || 'pendente',
    data_pedido: r['Data Pedido'] || r.data_pedido || new Date().toISOString(),
    history: r['Histórico de Status'] || r.history,
    itens: r.itens
  });

  // A (paralelo): clientes + produtos
  await Promise.all([
    processSheet('Clientes', 'clientes', clienteSchema, mapClientes),
    processSheet('Produtos', 'produtos', produtoSchema, mapProdutos)
  ]);

  // B: pedidos_pre_venda + registros_pos_venda
  await processSheet('Pedidos (Pré-Venda)', 'pedidosPreVenda', pedidoSchema, mapPedidos);
  await processSheet('Vendas (Pós-Venda)', 'registrosPosVenda', registroSchema);

  // C: pagamentos
  await processSheet('Pagamentos', 'pagamentos', pagamentoSchema);

  // D (paralelo): despesas + receitas
  await Promise.all([
    processSheet('Despesas', 'despesas', despesaReceitaSchema),
    processSheet('Receitas', 'receitas', despesaReceitaSchema)
  ]);

  // E (paralelo): scheduled_orders + audit_logs + notification_logs
  await Promise.all([
    processSheet('Agendamentos', 'scheduledOrders', scheduledOrderSchema),
    processSheet('AuditLogs', 'auditLogs', auditLogSchema),
    processSheet('NotificationLogs', 'notificationLogs', notificationLogSchema)
  ]);

  // F: configuracoes
  await processSheet('Configuracoes', 'configuracoes', configuracaoSchema);

  if (navigator.onLine) {
    try {
      await syncEngine.pullFromCloud();
    } catch(e) {
      console.warn("Falha no pullFromCloud");
    }
  }

  return reports;
}
