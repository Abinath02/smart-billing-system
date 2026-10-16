/**
 * Standard Currency Formatting for Smart Restaurant Billing
 * Uses 'Rs.' prefix and standard 3-digit comma grouping (thousands separator).
 * Avoids Indian Lakh/Crore grouping (en-IN) and ensures consistent presentation.
 */

export const formatRs = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return 'Rs. 0.00';
  return `Rs. ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPriceNumber = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default formatRs;
