import { db } from './db';

const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
const getRandomItem = <T>(arr: T[]): T => arr[getRandomInt(0, arr.length - 1)];

export const runMassiveSeed = async () => {
  console.log('Iniciando seed massivo (Simulação Realista)...');

  // 1. Clear database
  await db.clientes.clear();
  await db.produtos.clear();
  await db.pedidosPreVenda.clear();
  await db.registrosPosVenda.clear();
  await db.pagamentos.clear();
  await db.despesas.clear();
  await db.receitas.clear();
  await db.scheduledOrders.clear();
  await db.auditLogs.clear();
  await db.notificationLogs.clear();

  const now = new Date();
  const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 2. Produtos (30 itens reais e precificação justa)
  const produtosSeed = [
    { nome: 'Brigadeiro Tradicional', preco: 4.50 },
    { nome: 'Brigadeiro Ninho c/ Nutella', preco: 6.00 },
    { nome: 'Brigadeiro Pistache', preco: 8.00 },
    { nome: 'Beijinho', preco: 4.00 },
    { nome: 'Doce de Leite c/ Nozes', preco: 6.50 },
    { nome: 'Bolo de Pote Cenoura c/ Chocolate', preco: 12.00 },
    { nome: 'Bolo de Pote Ninho c/ Morango', preco: 15.00 },
    { nome: 'Bolo de Pote Red Velvet', preco: 18.00 },
    { nome: 'Bolo de Pote Oreo', preco: 14.00 },
    { nome: 'Bolo de Pote Coco', preco: 12.00 },
    { nome: 'Copo da Felicidade P', preco: 20.00 },
    { nome: 'Copo da Felicidade M', preco: 28.00 },
    { nome: 'Copo da Felicidade G', preco: 35.00 },
    { nome: 'Copo Especial Pistache', preco: 42.00 },
    { nome: 'Torta de Limão (Fatia)', preco: 16.00 },
    { nome: 'Torta Holandesa (Fatia)', preco: 18.00 },
    { nome: 'Torta de Morango Inteira', preco: 120.00 },
    { nome: 'Torta de Chocolate Inteira', preco: 140.00 },
    { nome: 'Caixa de Doces (6 un)', preco: 25.00 },
    { nome: 'Caixa de Doces (12 un)', preco: 48.00 },
    { nome: 'Caixa de Doces (24 un)', preco: 90.00 },
    { nome: 'Brownie Tradicional', preco: 8.00 },
    { nome: 'Brownie Recheado Ninho', preco: 12.00 },
    { nome: 'Palha Italiana', preco: 10.00 },
    { nome: 'Cone Trufado Ninho', preco: 12.00 },
    { nome: 'Cone Trufado Nutella', preco: 14.00 },
    { nome: 'Barra Recheada Ouro Branco', preco: 35.00 },
    { nome: 'Barra Recheada Pistache', preco: 45.00 },
    { nome: 'Pão de Mel Tradicional', preco: 7.00 },
    { nome: 'Pão de Mel Doce de Leite', preco: 8.50 }
  ];

  const produtos = produtosSeed.map(p => ({
    id: generateUUID(),
    nome_sabor: p.nome,
    preco_unitario: p.preco,
    ativo: true,
    created_at: getRandomDate(past30Days, now)
  }));
  await db.produtos.bulkAdd(produtos);

  // 3. Clientes (~30)
  const nomes = ['Ana', 'João', 'Maria', 'Pedro', 'Carlos', 'Beatriz', 'Lucas', 'Fernanda', 'Rafael', 'Julia', 'Marcelo', 'Camila', 'Rodrigo', 'Amanda', 'Felipe', 'Letícia', 'Gustavo', 'Bruna', 'Thiago', 'Mariana', 'Ricardo', 'Larissa', 'Bruno', 'Natália', 'Eduardo', 'Tatiana', 'Fernando', 'Carolina', 'Daniel', 'Patrícia'];
  const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];
  
  const clientes = nomes.map(nome => ({
    id: generateUUID(),
    nome: `${nome} ${getRandomItem(sobrenomes)}`,
    telefone: `119${getRandomInt(10000000, 99999999)}`,
    observacoes: Math.random() > 0.8 ? 'Cliente Fiel / VIP' : '',
    created_at: getRandomDate(past30Days, now)
  }));
  await db.clientes.bulkAdd(clientes);

  // Helper para gerar itens aleatórios para o pedido/venda
  const getItems = (count: number) => {
    const items = [];
    let total = 0;
    for(let i=0; i<count; i++) {
      const prod = getRandomItem(produtos);
      const qtd = getRandomInt(1, 5); // 1 a 5 unidades por item
      const subtotal = prod.preco_unitario * qtd;
      items.push({
        id: generateUUID(), // ID granular obrigatório para entrega individual
        produto_id: prod.id,
        produto_nome: prod.nome_sabor,
        quantidade: qtd,
        subtotal: subtotal
      });
      total += subtotal;
    }
    return { items, total };
  };

  // 4. Receitas / Vendas
  // Faturamento Alvo: ~4000
  let faturamentoTotal = 0;

  const preVendaStatuses = ['pendente', 'preparando', 'pronto', 'entregue', 'cancelado'];
  const posVendaStatuses = ['pago', 'pendente'];
  const pgtoMethod = ['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'];

  while (faturamentoTotal < 4000) {
    const isPreVenda = Math.random() > 0.4; // 60% pedidos sob encomenda, 40% pronta entrega
    const isPaga = Math.random() > 0.15; // 85% já pago, 15% fiado/pendente
    const client = getRandomItem(clientes);
    // Compra de 1 a 4 itens variados
    const { items, total } = getItems(getRandomInt(1, 4));

    if (isPreVenda) {
      const status = getRandomItem(preVendaStatuses);
      let valorPago = 0;
      if (status === 'entregue') { valorPago = total; }
      else if (status !== 'cancelado' && Math.random() > 0.4) { valorPago = total * 0.5; } // 50% de sinal pago
      else if (status === 'cancelado' && Math.random() > 0.8) { valorPago = total * 0.5; } // Cancelado mas com sinal retido
      
      const id = generateUUID();
      const dtPedido = getRandomDate(past30Days, now);
      const dtEntrega = getRandomDate(new Date(dtPedido), status === 'pendente' ? future30Days : now);
      
      const history = [];
      history.push({ status: 'pendente', timestamp: dtPedido });
      if (status === 'preparando' || status === 'pronto' || status === 'entregue') {
        history.push({ status: 'preparando', timestamp: getRandomDate(new Date(dtPedido), now) });
      }
      if (status === 'pronto' || status === 'entregue') {
        history.push({ status: 'pronto', timestamp: getRandomDate(new Date(dtPedido), now) });
      }
      if (status === 'entregue') {
        history.push({ status: 'entregue', timestamp: dtEntrega });
      }

      await db.pedidosPreVenda.add({
        id,
        cliente_id: client.id,
        itens: items,
        valor_total: total,
        valor_pago: valorPago,
        status: status as any,
        data_pedido: dtPedido,
        data_entrega: dtEntrega,
        history,
        removedFromReady: status === 'entregue'
      });

      if (valorPago > 0) {
        await db.pagamentos.add({
          id: generateUUID(),
          cliente_id: client.id,
          pedido_id: id,
          valor_pago: valorPago,
          forma_pagamento: getRandomItem(pgtoMethod),
          data_pagamento: dtPedido,
          tipo: 'pre_venda'
        });
        faturamentoTotal += valorPago;
      }

      // Agendamentos atrelados a pedidos não concluídos/cancelados
      if (status !== 'entregue' && status !== 'cancelado') {
        await db.scheduledOrders.add({
            id: generateUUID(),
            orderId: id,
            customer: { id: client.id, name: client.nome, phone: client.telefone },
            scheduledDate: dtEntrega.split('T')[0],
            scheduledTime: `${String(getRandomInt(9, 18)).padStart(2, '0')}:00`, // Horário entre 09:00 e 18:00
            status: status === 'pronto' ? 'confirmado' : 'pendente',
            notifications: { delivery: { sent: Math.random() > 0.5 } },
            rescheduled: { isRescheduled: Math.random() > 0.8, originalDate: dtPedido, originalTime: '10:00' },
            type: Math.random() > 0.5 ? 'entrega' : 'retirada'
        });
      }

    } else {
      const status = isPaga ? 'pago' : 'pendente';
      const id = generateUUID();
      const dtRegistro = getRandomDate(past30Days, now);
      
      await db.registrosPosVenda.add({
        id,
        cliente_id: client.id,
        itens: items,
        valor_total: total,
        valor_pago: isPaga ? total : 0,
        status: status as any,
        data_registro: dtRegistro,
        descricao: `Venda Direta - ${items.length} itens`
      });

      if (isPaga) {
        await db.pagamentos.add({
          id: generateUUID(),
          cliente_id: client.id,
          registro_id: id,
          valor_pago: total,
          forma_pagamento: getRandomItem(pgtoMethod),
          data_pagamento: dtRegistro,
          tipo: 'pos_venda'
        });
        faturamentoTotal += total;
      }
    }
  }

  // 5. Despesas (~1500)
  let despesaTotal = 0;
  const catsDespesa = ['Ingredientes', 'Embalagens', 'Marketing', 'Logística', 'Equipamentos', 'Impostos/Taxas'];
  const descDespesas = [
    ['Caixa de Leite Condensado (27 un)', 'Creme de Leite (Caixa)', 'Chocolate Callebaut 2kg', 'Manteiga Extra', 'Pistache Sem Casca 1kg'],
    ['Caixas de Papelão 10x10', 'Fitas de Cetim', 'Forminhas Trufa/Brigadeiro', 'Adesivos Logo'],
    ['Impulsionamento Instagram', 'Agência / Tráfego Pago'],
    ['Combustível Mês', 'Motoboy Diária', 'Uber Entregas'],
    ['Espátulas de Silicone', 'Formas de Alumínio', 'Manutenção Batedeira'],
    ['Taxa MEI', 'Contador Mensal']
  ];

  while (despesaTotal < 1500) {
    const catIndex = getRandomInt(0, catsDespesa.length - 1);
    const cat = catsDespesa[catIndex];
    const descArray = descDespesas[catIndex];
    const desc = getRandomItem(descArray);
    
    // Despesas de ingredientes costumam ser mais altas (100-300), outras variam
    const dValor = (cat === 'Ingredientes' || cat === 'Marketing') ? getRandomInt(100, 350) : getRandomInt(30, 150);
    const dt = getRandomDate(past30Days, now);

    await db.despesas.add({
      id: generateUUID(),
      descricao: desc,
      categoria: cat,
      valor: dValor,
      status: Math.random() > 0.1 ? 'pago' : 'pendente',
      data_despesa: dt
    });
    despesaTotal += dValor;
  }

  // 6. Receitas Extras (só para constar)
  for(let i=0; i<2; i++) {
    await db.receitas.add({
        id: generateUUID(),
        descricao: 'Rendimento Caixinha Nubank',
        categoria: 'Investimento',
        valor: getRandomInt(10, 50),
        origem: 'Rendimento',
        data_receita: getRandomDate(past30Days, now)
    });
  }

  // 7. Logs de Auditoria
  for(let i=0; i<30; i++) {
    await db.auditLogs.add({
        id: generateUUID(),
        action: getRandomItem(['ORDER_CREATED', 'STATUS_CHANGED', 'PAYMENT_RECEIVED', 'ORDER_RESCHEDULED', 'CUSTOMER_ADDED']),
        orderId: generateUUID(),
        userId: 'admin',
        timestamp: getRandomDate(past30Days, now),
        details: 'Ação automática simulada no sistema'
    });
  }

  console.log(`✅ Seed massivo finalizado!`);
  console.log(`Faturamento simulado (Vendas e Sinais Pagos): R$ ${faturamentoTotal.toFixed(2)}`);
  console.log(`Despesas simuladas: R$ ${despesaTotal.toFixed(2)}`);

  // Remove a flag de backup completed para que o banner volte a aparecer ao limpar o banco
  localStorage.removeItem('backup_completed');

  return { faturamentoTotal, despesaTotal };
};

// @ts-ignore - Expor globalmente para facilitar execução no console
if (typeof window !== 'undefined') {
  (window as any).runMassiveSeed = runMassiveSeed;
}
