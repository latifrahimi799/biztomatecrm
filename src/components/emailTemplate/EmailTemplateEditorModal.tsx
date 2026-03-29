import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Columns2,
  GripVertical,
  ImageIcon,
  Minus,
  Plus,
  Space,
  SquareMousePointer,
  Trash2,
  Type,
  User,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { EmailTemplate, EmailTemplateCategory } from '../../types/crm';
import type { EmailBlock, EmailSectionBlock } from '../../types/emailBlocks';
import { isColumnsBlock } from '../../types/emailBlocks';
import { blocksToEmailHtml } from '../../lib/emailBlocks/renderEmailHtml';
import {
  createBlockForToolbar,
  createSectionBlock,
  createTextBlock,
  type SectionType,
} from '../../lib/emailBlocks/blockFactory';
import { moveBlocksOnDragEnd } from '../../lib/emailBlocks/treeLocation';
import { stripHtmlForPreview } from '../../lib/emailBlocks/textFormat';
import { uploadEmailTemplateImage } from '../../lib/supabase/storage';
import { BlockInspector, type EditorSelection } from './BlockInspector';

const categories: EmailTemplateCategory[] = ['campaign', 'general'];

const SECTION_ADD_TYPES: { type: SectionType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'signature', label: 'Signature', icon: User },
  { type: 'button', label: 'Button', icon: SquareMousePointer },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer', label: 'Spacer', icon: Space },
];

function templateToBlocks(t: EmailTemplate): EmailBlock[] {
  if (t.bodyFormat === 'blocks' && t.blocks && t.blocks.length > 0) {
    return t.blocks;
  }
  const text = createTextBlock();
  text.content = t.body
    ? t.body.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    : '';
  return [text];
}

function SortableChrome({
  id,
  selected,
  onSelect,
  onRemove,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white shadow-sm ${selected ? 'ring-2 ring-brand' : 'border-[var(--color-border)]'}`}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex touch-none items-center justify-center px-1.5 text-muted hover:bg-surface"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 px-2 py-2 text-left"
          onClick={onSelect}
        >
          {children}
        </button>
        <button
          type="button"
          className="flex items-center px-2 text-muted hover:bg-red-50 hover:text-error"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove section"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BlockLabel({ block }: { block: EmailBlock | EmailSectionBlock }) {
  if (isColumnsBlock(block)) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <Columns2 className="h-4 w-4 text-muted" />
        Two columns ({block.left.length + block.right.length} sections)
      </div>
    );
  }
  switch (block.type) {
    case 'text':
      return (
        <span className="text-sm text-gray-800 line-clamp-2">
          <span className="font-medium text-muted">Text · </span>
          {stripHtmlForPreview(block.content).slice(0, 80) || '(empty)'}
        </span>
      );
    case 'image':
      return (
        <span className="text-sm text-gray-800">
          <span className="font-medium text-muted">Image · </span>
          {block.src ? block.src.slice(-40) : 'No URL'}
        </span>
      );
    case 'signature':
      return <span className="text-sm text-gray-800 font-medium text-muted">Signature</span>;
    case 'button':
      return (
        <span className="text-sm text-gray-800">
          <span className="font-medium text-muted">Button · </span>
          {block.label}
        </span>
      );
    case 'divider':
      return <span className="text-sm text-muted">Divider</span>;
    case 'spacer':
      return (
        <span className="text-sm text-muted">
          Spacer · {block.height}px
        </span>
      );
    default:
      return null;
  }
}

export function EmailTemplateEditorModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: EmailTemplate | null;
  onSave: (payload: {
    name: string;
    subject: string;
    category: EmailTemplateCategory;
    active: boolean;
    bodyFormat: 'blocks';
    blocks: EmailBlock[];
    body: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<EmailTemplateCategory>('campaign');
  const [active, setActive] = useState(true);
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [addRootType, setAddRootType] = useState<'section' | 'columns'>('section');
  const [addSectionKind, setAddSectionKind] = useState<SectionType>('text');
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !initial) return;
    setName(initial.name);
    setSubject(initial.subject);
    setCategory(initial.category);
    setActive(initial.active);
    const next = templateToBlocks(initial);
    setBlocks(next);
    setSelection(next[0] ? { scope: 'root', id: next[0].id } : null);
  }, [open, initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => moveBlocksOnDragEnd(prev, String(active.id), String(over.id)));
  }, []);

  const deleteBlock = useCallback((sel: EditorSelection) => {
    setBlocks((prev) => {
      if (sel.scope === 'root') {
        return prev.filter((b) => b.id !== sel.id);
      }
      return prev.map((b) => {
        if (!isColumnsBlock(b) || b.id !== sel.columnsId) return b;
        if (sel.side === 'left') {
          return { ...b, left: b.left.filter((x) => x.id !== sel.id) };
        }
        return { ...b, right: b.right.filter((x) => x.id !== sel.id) };
      });
    });
    setSelection(null);
  }, []);

  const upsertBlock = useCallback(
    (sel: EditorSelection | null, next: EmailBlock | EmailSectionBlock) => {
      if (!sel) return;
      setBlocks((prev) => {
        if (sel.scope === 'root') {
          return prev.map((b) => (b.id === sel.id ? (next as EmailBlock) : b));
        }
        return prev.map((b) => {
          if (!isColumnsBlock(b) || b.id !== sel.columnsId) return b;
          const patch = (arr: EmailSectionBlock[]) =>
            arr.map((x) => (x.id === sel.id ? (next as EmailSectionBlock) : x));
          return sel.side === 'left' ? { ...b, left: patch(b.left) } : { ...b, right: patch(b.right) };
        });
      });
    },
    [],
  );

  function addRootBlock() {
    const nb =
      addRootType === 'columns' ? createBlockForToolbar('columns') : createSectionBlock(addSectionKind);
    setBlocks((prev) => [...prev, nb]);
    setSelection({ scope: 'root', id: nb.id });
  }

  function addColumnSection(columnsId: string, side: 'left' | 'right', kind: SectionType) {
    const nb = createSectionBlock(kind);
    setBlocks((prev) =>
      prev.map((b) => {
        if (!isColumnsBlock(b) || b.id !== columnsId) return b;
        return side === 'left' ? { ...b, left: [...b.left, nb] } : { ...b, right: [...b.right, nb] };
      }),
    );
    setSelection({ scope: 'column', columnsId, side, id: nb.id });
  }

  async function onPickImageForBlock(imageBlockId: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadErr(null);
      setUploading(true);
      const r = await uploadEmailTemplateImage(file);
      setUploading(false);
      if ('error' in r) {
        setUploadErr(r.error);
        return;
      }
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id === imageBlockId && b.type === 'image') {
            return { ...b, src: r.url, alt: b.alt || file.name };
          }
          if (isColumnsBlock(b)) {
            const mapImg = (arr: EmailSectionBlock[]) =>
              arr.map((x) =>
                x.id === imageBlockId && x.type === 'image' ? { ...x, src: r.url, alt: x.alt || file.name } : x,
              );
            return { ...b, left: mapImg(b.left), right: mapImg(b.right) };
          }
          return b;
        }),
      );
    };
    input.click();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit email template' : 'New email template'}
      className="flex max-h-[92vh] w-full max-w-[min(96vw,1280px)] flex-col overflow-hidden p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-0 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col border-b border-[var(--color-border)] sm:border-b-0 sm:border-r">
          <div className="space-y-3 border-b border-[var(--color-border)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted">Name</label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Subject</label>
                <Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs font-medium text-muted">Category</label>
                <Select
                  className="mt-1 min-w-[8rem]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EmailTemplateCategory)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-surface/50 px-4 py-2">
            <span className="text-xs font-medium text-muted">Add to canvas:</span>
            <Select
              className="w-36 text-sm"
              value={addRootType}
              onChange={(e) => setAddRootType(e.target.value as 'section' | 'columns')}
            >
              <option value="section">Section</option>
              <option value="columns">Two columns</option>
            </Select>
            {addRootType === 'section' ? (
              <Select
                className="w-40 text-sm"
                value={addSectionKind}
                onChange={(e) => setAddSectionKind(e.target.value as SectionType)}
              >
                {SECTION_ADD_TYPES.map((s) => (
                  <option key={s.type} value={s.type}>
                    {s.label}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button type="button" variant="secondary" className="!px-2" onClick={addRootBlock}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
            {uploading ? <span className="text-xs text-muted">Uploading…</span> : null}
            {uploadErr ? <span className="max-w-xs text-xs text-error">{uploadErr}</span> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <SortableChrome
                      key={block.id}
                      id={block.id}
                      selected={selection?.scope === 'root' && selection.id === block.id}
                      onSelect={() => setSelection({ scope: 'root', id: block.id })}
                      onRemove={() => deleteBlock({ scope: 'root', id: block.id })}
                    >
                      {isColumnsBlock(block) ? (
                        <div className="space-y-3 py-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 text-left"
                            onClick={() => setSelection({ scope: 'root', id: block.id })}
                          >
                            <BlockLabel block={block} />
                          </button>
                          <div className="grid gap-3 md:grid-cols-2">
                            {(['left', 'right'] as const).map((side) => (
                              <div
                                key={side}
                                className="rounded-md border border-dashed border-[var(--color-border)] bg-surface/30 p-2"
                              >
                                <div className="mb-2 text-xs font-semibold uppercase text-muted">
                                  {side} column
                                </div>
                                <SortableContext
                                  items={block[side].map((c) => c.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-2">
                                    {block[side].map((child) => (
                                      <SortableChrome
                                        key={child.id}
                                        id={child.id}
                                        selected={
                                          selection?.scope === 'column' &&
                                          selection.columnsId === block.id &&
                                          selection.side === side &&
                                          selection.id === child.id
                                        }
                                        onSelect={() =>
                                          setSelection({
                                            scope: 'column',
                                            columnsId: block.id,
                                            side,
                                            id: child.id,
                                          })
                                        }
                                        onRemove={() =>
                                          deleteBlock({
                                            scope: 'column',
                                            columnsId: block.id,
                                            side,
                                            id: child.id,
                                          })
                                        }
                                      >
                                        <div className="flex flex-col gap-1 py-1">
                                          <BlockLabel block={child} />
                                          {child.type === 'image' ? (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              className="mt-1 w-full !py-1 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onPickImageForBlock(child.id);
                                              }}
                                            >
                                              <ImageIcon className="h-3 w-3" />
                                              Upload image
                                            </Button>
                                          ) : null}
                                        </div>
                                      </SortableChrome>
                                    ))}
                                  </div>
                                </SortableContext>
                                <Select
                                  key={`${block.id}-${side}-${block[side].length}`}
                                  className="mt-2 w-full text-xs"
                                  defaultValue=""
                                  onChange={(e) => {
                                    const v = e.target.value as SectionType;
                                    if (v) addColumnSection(block.id, side, v);
                                  }}
                                >
                                  <option value="">+ Add section…</option>
                                  {SECTION_ADD_TYPES.map((s) => (
                                    <option key={s.type} value={s.type}>
                                      {s.label}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 py-1">
                          <BlockLabel block={block} />
                          {block.type === 'image' ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-1 w-full !py-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPickImageForBlock(block.id);
                              }}
                            >
                              <ImageIcon className="h-3 w-3" />
                              Upload image
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </SortableChrome>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-3 overflow-y-auto border-t border-[var(--color-border)] p-4 sm:w-80 sm:border-t-0">
          <h3 className="text-sm font-semibold text-gray-900">Section properties</h3>
          <BlockInspector
            blocks={blocks}
            selection={selection}
            onChangeBlock={(next) => selection && upsertBlock(selection, next)}
          />
        </aside>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] p-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!name.trim() || !subject.trim()) return;
            const body = blocksToEmailHtml(blocks);
            onSave({
              name: name.trim(),
              subject: subject.trim(),
              category,
              active,
              bodyFormat: 'blocks',
              blocks,
              body,
            });
            onClose();
          }}
        >
          Save template
        </Button>
      </div>
    </Modal>
  );
}
