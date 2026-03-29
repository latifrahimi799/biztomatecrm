import type {
  ButtonBlock,
  ColumnsBlock,
  DividerBlock,
  EmailBlock,
  EmailSectionBlock,
  ImageBlock,
  SignatureBlock,
  SpacerBlock,
  TextBlock,
  TextStyle,
} from '../../types/emailBlocks';
import {
  looksLikeRichHtml,
  newlineToBrOutsideTags,
  sanitizeEmailHtmlFragment,
  styleListsInFragment,
} from './textFormat';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textStyleToCss(t: TextStyle): string {
  const pad =
    t.paddingTop || t.paddingBottom || t.paddingLeft || t.paddingRight
      ? `padding:${t.paddingTop}px ${t.paddingRight}px ${t.paddingBottom}px ${t.paddingLeft}px;`
      : '';
  const bg =
    t.backgroundColor && t.backgroundColor !== 'transparent'
      ? `background-color:${t.backgroundColor};`
      : '';
  return [
    `font-family:${t.fontFamily}`,
    `font-size:${t.fontSize}px`,
    `font-weight:${t.fontWeight}`,
    `color:${t.color}`,
    `text-align:${t.textAlign}`,
    `line-height:${t.lineHeight}`,
    pad,
    bg,
    'margin:0',
  ]
    .filter(Boolean)
    .join(';');
}

function normalizeAnchorsForEmail(html: string): string {
  return html.replace(
    /<a\s(?![^>]*\bstyle=)([^>]*)>/gi,
    '<a style="color:#007aff;text-decoration:underline;" $1>',
  );
}

function renderText(b: TextBlock): string {
  const style = textStyleToCss(b.style);
  let inner: string;
  if (looksLikeRichHtml(b.content)) {
    inner = normalizeAnchorsForEmail(
      newlineToBrOutsideTags(
        sanitizeEmailHtmlFragment(styleListsInFragment(b.content)),
      ),
    );
  } else {
    const lines = b.content.split(/\n/);
    inner = lines
      .map((line) => (line.trim() === '' ? '<br/>' : esc(line)))
      .join('<br/>');
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${style}">${inner}</td></tr></table>`;
}

function renderImage(b: ImageBlock): string {
  const ta = b.align === 'center' ? 'center' : b.align === 'right' ? 'right' : 'left';
  const w = Math.max(10, Math.min(100, b.widthPercent));
  const img = `<img src="${esc(b.src)}" alt="${esc(b.alt)}" width="${w}%" style="max-width:${w}%;height:auto;display:block;border:0;outline:0;" />`;
  const linked =
    b.linkHref.trim() ? `<a href="${esc(b.linkHref)}" style="text-decoration:none;">${img}</a>` : img;
  const pad = `padding:${b.paddingTop}px 0 ${b.paddingBottom}px 0;`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${ta}" style="${pad}">${linked}</td></tr></table>`;
}

function renderSignature(b: SignatureBlock): string {
  const ns = textStyleToCss(b.nameStyle);
  const ds = textStyleToCss(b.detailStyle);
  const nameHtml = b.name.trim() ? `<div style="${ns}">${esc(b.name)}</div>` : '';
  const rest = [b.title, b.line2, b.line3].filter((x) => x.trim());
  const restHtml = rest.map((l) => `<div style="${ds}">${esc(l)}</div>`).join('');
  if (!nameHtml && !restHtml) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:8px;padding-bottom:8px;">${nameHtml}${restHtml}</td></tr></table>`;
}

function renderButton(b: ButtonBlock): string {
  const ta = b.align;
  const fs = [
    `font-family:${b.fontFamily}`,
    `font-size:${b.fontSize}px`,
    `font-weight:${b.fontWeight}`,
    `color:${b.textColor}`,
    `background-color:${b.backgroundColor}`,
    `border-radius:${b.borderRadius}px`,
    `padding:${b.paddingY}px ${b.paddingX}px`,
    'display:inline-block',
    'text-decoration:none',
  ].join(';');
  const btn = `<a href="${esc(b.href)}" style="${fs}">${esc(b.label)}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${ta}" style="padding:12px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${ta}"><tr><td>${btn}</td></tr></table></td></tr></table>`;
}

function renderDivider(b: DividerBlock): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="margin:${b.marginTop}px 0 ${b.marginBottom}px 0;height:${b.thickness}px;line-height:${b.thickness}px;background-color:${esc(b.color)};font-size:0;">&nbsp;</td></tr></table>`;
}

function renderSpacer(b: SpacerBlock): string {
  const h = Math.max(0, b.height);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:0;line-height:0;height:${h}px;">&nbsp;</td></tr></table>`;
}

function renderSection(b: EmailSectionBlock): string {
  switch (b.type) {
    case 'text':
      return renderText(b);
    case 'image':
      return renderImage(b);
    case 'signature':
      return renderSignature(b);
    case 'button':
      return renderButton(b);
    case 'divider':
      return renderDivider(b);
    case 'spacer':
      return renderSpacer(b);
    default:
      return '';
  }
}

function renderColumns(b: ColumnsBlock): string {
  const gap = b.gap;
  const cell = `width:50%;vertical-align:top;box-sizing:border-box;padding-left:${gap / 2}px;padding-right:${gap / 2}px;`;
  const leftHtml = b.left.map(renderSection).join('');
  const rightHtml = b.right.map(renderSection).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${cell}">${leftHtml}</td><td style="${cell}">${rightHtml}</td></tr></table>`;
}

function renderBlock(b: EmailBlock): string {
  if (b.type === 'columns') {
    return renderColumns(b);
  }
  return renderSection(b);
}

/** Table-based, mostly inline CSS — works in common email clients. */
export function blocksToEmailHtml(blocks: EmailBlock[]): string {
  if (!blocks.length) {
    return '<p style="margin:0;color:#6b7280;">(empty template)</p>';
  }
  return blocks.map(renderBlock).join('\n');
}
