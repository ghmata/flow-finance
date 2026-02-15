/**
 * Retorna o intervalo de datas do mês atual
 * @returns {start: Date, end: Date}
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  
  // Primeiro dia do mês às 00:00:00
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  
  // Último dia do mês às 23:59:59
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Verifica se uma data está no mês atual
 * @param date - Data a verificar (string ISO ou Date)
 * @returns boolean
 */
export function isInCurrentMonth(date: string | Date): boolean {
  const { start, end } = getCurrentMonthRange();
  
  // Handle YYYY-MM-DD strings by appending time to ensure local timezone interpretation or safe comparison
  // If date is "2026-02-14", new Date("2026-02-14") might be UTC.
  // Ideally we should compare YYYY-MM strings for simplicity if input is YYYY-MM-DD.
  // But let's trust the Date object for now as per instructions, but be careful.
  
  let targetDate: Date;
  if (typeof date === 'string') {
    // Check if it's YYYY-MM-DD (length 10)
    if (date.length === 10) {
       // Append time to ensure it is treated as local day start, or use split
       // Actually, the best way for YYYY-MM-DD is to check if it falls within the month.
       // Let's rely on standard Date parsing for now, assuming consistent environment.
       // To be safer with YYYY-MM-DD, we can just parse the YYYY and MM.
       const [y, m, d] = date.split('-').map(Number);
       targetDate = new Date(y, m - 1, d); // Local time
    } else {
       targetDate = new Date(date);
    }
  } else {
    targetDate = date;
  }
  
  return targetDate >= start && targetDate <= end;
}
