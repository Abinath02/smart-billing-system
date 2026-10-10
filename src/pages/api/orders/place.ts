import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../../../lib/supabaseClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize server database client: uses service role key if available to bypass RLS securely on server
const getServerSupabase = () => {
  if (serviceRoleKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return defaultSupabase;
};

export interface PlaceOrderRequestBody {
  tableNo: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  cartItems: {
    itemId: string;
    quantity: number;
    offerId?: string;
    specialInstructions?: string;
  }[];
  appendToExisting?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    tableNo,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    cartItems,
    appendToExisting = false,
  }: PlaceOrderRequestBody = req.body;

  // 1. Validation
  if (!tableNo || !tableNo.trim()) {
    return res.status(400).json({ success: false, error: 'Table number is required.' });
  }

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Cart must contain at least one item.' });
  }

  const db = getServerSupabase();

  try {
    // Attempt 1: Call secure database RPC if available
    const rpcPayload = {
      p_table_no: tableNo.trim().toUpperCase(),
      p_customer_name: customerName?.trim() || 'Guest Customer',
      p_customer_phone: customerPhone?.trim() || '',
      p_customer_email: customerEmail?.trim() || '',
      p_notes: notes?.trim() || null,
      p_items: cartItems.map((ci) => ({
        item_id: ci.itemId,
        quantity: ci.quantity,
        special_instructions: ci.specialInstructions || null,
        offer_id: ci.offerId || null,
      })),
      p_append_to_existing: Boolean(appendToExisting),
    };

    const { data: rpcData, error: rpcError } = await db.rpc(
      'place_or_append_order',
      rpcPayload
    );

    if (!rpcError && rpcData) {
      const orderObj = rpcData.order;
      orderObj.order_items = rpcData.items;
      return res.status(200).json({
        success: true,
        order: orderObj,
        isAppended: rpcData.is_appended,
      });
    }

    if (rpcError) {
      console.warn('place_or_append_order RPC notice, using direct flow:', rpcError.message);
    }

    // Attempt 2: Server-side secure fallback verification
    // Fetch real dishes from database
    const itemIds = cartItems.map((c) => c.itemId);
    const { data: dbDishes, error: dishesErr } = await db
      .from('menu_items')
      .select('*')
      .in('id', itemIds);

    if (dishesErr || !dbDishes) {
      throw new Error('Failed to verify menu items against database.');
    }

    // Fetch active offers
    const { data: dbOffers } = await db
      .from('offers')
      .select('*')
      .eq('is_active', true);

    const dishesMap = new Map(dbDishes.map((d) => [d.id, d]));
    const offersMap = new Map((dbOffers || []).map((o) => [o.id, o]));

    let calculatedSubtotal = 0;
    let calculatedDiscount = 0;

    const preparedOrderItems: any[] = [];

    for (const item of cartItems) {
      const dish = dishesMap.get(item.itemId);
      if (!dish) {
        return res.status(400).json({
          success: false,
          error: `Dish ${item.itemId} not found in database.`,
        });
      }
      if (!dish.is_available) {
        return res.status(400).json({
          success: false,
          error: `Dish "${dish.name}" is currently sold out.`,
        });
      }

      const qty = Math.max(1, parseInt(String(item.quantity)) || 1);
      const unitPrice = Number(dish.price);
      let itemDiscount = 0;

      if (item.offerId && offersMap.has(item.offerId)) {
        const offer = offersMap.get(item.offerId)!;
        if (offer.item_id === dish.id) {
          if (offer.discount_details?.type === 'percentage') {
            itemDiscount = Number(
              ((unitPrice * (offer.discount_details.value || 0)) / 100).toFixed(2)
            );
          } else if (offer.discount_details?.type === 'fixed') {
            itemDiscount = Math.min(unitPrice, Number(offer.discount_details.value || 0));
          }
        }
      }

      const lineTotal = Number(((unitPrice - itemDiscount) * qty).toFixed(2));
      calculatedSubtotal += unitPrice * qty;
      calculatedDiscount += itemDiscount * qty;

      preparedOrderItems.push({
        item_id: dish.id,
        item_name: dish.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: lineTotal,
        special_instructions: item.specialInstructions || null,
      });
    }

    const taxRate = 0.05; // 5% GST
    const taxableAmount = Math.max(0, calculatedSubtotal - calculatedDiscount);
    const calculatedTax = Number((taxableAmount * taxRate).toFixed(2));
    const calculatedTotal = Number((taxableAmount + calculatedTax).toFixed(2));

    const normalizedTable = tableNo.trim().toUpperCase();

    // Check if active order exists for appending
    let existingOrderId: string | null = null;
    let activeOrderData: any = null;

    if (appendToExisting) {
      const { data: openOrders } = await db
        .from('orders')
        .select('*')
        .eq('table_no', normalizedTable)
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (openOrders && openOrders.length > 0) {
        existingOrderId = openOrders[0].id;
        activeOrderData = openOrders[0];
      }
    }

    if (existingOrderId && activeOrderData) {
      // Append round to existing order
      const newSubtotal = Number(activeOrderData.subtotal) + calculatedSubtotal;
      const newDiscount = Number(activeOrderData.discount_amount) + calculatedDiscount;
      const newTax = Number(((newSubtotal - newDiscount) * taxRate).toFixed(2));
      const newTotal = Number((newSubtotal - newDiscount + newTax).toFixed(2));

      // 1. Update order header
      const { data: updatedOrder, error: updateErr } = await db
        .from('orders')
        .update({
          subtotal: newSubtotal,
          discount_amount: newDiscount,
          tax_amount: newTax,
          total_amount: newTotal,
          status: 'pending', // alert kitchen of new round
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrderId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // 2. Insert new order items with Round badge
      const itemsPayload = preparedOrderItems.map((item) => ({
        ...item,
        order_id: existingOrderId,
        special_instructions: item.special_instructions
          ? `${item.special_instructions} [Round 2]`
          : '[Round 2 Add-on]',
      }));

      const { error: itemsInsertErr } = await db
        .from('order_items')
        .insert(itemsPayload);

      if (itemsInsertErr) throw itemsInsertErr;

      // 3. Fetch fresh joined order
      const { data: fullOrder } = await db
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', existingOrderId)
        .single();

      return res.status(200).json({
        success: true,
        order: fullOrder || updatedOrder,
        isAppended: true,
      });
    } else {
      // Brand new order
      const timestampSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedBillNo = `BILL-${Date.now().toString().slice(-4)}${timestampSuffix}`;

      const { data: newOrder, error: orderErr } = await db
        .from('orders')
        .insert([
          {
            bill_no: generatedBillNo,
            table_no: normalizedTable,
            customer_name: customerName?.trim() || 'Guest Customer',
            customer_phone: customerPhone?.trim() || null,
            customer_email: customerEmail?.trim() || null,
            subtotal: calculatedSubtotal,
            discount_amount: calculatedDiscount,
            tax_amount: calculatedTax,
            total_amount: calculatedTotal,
            status: 'pending',
            payment_mode: 'unpaid',
            notes: notes?.trim() || null,
          },
        ])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const itemsPayload = preparedOrderItems.map((item) => ({
        ...item,
        order_id: newOrder.id,
      }));

      const { error: itemsInsertErr } = await db
        .from('order_items')
        .insert(itemsPayload);

      if (itemsInsertErr) throw itemsInsertErr;

      const { data: fullOrder } = await db
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', newOrder.id)
        .single();

      return res.status(200).json({
        success: true,
        order: fullOrder || newOrder,
        isAppended: false,
      });
    }
  } catch (err: any) {
    console.error('Server-side order placement error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to place order securely.',
    });
  }
}
