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

  // Rate Limiting: 10 password reset attempts per minute per IP
  if (!checkRateLimit(req, res, { limit: 10, windowMs: 60 * 1000, keyPrefix: 'admin_reset_pwd' })) {
    return;
  }

  const { userId, newPassword, email, targetType = 'profile' } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: userId and newPassword are required.',
    });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long.',
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Handle Waiter passcode / pin reset
    if (targetType === 'waiter') {
      let client = defaultClient;
      if (serviceRoleKey && supabaseUrl) {
        client = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      }

      const { data, error } = await client
        .from('waiters')
        .update({ emp_code: newPassword.trim() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: `Waiter login code updated successfully to: ${newPassword.trim()}`,
        waiter: data,
      });
    }

    // 2. Handle Supabase Auth User Password Reset (Admin, Cashier, Kitchen)
    if (serviceRoleKey && supabaseUrl) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: userData, error: updateErr } = await adminClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateErr) throw updateErr;

      // Update profile updated_at
      await adminClient
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId);

      return res.status(200).json({
        success: true,
        message: `Password updated successfully for account ${userData.user?.email || email || userId}.`,
        user: { id: userData.user?.id, email: userData.user?.email },
      });
    } else {
      // Fallback: If service role key is not configured, attempt password reset via default client or return clear instruction
      return res.status(500).json({
        success: false,
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable admin password resets.',
      });
    }
  } catch (err: any) {
    console.error('Password reset error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update user password. Please try again.',
    });
  }
}
