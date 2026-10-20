/**
 * Currency formatting utilities.
 * All monetary amounts are stored as integers in minor currency units.
 * For IDR: 1 unit = 1 rupiah (no sub-unit, precision = 0)
 * For USD: 1 unit = 1 cent (precision = 2)
 */

export const CURRENCY_PRECISION: Record<string, number> = {
  IDR: 0,
  USD: 2,
  EUR: 2,
  JPY: 0,
  GBP: 2,
};

export const DEFAULT_CURRENCY = "IDR";
export const DEFAULT_LOCALE = "id-ID";

/**
 * Format an integer minor-unit amount into a display string.
 * @param amount - Integer in minor currency units (e.g. 150000 = Rp150.000 for IDR)
 * @param currency - ISO 4217 currency code
 * @returns Formatted string e.g. "Rp 150.000" or "US$ 150.00"
 */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const precision = CURRENCY_PRECISION[currency] ?? 0;
  const displayValue =
    precision === 0 ? amount : amount / Math.pow(10, precision);

  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    }).format(displayValue);
  } catch {
    // Fallback if Intl currency formatting fails
    const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    }).format(displayValue);
    return `${currency} ${formatted}`;
  }
}

/**
 * Format an integer minor-unit amount as a plain number string without currency symbol.
 * @param amount - Integer in minor currency units
 * @param currency - ISO 4217 currency code
 * @returns e.g. "150.000" for IDR, "150.00" for USD
 */
export function formatAmountPlain(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const precision = CURRENCY_PRECISION[currency] ?? 0;
  const displayValue =
    precision === 0 ? amount : amount / Math.pow(10, precision);

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  }).format(displayValue);
}

/**
 * Parse a user-facing input string into integer minor units.
 * @param input - e.g. "150.000" or "150,000" or "Rp 150.000"
 * @param currency - ISO 4217 currency code
 * @returns Integer in minor units (e.g. 150000 for IDR)
 */
export function parseAmount(input: string, currency: string = DEFAULT_CURRENCY): number {
  if (!input || typeof input !== "string") return 0;

  const precision = CURRENCY_PRECISION[currency] ?? 0;

  // Remove all non-numeric characters except dots and commas
  const cleaned = input.replace(/[^0-9.,-]/g, "");

  // Normalize: treat comma as decimal separator if locale uses it
  let normalized = cleaned;
  if (precision > 0) {
    // If there are two dots/commas, the last one is the decimal separator
    const parts = normalized.split(/[.,]/);
    if (parts.length > 2) {
      const decimalPart = parts.pop() || "";
      const integerPart = parts.join("");
      normalized = `${integerPart}.${decimalPart}`;
    } else if (parts.length === 2) {
      // One separator found — could be decimal or thousands
      const decimalPart = parts[1];
      // If the decimal part length matches precision, treat as decimal
      if (decimalPart.length === precision || decimalPart.length === 2) {
        normalized = `${parts[0]}.${parts[1]}`;
      } else {
        // Probably thousands separator, remove it
        normalized = `${parts[0]}${parts[1]}`;
      }
    }
   } else {
    // No decimal — remove all separators
    normalized = cleaned.replace(/[.,]/g, "");
  }

  const value = parseFloat(normalized);
  if (isNaN(value)) return 0;

  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier);
}

/**
 * Format a ratio as a percentage string.
 * @param value - numerator (e.g. spent)
 * @param total - denominator (e.g. budget)
 * @param decimals - number of decimal places (default 1)
 * @returns e.g. "75.0%"
 */
export function formatPercentage(
  value: number,
  total: number,
  decimals: number = 1
): string {
  if (total === 0) return "0%";
  const ratio = value / total;
  const clamped = Math.min(1, Math.max(0, ratio));
  return `${(clamped * 100).toFixed(decimals)}%`;
}

/**
 * Add amounts using integer arithmetic.
 * @returns Sum of all amounts (all integers in minor units)
 */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((acc, val) => {
    if (typeof val !== "number" || isNaN(val)) return acc;
    return acc + Math.trunc(val);
  }, 0);
}
