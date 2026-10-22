import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../../lib/supabaseClient';
import { checkRateLimit } from '../../../lib/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate Limiting: 10 user deletion requests per minute per IP
  if (!checkRateLimit(req, res, { limit: 10, windowMs: 60 * 1000, keyPrefix: 'admin_delete_user' })) {
    return;
  }

  const { userId, userType = 'profile' } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: userId is required.',
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let client = defaultClient;
    let adminAuthClient: any = null;

    if (serviceRoleKey && supabaseUrl) {
      client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      adminAuthClient = client.auth.admin;
    }

    if (userType === 'waiter') {
      // Delete from waiters table
      const { error: waiterErr } = await client.from('waiters').delete().eq('id', userId);
      if (waiterErr) throw waiterErr;

      return res.status(200).json({
        success: true,
        message: 'Floor waiter record removed successfully from database.',
      });
    }

    // Deleting a portal user account (profiles + auth.users)
    if (adminAuthClient) {
      // 1. Delete from Supabase Auth admin
      const { error: authDeleteErr } = await adminAuthClient.deleteUser(userId);
      if (authDeleteErr) {
        console.warn('Auth admin delete notice:', authDeleteErr.message);
      }
    }

    // 2. Explicitly remove from profiles table
    const { error: profileDeleteErr } = await client.from('profiles').delete().eq('id', userId);
    if (profileDeleteErr) throw profileDeleteErr;

    // 3. If waiter record exists with same ID, remove it too
    await client.from('waiters').delete().eq('id', userId);

    return res.status(200).json({
      success: true,
      message: 'Staff account permanently deleted from the system.',
    });
  } catch (err: any) {
    console.error('Account deletion error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete staff account.',
    });
  }
}
