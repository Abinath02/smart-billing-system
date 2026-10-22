import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../../lib/supabaseClient';
import { checkRateLimit } from '../../../lib/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate Limiting: 5 backup exports per minute per IP
  if (!checkRateLimit(req, res, { limit: 5, windowMs: 60 * 1000, keyPrefix: 'admin_backup' })) {
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let client = defaultClient;
    if (serviceRoleKey && supabaseUrl) {
      client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    // Fetch all tables in parallel
    const [
      ordersRes,
      orderItemsRes,
      menuItemsRes,
      inventoryRes,
      waitersRes,
      offersRes,
      profilesRes,
    ] = await Promise.all([
      client.from('orders').select('*').order('created_at', { ascending: false }),
      client.from('order_items').select('*'),
      client.from('menu_items').select('*').order('name', { ascending: true }),
      client.from('inventory').select('*').order('item_name', { ascending: true }),
      client.from('waiters').select('*').order('name', { ascending: true }),
      client.from('offers').select('*').order('created_at', { ascending: false }),
      client.from('profiles').select('id, email, full_name, role, phone, is_active, created_at, updated_at'),
    ]);

    const backupDate = new Date();
    const dateStr = backupDate.toISOString().replace(/[:.]/g, '-');

    const backupData = {
      system: 'Spice Garden Smart Billing System',
      version: '1.0.0',
      exportedAt: backupDate.toISOString(),
      metadata: {
        totalOrders: ordersRes.data?.length || 0,
        totalOrderItems: orderItemsRes.data?.length || 0,
        totalMenuItems: menuItemsRes.data?.length || 0,
        totalInventoryItems: inventoryRes.data?.length || 0,
        totalWaiters: waitersRes.data?.length || 0,
        totalOffers: offersRes.data?.length || 0,
        totalStaffProfiles: profilesRes.data?.length || 0,
      },
      tables: {
        orders: ordersRes.data || [],
        order_items: orderItemsRes.data || [],
        menu_items: menuItemsRes.data || [],
        inventory: inventoryRes.data || [],
        waiters: waitersRes.data || [],
        offers: offersRes.data || [],
        profiles: profilesRes.data || [],
      },
    };

    // If client requested a direct download attachment
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="smart-billing-backup-${dateStr.slice(0, 10)}.json"`
      );
      return res.status(200).send(JSON.stringify(backupData, null, 2));
    }

    return res.status(200).json({
      success: true,
      message: 'Database backup snapshot generated successfully.',
      backup: backupData,
    });
  } catch (err: any) {
    console.error('Database backup export error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate database backup snapshot.',
    });
  }
}
