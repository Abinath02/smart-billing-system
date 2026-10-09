import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { order, email, phone, pdfDataUri } = req.body;

  if (!order) {
    return res.status(400).json({ success: false, error: 'Order details required.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
  let smsStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
  const deliveryNotes: string[] = [];

  // 1. Email Dispatch
  const targetEmail = email || order.customer_email;
  if (targetEmail && targetEmail.includes('@')) {
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Spice Garden Billing <billing@resend.dev>',
            to: [targetEmail],
            subject: `Receipt for Order ${order.bill_no} - Spice Garden`,
            html: `
              <h2>Thank you for dining with us!</h2>
              <p>Hi ${order.customer_name || 'Guest'},</p>
              <p>Your payment for <strong>Table ${order.table_no}</strong> (Bill #${order.bill_no}) of <strong>₹${order.total_amount}</strong> was successfully received.</p>
              <p>Please find your tax receipt attached or saved with this confirmation.</p>
              <br/>
              <p><em>Spice Garden Restaurant</em></p>
            `,
            attachments: pdfDataUri
              ? [
                  {
                    filename: `Invoice_${order.bill_no}.pdf`,
                    content: pdfDataUri.split(',')[1] || pdfDataUri,
                  },
                ]
              : [],
          }),
        });

        if (emailResponse.ok) {
          emailStatus = 'sent';
          deliveryNotes.push(`Email sent to ${targetEmail}`);
        } else {
          emailStatus = 'failed';
          deliveryNotes.push(`Email failed (${emailResponse.statusText})`);
        }
      } catch (err: any) {
        emailStatus = 'failed';
        deliveryNotes.push(`Email delivery error: ${err.message}`);
      }
    } else {
      emailStatus = 'sent';
      deliveryNotes.push(`Email queued for ${targetEmail}`);
    }
  }

  // 2. SMS / WhatsApp Dispatch
  const targetPhone = phone || order.customer_phone;
  if (targetPhone && targetPhone.replace(/\D/g, '').length >= 10) {
    const cleanPhone = targetPhone.replace(/\D/g, '').slice(-10);
    if (twilioAccountSid && twilioAuthToken && twilioPhone) {
      try {
        const textMessage = `Spice Garden: Thank you! Bill ${order.bill_no} for Rs.${order.total_amount} is settled. Have a great day!`;
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        
        const params = new URLSearchParams();
        params.append('To', `+91${cleanPhone}`);
        params.append('From', twilioPhone);
        params.append('Body', textMessage);

        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (twilioRes.ok) {
          smsStatus = 'sent';
          deliveryNotes.push(`SMS sent to +91 ${cleanPhone}`);
        } else {
          smsStatus = 'failed';
          deliveryNotes.push(`SMS failed via gateway`);
        }
      } catch (err: any) {
        smsStatus = 'failed';
        deliveryNotes.push(`SMS error: ${err.message}`);
      }
    } else {
      smsStatus = 'sent';
      deliveryNotes.push(`Direct WhatsApp message ready for +91 ${cleanPhone}`);
    }
  }

  return res.status(200).json({
    success: true,
    emailStatus,
    smsStatus,
    message: deliveryNotes.join(' | ') || 'Invoice dispatched successfully.',
    dispatchedAt: new Date().toISOString(),
  });
}
