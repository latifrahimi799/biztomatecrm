/**
 * Full CRM workspace load + write-through for Supabase Postgres tables
 * (Accounts→companies, Contacts, Leads, Deals, Activities, Products, Quotes,
 * Email Templates, Campaigns — Zoho-style module set in this app).
 */
import type {
  Activity,
  Campaign,
  Company,
  Contact,
  ContactLifecycle,
  Deal,
  DealStage,
  EmailTemplate,
  Lead,
  LeadStatus,
  Product,
  Quote,
  TeamMember,
} from '../../types/crm';
import { LEAD_STATUSES } from '../../types/crm';
import type { EmailBlock } from '../../types/emailBlocks';
import { isSupabaseConfigured, supabase } from './client';
import { ensureWorkspaceIdentity } from './users';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LEGACY_LEAD_STATUS: Record<string, LeadStatus> = {
  new: 'dm',
  working: 'presentation',
  nurturing: 'stuck_gatekeeper',
  qualified: 'consultation_booked',
  converted: 'sold',
  disqualified: 'invalid_lead',
};

function normalizeLeadStatus(raw: string | null | undefined): LeadStatus {
  if (!raw) return 'dm';
  if ((LEAD_STATUSES as string[]).includes(raw)) return raw as LeadStatus;
  return LEGACY_LEAD_STATUS[raw] ?? 'dm';
}

export function isUuid(value: string | undefined | null): value is string {
  return Boolean(value && UUID_RE.test(value));
}

function optUuid(value: string | undefined | null): string | null {
  return isUuid(value) ? value : null;
}

function asDate(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function asIso(value: string | undefined | null): string | null {
  if (!value) return null;
  return value;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ——— row types ———

type TeamRow = { id: string; name: string; email: string; role: TeamMember['role'] };
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
  status: string;
  score: number;
  source: string;
  notes: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
type DealRow = {
  id: string;
  name: string;
  company_id: string | null;
  stage: DealStage;
  value: number | string;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
type DealContactRow = { deal_id: string; contact_id: string };
type ActivityRow = {
  id: string;
  type: Activity['type'];
  subject: string;
  body: string | null;
  due_at: string | null;
  completed_at: string | null;
  related_type: Activity['relatedType'] | null;
  related_id: string | null;
  owner_id: string;
  created_at: string;
};
type ProductRow = {
  id: string;
  name: string;
  sku: string;
  unit_price: number | string;
  currency: string;
  active: boolean;
  created_at: string;
};
type QuoteRow = {
  id: string;
  title: string;
  deal_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  status: Quote['status'];
  valid_until: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
type QuoteLineRow = {
  quote_id: string;
  product_id: string;
  quantity: number | string;
  discount_pct: number | string;
};
type TemplateRow = {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_format: string | null;
  blocks: EmailBlock[] | null;
  category: EmailTemplate['category'];
  active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
type CampaignRow = {
  id: string;
  name: string;
  type: Campaign['type'];
  status: Campaign['status'];
  start_date: string | null;
  end_date: string | null;
  budgeted_cost: number | string | null;
  actual_cost: number | string | null;
  expected_revenue: number | string | null;
  currency: string;
  description: string | null;
  template_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
type CampaignMemberRow = {
  campaign_id: string;
  member_type: 'contact' | 'lead';
  member_id: string;
};

// ——— mappers ———

function mapTeam(row: TeamRow): TeamMember {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
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
    status: normalizeLeadStatus(row.status),
    score: num(row.score),
    source: row.source ?? '',
    notes: row.notes ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeal(row: DealRow, contactIds: string[]): Deal {
  return {
    id: row.id,
    name: row.name,
    companyId: row.company_id ?? undefined,
    contactIds,
    stage: row.stage,
    value: num(row.value),
    currency: row.currency || 'CAD',
    probability: num(row.probability),
    expectedCloseDate: row.expected_close_date ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    body: row.body ?? undefined,
    dueAt: row.due_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    relatedType: row.related_type ?? undefined,
    relatedId: row.related_id ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    unitPrice: num(row.unit_price),
    currency: row.currency || 'CAD',
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

function mapQuote(row: QuoteRow, lines: Quote['lines']): Quote {
  return {
    id: row.id,
    title: row.title,
    dealId: row.deal_id ?? undefined,
    companyId: row.company_id ?? undefined,
    contactId: row.contact_id ?? undefined,
    lines,
    status: row.status,
    validUntil: row.valid_until ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row: TemplateRow): EmailTemplate {
  const bodyFormat =
    row.body_format === 'blocks' || row.body_format === 'html' ? row.body_format : 'html';
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body ?? '',
    bodyFormat,
    blocks: row.blocks ?? undefined,
    category: row.category,
    active: Boolean(row.active),
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCampaign(
  row: CampaignRow,
  contactIds: string[],
  leadIds: string[],
): Campaign {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    budgetedCost: row.budgeted_cost == null ? undefined : num(row.budgeted_cost),
    actualCost: row.actual_cost == null ? undefined : num(row.actual_cost),
    expectedRevenue: row.expected_revenue == null ? undefined : num(row.expected_revenue),
    currency: row.currency || 'CAD',
    description: row.description ?? undefined,
    templateId: row.template_id ?? undefined,
    contactIds,
    leadIds,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ——— to-row helpers ———

function companyToRow(c: Company, ownerId: string) {
  return {
    id: c.id,
    name: c.name,
    industry: c.industry ?? null,
    website: c.website ?? null,
    phone: c.phone ?? null,
    employee_count: c.employeeCount ?? null,
    address: c.address ?? null,
    owner_id: isUuid(c.ownerId) ? c.ownerId : ownerId,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
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
    company_id: optUuid(c.companyId),
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
    status: normalizeLeadStatus(l.status),
    score: l.score,
    source: l.source ?? '',
    notes: l.notes ?? null,
    owner_id: isUuid(l.ownerId) ? l.ownerId : ownerId,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

function dealToRow(d: Deal, ownerId: string) {
  return {
    id: d.id,
    name: d.name,
    company_id: optUuid(d.companyId),
    stage: d.stage,
    value: d.value,
    currency: d.currency || 'CAD',
    probability: d.probability,
    expected_close_date: asDate(d.expectedCloseDate),
    owner_id: isUuid(d.ownerId) ? d.ownerId : ownerId,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

function activityToRow(a: Activity, ownerId: string) {
  return {
    id: a.id,
    type: a.type,
    subject: a.subject,
    body: a.body ?? null,
    due_at: asIso(a.dueAt),
    completed_at: asIso(a.completedAt),
    related_type: a.relatedType ?? null,
    related_id: optUuid(a.relatedId),
    owner_id: isUuid(a.ownerId) ? a.ownerId : ownerId,
    created_at: a.createdAt,
  };
}

function productToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit_price: p.unitPrice,
    currency: p.currency || 'CAD',
    active: p.active,
    created_at: p.createdAt,
  };
}

function quoteToRow(q: Quote, ownerId: string) {
  return {
    id: q.id,
    title: q.title,
    deal_id: optUuid(q.dealId),
    company_id: optUuid(q.companyId),
    contact_id: optUuid(q.contactId),
    status: q.status,
    valid_until: asDate(q.validUntil),
    owner_id: isUuid(q.ownerId) ? q.ownerId : ownerId,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  };
}

function templateToRow(t: EmailTemplate, ownerId: string) {
  return {
    id: t.id,
    name: t.name,
    subject: t.subject,
    body: t.body ?? '',
    body_format: t.bodyFormat === 'blocks' ? 'blocks' : 'html',
    blocks: t.blocks ?? null,
    category: t.category,
    active: t.active,
    owner_id: isUuid(t.ownerId) ? t.ownerId : ownerId,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function campaignToRow(c: Campaign, ownerId: string) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    start_date: asDate(c.startDate),
    end_date: asDate(c.endDate),
    budgeted_cost: c.budgetedCost ?? null,
    actual_cost: c.actualCost ?? null,
    expected_revenue: c.expectedRevenue ?? null,
    currency: c.currency || 'CAD',
    description: c.description ?? null,
    template_id: optUuid(c.templateId),
    owner_id: isUuid(c.ownerId) ? c.ownerId : ownerId,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

// ——— ensure owner + fetch full workspace ———

export type CrmWorkspacePayload = {
  team: TeamMember[];
  companies: Company[];
  contacts: Contact[];
  leads: Lead[];
  deals: Deal[];
  activities: Activity[];
  products: Product[];
  quotes: Quote[];
  emailTemplates: EmailTemplate[];
  campaigns: Campaign[];
  defaultOwnerId: string;
};

export async function ensureDefaultOwner(
  displayName: string,
  email: string,
): Promise<{ ownerId: string; team: TeamMember[] } | { error: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const identity = await ensureWorkspaceIdentity(displayName, email);
  if ('error' in identity) return identity;

  const { data: existing, error: listErr } = await supabase
    .from('team_members')
    .select('id, name, email, role')
    .order('created_at', { ascending: true });

  if (listErr) return { error: listErr.message };

  const team = ((existing as TeamRow[] | null) ?? []).map(mapTeam);
  return { ownerId: identity.teamMemberId, team };
}

export async function fetchCrmWorkspace(
  displayName: string,
  email: string,
): Promise<CrmWorkspacePayload | { error: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const owner = await ensureDefaultOwner(displayName, email);
  if ('error' in owner) return owner;

  const [
    companiesRes,
    contactsRes,
    leadsRes,
    dealsRes,
    dealContactsRes,
    activitiesRes,
    productsRes,
    quotesRes,
    quoteLinesRes,
    templatesRes,
    campaignsRes,
    campaignMembersRes,
  ] = await Promise.all([
    supabase.from('companies').select('*').order('name', { ascending: true }),
    supabase.from('contacts').select('*').order('updated_at', { ascending: false }),
    supabase.from('leads').select('*').order('updated_at', { ascending: false }),
    supabase.from('deals').select('*').order('updated_at', { ascending: false }),
    supabase.from('deal_contacts').select('deal_id, contact_id'),
    supabase.from('activities').select('*').order('created_at', { ascending: false }),
    supabase.from('products').select('*').order('name', { ascending: true }),
    supabase.from('quotes').select('*').order('updated_at', { ascending: false }),
    supabase.from('quote_lines').select('quote_id, product_id, quantity, discount_pct'),
    supabase.from('email_templates').select('*').order('updated_at', { ascending: false }),
    supabase.from('campaigns').select('*').order('updated_at', { ascending: false }),
    supabase.from('campaign_members').select('campaign_id, member_type, member_id'),
  ]);

  const firstError =
    companiesRes.error ||
    contactsRes.error ||
    leadsRes.error ||
    dealsRes.error ||
    dealContactsRes.error ||
    activitiesRes.error ||
    productsRes.error ||
    quotesRes.error ||
    quoteLinesRes.error ||
    templatesRes.error ||
    campaignsRes.error ||
    campaignMembersRes.error;

  if (firstError) return { error: firstError.message };

  const dealContacts = (dealContactsRes.data as DealContactRow[]) ?? [];
  const contactsByDeal = new Map<string, string[]>();
  for (const row of dealContacts) {
    const list = contactsByDeal.get(row.deal_id) ?? [];
    list.push(row.contact_id);
    contactsByDeal.set(row.deal_id, list);
  }

  const quoteLines = (quoteLinesRes.data as QuoteLineRow[]) ?? [];
  const linesByQuote = new Map<string, Quote['lines']>();
  for (const row of quoteLines) {
    const list = linesByQuote.get(row.quote_id) ?? [];
    list.push({
      productId: row.product_id,
      quantity: num(row.quantity, 1),
      discountPct: num(row.discount_pct),
    });
    linesByQuote.set(row.quote_id, list);
  }

  const members = (campaignMembersRes.data as CampaignMemberRow[]) ?? [];
  const campaignContacts = new Map<string, string[]>();
  const campaignLeads = new Map<string, string[]>();
  for (const row of members) {
    if (row.member_type === 'contact') {
      const list = campaignContacts.get(row.campaign_id) ?? [];
      list.push(row.member_id);
      campaignContacts.set(row.campaign_id, list);
    } else {
      const list = campaignLeads.get(row.campaign_id) ?? [];
      list.push(row.member_id);
      campaignLeads.set(row.campaign_id, list);
    }
  }

  return {
    team: owner.team,
    defaultOwnerId: owner.ownerId,
    companies: ((companiesRes.data as CompanyRow[]) ?? []).map(mapCompany),
    contacts: ((contactsRes.data as ContactRow[]) ?? []).map(mapContact),
    leads: ((leadsRes.data as LeadRow[]) ?? []).map(mapLead),
    deals: ((dealsRes.data as DealRow[]) ?? []).map((d) =>
      mapDeal(d, contactsByDeal.get(d.id) ?? []),
    ),
    activities: ((activitiesRes.data as ActivityRow[]) ?? []).map(mapActivity),
    products: ((productsRes.data as ProductRow[]) ?? []).map(mapProduct),
    quotes: ((quotesRes.data as QuoteRow[]) ?? []).map((q) =>
      mapQuote(q, linesByQuote.get(q.id) ?? []),
    ),
    emailTemplates: ((templatesRes.data as TemplateRow[]) ?? []).map(mapTemplate),
    campaigns: ((campaignsRes.data as CampaignRow[]) ?? []).map((c) =>
      mapCampaign(c, campaignContacts.get(c.id) ?? [], campaignLeads.get(c.id) ?? []),
    ),
  };
}

// ——— write helpers ———

async function requireClient() {
  if (!isSupabaseConfigured || !supabase) return null;
  return supabase;
}

export async function upsertCompanyRemote(
  company: Company,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(company.id)) return null;
  const { error } = await client
    .from('companies')
    .upsert(companyToRow(company, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteCompanyRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('companies').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertContactRemote(
  contact: Contact,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(contact.id)) return null;
  const { error } = await client
    .from('contacts')
    .upsert(contactToRow(contact, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteContactRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('contacts').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertLeadRemote(
  lead: Lead,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(lead.id)) return null;
  const { error } = await client
    .from('leads')
    .upsert(leadToRow(lead, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteLeadRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('leads').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertDealRemote(
  deal: Deal,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(deal.id)) return null;
  const { error } = await client
    .from('deals')
    .upsert(dealToRow(deal, defaultOwnerId), { onConflict: 'id' });
  if (error) return error.message;

  await client.from('deal_contacts').delete().eq('deal_id', deal.id);
  const links = deal.contactIds
    .filter(isUuid)
    .map((contact_id) => ({ deal_id: deal.id, contact_id }));
  if (links.length > 0) {
    const { error: linkErr } = await client.from('deal_contacts').insert(links);
    if (linkErr) return linkErr.message;
  }
  return null;
}

export async function deleteDealRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('deals').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertActivityRemote(
  activity: Activity,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(activity.id)) return null;
  const { error } = await client
    .from('activities')
    .upsert(activityToRow(activity, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteActivityRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('activities').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertProductRemote(product: Product): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(product.id)) return null;
  const { error } = await client
    .from('products')
    .upsert(productToRow(product), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteProductRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('products').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertQuoteRemote(
  quote: Quote,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(quote.id)) return null;
  const { error } = await client
    .from('quotes')
    .upsert(quoteToRow(quote, defaultOwnerId), { onConflict: 'id' });
  if (error) return error.message;

  await client.from('quote_lines').delete().eq('quote_id', quote.id);
  const lines = quote.lines
    .filter((l) => isUuid(l.productId))
    .map((l) => ({
      quote_id: quote.id,
      product_id: l.productId,
      quantity: l.quantity,
      discount_pct: l.discountPct,
    }));
  if (lines.length > 0) {
    const { error: lineErr } = await client.from('quote_lines').insert(lines);
    if (lineErr) return lineErr.message;
  }
  return null;
}

export async function deleteQuoteRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('quotes').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertTemplateRemote(
  template: EmailTemplate,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(template.id)) return null;
  const { error } = await client
    .from('email_templates')
    .upsert(templateToRow(template, defaultOwnerId), { onConflict: 'id' });
  return error?.message ?? null;
}

export async function deleteTemplateRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('email_templates').delete().eq('id', id);
  return error?.message ?? null;
}

export async function upsertCampaignRemote(
  campaign: Campaign,
  defaultOwnerId: string,
): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(campaign.id)) return null;
  const { error } = await client
    .from('campaigns')
    .upsert(campaignToRow(campaign, defaultOwnerId), { onConflict: 'id' });
  if (error) return error.message;

  await client.from('campaign_members').delete().eq('campaign_id', campaign.id);
  const members = [
    ...campaign.contactIds.filter(isUuid).map((member_id) => ({
      campaign_id: campaign.id,
      member_type: 'contact' as const,
      member_id,
    })),
    ...campaign.leadIds.filter(isUuid).map((member_id) => ({
      campaign_id: campaign.id,
      member_type: 'lead' as const,
      member_id,
    })),
  ];
  if (members.length > 0) {
    const { error: memErr } = await client.from('campaign_members').insert(members);
    if (memErr) return memErr.message;
  }
  return null;
}

export async function deleteCampaignRemote(id: string): Promise<string | null> {
  const client = await requireClient();
  if (!client || !isUuid(id)) return null;
  const { error } = await client.from('campaigns').delete().eq('id', id);
  return error?.message ?? null;
}

/** @deprecated Use fetchCrmWorkspace */
export type CrmPeoplePayload = Pick<
  CrmWorkspacePayload,
  'contacts' | 'leads' | 'companies' | 'team' | 'defaultOwnerId'
>;

/** @deprecated Use fetchCrmWorkspace */
export async function fetchCrmPeople(
  displayName: string,
  email: string,
): Promise<CrmPeoplePayload | { error: string }> {
  const full = await fetchCrmWorkspace(displayName, email);
  if ('error' in full) return full;
  return {
    contacts: full.contacts,
    leads: full.leads,
    companies: full.companies,
    team: full.team,
    defaultOwnerId: full.defaultOwnerId,
  };
}
