export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  observacoes?: string;
  created_at: string;
}

export interface Produto {
  id: string;
  nome_sabor: string;
  preco_unitario: number;
  ativo: boolean;
  created_at: string;
}

export interface PedidoItem {
  id: string;
  produto_id: string;
  produto_nome: string; // Denormalized for easier display/history
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  paidAt?: string | null;      // NEW: Granular payment status
  deliveredAt?: string | null; // NEW: Granular delivery status
}

export interface PedidoPreVenda {
  id: string;
  cliente_id: string;
  // Legacy fields (kept optional for types, but migration will move data to itens)
  produto_id?: string;
  quantidade?: number;
  valor_unitario?: number;
  
  itens: PedidoItem[];
  valor_total: number;
  valor_pago?: number; // Total amount paid so far
  status: 'pendente' | 'entregue' | 'pago' | 'parcial' | 'agendado' | 'cancelado' | 'pronta_entrega' | 'em_preparacao'; // Extended status
  data_pedido: string;
  data_entrega?: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  observacoes?: string;
  
  // New fields for scheduling/ready flow
  scheduledDate?: string;
  scheduledTime?: string;
  removedFromReady?: {
    timestamp: string;
    previousStatus: string;
    reason?: string;
    userId?: string;
    canUndo: boolean;
    undoExpiresAt?: string;
  };
  history?: Array<{
    action: string;
    timestamp: string;
    userId?: string;
    reason?: string;
    [key: string]: any;
  }>;
}

export interface RegistroPosVenda {
  id: string;
  cliente_id: string;
  descricao: string; // Keep for general description or legacy
  
  itens: PedidoItem[];
  quantidade: number; // Total quantity (sum of items) or legacy
  valor_total: number;
  valor_pago?: number; // Total amount paid so far
  status: 'aberto' | 'pago' | 'parcial';
  data_registro: string;
  data_pagamento?: string;
  forma_pagamento?: string;
}

export interface Pagamento {
  id: string;
  tipo: 'prevenda' | 'posvenda';
  referencia_id: string;
  cliente_id: string;
  valor_pago: number;
  forma_pagamento: string;
  data_pagamento: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_despesa: string;
  status: 'pendente' | 'paga';
  data_pagamento?: string;
  forma_pagamento?: string;
  observacoes?: string;
  created_at?: string; // New field for precise sorting
}

export interface Receita {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_receita: string;
  origem: 'manual' | 'pagamento';
  referencia_pagamento_id?: string;
  forma_recebimento?: string;
  observacoes?: string;
  created_at?: string; // New field for precise sorting
}

// NEW INTERFACES FOR SCHEDULING & LOGS

export interface ScheduledOrder {
  orderId: string; // References PedidoPreVenda.id
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  timezone: string;
  status: 'scheduled' | 'ready_for_delivery' | 'delivered' | 'cancelled';
  notifications: {
    dayBefore: { sent: boolean; sentAt?: string; method: string };
    morningOf: { sent: boolean; sentAt?: string };
    oneHourBefore: { sent: boolean; sentAt?: string };
  };
  autoMoveToReady: boolean;
  createdAt: string;
  createdBy?: string;
  customer: {
    id: string;
    name: string;
    phone?: string;
  };
  items: PedidoItem[];
  total: number;
  address?: string; // If applicable
  
  rescheduled?: {
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    reason?: string;
    timestamp: string;
  };
  cancelledAt?: string;
  cancelReason?: string;
  movedToReadyAt?: string;
  deliveredAt?: string;
  deliveredBy?: string;
}

export interface AuditLog {
  id?: number; // Auto-incremented
  orderId?: string;
  action: string;
  userId?: string; // If we implement auth later
  timestamp: string;
  reason?: string;
  details?: any; // JSON object for extra data (dataBefore, dataAfter, etc)
}

export interface NotificationLog {
  id?: number; // Auto-incremented
  orderId: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  data?: any;
  sentAt: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  retryCount?: number;
  externalId?: string;
}


export const CATEGORIAS_DESPESA = [
  { nome: 'Ingredientes', emoji: '🥚' },
  { nome: 'Embalagens', emoji: '📦' },
  { nome: 'Transporte', emoji: '🚗' },
  { nome: 'Aluguel', emoji: '🏠' },
  { nome: 'Energia', emoji: '💡' },
  { nome: 'Água', emoji: '💧' },
  { nome: 'Internet', emoji: '📡' },
  { nome: 'Marketing', emoji: '📢' },
  { nome: 'Equipamentos', emoji: '🔧' },
  { nome: 'Mão de obra', emoji: '👷' },
  { nome: 'Impostos', emoji: '📝' },
  { nome: 'Outras', emoji: '📌' },
] as const;

export const CATEGORIAS_RECEITA = [
  { nome: 'Venda de produtos', emoji: '💰' },
  { nome: 'Serviços', emoji: '⚙️' },
  { nome: 'Outras receitas', emoji: '💵' },
] as const;

export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Transferência'] as const;

export interface DevedorAgrupado {
  cliente: Cliente;
  itens: Array<{
    tipo: 'prevenda' | 'posvenda';
    id: string;
    itemId?: string; // New: for granular actions
    descricao: string;
    valor: number;
    dias: number;
    data: string;
    paidAt?: string | null; // New: to show status in UI
  }>;
  total: number;
}
