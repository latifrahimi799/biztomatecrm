import type { EmailBlock, EmailSectionBlock } from './emailBlocks';

export type { EmailBlock, EmailSectionBlock };

export type Id = string;

export type DealStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type ActivityType = 'task' | 'call' | 'meeting' | 'email' | 'note';

export type LeadStatus =
  | 'dm'
  | 'stuck_gatekeeper'
  | 'presentation'
  | 'not_interested'
  | 'consultation_booked'
  | 'sold'
  | 'invalid_lead';

export const LEAD_STATUSES: LeadStatus[] = [
  'dm',
  'stuck_gatekeeper',
  'presentation',
  'not_interested',
  'consultation_booked',
  'sold',
  'invalid_lead',
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  dm: 'DM',
  stuck_gatekeeper: 'Stuck at GateKeeper',
  presentation: 'Presentation',
  not_interested: 'Not interested',
  consultation_booked: 'Consultation booked',
  sold: 'Sold',
  invalid_lead: 'Invalid Lead',
};

/** Active pipeline (not closed / invalid). */
export function isOpenLeadStatus(status: LeadStatus): boolean {
  return (
    status !== 'not_interested' &&
    status !== 'sold' &&
    status !== 'invalid_lead'
  );
}

export type ContactLifecycle = 'subscriber' | 'lead' | 'customer' | 'churned';

export interface Company {
  id: Id;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  employeeCount?: string;
  address?: string;
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: Id;
  ownerId: Id;
  tags: string[];
  source: string;
  lifecycle: ContactLifecycle;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Deal {
  id: Id;
  name: string;
  companyId?: Id;
  contactIds: Id[];
  stage: DealStage;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string;
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: Id;
  type: ActivityType;
  subject: string;
  body?: string;
  dueAt?: string;
  completedAt?: string;
  relatedType?: 'contact' | 'company' | 'deal';
  relatedId?: Id;
  ownerId: Id;
  createdAt: string;
}

export interface Lead {
  id: Id;
  name: string;
  /** Primary email (first of emails) — kept for back-compat. */
  email: string;
  /** All emails; first is primary. */
  emails: string[];
  company?: string;
  /** Primary phone (first of phones). */
  phone?: string;
  /** All phone numbers; first is primary. */
  phones: string[];
  website?: string;
  /** City / location for filtering. */
  city?: string;
  /** HQ vs Branch office type. */
  locationType?: LeadLocationType;
  status: LeadStatus;
  score: number;
  source: string;
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export type LeadLocationType = 'hq' | 'branch';

export const LEAD_LOCATION_TYPES: LeadLocationType[] = ['hq', 'branch'];

export const LEAD_LOCATION_LABEL: Record<LeadLocationType, string> = {
  hq: 'HQ',
  branch: 'Branch',
};

/** Normalize lead contact fields so emails/phones always exist. */
export function normalizeLeadContactFields<T extends Partial<Lead>>(lead: T): T & {
  email: string;
  emails: string[];
  phone?: string;
  phones: string[];
} {
  const emailsFromList = (lead.emails ?? [])
    .map((e) => e.trim())
    .filter(Boolean);
  const emailPrimary = (lead.email ?? '').trim();
  const emails =
    emailsFromList.length > 0
      ? emailsFromList
      : emailPrimary
        ? [emailPrimary]
        : [];

  const phonesFromList = (lead.phones ?? [])
    .map((p) => p.trim())
    .filter(Boolean);
  const phonePrimary = (lead.phone ?? '').trim();
  const phones =
    phonesFromList.length > 0
      ? phonesFromList
      : phonePrimary
        ? [phonePrimary]
        : [];

  return {
    ...lead,
    email: emails[0] ?? '',
    emails,
    phone: phones[0] || undefined,
    phones,
  };
}

export interface Product {
  id: Id;
  name: string;
  sku: string;
  unitPrice: number;
  currency: string;
  active: boolean;
  createdAt: string;
}

export interface QuoteLine {
  productId: Id;
  quantity: number;
  discountPct: number;
}

export interface Quote {
  id: Id;
  title: string;
  dealId?: Id;
  companyId?: Id;
  contactId?: Id;
  lines: QuoteLine[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil?: string;
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
}

export type TeamRole = 'super_admin' | 'admin' | 'sales' | 'marketing' | 'support';

export interface TeamMember {
  id: Id;
  name: string;
  email: string;
  role: TeamRole;
}

/** Zoho-style campaign type */
export type CampaignType =
  | 'email'
  | 'webinar'
  | 'trade_show'
  | 'advertisement'
  | 'conference'
  | 'referral'
  | 'other';

/** Zoho-style campaign status */
export type CampaignStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export type EmailTemplateCategory = 'campaign' | 'general';

export type EmailTemplateBodyFormat = 'html' | 'blocks';

export interface EmailTemplate {
  id: Id;
  name: string;
  subject: string;
  /**
   * Legacy HTML body when `bodyFormat` is `html` or omitted.
   * When `bodyFormat` is `blocks`, kept in sync as rendered output for compatibility.
   */
  body: string;
  bodyFormat?: EmailTemplateBodyFormat;
  /** Drag-and-drop email builder document. */
  blocks?: EmailBlock[];
  category: EmailTemplateCategory;
  active: boolean;
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: Id;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  budgetedCost?: number;
  actualCost?: number;
  expectedRevenue?: number;
  currency: string;
  description?: string;
  templateId?: Id;
  contactIds: Id[];
  leadIds: Id[];
  ownerId: Id;
  createdAt: string;
  updatedAt: string;
}

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  lead: 'Qualification',
  qualified: 'Needs Analysis',
  proposal: 'Proposal/Price Quote',
  negotiation: 'Negotiation/Review',
  won: 'Closed Won',
  lost: 'Closed Lost',
};

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  task: 'Task',
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  note: 'Note',
};

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  email: 'Email',
  webinar: 'Webinar',
  trade_show: 'Trade show',
  advertisement: 'Advertisement',
  conference: 'Conference',
  referral: 'Referral',
  other: 'Other',
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
