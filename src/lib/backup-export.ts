import { db } from './db';
import * as xlsx from 'xlsx-js-style';

// Utilitário para evitar CSV injection ou erros de formatação
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeCsv = (val: any) => {
  if (typeof val === 'string') {
    if (val.match(/^[=+\-@]/)) {
      return "'" + val;
    }
    return val;
  }
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
};

// Formatador de datas para DD/MM/AAAA e HH:MM (se aplicável)
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  if (dateStr.includes('T') && (hours !== '00' || minutes !== '00')) {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  
  return `${day}/${month}/${year}`;
};

// Formatador legível para o histórico do pedido
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatHistory = (historyData: any): string => {
  if (!historyData) return '';
  try {
    const parsed = typeof historyData === 'string' ? JSON.parse(historyData) : historyData;
    if (Array.isArray(parsed)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((h: any) => `${String(h.status).toUpperCase()} (${formatDate(h.timestamp)})`).join(' -> ');
    }
    return String(parsed);
  } catch(e) {
    return String(historyData);
  }
};

// Formatador legível para as notificações de agendamentos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatNotifications = (notifData: any): string => {
   if (!notifData) return 'Não enviado';
   try {
     const parsed = typeof notifData === 'string' ? JSON.parse(notifData) : notifData;
     if (parsed.delivery && parsed.delivery.sent) return 'Aviso de Entrega Enviado';
     if (parsed.pickup && parsed.pickup.sent) return 'Aviso de Retirada Enviado';
     return 'Pendente';
   } catch(e) {
     return String(notifData);
   }
};

// Formatador legível para os reagendamentos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatRescheduled = (reschData: any): string => {
  if (!reschData) return 'Não';
  try {
     const parsed = typeof reschData === 'string' ? JSON.parse(reschData) : reschData;
     if (parsed.isRescheduled) {
       return `Sim (Era ${formatDate(parsed.originalDate)} às ${parsed.originalTime})`;
     }
     return 'Não';
  } catch(e) {
    return 'Não';
  }
};

// Função auxiliar para aplicar estilos e larguras nas planilhas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyStylesAndWidths = (ws: xlsx.WorkSheet, data: any[]) => {
  if (data.length === 0) return;

  const cols: { wch: number }[] = [];
  const keys = Object.keys(data[0]);

  keys.forEach((key, i) => {
    cols[i] = { wch: key.length + 2 }; // Largura inicial baseada no nome da coluna
  });

  const cellStyle = {
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
  };

  const headerStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
  };

  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

  for (let C = range.s.c; C <= range.e.c; ++C) {
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = { c: C, r: R };
      const cellRef = xlsx.utils.encode_cell(cellAddress);
      const cell = ws[cellRef];

      if (!cell) continue;

      cell.s = R === 0 ? headerStyle : cellStyle;

      const cellTextLength = cell.v ? String(cell.v).length : 0;
      if (cellTextLength + 2 > cols[C].wch) {
        cols[C].wch = cellTextLength + 2;
      }
    }
  }

  // Define um limite máximo para não ficar extremamente largo
  cols.forEach(col => {
    if (col.wch > 60) col.wch = 60; 
  });

  ws['!cols'] = cols;
};

export async function exportDatabaseAsJson() {
  const data = {
    metadata: {
      version: 1,
      exportDate: new Date().toISOString(),
      totalRecords: 0,
      appVersion: '1.0.0'
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tables: {} as Record<string, any[]>
  };

  const tables = [
    'clientes', 'produtos', 'pedidosPreVenda', 'registrosPosVenda',
    'pagamentos', 'despesas', 'receitas', 'scheduledOrders',
    'auditLogs', 'notificationLogs', 'configuracoes'
  ];

  let total = 0;
  for (const table of tables) {
    const records = await db.table(table).toArray();
    data.tables[table] = records;
    total += records.length;
  }
  data.metadata.totalRecords = total;

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 15);
  a.href = url;
  a.download = `flow-finance-backup-${dateStr}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function exportDataAsXlsx() {
  const wb = xlsx.utils.book_new();

  // Removido logs e configuracoes conforme solicitado
  const tables = [
    'clientes', 'produtos', 'pedidosPreVenda', 'registrosPosVenda',
    'pagamentos', 'despesas', 'receitas', 'scheduledOrders'
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbData: Record<string, any[]> = {};
  for (const table of tables) {
    dbData[table] = await db.table(table).toArray();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addSheet = (data: any[], name: string) => {
    if(data.length === 0) {
        data = [{ 'Aviso': 'Nenhum dado encontrado' }];
    }
    const ws = xlsx.utils.json_to_sheet(data);
    applyStylesAndWidths(ws, data);
    xlsx.utils.book_append_sheet(wb, ws, name);
  };

  // 1. Resumo
  const resumoData = [
    { Indicador: 'Data do Export', Valor: formatDate(new Date().toISOString()) },
    ...tables.map(t => ({ Indicador: `Total ${t}`, Valor: dbData[t].length }))
  ];
  addSheet(resumoData, 'Resumo');

  // 2. Clientes
  const clientesSheet = dbData.clientes.map(c => ({
    Nome: sanitizeCsv(c.nome),
    Telefone: sanitizeCsv(c.telefone),
    Observacoes: sanitizeCsv(c.observacoes),
    'Data Cadastro': formatDate(c.created_at)
  }));
  addSheet(clientesSheet, 'Clientes');

  // 3. Produtos
  const produtosSheet = dbData.produtos.map(p => ({
    Sabor: sanitizeCsv(p.nome_sabor),
    'Preço Unitário': p.preco_unitario,
    Ativo: p.ativo ? 'Sim' : 'Não',
    'Data Cadastro': formatDate(p.created_at)
  }));
  addSheet(produtosSheet, 'Produtos');

  // 4. Pedidos (Pré-Venda)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidosPreVendaSheet: any[] = [];
  dbData.pedidosPreVenda.forEach(p => {
    const cliente = dbData.clientes.find(c => c.id === p.cliente_id)?.nome || 'Desconhecido';
    const removidoStatus = p.removedFromReady ? 'Sim' : 'Não';

    if (p.itens && p.itens.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.itens.forEach((item: any) => {
        pedidosPreVendaSheet.push({
          Pedido: p.id,
          Cliente: sanitizeCsv(cliente),
          Item: sanitizeCsv(item.produto_nome),
          Quantidade: item.quantidade,
          'Subtotal Item': item.subtotal,
          'Valor Total Pedido': p.valor_total,
          'Valor Pago Pedido': p.valor_pago || 0,
          Status: String(p.status).toUpperCase(),
          'Data Pedido': formatDate(p.data_pedido),
          'Data Entrega': formatDate(p.data_entrega),
          'Histórico de Status': formatHistory(p.history),
          'Retirado Pronta Entrega': removidoStatus
        });
      });
    } else {
        pedidosPreVendaSheet.push({
          Pedido: p.id,
          Cliente: sanitizeCsv(cliente),
          Item: 'Sem itens',
          Quantidade: p.quantidade || 0,
          'Subtotal Item': p.valor_unitario || 0,
          'Valor Total Pedido': p.valor_total,
          'Valor Pago Pedido': p.valor_pago || 0,
          Status: String(p.status).toUpperCase(),
          'Data Pedido': formatDate(p.data_pedido),
          'Data Entrega': formatDate(p.data_entrega),
          'Histórico de Status': formatHistory(p.history),
          'Retirado Pronta Entrega': removidoStatus
        });
    }
  });
  addSheet(pedidosPreVendaSheet, 'Pedidos (Pré-Venda)');

  // 5. Vendas (Pós-Venda)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posVendaSheet: any[] = [];
  dbData.registrosPosVenda.forEach(p => {
    const cliente = dbData.clientes.find(c => c.id === p.cliente_id)?.nome || 'Desconhecido';
    if (p.itens && p.itens.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.itens.forEach((item: any) => {
        posVendaSheet.push({
          Registro: p.id,
          Cliente: sanitizeCsv(cliente),
          Item: sanitizeCsv(item.produto_nome),
          Quantidade: item.quantidade,
          'Subtotal Item': item.subtotal,
          'Valor Total Registro': p.valor_total,
          Status: String(p.status).toUpperCase(),
          Data: formatDate(p.data_registro)
        });
      });
    } else {
        posVendaSheet.push({
          Registro: p.id,
          Cliente: sanitizeCsv(cliente),
          Descrição: sanitizeCsv(p.descricao),
          Quantidade: p.quantidade || 0,
          'Subtotal Item': p.valor_total,
          'Valor Total Registro': p.valor_total,
          Status: String(p.status).toUpperCase(),
          Data: formatDate(p.data_registro)
        });
    }
  });
  addSheet(posVendaSheet, 'Vendas (Pós-Venda)');

  // 6. Pagamentos
  const pagamentosSheet = dbData.pagamentos.map(p => ({
    Tipo: String(p.tipo).toUpperCase(),
    Cliente: sanitizeCsv(dbData.clientes.find(c => c.id === p.cliente_id)?.nome || 'Desconhecido'),
    Valor: p.valor_pago,
    'Forma Pgto': sanitizeCsv(p.forma_pagamento),
    Data: formatDate(p.data_pagamento)
  }));
  addSheet(pagamentosSheet, 'Pagamentos');

  // 7. Despesas
  const despesasSheet = dbData.despesas.map(d => ({
    Descrição: sanitizeCsv(d.descricao),
    Categoria: sanitizeCsv(d.categoria),
    Valor: d.valor,
    Status: String(d.status).toUpperCase(),
    Data: formatDate(d.data_despesa)
  }));
  addSheet(despesasSheet, 'Despesas');

  // 8. Receitas
  const receitasSheet = dbData.receitas.map(r => ({
    Descrição: sanitizeCsv(r.descricao),
    Categoria: sanitizeCsv(r.categoria),
    Valor: r.valor,
    Origem: String(r.origem).toUpperCase(),
    Data: formatDate(r.data_receita)
  }));
  addSheet(receitasSheet, 'Receitas');

  // 9. Devedores (Relatório Especial)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devedoresSheet: any[] = [];
  
  const devedoresPre = dbData.pedidosPreVenda.filter(p => p.status !== 'pago' && p.status !== 'cancelado');
  devedoresPre.forEach(p => {
    const cliente = dbData.clientes.find(c => c.id === p.cliente_id);
    const devido = p.valor_total - (p.valor_pago || 0);
    if (devido > 0) {
      const diasAtraso = Math.floor((new Date().getTime() - new Date(p.data_pedido).getTime()) / (1000 * 3600 * 24));
      devedoresSheet.push({
        Cliente: sanitizeCsv(cliente?.nome || 'Desconhecido'),
        Telefone: sanitizeCsv(cliente?.telefone || ''),
        'Descrição da Dívida': `Pré-Venda - ${p.id}`,
        'Valor Devido': devido,
        'Dias em Atraso': diasAtraso,
        'Data Original': formatDate(p.data_pedido)
      });
    }
  });

  const devedoresPos = dbData.registrosPosVenda.filter(p => p.status !== 'pago');
  devedoresPos.forEach(p => {
    const cliente = dbData.clientes.find(c => c.id === p.cliente_id);
    const devido = p.valor_total - (p.valor_pago || 0);
    if (devido > 0) {
      const diasAtraso = Math.floor((new Date().getTime() - new Date(p.data_registro).getTime()) / (1000 * 3600 * 24));
      devedoresSheet.push({
        Cliente: sanitizeCsv(cliente?.nome || 'Desconhecido'),
        Telefone: sanitizeCsv(cliente?.telefone || ''),
        'Descrição da Dívida': `Pós-Venda - ${p.id}`,
        'Valor Devido': devido,
        'Dias em Atraso': diasAtraso,
        'Data Original': formatDate(p.data_registro)
      });
    }
  });
  
  const totalDivida = devedoresSheet.reduce((acc, curr) => acc + curr['Valor Devido'], 0);
  devedoresSheet.push({
    Cliente: 'TOTAL GERAL',
    Telefone: '',
    'Descrição da Dívida': '',
    'Valor Devido': totalDivida,
    'Dias em Atraso': '',
    'Data Original': ''
  });

  addSheet(devedoresSheet, 'Devedores');

  // 10. Agendamentos
  const agendamentosSheet = dbData.scheduledOrders.map(s => ({
    Pedido: s.orderId,
    'Data Agendada': formatDate(s.scheduledDate),
    Horário: sanitizeCsv(s.scheduledTime),
    Status: String(s.status).toUpperCase(),
    Cliente: sanitizeCsv(s.customer?.name || ''),
    'Avisos Enviados': formatNotifications(s.notifications),
    'Reagendado?': formatRescheduled(s.rescheduled)
  }));
  addSheet(agendamentosSheet, 'Agendamentos');

  const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 15);
  a.href = url;
  a.download = `flow-finance-relatorio-${dateStr}.xlsx`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function getBackupPreview() {
  const tables = [
    'clientes', 'produtos', 'pedidosPreVenda', 'registrosPosVenda',
    'pagamentos', 'despesas', 'receitas', 'scheduledOrders',
    'auditLogs', 'notificationLogs', 'configuracoes'
  ];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    counts[table] = await db.table(table).count();
  }
  return counts;
}
