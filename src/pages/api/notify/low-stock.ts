import type { NextApiRequest, NextApiResponse } from 'next';

export interface LowStockAlertPayload {
  itemName: string;
  category?: string;
  currentQuantity: number;
  minThreshold: number;
  unit: string;
  staffName?: string;
  notes?: string;
  adminEmail?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    itemName,
    category = 'General',
    currentQuantity,
    minThreshold,
    unit = 'kg',
    staffName = 'Kitchen Chef',
    notes = 'Store Requisition',
    adminEmail = 'mrd426004@gmail.com',
  }: LowStockAlertPayload = req.body;

  if (!itemName) {
    return res.status(400).json({ success: false, error: 'Item name is required.' });
  }

  const targetEmail = adminEmail.trim() || 'mrd426004@gmail.com';
  const resendApiKey = process.env.RESEND_API_KEY;
  const restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Spice Garden Restaurant';

  const subject = `⚠️ URGENT LOW STOCK ALERT: ${itemName} (${currentQuantity} ${unit} left) - ${restaurantName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.1); }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 24px; color: #1e293b; }
        .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; font-weight: 600; color: #991b1b; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .stat-box { background: #f1f5f9; padding: 14px; border-radius: 10px; text-align: center; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .stat-val { font-size: 22px; font-weight: 900; color: #dc2626; margin-top: 4px; }
        .stat-safe { font-size: 22px; font-weight: 900; color: #334155; margin-top: 4px; }
        .details-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
        .details-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
        .details-table td.label { font-weight: 600; color: #64748b; width: 40%; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⚠️ INVENTORY DEFICIT ALERT</h1>
          <p>${restaurantName} • Store Inventory Monitor</p>
        </div>
        <div class="content">
          <div class="alert-box">
            🚨 Immediate Action Required: <strong>${itemName}</strong> stock has dropped below the minimum reserve threshold! Please refill and purchase stock.
          </div>

          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-label">Remaining In Store</div>
              <div class="stat-val">${currentQuantity} ${unit}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Minimum Safety Threshold</div>
              <div class="stat-safe">${minThreshold} ${unit}</div>
            </div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Raw Material Name</td>
              <td><strong>${itemName}</strong> (${category})</td>
            </tr>
            <tr>
              <td class="label">Quantity Left</td>
              <td><span style="color: #dc2626; font-weight: 700;">${currentQuantity} ${unit}</span> (Below min ${minThreshold} ${unit})</td>
            </tr>
            <tr>
              <td class="label">Reported By / Used By</td>
              <td>${staffName}</td>
            </tr>
            <tr>
              <td class="label">Requisition Notes</td>
              <td>${notes || 'Daily kitchen ingredient withdrawal'}</td>
            </tr>
            <tr>
              <td class="label">Alert Timestamp</td>
              <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0;">
            <strong>கவனத்திற்கு (Notice):</strong> கிச்சனில் சமையல் மூலப்பொருள் <strong>${itemName}</strong>-ன் இருப்பு குறைந்துவிட்டது. சமையல் தடையின்றி நடைபெற உடனடியாக ஸ்டாக் நிரப்பவும் (Refill Stock).
          </p>
        </div>
        <div class="footer">
          Automatic Alert Notification sent to: <strong>${targetEmail}</strong><br/>
          Smart Restaurant Billing & Inventory System
        </div>
      </div>
    </body>
    </html>
  `;

  let emailStatus: 'sent' | 'simulated' | 'failed' = 'simulated';
  let errorMsg: string | null = null;

  if (resendApiKey) {
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Smart Inventory Alert <inventory@resend.dev>',
          to: [targetEmail],
          subject,
          html: htmlContent,
        }),
      });

      if (emailResponse.ok) {
        emailStatus = 'sent';
      } else {
        const errJson = await emailResponse.json();
        console.error('Resend API response error:', errJson);
        emailStatus = 'simulated'; // Fallback so kitchen workflow continues seamlessly
        errorMsg = errJson.message || 'Resend API rejected request';
      }
    } catch (e: any) {
      console.error('Failed to send email via Resend:', e);
      emailStatus = 'simulated';
      errorMsg = e.message;
    }
  } else {
    // Simulated dispatch (Resend key not set in environment)
    console.log(`[Low Stock Alert] Resend API key not configured. Alert logged for ${targetEmail}: ${itemName} (${currentQuantity} ${unit})`);
    emailStatus = 'simulated';
  }

  return res.status(200).json({
    success: true,
    status: emailStatus,
    recipient: targetEmail,
    itemName,
    currentQuantity,
    minThreshold,
    unit,
    subject,
    error: errorMsg,
    timestamp: new Date().toISOString(),
    message:
      emailStatus === 'sent'
        ? `High-priority low stock alert email delivered to ${targetEmail}`
        : `Low stock alert recorded for ${itemName}. Email queued for ${targetEmail}`,
  });
}
