import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../../lib/supabaseClient';
import { UserRole } from '../../../types/database.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password, fullName, role, phone } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: email, password, fullName, and role are required.',
    });
  }

  const validRoles: UserRole[] = ['admin', 'cashier', 'kitchen'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: `Invalid role specified: ${role}. Valid roles are: ${validRoles.join(', ')}`,
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long.',
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let userId: string | null = null;

    if (serviceRoleKey && supabaseUrl) {
      // Use Admin service role client for direct privileged user creation
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          role: role,
        },
      });

      if (createErr) throw createErr;
      userId = userData.user.id;

      // Upsert profile
      const { error: profileErr } = await adminClient.from('profiles').upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role: role,
        phone: phone?.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      if (profileErr) console.warn('Admin profile upsert warning:', profileErr);
    } else {
      // Standard Supabase client sign up
      const { data: signUpData, error: signUpErr } = await defaultClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
          },
        },
      });

      if (signUpErr) throw signUpErr;
      userId = signUpData.user?.id || null;

      if (userId) {
        // Upsert into profiles
        const { error: profileErr } = await defaultClient.from('profiles').upsert({
          id: userId,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: role,
          phone: phone?.trim() || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        });

        if (profileErr) console.warn('Profile upsert warning:', profileErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `User account created successfully for ${email} with role '${role}'.`,
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role: role,
        is_active: true,
      },
    });
  } catch (err: any) {
    console.error('Error creating staff user account:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create user account.',
    });
  }
}
