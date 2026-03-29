import type { EmailBlock } from '../../types/emailBlocks';
import { isColumnsBlock } from '../../types/emailBlocks';
import { arrayMove } from '@dnd-kit/sortable';

export type BlockLocation =
  | { where: 'root'; index: number }
  | { where: 'column'; columnsId: string; side: 'left' | 'right'; index: number };

export function findBlockLocation(blocks: EmailBlock[], id: string): BlockLocation | null {
  const ri = blocks.findIndex((b) => b.id === id);
  if (ri >= 0) return { where: 'root', index: ri };
  for (const b of blocks) {
    if (!isColumnsBlock(b)) continue;
    const li = b.left.findIndex((x) => x.id === id);
    if (li >= 0) return { where: 'column', columnsId: b.id, side: 'left', index: li };
    const rj = b.right.findIndex((x) => x.id === id);
    if (rj >= 0) return { where: 'column', columnsId: b.id, side: 'right', index: rj };
  }
  return null;
}

export function moveBlocksOnDragEnd(blocks: EmailBlock[], activeId: string, overId: string): EmailBlock[] {
  if (activeId === overId) return blocks;
  const a = findBlockLocation(blocks, activeId);
  const o = findBlockLocation(blocks, overId);
  if (!a || !o) return blocks;

  if (a.where === 'root' && o.where === 'root') {
    return arrayMove(blocks, a.index, o.index);
  }

  if (
    a.where === 'column' &&
    o.where === 'column' &&
    a.columnsId === o.columnsId &&
    a.side === o.side
  ) {
    return blocks.map((b) => {
      if (!isColumnsBlock(b) || b.id !== a.columnsId) return b;
      const arr = a.side === 'left' ? [...b.left] : [...b.right];
      const moved = arrayMove(arr, a.index, o.index);
      return a.side === 'left' ? { ...b, left: moved } : { ...b, right: moved };
    });
  }

  return blocks;
}
