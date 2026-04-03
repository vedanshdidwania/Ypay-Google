import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatUSDT(amount: number | string | undefined | null) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === undefined || num === null || isNaN(num)) return '0.00 USDT';
  return `${num.toFixed(2)} USDT`;
}
