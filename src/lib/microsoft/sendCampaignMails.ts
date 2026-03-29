import type { Campaign, Company, Contact, EmailTemplate, Lead } from '../../types/crm';
import { getTemplateBodyHtml } from '../emailTemplateBody';
import type { MergeContext } from '../templateMerge';
import { applyMergeFields } from '../templateMerge';
import { sendMailViaGraph } from './sendMail';

export interface CampaignSendResult {
  sent: number;
  skippedNoEmail: number;
  errors: string[];
}

/**
 * Sends the campaign’s template once per member (contacts + leads) with merge fields.
 * Sequential to reduce Graph throttling risk on small lists.
 */
export async function sendCampaignTemplateToMembers(
  campaign: Campaign,
  template: EmailTemplate,
  contacts: Contact[],
  leads: Lead[],
  companies: Company[],
  onProgress?: (sent: number, total: number) => void,
): Promise<CampaignSendResult> {
  const htmlBase = getTemplateBodyHtml(template);
  const rows: { email: string; ctx: MergeContext }[] = [];
  let skippedNoEmail = 0;

  for (const cid of campaign.contactIds) {
    const c = contacts.find((x) => x.id === cid);
    if (!c) continue;
    const em = c.email?.trim();
    if (!em) {
      skippedNoEmail++;
      continue;
    }
    const co = c.companyId ? companies.find((x) => x.id === c.companyId) : undefined;
    rows.push({
      email: em,
      ctx: { contact: c, companyName: co?.name },
    });
  }

  for (const lid of campaign.leadIds) {
    const l = leads.find((x) => x.id === lid);
    if (!l) continue;
    const em = l.email?.trim();
    if (!em) {
      skippedNoEmail++;
      continue;
    }
    rows.push({
      email: em,
      ctx: { lead: l, companyName: l.company },
    });
  }

  const total = rows.length;
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    onProgress?.(i + 1, total);
    const subject = applyMergeFields(template.subject, r.ctx);
    const html = applyMergeFields(htmlBase, r.ctx);
    try {
      await sendMailViaGraph({ to: r.email, subject, html });
      sent++;
    } catch (e) {
      errors.push(`${r.email}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  return { sent, skippedNoEmail, errors };
}
