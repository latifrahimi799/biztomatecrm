import type { EmailTemplate } from '../types/crm';
import { blocksToEmailHtml } from './emailBlocks/renderEmailHtml';

/** Resolved HTML body for preview / merge (legacy html vs block editor). */
export function getTemplateBodyHtml(template: EmailTemplate): string {
  if (template.bodyFormat === 'blocks' && template.blocks?.length) {
    return blocksToEmailHtml(template.blocks);
  }
  return template.body;
}
