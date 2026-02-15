export const formatPhone = (value: string) => {
  if (!value) return '';
  
  // Remove non-digits
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 11 digits
  const truncated = numbers.substring(0, 11);
  
  if (truncated.length <= 10) {
    // (99) 9999-9999
    return truncated
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // (99) 99999-9999
    return truncated
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
};

export const formatCurrency = (value: string | number) => {
  if (value === '') return '';
  
  // If number, format directly
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  // If string (while user types)
  const numbers = value.replace(/\D/g, '');
  const amount = Number(numbers) / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const parseCurrency = (value: string): number => {
  return Number(value.replace(/\D/g, '')) / 100;
};
