/**
 * Formato de moneda para Soles Peruanos
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `S/. ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `S/. ${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const CURRENCY_SYMBOL = 'PEN';
export const CURRENCY_LOCALE = 'es-PE';
