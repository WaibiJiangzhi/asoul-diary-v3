'use client';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { useRef, useState } from 'react';
import type { AccentTheme } from '@/lib/types';
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
  accent,
}: {
  confirmation: Confirmation | null;
  onClose: () => void;
  accent: AccentTheme;
}) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (!confirmation || running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await confirmation.action();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作未完成，请重试');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <AlertDialog.Root
      open={!!confirmation}
      onOpenChange={(open) => {
        if (!open && !running.current) {
          setError('');
          onClose();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirm-backdrop" />
        <AlertDialog.Popup className={'life-confirm theme-' + accent}>
          <span className="confirm-icon" aria-hidden="true">
            <AlertTriangle />
          </span>
          <AlertDialog.Title>{confirmation?.title}</AlertDialog.Title>
          <AlertDialog.Description>
            {confirmation?.description}
          </AlertDialog.Description>
          {error && <p role="alert">{error}</p>}
          <footer>
            <AlertDialog.Close className="confirm-cancel" disabled={busy}>
              取消
            </AlertDialog.Close>
            <button
              type="button"
              disabled={busy}
              className={
                confirmation?.destructive ? 'confirm-danger' : 'confirm-action'
              }
              onClick={() => void confirm()}
            >
              {busy ? '正在处理…' : (confirmation?.confirmLabel ?? '确定')}
            </button>
          </footer>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
