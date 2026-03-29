/** Detect HTML fragments produced by the template toolbar or pasted content. */
export function looksLikeRichHtml(content: string): boolean {
  return /<\s*\/?\s*(a|u|ul|ol|li|p|div|span|strong|b|i|em|br)\b/i.test(content);
}

export function sanitizeEmailHtmlFragment(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/**
 * Browsers collapse newlines in HTML. Typed Enter in the textarea only affects email
 * output if we turn those newlines into <br/>. Only touch text runs, not tag markup.
 */
export function newlineToBrOutsideTags(html: string): string {
  return html
    .split(/(<[^>]+>)/g)
    .map((segment) => {
      if (segment.startsWith('<') && segment.endsWith('>')) {
        return segment;
      }
      return segment.replace(/\r\n|\r|\n/g, '<br/>');
    })
    .join('');
}

/** Insert at cursor (replaces selection). Used for <br/> etc. */
export function insertSnippetAtSelection(
  content: string,
  selStart: number,
  selEnd: number,
  snippet: string,
): { next: string; caret: number } {
  const a = Math.min(selStart, selEnd);
  const b = Math.max(selStart, selEnd);
  const next = content.slice(0, a) + snippet + content.slice(b);
  return { next, caret: a + snippet.length };
}

/** Wrap selection; if empty, inserts placeholder text inside tags. */
export function wrapSelection(
  content: string,
  selStart: number,
  selEnd: number,
  open: string,
  close: string,
  emptyFallback = 'text',
): { next: string; caret: number } {
  const a = Math.min(selStart, selEnd);
  const b = Math.max(selStart, selEnd);
  const selected = content.slice(a, b);
  const inner = selected.length > 0 ? selected : emptyFallback;
  const next = content.slice(0, a) + open + inner + close + content.slice(b);
  const caret = a + open.length + inner.length + close.length;
  return { next, caret };
}

export function wrapSelectionAsList(
  content: string,
  selStart: number,
  selEnd: number,
  ordered: boolean,
): { next: string; caret: number } {
  const a = Math.min(selStart, selEnd);
  const b = Math.max(selStart, selEnd);
  const selected = content.slice(a, b).trim();
  const tag = ordered ? 'ol' : 'ul';
  let block: string;
  if (!selected) {
    block = `<${tag}><li>First item</li><li>Second item</li></${tag}>`;
  } else {
    const lines = selected
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const items = (lines.length ? lines : [selected]).map((l) => `<li>${l}</li>`).join('');
    block = `<${tag}>${items}</${tag}>`;
  }
  const next = content.slice(0, a) + block + content.slice(b);
  const caret = a + block.length;
  return { next, caret };
}

/** Inline list styles for email clients that ignore `<style>`. */
export function styleListsInFragment(html: string): string {
  return html
    .replace(/<ul\b/gi, '<ul style="margin:0 0 12px 0;padding-left:24px;" ')
    .replace(/<ol\b/gi, '<ol style="margin:0 0 12px 0;padding-left:24px;" ')
    .replace(/<li\b/gi, '<li style="margin:0 0 4px 0;" ');
}

/** One-line preview in canvas list. */
export function stripHtmlForPreview(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function promptLinkUrl(): string | null {
  const raw = window.prompt('Link URL', 'https://');
  if (raw === null || raw.trim() === '') return null;
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^mailto:/i.test(t) || t.startsWith('#')) return t;
  return `https://${t}`;
}
