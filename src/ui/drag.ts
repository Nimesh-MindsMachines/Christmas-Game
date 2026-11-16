// Drag & Drop mit Pointer Events – funktioniert mit Maus und Touch.
// Ein kurzer Tipp ohne Bewegung zählt als „Tap“ (Barrierefreiheit / einfache Bedienung).

export interface DragOptions {
  items: HTMLElement[];
  target: HTMLElement;
  onDrop: (item: HTMLElement) => void;
  onTap?: (item: HTMLElement) => void;
}

export function enableDrag({ items, target, onDrop, onTap }: DragOptions) {
  for (const item of items) {
    // Tastatur: Enter/Leertaste auf dem Button
    item.addEventListener('click', e => {
      if ((e as MouseEvent).detail === 0 && !item.dataset.done) (onTap ?? onDrop)(item);
    });

    item.addEventListener('pointerdown', e => {
      if (item.dataset.done || e.button > 0) return;
      e.preventDefault();
      const rect = item.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
      let ghost: HTMLElement | null = null;
      item.setPointerCapture(e.pointerId);

      const over = (x: number, y: number) => {
        const t = target.getBoundingClientRect();
        const pad = 24; // großzügige Trefferfläche für Finger
        return x > t.left - pad && x < t.right + pad && y > t.top - pad && y < t.bottom + pad;
      };
      const move = (ev: PointerEvent) => {
        if (!ghost) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
          ghost = item.cloneNode(true) as HTMLElement;
          ghost.classList.add('drag-ghost');
          Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` });
          document.body.appendChild(ghost);
          item.classList.add('dragging');
        }
        ghost.style.left = `${ev.clientX - offX}px`;
        ghost.style.top = `${ev.clientY - offY}px`;
        target.classList.toggle('drop-hover', over(ev.clientX, ev.clientY));
      };
      const up = (ev: PointerEvent) => {
        item.removeEventListener('pointermove', move);
        item.removeEventListener('pointerup', up);
        item.removeEventListener('pointercancel', up);
        item.classList.remove('dragging');
        target.classList.remove('drop-hover');
        if (!ghost) {
          if (ev.type === 'pointerup') (onTap ?? onDrop)(item);
          return;
        }
        ghost.remove();
        if (ev.type === 'pointerup' && over(ev.clientX, ev.clientY)) onDrop(item);
      };
      item.addEventListener('pointermove', move);
      item.addEventListener('pointerup', up);
      item.addEventListener('pointercancel', up);
    });
  }
}
