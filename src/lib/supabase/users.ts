import type { TeamMember } from '../../types/crm';
import { isSupabaseConfigured, supabase } from './client';
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type AppRole = TeamMember['role'];

export type WorkspaceIdentity = {
  userId: string;
  teamMemberId: string;
  role: AppRole;
  name: string;
  email: string;
  isSuperAdmin: boolean;
};

function isSuperRole(role: string | null | undefined): boolean {
  return role === 'super_admin';
}

/**
 * Ensure the signed-in auth user has a team_members row + profiles.team_member_id.
 * First workspace user becomes super_admin; later invites keep the role assigned by admin.
 */
export async function ensureWorkspaceIdentity(
  displayName: string,
  email: string,
): Promise<WorkspaceIdentity | { error: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { error: userErr?.message ?? 'Not signed in.' };

  const userEmail = (user.email ?? email).trim().toLowerCase();
  const name =
    displayName ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    userEmail.split('@')[0] ||
    'User';

  // Ensure profile row exists
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, team_member_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) return { error: profileErr.message };

  let teamMemberId = profile?.team_member_id as string | null;

  if (teamMemberId) {
    const { data: tm, error: tmErr } = await supabase
      .from('team_members')
      .select('id, name, email, role')
      .eq('id', teamMemberId)
      .maybeSingle();
    if (tmErr) return { error: tmErr.message };
    if (tm) {
      return {
        userId: user.id,
        teamMemberId: tm.id,
        role: tm.role as AppRole,
        name: tm.name,
        email: tm.email,
        isSuperAdmin: isSuperRole(tm.role),
      };
    }
  }

  // Match by email (pre-created by super admin)
  const { data: byEmail } = await supabase
    .from('team_members')
    .select('id, name, email, role')
    .ilike('email', userEmail)
    .maybeSingle();

  if (byEmail) {
    teamMemberId = byEmail.id;
  } else {
    // Create seat — first seat becomes super_admin if none exists
    const { count } = await supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true });

    const role: AppRole = (count ?? 0) === 0 ? 'super_admin' : 'sales';

    const { data: created, error: createErr } = await supabase
      .from('team_members')
      .insert({
        name,
        email: userEmail,
        role,
      })
      .select('id, name, email, role')
      .single();

    if (createErr || !created) {
      return { error: createErr?.message ?? 'Could not create team member.' };
    }
    teamMemberId = created.id;
  }

  const { error: linkErr } = await supabase
    .from('profiles')
    .update({
      team_member_id: teamMemberId,
      display_name: name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (linkErr) return { error: linkErr.message };

  const { data: tm } = await supabase
    .from('team_members')
    .select('id, name, email, role')
    .eq('id', teamMemberId)
    .single();

  if (!tm) return { error: 'Team member missing after link.' };

  return {
    userId: user.id,
    teamMemberId: tm.id,
    role: tm.role as AppRole,
    name: tm.name,
    email: tm.email,
    isSuperAdmin: isSuperRole(tm.role),
  };
}

export async function listTeamMembers(): Promise<TeamMember[] | { error: string }> {
  if (!isSupabaseConfigured || !supabase) return { error: 'Supabase is not configured.' };
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, email, role')
    .order('created_at', { ascending: true });
  if (error) return { error: error.message };
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    role: r.role as AppRole,
  }));
}

export async function updateTeamMemberRole(
  teamMemberId: string,
  role: AppRole,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return 'Supabase is not configured.';
  const { error } = await supabase
    .from('team_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', teamMemberId);
  return error?.message ?? null;
}

/**
 * Super Admin creates an Auth user + team seat.
 * Uses a separate Supabase client so the admin session is not replaced.
 */
export async function createTeamUser(input: {
  name: string;
  email: string;
  password: string;
  role: AppRole;
}): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !url || !anonKey) {
    return 'Supabase is not configured.';
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || email.split('@')[0];
  if (!email || !input.password || input.password.length < 6) {
    return 'Email and password (min 6 characters) are required.';
  }

  // Secondary client — does not share session storage with the admin client
  const inviteClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: signed, error: signErr } = await inviteClient.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: name,
        name,
      },
    },
  });

  if (signErr) return signErr.message;
  const newUserId = signed.user?.id;
  if (!newUserId) {
    return 'User may already exist or email confirmation is required. Check Auth users, then assign a role.';
  }

  // Create / update team_member seat with chosen role
  const { data: existingSeat } = await supabase
    .from('team_members')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  let teamMemberId: string;
  if (existingSeat?.id) {
    teamMemberId = existingSeat.id as string;
    const { error } = await supabase
      .from('team_members')
      .update({
        name,
        role: input.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamMemberId);
    if (error) return error.message;
  } else {
    const { data: created, error } = await supabase
      .from('team_members')
      .insert({
        name,
        email,
        role: input.role,
      })
      .select('id')
      .single();
    if (error || !created) return error?.message ?? 'Could not create team seat.';
    teamMemberId = created.id as string;
  }

  // Link profile (trigger may have created it)
  const { error: linkErr } = await supabase.from('profiles').upsert(
    {
      id: newUserId,
      display_name: name,
      team_member_id: teamMemberId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (linkErr) return linkErr.message;

  return null;
}
