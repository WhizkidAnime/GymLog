import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ReorderItem = { id: string; name: string; position: number };

type Props = {
  open: boolean;
  items: ReorderItem[];
  onClose: () => void;
  onSave: (ordered: ReorderItem[]) => Promise<void> | void;
};

function reorder<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const ReorderExercisesModal: React.FC<Props> = ({ open, items, onClose, onSave }) => {
  const [list, setList] = useState<ReorderItem[]>([]);
  const draggingId = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = useMemo(
    () => items.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [items]
  );

  useEffect(() => {
    if (open) setList(initial);
  }, [open, initial]);

  if (!open) return null;

  const move = (i: number, j: number) => {
    if (j < 0 || j >= list.length) return;
    setList(prev => reorder(prev, i, j));
  };

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (overId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromId = draggingId.current;
    draggingId.current = null;
    if (fromId == null || fromId === overId) return;

    const from = list.findIndex(i => i.id === fromId);
    const to = list.findIndex(i => i.id === overId);
    if (from === -1 || to === -1) return;
    setList(prev => reorder(prev, from, to));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(list.map((it, idx) => ({ ...it, position: idx + 1 })));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Порядок упражнений</h2>

        <ol className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {list.map((it, idx) => (
            <li
              key={it.id}
              draggable
              onDragStart={onDragStart(it.id)}
              onDragOver={onDragOver}
              onDrop={onDrop(it.id)}
              className="rounded-lg p-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
              <span className="select-none w-6 text-center opacity-70">{idx + 1}.</span>
              <button
                type="button"
                aria-label="Перетащить"
                className="cursor-grab px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 active:cursor-grabbing"
                onMouseDown={e => e.preventDefault()}
              >
                ⋮⋮
              </button>
              <div className="flex-1 truncate">{it.name || 'Без названия'}</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn-glass btn-glass-sm btn-glass-secondary"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-glass btn-glass-sm btn-glass-secondary"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === list.length - 1}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-glass btn-glass-sm btn-glass-secondary" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button className="btn-glass btn-glass-sm btn-glass-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReorderExercisesModal;
