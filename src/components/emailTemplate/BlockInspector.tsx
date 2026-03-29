import { useRef, type RefObject } from 'react';
import { CornerDownLeft, Link2, List, ListOrdered, Underline } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import type { EmailBlock, EmailSectionBlock, TextAlign, TextBlock, TextStyle } from '../../types/emailBlocks';
import { EMAIL_FONT_OPTIONS, isColumnsBlock } from '../../types/emailBlocks';
import {
  looksLikeRichHtml,
  insertSnippetAtSelection,
  promptLinkUrl,
  wrapSelection,
  wrapSelectionAsList,
} from '../../lib/emailBlocks/textFormat';
import { blocksToEmailHtml } from '../../lib/emailBlocks/renderEmailHtml';

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function TextFormatToolbar({
  textareaRef,
  content,
  onApply,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  content: string;
  onApply: (next: string) => void;
}) {
  function withSelection(fn: (start: number, end: number) => { next: string; caret: number }) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { next, caret } = fn(start, end);
    onApply(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-[var(--color-border)] bg-surface/50 p-1.5">
      <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted">Format</span>
      <Button
        type="button"
        variant="outline"
        className="!h-8 !px-2 !py-0 text-xs"
        title="Hyperlink"
        onClick={() => {
          const url = promptLinkUrl();
          if (!url) return;
          withSelection((s, e) =>
            wrapSelection(
              content,
              s,
              e,
              `<a href="${escAttr(url)}" style="color:#007aff;text-decoration:underline;">`,
              '</a>',
              'link text',
            ),
          );
        }}
      >
        <Link2 className="h-3.5 w-3.5" />
        Link
      </Button>
      <Button
        type="button"
        variant="outline"
        className="!h-8 !px-2 !py-0 text-xs"
        title="Underline"
        onClick={() => {
          withSelection((s, e) => wrapSelection(content, s, e, '<u>', '</u>', 'text'));
        }}
      >
        <Underline className="h-3.5 w-3.5" />
        Underline
      </Button>
      <Button
        type="button"
        variant="outline"
        className="!h-8 !px-2 !py-0 text-xs"
        title="Insert line break in email (<br/>). In plain text mode you can also press Enter."
        onClick={() => {
          withSelection((s, e) => insertSnippetAtSelection(content, s, e, '<br/>'));
        }}
      >
        <CornerDownLeft className="h-3.5 w-3.5" />
        Line break
      </Button>
      <Button
        type="button"
        variant="outline"
        className="!h-8 !px-2 !py-0 text-xs"
        title="Bullet list"
        onClick={() => {
          withSelection((s, e) => wrapSelectionAsList(content, s, e, false));
        }}
      >
        <List className="h-3.5 w-3.5" />
        Bullets
      </Button>
      <Button
        type="button"
        variant="outline"
        className="!h-8 !px-2 !py-0 text-xs"
        title="Numbered list"
        onClick={() => {
          withSelection((s, e) => wrapSelectionAsList(content, s, e, true));
        }}
      >
        <ListOrdered className="h-3.5 w-3.5" />
        Numbers
      </Button>
    </div>
  );
}

function TextBlockInspector({
  block,
  onChangeBlock,
}: {
  block: TextBlock;
  onChangeBlock: (next: TextBlock) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Text</label>
        <TextFormatToolbar textareaRef={taRef} content={block.content} onApply={(c) => onChangeBlock({ ...block, content: c })} />
        <Textarea
          ref={taRef}
          className="min-h-[120px] font-mono text-xs"
          value={block.content}
          onChange={(e) => onChangeBlock({ ...block, content: e.target.value })}
          placeholder="Plain: type lines and press Enter — each line = new line in email. HTML: use Line break or &lt;br/&gt; between tags for a new line in the message."
        />
        <p className="mt-1 text-[10px] text-muted">
          <strong>Enter / blank lines</strong> are kept in the email even when you also use links or lists (they become{' '}
          <code className="rounded bg-surface px-0.5">&lt;br/&gt;</code> automatically). You can still use the{' '}
          <strong>Line break</strong> button or type <code className="rounded bg-surface px-0.5">&lt;br/&gt;</code> yourself.
          Lists use
          normal <code className="rounded bg-surface px-0.5">&lt;ul&gt;/&lt;ol&gt;</code>. Preview below matches
          recipients.
        </p>
        {looksLikeRichHtml(block.content) ? (
          <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-white p-3 shadow-sm">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Preview (standard bullets / numbers / links)
            </div>
            <div
              className="max-h-48 overflow-y-auto text-sm [&_a]:text-brand [&_li]:my-0.5"
              dangerouslySetInnerHTML={{
                __html: blocksToEmailHtml([block]),
              }}
            />
          </div>
        ) : null}
      </div>
      <FontControls style={block.style} onChange={(style) => onChangeBlock({ ...block, style })} />
    </div>
  );
}

function FontControls({
  style,
  onChange,
}: {
  style: TextStyle;
  onChange: (s: TextStyle) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium text-muted">Font</label>
        <Select
          className="mt-1"
          value={style.fontFamily}
          onChange={(e) => onChange({ ...style, fontFamily: e.target.value })}
        >
          {EMAIL_FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted">Size (px)</label>
          <Input
            type="number"
            className="mt-1"
            min={8}
            max={72}
            value={style.fontSize}
            onChange={(e) => onChange({ ...style, fontSize: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Weight</label>
          <Select
            className="mt-1"
            value={String(style.fontWeight)}
            onChange={(e) => onChange({ ...style, fontWeight: Number(e.target.value) })}
          >
            {[400, 500, 600, 700].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted">Color</label>
          <Input
            type="color"
            className="mt-1 h-9"
            value={style.color.startsWith('#') && style.color.length >= 4 ? style.color : '#111827'}
            onChange={(e) => onChange({ ...style, color: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Align</label>
          <Select
            className="mt-1"
            value={style.textAlign}
            onChange={(e) => onChange({ ...style, textAlign: e.target.value as TextAlign })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Line height</label>
        <Input
          type="number"
          step="0.05"
          className="mt-1"
          min={1}
          max={2.5}
          value={style.lineHeight}
          onChange={(e) => onChange({ ...style, lineHeight: Number(e.target.value) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted">Pad top</label>
          <Input
            type="number"
            className="mt-1"
            min={0}
            value={style.paddingTop}
            onChange={(e) => onChange({ ...style, paddingTop: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Pad bottom</label>
          <Input
            type="number"
            className="mt-1"
            min={0}
            value={style.paddingBottom}
            onChange={(e) => onChange({ ...style, paddingBottom: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Background</label>
        <div className="mt-1 flex gap-2">
          <Input
            type="color"
            className="h-9 w-14 shrink-0"
            value={
              style.backgroundColor?.startsWith('#') && style.backgroundColor.length >= 4
                ? style.backgroundColor
                : '#ffffff'
            }
            onChange={(e) => onChange({ ...style, backgroundColor: e.target.value })}
          />
          <ButtonClearBg onClear={() => onChange({ ...style, backgroundColor: 'transparent' })} />
        </div>
      </div>
    </div>
  );
}

function ButtonClearBg({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="text-xs text-brand hover:underline"
    >
      Clear
    </button>
  );
}

export type EditorSelection =
  | { scope: 'root'; id: string }
  | { scope: 'column'; columnsId: string; side: 'left' | 'right'; id: string };

function findBlock(blocks: EmailBlock[], sel: EditorSelection): EmailBlock | EmailSectionBlock | null {
  if (sel.scope === 'root') {
    return blocks.find((b) => b.id === sel.id) ?? null;
  }
  const col = blocks.find((b) => isColumnsBlock(b) && b.id === sel.columnsId);
  if (!col || !isColumnsBlock(col)) return null;
  const arr = sel.side === 'left' ? col.left : col.right;
  return arr.find((c) => c.id === sel.id) ?? null;
}

export function BlockInspector({
  blocks,
  selection,
  onChangeBlock,
}: {
  blocks: EmailBlock[];
  selection: EditorSelection | null;
  onChangeBlock: (next: EmailBlock | EmailSectionBlock) => void;
}) {
  if (!selection) {
    return <p className="text-sm text-muted">Select a section to edit typography and content.</p>;
  }

  const b = findBlock(blocks, selection);
  if (!b) {
    return <p className="text-sm text-muted">Section not found.</p>;
  }

  if (isColumnsBlock(b)) {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-gray-900">Two columns</p>
        <div>
          <label className="text-xs font-medium text-muted">Gap (px)</label>
          <Input
            type="number"
            className="mt-1"
            min={0}
            max={48}
            value={b.gap}
            onChange={(e) => onChangeBlock({ ...b, gap: Number(e.target.value) })}
          />
        </div>
        <p className="text-xs text-muted">
          Add sections from the buttons inside each column in the canvas.
        </p>
      </div>
    );
  }

  switch (b.type) {
    case 'text':
      return <TextBlockInspector block={b} onChangeBlock={onChangeBlock} />;
    case 'image':
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Image URL</label>
            <Input
              className="mt-1 font-mono text-xs"
              value={b.src}
              onChange={(e) => onChangeBlock({ ...b, src: e.target.value })}
              placeholder="https://… or upload on canvas"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Alt text</label>
            <Input className="mt-1" value={b.alt} onChange={(e) => onChangeBlock({ ...b, alt: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Link URL (optional)</label>
            <Input
              className="mt-1"
              value={b.linkHref}
              onChange={(e) => onChangeBlock({ ...b, linkHref: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted">Width %</label>
              <Input
                type="number"
                className="mt-1"
                min={10}
                max={100}
                value={b.widthPercent}
                onChange={(e) => onChangeBlock({ ...b, widthPercent: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Align</label>
              <Select
                className="mt-1"
                value={b.align}
                onChange={(e) => onChangeBlock({ ...b, align: e.target.value as TextAlign })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </div>
          </div>
        </div>
      );
    case 'signature':
      return (
        <div className="space-y-3">
          {(['name', 'title', 'line2', 'line3'] as const).map((field) => (
            <div key={field}>
              <label className="text-xs font-medium text-muted capitalize">{field}</label>
              <Input
                className="mt-1"
                value={b[field]}
                onChange={(e) => onChangeBlock({ ...b, [field]: e.target.value })}
              />
            </div>
          ))}
          <p className="text-xs font-medium text-muted">Name line</p>
          <FontControls style={b.nameStyle} onChange={(nameStyle) => onChangeBlock({ ...b, nameStyle })} />
          <p className="text-xs font-medium text-muted">Detail lines</p>
          <FontControls style={b.detailStyle} onChange={(detailStyle) => onChangeBlock({ ...b, detailStyle })} />
        </div>
      );
    case 'button':
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Label</label>
            <Input className="mt-1" value={b.label} onChange={(e) => onChangeBlock({ ...b, label: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">URL</label>
            <Input className="mt-1" value={b.href} onChange={(e) => onChangeBlock({ ...b, href: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Align</label>
            <Select
              className="mt-1"
              value={b.align}
              onChange={(e) => onChangeBlock({ ...b, align: e.target.value as TextAlign })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Font</label>
            <Select
              className="mt-1"
              value={b.fontFamily}
              onChange={(e) => onChangeBlock({ ...b, fontFamily: e.target.value })}
            >
              {EMAIL_FONT_OPTIONS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted">Size</label>
              <Input
                type="number"
                className="mt-1"
                value={b.fontSize}
                onChange={(e) => onChangeBlock({ ...b, fontSize: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Radius</label>
              <Input
                type="number"
                className="mt-1"
                value={b.borderRadius}
                onChange={(e) => onChangeBlock({ ...b, borderRadius: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted">Text color</label>
              <Input
                type="color"
                className="mt-1 h-9"
                value={b.textColor}
                onChange={(e) => onChangeBlock({ ...b, textColor: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Background</label>
              <Input
                type="color"
                className="mt-1 h-9"
                value={b.backgroundColor}
                onChange={(e) => onChangeBlock({ ...b, backgroundColor: e.target.value })}
              />
            </div>
          </div>
        </div>
      );
    case 'divider':
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Color</label>
            <Input
              type="color"
              className="mt-1 h-9"
              value={b.color.length >= 4 ? b.color : '#e5e7eb'}
              onChange={(e) => onChangeBlock({ ...b, color: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-muted">Thick</label>
              <Input
                type="number"
                className="mt-1"
                min={1}
                value={b.thickness}
                onChange={(e) => onChangeBlock({ ...b, thickness: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">MT</label>
              <Input
                type="number"
                className="mt-1"
                value={b.marginTop}
                onChange={(e) => onChangeBlock({ ...b, marginTop: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">MB</label>
              <Input
                type="number"
                className="mt-1"
                value={b.marginBottom}
                onChange={(e) => onChangeBlock({ ...b, marginBottom: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      );
    case 'spacer':
      return (
        <div>
          <label className="text-xs font-medium text-muted">Height (px)</label>
          <Input
            type="number"
            className="mt-1"
            min={0}
            max={200}
            value={b.height}
            onChange={(e) => onChangeBlock({ ...b, height: Number(e.target.value) })}
          />
        </div>
      );
    default:
      return null;
  }
}
