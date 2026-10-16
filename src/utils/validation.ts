/**
 * Client & Server Validation Utilities for Smart Restaurant Billing
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Validates Sri Lankan mobile & landline phone numbers
 * Accepts:
 * - 07XXXXXXXX (10 digits starting with 0)
 * - 7XXXXXXXX (9 digits without 0)
 * - +947XXXXXXXX or 947XXXXXXXX
 * - Landlines starting with 01X, 02X, 03X, 04X, 05X, 06X, 08X
 */
export function validateSriLankanPhone(input: string): PhoneValidationResult {
  if (!input || !input.trim()) {
    return { isValid: false, formatted: '', error: 'Phone number is required.' };
  }

  const cleaned = input.trim().replace(/[\s\-()]/g, '');

  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return { isValid: false, formatted: '', error: 'Phone number can only contain digits.' };
  }

  let digits = cleaned.replace(/\D/g, '');

  // Handle leading country code 94
  if (digits.startsWith('94')) {
    digits = digits.slice(2);
  }

  // Handle leading 0
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 9) {
    return {
      isValid: false,
      formatted: '',
      error: 'Sri Lankan phone numbers must be 9 digits (or 10 digits starting with 0, e.g. 077 123 4567).',
    };
  }

  // Sri Lanka mobile prefixes start with 7 (e.g. 70, 71, 72, 74, 75, 76, 77, 78)
  // Landlines start with 1, 2, 3, 4, 5, 6, 8
  const validPrefix = /^[1-8][0-9]{8}$/;
  if (!validPrefix.test(digits)) {
    return {
      isValid: false,
      formatted: '',
      error: 'Invalid Sri Lankan number. Mobile numbers should start with 07X (e.g. 077, 071, 076, 070).',
    };
  }

  return {
    isValid: true,
    formatted: `+94${digits}`,
  };
}

/**
 * Validates Email Address format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required for digital receipts.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { isValid: true };
}

/**
 * Validates Customer Name
 */
export function validateCustomerName(name: string): { isValid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Customer name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long.' };
  }
  if (!/^[a-zA-Z\s.'-]{2,50}$/.test(trimmed)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, and hyphens.' };
  }
  return { isValid: true };
}

/**
 * Validates Table Number
 */
export function validateTableNumber(tableNo: string): { isValid: boolean; error?: string } {
  if (!tableNo || !tableNo.trim()) {
    return { isValid: false, error: 'Table number is required.' };
  }
  const trimmed = tableNo.trim().toUpperCase();
  if (trimmed.length < 2 || trimmed.length > 15) {
    return { isValid: false, error: 'Table number must be between 2 and 15 characters (e.g. T-01, VIP-1).' };
  }
  return { isValid: true };
}
