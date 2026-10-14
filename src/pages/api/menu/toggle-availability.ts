import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../../../lib/supabaseClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getServerSupabase = () => {
  if (serviceRoleKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return defaultSupabase;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id, is_available } = req.body;

  if (!id || typeof is_available !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Dish ID and boolean is_available status are required.',
    });
  }

  try {
    const db = getServerSupabase();
    const { data, error } = await db
      .from('menu_items')
      .update({
        is_available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('API toggle menu error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const updatedItem = data && data.length > 0 ? data[0] : null;

    return res.status(200).json({
      success: true,
      item: updatedItem,
    });
  } catch (err: any) {
    console.error('Server error updating item availability:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
