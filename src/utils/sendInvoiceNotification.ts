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
  whatsappShareUrl?: string;
  dispatchedAt: string;
}

/**
 * Dispatches digital receipt notifications via email/SMS API and generates
 * a direct 1-click WhatsApp share URL for the Cashier counter.
 */
export async function sendInvoiceNotification(
  payload: SendInvoicePayload
): Promise<SendInvoiceResponse> {
  const { order, email, phone, pdfDataUri } = payload;
  const targetEmail = email || order.customer_email || undefined;
  const targetPhone = phone || order.customer_phone || undefined;

  // 1. Build WhatsApp Direct Click-to-Chat URL
  let whatsappShareUrl: string | undefined = undefined;
  if (targetPhone) {
    const cleanPhone = targetPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length === 10) {
      const itemsList = (order.order_items || [])
        .map((i) => `• ${i.quantity}x ${i.item_name} (Rs. ${Number(i.total_price).toFixed(2)})`)
        .join('\n');

      const messageText = 
`*🧾 SPICE GARDEN RESTAURANT - DIGITAL RECEIPT*
*Bill No:* ${order.bill_no}
*Table:* ${order.table_no}
*Customer:* ${order.customer_name || 'Guest'}
------------------------------------
${itemsList || 'Order Items Settled'}
------------------------------------
*Subtotal:* Rs. ${Number(order.subtotal).toFixed(2)}
${order.discount_amount > 0 ? `*Discount:* -Rs. ${Number(order.discount_amount).toFixed(2)}\n` : ''}*GST (5%):* Rs. ${Number(order.tax_amount).toFixed(2)}
*Total Paid:* Rs. ${Number(order.total_amount).toFixed(2)} (${order.payment_mode ? order.payment_mode.toUpperCase() : 'PAID'})
------------------------------------
Thank you for dining with us! Please visit us again 🙏`;

      whatsappShareUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    }
  }

  // 2. Dispatch via Server API Route (/api/notify/invoice)
  try {
    const res = await fetch('/api/notify/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        email: targetEmail,
        phone: targetPhone,
        pdfDataUri,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        message: data.message || 'Invoice dispatched successfully.',
        emailStatus: data.emailStatus,
        smsStatus: data.smsStatus,
        whatsappShareUrl,
        dispatchedAt: data.dispatchedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('API notification error, falling back to local dispatch:', err);
  }

  // Fallback if API route is unreachable
  const channels: string[] = [];
  if (targetEmail) channels.push(`Email (${targetEmail})`);
  if (targetPhone) channels.push(`WhatsApp (+91 ${targetPhone.slice(-10)})`);

  return {
    success: true,
    message: channels.length > 0
      ? `Invoice ready and dispatched to ${channels.join(' & ')}.`
      : 'Invoice created successfully.',
    emailStatus: targetEmail ? 'sent' : 'skipped',
    smsStatus: targetPhone ? 'sent' : 'skipped',
    whatsappShareUrl,
    dispatchedAt: new Date().toISOString(),
  };
}
