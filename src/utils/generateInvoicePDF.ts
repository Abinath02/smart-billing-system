import { Order, OrderItem } from '../types/database.types';

export async function generateInvoicePDF(order: Order, items: OrderItem[]): Promise<string> {
  try {
    // Dynamic import to support SSR in Next.js
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // Standard 80mm thermal receipt format
    });

    let y = 10;
    const margin = 5;
    const pageWidth = 80;

    // 1. Restaurant Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SPICE GARDEN RESTAURANT', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('123 Gourmet Street, Food Valley', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210', pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Divider
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // 2. Bill & Order Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`TAX INVOICE / RECEIPT`, margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Bill No: ${order.bill_no}`, margin, y);
    doc.text(`Table: ${order.table_no}`, pageWidth - margin, y, { align: 'right' });
    y += 4;

    const formattedDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    doc.text(`Date: ${formattedDate}`, margin, y);
    if (order.waiter?.name) {
      doc.text(`Server: ${order.waiter.name}`, pageWidth - margin, y, { align: 'right' });
    }
    y += 4;

    if (order.customer_name || order.customer_phone) {
      doc.text(`Customer: ${order.customer_name || 'Guest'} (${order.customer_phone || '-'})`, margin, y);
      y += 4;
    }

    // Divider
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // 3. Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('Item', margin, y);
    doc.text('Qty', 45, y, { align: 'center' });
    doc.text('Rate', 58, y, { align: 'right' });
    doc.text('Amt (Rs)', pageWidth - margin, y, { align: 'right' });
    y += 3;

    doc.setLineDashPattern([], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // 4. Line Items
    doc.setFont('helvetica', 'normal');
    items.forEach((item) => {
      const itemName = item.item_name.length > 20 ? item.item_name.substring(0, 19) + '..' : item.item_name;
      doc.text(itemName, margin, y);
      doc.text(item.quantity.toString(), 45, y, { align: 'center' });
      doc.text(item.unit_price.toFixed(2), 58, y, { align: 'right' });
      doc.text(item.total_price.toFixed(2), pageWidth - margin, y, { align: 'right' });
      y += 4;
    });

    // Divider
    doc.setLineDashPattern([1, 1], 0);
    y += 1;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // 5. Bill Summary Calculations
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 40, y);
    doc.text(`Rs. ${order.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;

    if (order.discount_amount && order.discount_amount > 0) {
      doc.text('Discount:', 40, y);
      doc.text(`- Rs. ${order.discount_amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      y += 4;
    }

    doc.text('Tax / Service (5%):', 35, y);
    doc.text(`Rs. ${order.tax_amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;

    doc.setLineDashPattern([], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Grand Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GRAND TOTAL:', margin, y);
    doc.text(`Rs. ${order.total_amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 5;

    // Payment Mode
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`PAYMENT: ${order.payment_mode ? order.payment_mode.toUpperCase() : 'PAID'} [COMPLETED]`, margin, y);
    y += 6;

    // Footer Message
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Thank you for dining with us!', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Please visit again!', pageWidth / 2, y, { align: 'center' });

    // Download PDF locally
    const filename = `invoice_${order.bill_no || 'receipt'}.pdf`;
    doc.save(filename);

    // Return Data URI for email/phone dispatch
    return doc.output('datauristring');
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback: Trigger browser print
    window.print();
    return '';
  }
}
