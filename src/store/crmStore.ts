import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Activity,
  Campaign,
  Company,
  Contact,
  Deal,
  DealStage,
  EmailTemplate,
  Id,
  Lead,
  Product,
  Quote,
  TeamMember,
} from '../types/crm';
import { normalizeLeadContactFields } from '../types/crm';
import { blocksToEmailHtml } from '../lib/emailBlocks/renderEmailHtml';
import { createTextBlock, createButtonBlock } from '../lib/emailBlocks/blockFactory';
import { defaultTextStyle } from '../types/emailBlocks';
import {
  deleteActivityRemote,
  deleteCampaignRemote,
  deleteCompanyRemote,
  deleteContactRemote,
  deleteDealRemote,
  deleteTemplateRemote,
  isUuid,
  type CrmWorkspacePayload,
  upsertActivityRemote,
  upsertCampaignRemote,
  upsertCompanyRemote,
  upsertContactRemote,
  upsertDealRemote,
  upsertLeadRemote,
  upsertProductRemote,
  upsertQuoteRemote,
  upsertTemplateRemote,
} from '../lib/supabase/crmData';
import { isSupabaseConfigured } from '../lib/supabase/client';

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const OWNER = 'user-1';

export type RemoteSyncStatus = 'idle' | 'loading' | 'ready' | 'error';

function resolveOwnerId(
  preferred: string | undefined,
  state: { defaultOwnerId: string | null },
): string {
  if (preferred && isUuid(preferred)) return preferred;
  if (state.defaultOwnerId && isUuid(state.defaultOwnerId)) return state.defaultOwnerId;
  return preferred || OWNER;
}

function remoteOwner(state: { defaultOwnerId: string | null }): string | null {
  return state.defaultOwnerId && isUuid(state.defaultOwnerId) ? state.defaultOwnerId : null;
}

function logRemote(entity: string, err: string | null) {
  if (err) console.error(`[crm] ${entity}:`, err);
}

function queueCompanyUpsert(company: Company, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertCompanyRemote(company, ownerId).then((e) => logRemote('company upsert', e));
}
function queueCompanyDelete(id: string) {
  if (!isSupabaseConfigured) return;
  void deleteCompanyRemote(id).then((e) => logRemote('company delete', e));
}
function queueContactUpsert(contact: Contact, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertContactRemote(contact, ownerId).then((e) => logRemote('contact upsert', e));
}
function queueContactDelete(id: string) {
  if (!isSupabaseConfigured) return;
  void deleteContactRemote(id).then((e) => logRemote('contact delete', e));
}
function queueLeadUpsert(lead: Lead, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertLeadRemote(lead, ownerId).then((e) => logRemote('lead upsert', e));
}
function queueDealUpsert(deal: Deal, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertDealRemote(deal, ownerId).then((e) => logRemote('deal upsert', e));
}
function queueDealDelete(id: string) {
  if (!isSupabaseConfigured) return;
  void deleteDealRemote(id).then((e) => logRemote('deal delete', e));
}
function queueActivityUpsert(activity: Activity, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertActivityRemote(activity, ownerId).then((e) => logRemote('activity upsert', e));
}
function queueActivityDelete(id: string) {
  if (!isSupabaseConfigured) return;
  void deleteActivityRemote(id).then((e) => logRemote('activity delete', e));
}
function queueProductUpsert(product: Product) {
  if (!isSupabaseConfigured) return;
  void upsertProductRemote(product).then((e) => logRemote('product upsert', e));
}
function queueQuoteUpsert(quote: Quote, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertQuoteRemote(quote, ownerId).then((e) => logRemote('quote upsert', e));
}
function queueTemplateUpsert(template: EmailTemplate, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertTemplateRemote(template, ownerId).then((e) => logRemote('template upsert', e));
}
function queueTemplateDelete(id: string) {
  if (!isSupabaseConfigured) return;
  void deleteTemplateRemote(id).then((e) => logRemote('template delete', e));
}
function queueCampaignUpsert(campaign: Campaign, ownerId: string | null) {
  if (!isSupabaseConfigured || !ownerId) return;
  void upsertCampaignRemote(campaign, ownerId).then((e) => logRemote('campaign upsert', e));
}
function queueCampaignDelete(id: string) {
  if (!isSupabaseConfigured) return;
  void deleteCampaignRemote(id).then((e) => logRemote('campaign delete', e));
}

/** Single owner row used when CRM starts empty (production). */
const minimalTeam: TeamMember[] = [
  { id: OWNER, name: 'Workspace owner', email: 'owner@workspace.local', role: 'admin' },
];

/**
 * Demo Northwind-style dataset — local dev only.
 * Production never seeds demo records (ignore VITE_DEMO_DATA=true on deployed builds).
 */
function useDemoSeed(): boolean {
  if (import.meta.env.PROD) return false;
  const flag = import.meta.env.VITE_DEMO_DATA;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return import.meta.env.DEV;
}

const seedCompanies: Company[] = [
  {
    id: 'co-1',
    name: 'Northwind Traders',
    industry: 'Retail',
    website: 'https://northwind.example',
    phone: '+1 415 555 0100',
    employeeCount: '500–1000',
    address: 'San Francisco, CA',
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'co-2',
    name: 'Contoso Labs',
    industry: 'Technology',
    website: 'https://contoso.example',
    phone: '+44 20 7946 0958',
    employeeCount: '50–200',
    address: 'London, UK',
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedContacts: Contact[] = [
  {
    id: 'ct-1',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 's.chen@northwind.example',
    phone: '+1 415 555 0142',
    jobTitle: 'VP Operations',
    companyId: 'co-1',
    ownerId: OWNER,
    tags: ['decision-maker', 'priority'],
    source: 'Biztomate Scanner event',
    lifecycle: 'customer',
    createdAt: now(),
    updatedAt: now(),
    notes: 'Interested in enterprise rollout for field teams.',
  },
  {
    id: 'ct-2',
    firstName: 'James',
    lastName: 'Okonkwo',
    email: 'j.okonkwo@contoso.example',
    phone: '+44 20 7946 0881',
    jobTitle: 'Head of IT',
    companyId: 'co-2',
    ownerId: OWNER,
    tags: ['technical'],
    source: 'LinkedIn',
    lifecycle: 'lead',
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedDeals: Deal[] = [
  {
    id: 'dl-1',
    name: 'Northwind — Annual platform',
    companyId: 'co-1',
    contactIds: ['ct-1'],
    stage: 'negotiation',
    value: 48000,
    currency: 'CAD',
    probability: 70,
    expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'dl-2',
    name: 'Contoso — Pilot + 50 seats',
    companyId: 'co-2',
    contactIds: ['ct-2'],
    stage: 'proposal',
    value: 12000,
    currency: 'GBP',
    probability: 40,
    expectedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'dl-3',
    name: 'Inbound SMB — starter',
    companyId: undefined,
    contactIds: [],
    stage: 'lead',
    value: 2400,
    currency: 'CAD',
    probability: 15,
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedActivities: Activity[] = [
  {
    id: 'ac-1',
    type: 'meeting',
    subject: 'Q2 renewal discussion — Northwind',
    body: 'Review success metrics and expansion seats.',
    dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    relatedType: 'deal',
    relatedId: 'dl-1',
    ownerId: OWNER,
    createdAt: now(),
  },
  {
    id: 'ac-2',
    type: 'call',
    subject: 'Technical scoping with James',
    relatedType: 'contact',
    relatedId: 'ct-2',
    ownerId: OWNER,
    createdAt: now(),
  },
  {
    id: 'ac-3',
    type: 'task',
    subject: 'Send updated quote for Contoso pilot',
    dueAt: new Date(Date.now() + 1 * 86400000).toISOString(),
    relatedType: 'deal',
    relatedId: 'dl-2',
    ownerId: OWNER,
    createdAt: now(),
  },
];

const seedLeads: Lead[] = [
  {
    id: 'ld-1',
    name: 'Maria Volkov',
    email: 'maria.v@example.org',
    emails: ['maria.v@example.org'],
    company: 'BrightPath Health',
    phone: '+1 555 0101',
    phones: ['+1 555 0101'],
    website: 'https://brightpath.example',
    status: 'presentation',
    score: 72,
    source: 'Website form',
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'ld-2',
    name: 'David Park',
    email: 'd.park@example.org',
    emails: ['d.park@example.org'],
    company: 'Urban Logistics Co',
    phones: [],
    status: 'dm',
    score: 45,
    source: 'Referral',
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedProducts: Product[] = [
  {
    id: 'pr-1',
    name: 'Biztomate Scanner — Basic',
    sku: 'BTM-BASIC-M',
    unitPrice: 9.99,
    currency: 'CAD',
    active: true,
    createdAt: now(),
  },
  {
    id: 'pr-2',
    name: 'Biztomate Scanner — Premium',
    sku: 'BTM-PREM-Y',
    unitPrice: 79,
    currency: 'CAD',
    active: true,
    createdAt: now(),
  },
  {
    id: 'pr-3',
    name: 'Enterprise — per seat / year',
    sku: 'BTM-ENT-SEAT',
    unitPrice: 120,
    currency: 'CAD',
    active: true,
    createdAt: now(),
  },
];

const seedQuotes: Quote[] = [
  {
    id: 'qu-1',
    title: 'Northwind expansion Q2',
    dealId: 'dl-1',
    companyId: 'co-1',
    contactId: 'ct-1',
    lines: [
      { productId: 'pr-3', quantity: 200, discountPct: 10 },
    ],
    status: 'sent',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedTeam: TeamMember[] = [
  { id: 'user-1', name: 'Alex Morgan', email: 'alex@biztomate.com', role: 'admin' },
  { id: 'user-2', name: 'Jordan Lee', email: 'jordan@biztomate.com', role: 'sales' },
  { id: 'user-3', name: 'Casey Rivera', email: 'casey@biztomate.com', role: 'marketing' },
];

const seedTemplateBlocks = [
  {
    ...createTextBlock(),
    id: 'eb-seed-1',
    content:
      'Hi {{FirstName}} {{LastName}},\n\nThanks for your interest in automation at {{Company}}.\n\n— The Biztomate team',
    style: { ...defaultTextStyle(), fontSize: 17 },
  },
  {
    ...createButtonBlock(),
    id: 'eb-seed-2',
    label: 'See how it works',
    href: 'https://biztomate.com',
  },
];

const seedTemplateBody = blocksToEmailHtml([...seedTemplateBlocks]);

const seedEmailTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Q2 product intro',
    subject: 'Hi {{FirstName}} — quick note from Biztomate',
    body: seedTemplateBody,
    bodyFormat: 'blocks',
    blocks: [...seedTemplateBlocks],
    category: 'campaign',
    active: true,
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedCampaigns: Campaign[] = [
  {
    id: 'cmp-1',
    name: 'Spring scanner launch',
    type: 'email',
    status: 'active',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    budgetedCost: 5000,
    actualCost: 1200,
    expectedRevenue: 40000,
    currency: 'CAD',
    description: 'Email series to existing customers and warm leads.',
    templateId: 'tmpl-1',
    contactIds: ['ct-1'],
    leadIds: ['ld-1'],
    ownerId: OWNER,
    createdAt: now(),
    updatedAt: now(),
  },
];

interface CrmState {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  leads: Lead[];
  products: Product[];
  quotes: Quote[];
  team: TeamMember[];
  emailTemplates: EmailTemplate[];
  campaigns: Campaign[];
  searchQuery: string;

  /** Owner used for Supabase contact/lead inserts (team_members.id). */
  defaultOwnerId: string | null;
  remoteSyncStatus: RemoteSyncStatus;
  remoteSyncError: string | null;

  setRemoteSyncState: (s: { status: RemoteSyncStatus; error: string | null }) => void;
  applyRemoteWorkspace: (payload: CrmWorkspacePayload) => void;

  addCompany: (c: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCompany: (id: Id, patch: Partial<Company>) => void;
  removeCompany: (id: Id) => void;

  addContact: (c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Contact;
  updateContact: (id: Id, patch: Partial<Contact>) => void;
  removeContact: (id: Id) => void;

  addDeal: (d: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDeal: (id: Id, patch: Partial<Deal>) => void;
  moveDealStage: (id: Id, stage: DealStage) => void;
  removeDeal: (id: Id) => void;

  addActivity: (a: Omit<Activity, 'id' | 'createdAt'>) => void;
  updateActivity: (id: Id, patch: Partial<Activity>) => void;
  completeActivity: (id: Id) => void;
  removeActivity: (id: Id) => void;

  addLead: (patch: Partial<Lead>) => void;
  updateLead: (id: Id, patch: Partial<Lead>) => void;
  convertLead: (
    leadId: Id,
    overrides?: Partial<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => void;

  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: Id, patch: Partial<Product>) => void;

  addQuote: (q: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'lines'>) => Quote;
  updateQuote: (id: Id, patch: Partial<Quote>) => void;

  addEmailTemplate: (t: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => EmailTemplate;
  updateEmailTemplate: (id: Id, patch: Partial<EmailTemplate>) => void;
  removeEmailTemplate: (id: Id) => void;

  addCampaign: (
    c: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'contactIds' | 'leadIds'> & {
      contactIds?: Id[];
      leadIds?: Id[];
    },
  ) => Campaign;
  updateCampaign: (id: Id, patch: Partial<Campaign>) => void;
  removeCampaign: (id: Id) => void;
  addCampaignContact: (campaignId: Id, contactId: Id) => void;
  removeCampaignContact: (campaignId: Id, contactId: Id) => void;
  addCampaignLead: (campaignId: Id, leadId: Id) => void;
  removeCampaignLead: (campaignId: Id, leadId: Id) => void;

  setSearchQuery: (q: string) => void;
  resetDemoData: () => void;
  /** Replace CRM entity data from a backup file (same shape as export). */
  importCrmBackup: (payload: CrmBackupV1) => void;
}

export const CRM_BACKUP_VERSION = 1 as const;

/** Persisted CRM entities — matches zustand `partialize` keys. */
export type CrmPersistedData = Pick<
  CrmState,
  | 'companies'
  | 'contacts'
  | 'deals'
  | 'activities'
  | 'leads'
  | 'products'
  | 'quotes'
  | 'team'
  | 'emailTemplates'
  | 'campaigns'
>;

export type CrmBackupV1 = {
  v: typeof CRM_BACKUP_VERSION;
  exportedAt: string;
  crm: CrmPersistedData;
};

function isCrmPersistedData(c: unknown): c is CrmPersistedData {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  const keys: (keyof CrmPersistedData)[] = [
    'companies',
    'contacts',
    'deals',
    'activities',
    'leads',
    'products',
    'quotes',
    'team',
    'emailTemplates',
    'campaigns',
  ];
  return keys.every((k) => Array.isArray(o[k]));
}

/** Parse JSON from a downloaded backup; returns null if invalid. */
export function tryParseCrmBackup(raw: unknown): CrmBackupV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== CRM_BACKUP_VERSION || typeof o.exportedAt !== 'string') return null;
  if (!isCrmPersistedData(o.crm)) return null;
  return { v: CRM_BACKUP_VERSION, exportedAt: o.exportedAt, crm: o.crm };
}

export function buildCrmBackupPayload(state: CrmPersistedData & { searchQuery?: string }): CrmBackupV1 {
  return {
    v: CRM_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    crm: {
      companies: state.companies,
      contacts: state.contacts,
      deals: state.deals,
      activities: state.activities,
      leads: state.leads,
      products: state.products,
      quotes: state.quotes,
      team: state.team,
      emailTemplates: state.emailTemplates,
      campaigns: state.campaigns,
    },
  };
}

function buildInitial(): Pick<
  CrmState,
  | 'companies'
  | 'contacts'
  | 'deals'
  | 'activities'
  | 'leads'
  | 'products'
  | 'quotes'
  | 'team'
  | 'emailTemplates'
  | 'campaigns'
  | 'searchQuery'
> {
  if (useDemoSeed()) {
    return {
      companies: seedCompanies,
      contacts: seedContacts,
      deals: seedDeals,
      activities: seedActivities,
      leads: seedLeads,
      products: seedProducts,
      quotes: seedQuotes,
      team: seedTeam,
      emailTemplates: seedEmailTemplates,
      campaigns: seedCampaigns,
      searchQuery: '',
    };
  }
  return {
    companies: [],
    contacts: [],
    deals: [],
    activities: [],
    leads: [],
    products: [],
    quotes: [],
    team: minimalTeam,
    emailTemplates: [],
    campaigns: [],
    searchQuery: '',
  };
}

export const useCrmStore = create<CrmState>()(
  persist(
    (set, get) => ({
      ...buildInitial(),
      defaultOwnerId: null,
      remoteSyncStatus: 'idle',
      remoteSyncError: null,

      setRemoteSyncState: ({ status, error }) =>
        set({ remoteSyncStatus: status, remoteSyncError: error }),

      applyRemoteWorkspace: (payload) =>
        set({
          companies: payload.companies,
          contacts: payload.contacts,
          leads: payload.leads,
          deals: payload.deals,
          activities: payload.activities,
          products: payload.products,
          quotes: payload.quotes,
          emailTemplates: payload.emailTemplates,
          campaigns: payload.campaigns,
          team: payload.team.length > 0 ? payload.team : get().team,
          defaultOwnerId: payload.defaultOwnerId,
        }),

      addCompany: (c) => {
        const ownerId = resolveOwnerId(c.ownerId, get());
        const row: Company = {
          ...c,
          ownerId,
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ companies: [...s.companies, row] }));
        queueCompanyUpsert(row, remoteOwner(get()));
      },

      updateCompany: (id, patch) => {
        set((s) => ({
          companies: s.companies.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        }));
        const row = get().companies.find((x) => x.id === id);
        if (row) queueCompanyUpsert(row, remoteOwner(get()));
      },

      removeCompany: (id) => {
        set((s) => ({
          companies: s.companies.filter((x) => x.id !== id),
          contacts: s.contacts.map((c) => (c.companyId === id ? { ...c, companyId: undefined } : c)),
        }));
        queueCompanyDelete(id);
      },

      addContact: (c) => {
        const ownerId = resolveOwnerId(c.ownerId, get());
        const row: Contact = {
          ...c,
          ownerId,
          tags: c.tags ?? [],
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ contacts: [...s.contacts, row] }));
        queueContactUpsert(row, remoteOwner(get()));
        return row;
      },

      updateContact: (id, patch) => {
        set((s) => ({
          contacts: s.contacts.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        }));
        const row = get().contacts.find((x) => x.id === id);
        if (row) queueContactUpsert(row, remoteOwner(get()));
      },

      removeContact: (id) => {
        set((s) => ({
          contacts: s.contacts.filter((x) => x.id !== id),
          deals: s.deals.map((d) => ({
            ...d,
            contactIds: d.contactIds.filter((cid) => cid !== id),
          })),
          campaigns: s.campaigns.map((c) => ({
            ...c,
            contactIds: c.contactIds.filter((cid) => cid !== id),
          })),
        }));
        queueContactDelete(id);
      },

      addDeal: (d) => {
        const ownerId = resolveOwnerId(d.ownerId, get());
        const row: Deal = {
          ...d,
          ownerId,
          contactIds: d.contactIds ?? [],
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ deals: [...s.deals, row] }));
        queueDealUpsert(row, remoteOwner(get()));
      },

      updateDeal: (id, patch) => {
        set((s) => ({
          deals: s.deals.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        }));
        const row = get().deals.find((x) => x.id === id);
        if (row) queueDealUpsert(row, remoteOwner(get()));
      },

      moveDealStage: (id, stage) => {
        set((s) => ({
          deals: s.deals.map((x) =>
            x.id === id ? { ...x, stage, updatedAt: now() } : x,
          ),
        }));
        const row = get().deals.find((x) => x.id === id);
        if (row) queueDealUpsert(row, remoteOwner(get()));
      },

      removeDeal: (id) => {
        set((s) => ({ deals: s.deals.filter((x) => x.id !== id) }));
        queueDealDelete(id);
      },

      addActivity: (a) => {
        const ownerId = resolveOwnerId(a.ownerId, get());
        const row: Activity = {
          ...a,
          ownerId,
          id: uid(),
          createdAt: now(),
        };
        set((s) => ({ activities: [row, ...s.activities] }));
        queueActivityUpsert(row, remoteOwner(get()));
      },

      updateActivity: (id, patch) => {
        set((s) => ({
          activities: s.activities.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }));
        const row = get().activities.find((x) => x.id === id);
        if (row) queueActivityUpsert(row, remoteOwner(get()));
      },

      completeActivity: (id) => {
        set((s) => ({
          activities: s.activities.map((x) =>
            x.id === id ? { ...x, completedAt: now() } : x,
          ),
        }));
        const row = get().activities.find((x) => x.id === id);
        if (row) queueActivityUpsert(row, remoteOwner(get()));
      },

      removeActivity: (id) => {
        set((s) => ({ activities: s.activities.filter((x) => x.id !== id) }));
        queueActivityDelete(id);
      },

      addLead: (patch) => {
        const ownerId = resolveOwnerId(patch.ownerId, get());
        const row: Lead = normalizeLeadContactFields({
          id: uid(),
          name: patch.name ?? 'New lead',
          email: patch.email ?? '',
          emails: patch.emails,
          company: patch.company,
          phone: patch.phone,
          phones: patch.phones,
          website: patch.website,
          status: patch.status ?? 'dm',
          score: patch.score ?? 0,
          source: patch.source ?? 'Manual',
          notes: patch.notes,
          ownerId,
          createdAt: now(),
          updatedAt: now(),
        });
        set((s) => ({ leads: [...s.leads, row] }));
        queueLeadUpsert(row, remoteOwner(get()));
      },

      updateLead: (id, patch) => {
        set((s) => ({
          leads: s.leads.map((x) => {
            if (x.id !== id) return x;
            return normalizeLeadContactFields({
              ...x,
              ...patch,
              updatedAt: now(),
            });
          }),
        }));
        const row = get().leads.find((x) => x.id === id);
        if (row) queueLeadUpsert(row, remoteOwner(get()));
      },

      convertLead: (leadId, overrides = {}) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return;
        const n = normalizeLeadContactFields(lead);
        const [firstName, ...rest] = n.name.trim().split(/\s+/);
        const lastName = rest.join(' ') || '—';
        get().addContact({
          firstName: overrides.firstName ?? firstName,
          lastName: overrides.lastName ?? lastName,
          email: overrides.email ?? n.email,
          phone: overrides.phone ?? n.phone,
          jobTitle: overrides.jobTitle,
          companyId: overrides.companyId,
          ownerId: overrides.ownerId ?? n.ownerId,
          tags: overrides.tags?.length ? overrides.tags : ['converted-lead'],
          source: overrides.source ?? n.source,
          lifecycle: overrides.lifecycle ?? 'customer',
          notes: overrides.notes ?? n.notes,
        });
        get().updateLead(leadId, { status: 'sold' });
      },

      addProduct: (p) => {
        const row: Product = { ...p, id: uid(), createdAt: now() };
        set((s) => ({ products: [...s.products, row] }));
        queueProductUpsert(row);
      },

      updateProduct: (id, patch) => {
        set((s) => ({
          products: s.products.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }));
        const row = get().products.find((x) => x.id === id);
        if (row) queueProductUpsert(row);
      },

      addQuote: (q) => {
        const ownerId = resolveOwnerId(q.ownerId, get());
        const row: Quote = {
          ...q,
          ownerId,
          id: uid(),
          lines: [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ quotes: [...s.quotes, row] }));
        queueQuoteUpsert(row, remoteOwner(get()));
        return row;
      },

      updateQuote: (id, patch) => {
        set((s) => ({
          quotes: s.quotes.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        }));
        const row = get().quotes.find((x) => x.id === id);
        if (row) queueQuoteUpsert(row, remoteOwner(get()));
      },

      addEmailTemplate: (t) => {
        const ownerId = resolveOwnerId(t.ownerId, get());
        const row: EmailTemplate = {
          ...t,
          ownerId,
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ emailTemplates: [...s.emailTemplates, row] }));
        queueTemplateUpsert(row, remoteOwner(get()));
        return row;
      },

      updateEmailTemplate: (id, patch) => {
        set((s) => ({
          emailTemplates: s.emailTemplates.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        }));
        const row = get().emailTemplates.find((x) => x.id === id);
        if (row) queueTemplateUpsert(row, remoteOwner(get()));
      },

      removeEmailTemplate: (id) => {
        set((s) => ({
          emailTemplates: s.emailTemplates.filter((x) => x.id !== id),
          campaigns: s.campaigns.map((c) =>
            c.templateId === id ? { ...c, templateId: undefined, updatedAt: now() } : c,
          ),
        }));
        queueTemplateDelete(id);
      },

      addCampaign: (c) => {
        const ownerId = resolveOwnerId(c.ownerId, get());
        const row: Campaign = {
          name: c.name,
          type: c.type,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          budgetedCost: c.budgetedCost,
          actualCost: c.actualCost,
          expectedRevenue: c.expectedRevenue,
          currency: c.currency ?? 'CAD',
          description: c.description,
          templateId: c.templateId,
          contactIds: c.contactIds ?? [],
          leadIds: c.leadIds ?? [],
          ownerId,
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ campaigns: [...s.campaigns, row] }));
        queueCampaignUpsert(row, remoteOwner(get()));
        return row;
      },

      updateCampaign: (id, patch) => {
        set((s) => ({
          campaigns: s.campaigns.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
          ),
        }));
        const row = get().campaigns.find((x) => x.id === id);
        if (row) queueCampaignUpsert(row, remoteOwner(get()));
      },

      removeCampaign: (id) => {
        set((s) => ({ campaigns: s.campaigns.filter((x) => x.id !== id) }));
        queueCampaignDelete(id);
      },

      addCampaignContact: (campaignId, contactId) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id !== campaignId
              ? c
              : c.contactIds.includes(contactId)
                ? c
                : {
                    ...c,
                    contactIds: [...c.contactIds, contactId],
                    updatedAt: now(),
                  },
          ),
        }));
        const row = get().campaigns.find((x) => x.id === campaignId);
        if (row) queueCampaignUpsert(row, remoteOwner(get()));
      },

      removeCampaignContact: (campaignId, contactId) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id !== campaignId
              ? c
              : {
                  ...c,
                  contactIds: c.contactIds.filter((x) => x !== contactId),
                  updatedAt: now(),
                },
          ),
        }));
        const row = get().campaigns.find((x) => x.id === campaignId);
        if (row) queueCampaignUpsert(row, remoteOwner(get()));
      },

      addCampaignLead: (campaignId, leadId) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id !== campaignId
              ? c
              : c.leadIds.includes(leadId)
                ? c
                : {
                    ...c,
                    leadIds: [...c.leadIds, leadId],
                    updatedAt: now(),
                  },
          ),
        }));
        const row = get().campaigns.find((x) => x.id === campaignId);
        if (row) queueCampaignUpsert(row, remoteOwner(get()));
      },

      removeCampaignLead: (campaignId, leadId) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id !== campaignId
              ? c
              : {
                  ...c,
                  leadIds: c.leadIds.filter((x) => x !== leadId),
                  updatedAt: now(),
                },
          ),
        }));
        const row = get().campaigns.find((x) => x.id === campaignId);
        if (row) queueCampaignUpsert(row, remoteOwner(get()));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      resetDemoData: () => set(buildInitial()),

      importCrmBackup: (payload) =>
        set({
          ...payload.crm,
          searchQuery: '',
        }),
    }),
    {
      name: 'biztomate-crm-data',
      partialize: (s) => ({
        companies: s.companies,
        contacts: s.contacts,
        deals: s.deals,
        activities: s.activities,
        leads: s.leads,
        products: s.products,
        quotes: s.quotes,
        team: s.team,
        emailTemplates: s.emailTemplates,
        campaigns: s.campaigns,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CrmState>;
        const leads = Array.isArray(p.leads)
          ? p.leads.map((l) => normalizeLeadContactFields(l as Lead))
          : current.leads;
        return {
          ...current,
          ...p,
          leads,
          emailTemplates: p.emailTemplates ?? current.emailTemplates,
          campaigns: p.campaigns ?? current.campaigns,
        };
      },
    },
  ),
);
