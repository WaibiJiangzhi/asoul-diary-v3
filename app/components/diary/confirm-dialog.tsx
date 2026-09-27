'use client';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { AlertTriangle } from 'lucide-react';
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
  return (
    <AlertDialog.Root
      open={!!confirmation}
      onOpenChange={(open) => {
        if (!open) onClose();
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
          <footer>
            <AlertDialog.Close className="confirm-cancel">
              取消
            </AlertDialog.Close>
            <button
              type="button"
              className={
                confirmation?.destructive ? 'confirm-danger' : 'confirm-action'
              }
              onClick={() => {
                const action = confirmation?.action;
                onClose();
                void action?.();
              }}
            >
              {confirmation?.confirmLabel ?? '确定'}
            </button>
          </footer>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
