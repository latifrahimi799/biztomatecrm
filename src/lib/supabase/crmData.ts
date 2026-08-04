import type { Company, Contact, ContactLifecycle, Lead, LeadStatus, TeamMember } from '../../types/crm';
import { isSupabaseConfigured, supabase } from './client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return Boolean(value && UUID_RE.test(value));
}

type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  company_id: string | null;
  owner_id: string;
  tags: string[] | null;
  source: string;
  lifecycle: ContactLifecycle;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type LeadRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  score: number;
  source: string;
  notes: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  employee_count: string | null;
  address: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type TeamRow = {
  id: string;
  name: string;
  email: string;
  role: TeamMember['role'];
};

function mapContact(row: ContactRow): Contact {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? undefined,
    jobTitle: row.job_title ?? undefined,
    companyId: row.company_id ?? undefined,
    ownerId: row.owner_id,
    tags: row.tags ?? [],
    source: row.source ?? '',
    lifecycle: row.lifecycle,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status,
    score: Number(row.score) || 0,
    source: row.source ?? '',
    notes: row.notes ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry ?? undefined,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    employeeCount: row.employee_count ?? undefined,
    address: row.address ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTeam(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

function contactToRow(c: Contact, ownerId: string) {
  return {
    id: c.id,
    first_name: c.firstName,
    last_name: c.lastName,
    email: c.email,
    phone: c.phone ?? null,
    job_title: c.jobTitle ?? null,
    company_id: isUuid(c.companyId) ? c.companyId : null,
    owner_id: isUuid(c.ownerId) ? c.ownerId : ownerId,
    tags: c.tags ?? [],
    source: c.source ?? '',
    lifecycle: c.lifecycle,
    notes: c.notes ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function leadToRow(l: Lead, ownerId: string) {
  return {
    id: l.id,
    name: l.name,
    email: l.email,
    company: l.company ?? null,
    phone: l.phone ?? null,
    status: l.status,
    score: l.score,
    source: l.source ?? '',
    notes: l.notes ?? null,
    owner_id: isUuid(l.ownerId) ? l.ownerId : ownerId,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

export type CrmPeoplePayload = {
  contacts: Contact[];
  leads: Lead[];
  companies: Company[];
  team: TeamMember[];
  defaultOwnerId: string;
};

/**
 * Ensure at least one team_members row exists (contacts/leads require owner_id FK).
 */
export async function ensureDefaultOwner(
  displayName: string,
  email: string,
): Promise<{ ownerId: string; team: TeamMember[] } | { error: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const { data: existing, error: listErr } = await supabase
    .from('team_members')
    .select('id, name, email, role')
    .order('created_at', { ascending: true });

  if (listErr) return { error: listErr.message };

  const team = (existing as TeamRow[] | null)?.map(mapTeam) ?? [];
  if (team.length > 0) {
    return { ownerId: team[0].id, team };
  }

  const { data: created, error: insertErr } = await supabase
    .from('team_members')
    .insert({
      name: displayName || 'Workspace owner',
      email: email || 'owner@workspace.local',
      role: 'admin',
    })
    .select('id, name, email, role')
    .single();

  if (insertErr || !created) {
    return { error: insertErr?.message ?? 'Could not create team member.' };
  }

  const member = mapTeam(created as TeamRow);
  return { ownerId: member.id, team: [member] };
}

export async function fetchCrmPeople(
  displayName: string,
  email: string,
): Promise<CrmPeoplePayload | { error: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const owner = await ensureDefaultOwner(displayName, email);
  if ('error' in owner) return owner;

  const [companiesRes, contactsRes, leadsRes] = await Promise.all([
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase.from('contacts').select('*').order('updated_at', { ascending: false }),
    supabase.from('leads').select('*').order('updated_at', { ascending: false }),
  ]);

  if (companiesRes.error) return { error: companiesRes.error.message };
  if (contactsRes.error) return { error: contactsRes.error.message };
  if (leadsRes.error) return { error: leadsRes.error.message };

  return {
    companies: ((companiesRes.data as CompanyRow[]) ?? []).map(mapCompany),
    contacts: ((contactsRes.data as ContactRow[]) ?? []).map(mapContact),
    leads: ((leadsRes.data as LeadRow[]) ?? []).map(mapLead),
    team: owner.team,
    defaultOwnerId: owner.ownerId,
  };
}

export async function upsertContactRemote(
  contact: Contact,
  defaultOwnerId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!isUuid(contact.id) || !isUuid(defaultOwnerId)) {
    return 'Contact or owner id is not a valid UUID for Supabase.';
  }
  const { error } = await supabase
    .from('contacts')
    .upsert(contactToRow(contact, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteContactRemote(id: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !isUuid(id)) return null;
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertLeadRemote(
  lead: Lead,
  defaultOwnerId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!isUuid(lead.id) || !isUuid(defaultOwnerId)) {
    return 'Lead or owner id is not a valid UUID for Supabase.';
  }
  const { error } = await supabase
    .from('leads')
    .upsert(leadToRow(lead, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteLeadRemote(id: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !isUuid(id)) return null;
  const { error } = await supabase.from('leads').delete().eq('id', id);
  return error?.message ?? null;
}
