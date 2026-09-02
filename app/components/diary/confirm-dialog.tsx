'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export type Confirmation = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  action: () => void | Promise<void>;
};

export function ConfirmDialog({
  confirmation,
  onClose,
}: {
  confirmation: Confirmation | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!confirmation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [confirmation, onClose]);

  if (!confirmation) return null;

  const confirm = () => {
    const action = confirmation.action;
    onClose();
    void action();
  };

  return (
    <div className="confirm-backdrop">
      <button type="button" className="confirm-dismiss" aria-label="取消操作" onClick={onClose} />
      <dialog className="confirm-dialog" open aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <span className="confirm-icon" aria-hidden="true"><AlertTriangle /></span>
        <h2 id="confirm-title">{confirmation.title}</h2>
        <p id="confirm-description">{confirmation.description}</p>
        <footer>
          <button type="button" className="confirm-cancel" onClick={onClose}>取消</button>
          <button type="button" className={confirmation.destructive ? 'confirm-danger' : 'confirm-action'} onClick={confirm}>
            {confirmation.confirmLabel ?? '确定'}
          </button>
        </footer>
      </dialog>
    </div>
  );
}
