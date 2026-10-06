import { Order } from '../types/database.types';

export interface SendInvoicePayload {
  order: Order;
  email?: string;
  phone?: string;
  pdfDataUri?: string;
}

export interface SendInvoiceResponse {
  success: boolean;
  message: string;
  emailStatus?: 'sent' | 'skipped' | 'failed';
  smsStatus?: 'sent' | 'skipped' | 'failed';
  dispatchedAt: string;
}

/**
 * Mock API service simulating sending digital receipt PDF to customer email and phone (WhatsApp/SMS).
 * In production, connect this to Resend/SendGrid/Twilio/WhatsApp Cloud API.
 */
export async function sendInvoiceNotification(
  payload: SendInvoicePayload
): Promise<SendInvoiceResponse> {
  const { order, email, phone, pdfDataUri } = payload;

  console.log('[MOCK API] Initiating Digital Receipt Dispatch...');
  console.log(`[MOCK API] Bill No: ${order.bill_no}`);
  console.log(`[MOCK API] Target Email: ${email || order.customer_email || 'None'}`);
  console.log(`[MOCK API] Target Phone: ${phone || order.customer_phone || 'None'}`);
  console.log(`[MOCK API] PDF Attachment size: ${pdfDataUri ? pdfDataUri.length : 0} bytes`);

  // Simulate network latency (800ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  const targetEmail = email || order.customer_email;
  const targetPhone = phone || order.customer_phone;

  const emailSent = Boolean(targetEmail && targetEmail.includes('@'));
  const smsSent = Boolean(targetPhone && targetPhone.length >= 10);

  if (!emailSent && !smsSent) {
    return {
      success: false,
      message: 'No valid customer email or phone number found to dispatch invoice.',
      emailStatus: 'skipped',
      smsStatus: 'skipped',
      dispatchedAt: new Date().toISOString(),
    };
  }

  const channels: string[] = [];
  if (emailSent) channels.push(`Email (${targetEmail})`);
  if (smsSent) channels.push(`SMS/WhatsApp (+91 ${targetPhone})`);

  return {
    success: true,
    message: `E-Invoice successfully dispatched to ${channels.join(' and ')}!`,
    emailStatus: emailSent ? 'sent' : 'skipped',
    smsStatus: smsSent ? 'sent' : 'skipped',
    dispatchedAt: new Date().toISOString(),
  };
}
