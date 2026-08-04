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

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * profiles.id → auth.users(id). Only update/insert a profile after the auth row exists.
 * Prefer update; the DB trigger usually creates the row on signup.
 */
async function linkProfileToTeam(
  authUserId: string,
  displayName: string,
  teamMemberId: string,
): Promise<string | null> {
  if (!supabase) return 'Supabase is not configured.';

  // Wait briefly for handle_new_user trigger
  for (let i = 0; i < 8; i++) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          team_member_id: teamMemberId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUserId);
      return error?.message ?? null;
    }
    await sleep(150);
  }

  // Profile missing (trigger not installed) — insert only if we know auth user was created by signUp
  const { error: insertErr } = await supabase.from('profiles').insert({
    id: authUserId,
    display_name: displayName,
    team_member_id: teamMemberId,
    updated_at: new Date().toISOString(),
  });

  if (!insertErr) return null;

  // FK violation or RLS: seat is still created; user can link on first login
  if (
    insertErr.code === '23503' ||
    insertErr.message.includes('profiles_id_fkey') ||
    insertErr.message.includes('foreign key')
  ) {
    return (
      'Auth user or email confirmation may be pending. Team seat was created; ' +
      'profile will link automatically when they sign in. ' +
      'If the email already exists in Authentication → Users, reset their password there instead of re-adding.'
    );
  }

  return insertErr.message;
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

  // Profile is created by auth trigger. Load or create safely (only own auth user id).
  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, team_member_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) return { error: profileErr.message };

  if (!profile) {
    const { error: upsertErr } = await supabase.from('profiles').insert({
      id: user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    });
    if (upsertErr && upsertErr.code !== '23505') {
      // 23505 unique violation = race with trigger — fine
      if (
        upsertErr.code === '23503' ||
        upsertErr.message.includes('profiles_id_fkey')
      ) {
        return {
          error:
            'Could not create profile: auth user missing. Sign out and sign in again, or check Supabase Auth.',
        };
      }
      return { error: upsertErr.message };
    }
    const re = await supabase
      .from('profiles')
      .select('id, team_member_id, display_name')
      .eq('id', user.id)
      .maybeSingle();
    profile = re.data;
    if (re.error) return { error: re.error.message };
  }

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

  if (signErr) {
    const msg = signErr.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      // Still ensure CRM seat exists for a pre-existing Auth user
      const seatOnly = await ensureTeamSeat(email, name, input.role);
      if (seatOnly) return seatOnly;
      return (
        'That email is already in Supabase Auth. CRM seat/role was saved — they should sign in with their existing password (reset it in Auth if needed).'
      );
    }
    return signErr.message;
  }

  const newUser = signed.user;
  // Supabase often returns a user object with empty identities when the email already exists
  const fakeExisting =
    !newUser?.id ||
    (Array.isArray(newUser.identities) && newUser.identities.length === 0);

  if (fakeExisting) {
    const seatOnly = await ensureTeamSeat(email, name, input.role);
    if (seatOnly) return seatOnly;
    return (
      'That email is already registered in Authentication. CRM seat/role was saved. ' +
      'Do not re-create the login — share existing credentials or set a new password in Supabase Auth.'
    );
  }

  const newUserId = newUser.id;

  const seat = await ensureTeamSeatReturnId(email, name, input.role);
  if ('error' in seat) return seat.error;

  const linkErr = await linkProfileToTeam(newUserId, name, seat.id);
  if (linkErr) {
    console.warn('[createTeamUser] profile link:', linkErr);
  }

  return null;
}

/** null = ok, string = error message */
async function ensureTeamSeat(
  email: string,
  name: string,
  role: AppRole,
): Promise<string | null> {
  const r = await ensureTeamSeatReturnId(email, name, role);
  return 'error' in r ? r.error : null;
}

async function ensureTeamSeatReturnId(
  email: string,
  name: string,
  role: AppRole,
): Promise<{ id: string } | { error: string }> {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { data: existingSeat } = await supabase
    .from('team_members')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existingSeat?.id) {
    const teamMemberId = existingSeat.id as string;
    const { error } = await supabase
      .from('team_members')
      .update({
        name,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamMemberId);
    if (error) return { error: error.message };
    return { id: teamMemberId };
  }

  const { data: created, error } = await supabase
    .from('team_members')
    .insert({
      name,
      email,
      role,
    })
    .select('id')
    .single();
  if (error || !created) {
    return { error: error?.message ?? 'Could not create team seat.' };
  }
  return { id: created.id as string };
}
